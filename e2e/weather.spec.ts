import { test, expect } from "@playwright/test";

/**
 * Mocked Open-Meteo response: warm, dry, sunny — should render a "good"
 * rating in the banner and on the swimming-hole detail page.
 */
function mockOpenMeteoResponse() {
  const now = new Date();
  const base = new Date(now);
  base.setMinutes(0, 0, 0);
  const hours: string[] = [];
  for (let i = 0; i < 72; i++) {
    const d = new Date(base.getTime() + i * 60 * 60 * 1000);
    hours.push(d.toISOString().slice(0, 16));
  }
  return {
    latitude: -37.8,
    longitude: 145,
    timezone: "Australia/Melbourne",
    current: {
      time: hours[0],
      temperature_2m: 26,
      precipitation: 0,
      weather_code: 0,
      uv_index: 5,
      wind_speed_10m: 8,
    },
    hourly: {
      time: hours,
      temperature_2m: hours.map(() => 26),
      precipitation_probability: hours.map(() => 0),
      precipitation: hours.map(() => 0),
      uv_index: hours.map(() => 5),
      weather_code: hours.map(() => 0),
    },
  };
}

test.describe("weather feature", () => {
  test.beforeEach(async ({ context }) => {
    await context.route(/https:\/\/ipapi\.co\/.*/i, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ latitude: -37.8, longitude: 145 }),
      })
    );
    await context.route(/https:\/\/api\.open-meteo\.com\/.*/i, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockOpenMeteoResponse()),
      })
    );
  });

  test("weather banner renders and expands on home", async ({ page }) => {
    await page.goto("/");

    // Banner shows current temperature from mocked forecast
    await expect(page.getByText(/26°C/).first()).toBeVisible({
      timeout: 10_000,
    });

    // Expand the banner via its toggle button
    const toggle = page.getByRole("button", { name: /toggle weather details/i }).first();
    await toggle.click();

    // After expand, per-type rows should be visible (at least one "good" rating)
    await expect(page.getByText(/good/i).first()).toBeVisible();
  });

  test("weather section renders on detail page", async ({ page }) => {
    await page.goto("/location/fairy-pools");
    await expect(
      page.getByRole("heading", { name: "Fairy Pools" })
    ).toBeVisible();

    // Arrival row temperature
    await expect(page.getByText(/26°C/).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
