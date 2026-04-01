import { test, expect } from "@playwright/test";

test("clicking a location card navigates to the detail page", async ({
  page,
}) => {
  await page.goto("/");
  const card = page.getByRole("link", { name: /Fairy Pools/ }).first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page).toHaveURL(/\/location\/fairy-pools/);
  await expect(
    page.getByRole("heading", { name: "Fairy Pools" })
  ).toBeVisible();
});

test("detail page has a back link to the map", async ({ page }) => {
  await page.goto("/location/fairy-pools");
  const backLink = page.getByRole("link", { name: /back to map/i });
  await expect(backLink).toBeVisible();
  await backLink.click();
  await expect(page).toHaveURL(/\/$/);

});

test("clicking a map marker opens a popup with the location name", async ({
  page,
}) => {
  await page.goto("/");
  const marker = page.locator(".leaflet-marker-icon").first();
  await expect(marker).toBeVisible({ timeout: 10_000 });
  await marker.click();
  const popup = page.locator(".leaflet-popup-content");
  await expect(popup).toBeVisible();
  await expect(popup).toContainText(
    /(Fairy Pools|Hamilton Pool Preserve|Niagara Falls)/
  );
});

test("clicking a map marker highlights the corresponding card", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /Fairy Pools/ }).first()).toBeVisible();
  const markers = page.locator(".leaflet-marker-icon");
  await expect(markers.first()).toBeVisible({ timeout: 10_000 });

  await markers.first().click();

  const highlighted = page.locator("a[href^='/location/'].bg-blue-50");
  await expect(highlighted.first()).toBeVisible();
});

test("filtering by type hides non-matching cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Fairy Pools").first()).toBeVisible();

  await page.locator("select").first().selectOption("waterfall");

  await expect(page.getByText("Niagara Falls").first()).toBeVisible();
  await expect(page.getByText("Fairy Pools")).not.toBeVisible();
});

test("all 3 markers are visible on the map", async ({ page }) => {
  await page.goto("/");
  const markers = page.locator(".leaflet-marker-icon");
  await expect(markers).toHaveCount(3, { timeout: 10_000 });
});
