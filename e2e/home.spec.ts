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
  // Filter to waterfall type using chip button
  await page.locator('[data-filter-chip="waterfall"]').first().click();
  const marker = page.locator(".leaflet-marker-icon").first();
  await expect(marker).toBeVisible({ timeout: 10_000 });
  await marker.hover({ force: true });
  const popup = page.locator(".leaflet-popup-content");
  await expect(popup).toBeVisible();
  await expect(popup).toHaveText(/.+/);
});

test("clicking a map marker opens detail in bottom sheet on mobile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  // Wait for markers to load
  const markers = page.locator(".leaflet-marker-icon");
  await expect(markers.first()).toBeVisible({ timeout: 10_000 });

  // Zoom into Australia (where most locations are) via Leaflet API
  await page.evaluate(() => {
    const container = document.querySelector(".leaflet-container") as any;
    if (!container) return;
    // Leaflet stores the map instance on the DOM element
    for (const key of Object.keys(container)) {
      if (key.startsWith("_leaflet")) {
        const mapInstance = (window as any).L?.Map?._maps;
        break;
      }
    }
    // Use leaflet-container's internal reference
    const mapId = container._leaflet_id;
    if (mapId != null) {
      // Access L map through eachLayer hack
      const L = (window as any).L;
      if (L) {
        // Find the map by iterating over all map instances
        const mapContainer = container;
        // Leaflet stores map ref directly
        let map: any = null;
        for (const key of Object.getOwnPropertyNames(container)) {
          const val = container[key];
          if (val && typeof val === "object" && typeof val.setView === "function") {
            map = val;
            break;
          }
        }
        if (!map) {
          // Alternative: access via _leaflet_map
          map = container._leaflet_map;
        }
        if (map) {
          map.setView([-37.8, 145], 8);
        }
      }
    }
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

  // Should show detail panel with "Back to list" in the bottom sheet
  const backButton = page.getByText("Back to list");
  await expect(backButton).toBeVisible({ timeout: 5_000 });
  await expect(page).toHaveURL(/\/$/);
});

test("filtering by type hides non-matching cards", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Fairy Pools").first()).toBeVisible();

  // Click the waterfall chip
  await page.locator('[data-filter-chip="waterfall"]').first().click();

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
