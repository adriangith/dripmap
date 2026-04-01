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

test("hovering a map marker opens a popup with the location name", async ({
  page,
}) => {
  await page.goto("/");
  // Filter to waterfall type to reduce marker density
  await page.locator("select").first().selectOption("waterfall");
  const marker = page.locator(".leaflet-marker-icon").first();
  await expect(marker).toBeVisible({ timeout: 10_000 });
  await marker.hover({ force: true });
  const popup = page.locator(".leaflet-popup-content");
  await expect(popup).toBeVisible();
  await expect(popup).toHaveText(/.+/);
});

test("clicking a map marker navigates to the detail page", async ({
  page,
}) => {
  await page.goto("/");
  // Filter to waterfall type to reduce marker density
  await page.locator("select").first().selectOption("waterfall");
  const markers = page.locator(".leaflet-marker-icon");
  await expect(markers.first()).toBeVisible({ timeout: 10_000 });

  await markers.first().click({ force: true });

  await expect(page).toHaveURL(/\/location\//);
});

test("filtering by type hides non-matching cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Fairy Pools").first()).toBeVisible();

  await page.locator("select").first().selectOption("waterfall");

  await expect(page.getByText("Niagara Falls").first()).toBeVisible();
  await expect(page.getByText("Fairy Pools")).not.toBeVisible();
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

test("markers are visible on the map", async ({ page }) => {
  await page.goto("/");
  const markers = page.locator(".leaflet-marker-icon");
  // Should have at least 3 markers (may have more with additional locations)
  await expect(markers.first()).toBeVisible({ timeout: 10_000 });
  const count = await markers.count();
  expect(count).toBeGreaterThanOrEqual(3);
});
