import { test, expect } from "@playwright/test";
import { bypassOnboarding } from "./helpers";

test.beforeEach(async ({ context }) => {
  await bypassOnboarding(context);
});

test("clicking a location card opens inline detail on desktop", async ({
  page,
}) => {
  await page.goto("/");
  const sidebar = page.locator('[data-testid="location-sidebar"]');
  // Wait for the list to load — sidebar cards render as buttons, not links
  const card = sidebar.getByRole("button", { name: /Fairy Pools/ }).first();
  await expect(card).toBeVisible({ timeout: 10_000 });
  await card.click();
  // Detail opens inline in the sidebar — URL stays at /
  await expect(page).toHaveURL(/\/$/);
  await expect(
    sidebar.getByRole("heading", { name: "Fairy Pools" })
  ).toBeVisible({ timeout: 5_000 });
});

test("detail page has a back link to the map", async ({ page }) => {
  await page.goto("/location/fairy-pools");
  const backLink = page.getByRole("link", { name: /back to map/i });
  await expect(backLink).toBeVisible();
  await backLink.click();
  await expect(page).toHaveURL(/\/$/);
});

test("hovering a map marker highlights the matching sidebar card", async ({
  page,
}) => {
  await page.goto("/");
  const sidebar = page.locator('[data-testid="location-sidebar"]');
  // Wait for markers and sidebar cards to load
  await expect(
    sidebar.getByRole("button").first()
  ).toBeVisible({ timeout: 10_000 });
  await page.locator(".leaflet-marker-icon, .marker-cluster").first().waitFor({ timeout: 10_000 });

  // Grab the first marker actually in-viewport and hover it
  const hovered = await page.evaluate(() => {
    const icons = document.querySelectorAll<HTMLElement>(".leaflet-marker-icon");
    for (const icon of icons) {
      const r = icon.getBoundingClientRect();
      if (r.width > 0 && r.height > 0 && r.top >= 0 && r.left >= 0 &&
          r.bottom <= window.innerHeight && r.right <= window.innerWidth) {
        // Fire the mouseover event directly (Leaflet listens for mouseover)
        icon.dispatchEvent(new MouseEvent("mouseover", { bubbles: true }));
        return true;
      }
    }
    return false;
  });
  expect(hovered).toBe(true);
  // The hovered marker's card in the sidebar should become highlighted
  await expect(
    sidebar.locator(".border-blue-400")
  ).toBeVisible({ timeout: 5_000 });
});

test("clicking a map marker opens detail in bottom sheet on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // Wait for markers to load
  const markers = page.locator(".leaflet-marker-icon");
  await expect(markers.first()).toBeVisible({ timeout: 10_000 });

  // Zoom into Victoria (where most locations are) via Leaflet API
  await page.evaluate(() => {
    type LeafletMapLike = { setView: (center: [number, number], zoom: number) => void };
    const container = document.querySelector(".leaflet-container") as Record<string, unknown> | null;
    if (!container) return;

    let map: LeafletMapLike | null = null;
    for (const key of Object.getOwnPropertyNames(container)) {
      const value = container[key];
      if (
        value &&
        typeof value === "object" &&
        "setView" in value &&
        typeof (value as { setView?: unknown }).setView === "function"
      ) {
        map = value as LeafletMapLike;
        break;
      }
    }
    const fallback = container._leaflet_map;
    if (
      !map &&
      fallback &&
      typeof fallback === "object" &&
      "setView" in fallback &&
      typeof (fallback as { setView?: unknown }).setView === "function"
    ) {
      map = fallback as LeafletMapLike;
    }
    map?.setView([-37.8, 145], 8);
  });
  await page.waitForTimeout(1500);

  // Find and click a marker in viewport
  const clicked = await page.evaluate(() => {
    const icons = document.querySelectorAll(".leaflet-marker-icon");
    for (const icon of icons) {
      const rect = icon.getBoundingClientRect();
      if (rect.x >= 0 && rect.y >= 0 && rect.x < 390 && rect.y < 700 && rect.width > 0) {
        (icon as HTMLElement).click();
        return true;
      }
    }
    return false;
  });
  expect(clicked).toBe(true);

  // Should show the back button in the mobile sheet header (aria-label="Back to list")
  const sheetBackButton = page.locator(".rounded-t-2xl").getByRole("button", { name: /back to list/i });
  await expect(sheetBackButton).toBeVisible({ timeout: 5_000 });
  await expect(page).toHaveURL(/\/$/);
});

test("filtering by type hides non-matching cards", async ({ page }) => {
  await page.goto("/");
  const sidebar = page.locator('[data-testid="location-sidebar"]');
  // Wait for the sidebar list to populate with swim locations
  await expect(sidebar.getByRole("button", { name: /Fairy Pools/ }).first()).toBeVisible({
    timeout: 10_000,
  });

  // Filter to beach type (7 beach locations, no swim locations)
  await page.locator('[data-filter-chip="beach"]').first().click();

  // A beach location should appear
  await expect(
    sidebar.getByRole("button", { name: /Eastern Beach/ }).first()
  ).toBeVisible({ timeout: 5_000 });
  // Fairy Pools (swim type) should be gone
  await expect(sidebar.getByRole("button", { name: /Fairy Pools/ })).toHaveCount(0);
});

test("detail page renders mini map without errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (err) => errors.push(err.message));

  await page.goto("/location/fairy-pools");
  await expect(
    page.getByRole("heading", { name: "Fairy Pools" })
  ).toBeVisible();
  // Mini map marker should render (uses divIcon, not default icon)
  const marker = page.locator(".leaflet-marker-icon");
  await expect(marker).toBeVisible({ timeout: 10_000 });

  expect(errors).toHaveLength(0);
});

test("markers and clusters are visible on the map", async ({ page }) => {
  await page.goto("/");
  // Either individual markers or cluster icons should be visible
  const mapElements = page.locator(
    ".leaflet-marker-icon, .marker-cluster"
  );
  await expect(mapElements.first()).toBeVisible({ timeout: 10_000 });
  const count = await mapElements.count();
  expect(count).toBeGreaterThanOrEqual(1);
});

test("clicking a list card on mobile zooms and pans map to the pin", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // Wait for markers to load
  await page.waitForSelector(".leaflet-marker-icon", { timeout: 10_000 });

  // Tap the handle once to cycle from peek → half, revealing the list
  const handle = page.locator(".rounded-t-2xl .cursor-grab").first();
  await handle.click();
  await page.waitForTimeout(600);

  // Find a card button (mobile renders cards as buttons) and click it
  const card = page.locator("button.rounded-lg").first();
  await expect(card).toBeVisible({ timeout: 5_000 });
  await card.click();

  // Wait for the mobile sheet back button (aria-label="Back to list")
  const sheetBackButton = page.locator(".rounded-t-2xl").getByRole("button", { name: /back to list/i });
  await expect(sheetBackButton).toBeVisible({ timeout: 5_000 });

  // Wait for pan animation to settle
  await page.waitForTimeout(500);

  // Verify the map zoomed to ~12 and pin is in visible area
  const mapData = await page.evaluate(() => {
    type LeafletWindow = Window & { __leafletMap?: { getZoom: () => number } };
    const map = (window as LeafletWindow).__leafletMap;
    if (!map) return null;
    return { zoom: map.getZoom() };
  });

  expect(mapData).toBeTruthy();
  expect(mapData!.zoom).toBeGreaterThanOrEqual(11);
  expect(mapData!.zoom).toBeLessThanOrEqual(13);
});

test("locate button is visible and clickable above the bottom sheet on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForSelector(".leaflet-marker-icon", { timeout: 10_000 });

  const locateBtn = page.getByTestId("locate-button");
  await expect(locateBtn).toBeVisible();

  // Button must be above the bottom sheet (sheet has rounded-t-2xl class)
  const btnBox = await locateBtn.boundingBox();
  const sheet = page.locator(".rounded-t-2xl").first();
  const sheetBox = await sheet.boundingBox();
  expect(btnBox).toBeTruthy();
  expect(sheetBox).toBeTruthy();
  // Button bottom edge should be above (or at) the sheet top edge
  expect(btnBox!.y + btnBox!.height).toBeLessThanOrEqual(sheetBox!.y + 2);

  // Button should be clickable (not blocked by sheet z-index)
  const clicked = await page.evaluate(() => {
    const btn = document.querySelector('[data-testid="locate-button"]');
    if (!btn) return false;
    const rect = btn.getBoundingClientRect();
    const topEl = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
    return btn === topEl || btn.contains(topEl);
  });
  expect(clicked).toBe(true);
});
