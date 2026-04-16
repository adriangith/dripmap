import { test, expect } from "@playwright/test";
import { bypassOnboarding } from "./helpers";

test.describe("Offline / PWA", () => {
  test.beforeEach(async ({ context }) => {
    await bypassOnboarding(context);
  });

  // Scope "Fairy Pools" checks to the sidebar so we don't match hidden map-pin labels
  const fairyPoolsCard = (page: import("@playwright/test").Page) =>
    page
      .locator('[data-testid="location-sidebar"]')
      .getByRole("button", { name: /Fairy Pools/ })
      .first();

  test("service worker registers and activates", async ({ page }) => {
    await page.goto("/");

    const swState = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sw = reg.active!;
      if (sw.state === "activated") return sw.state;
      // Wait for the statechange event if still activating
      return new Promise<string>((resolve) => {
        sw.addEventListener("statechange", () => resolve(sw.state));
      });
    });

    expect(swState).toBe("activated");
  });

  test("app loads offline after service worker caches assets", async ({
    context,
    page,
  }) => {
    await page.goto("/");

    // Wait for SW activation and precaching
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sw = reg.active!;
      if (sw.state !== "activated") {
        await new Promise<void>((resolve) => {
          sw.addEventListener("statechange", () => {
            if (sw.state === "activated") resolve();
          });
        });
      }
    });

    // Reload so the active SW serves precached assets
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(fairyPoolsCard(page)).toBeVisible({ timeout: 10_000 });

    // Go offline
    await context.setOffline(true);

    // Reload — SW should serve cached page
    await page.reload({ waitUntil: "domcontentloaded" });

    // Verify the page rendered meaningful app content (not a browser error)
    await expect(page.locator("body")).not.toHaveText(/is not available/i);
    await expect(page.locator("body")).toContainText(/.+/);
    // Check for location cards which are present on the home page
    await expect(fairyPoolsCard(page)).toBeVisible({ timeout: 10_000 });
  });

  test("location cards are visible offline", async ({ context, page }) => {
    await page.goto("/");

    // Wait for SW + location cards to load
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await expect(fairyPoolsCard(page)).toBeVisible({ timeout: 10_000 });

    // Reload to let SW take control and cache everything
    await page.reload({ waitUntil: "domcontentloaded" });
    await expect(fairyPoolsCard(page)).toBeVisible({ timeout: 10_000 });

    // Go offline
    await context.setOffline(true);

    await page.reload({ waitUntil: "domcontentloaded" });

    // Location cards should still render from cache
    await expect(fairyPoolsCard(page)).toBeVisible({ timeout: 10_000 });
  });

  test("detail page available offline after prior visit", async ({
    context,
    page,
  }) => {
    await page.goto("/");

    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });

    // Visit the detail page so it gets cached
    await page.goto("/location/fairy-pools", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Fairy Pools" })
    ).toBeVisible({ timeout: 10_000 });

    // Go back to home — still online
    await page.goto("/");
    await expect(fairyPoolsCard(page)).toBeVisible({ timeout: 10_000 });

    // Go offline
    await context.setOffline(true);

    // Navigate to the same detail page
    await page.goto("/location/fairy-pools", {
      waitUntil: "domcontentloaded",
    });

    await expect(
      page.getByRole("heading", { name: "Fairy Pools" })
    ).toBeVisible({ timeout: 10_000 });
  });
});
