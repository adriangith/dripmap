import { describe, it, expect } from "vitest";
import {
  classifyWeather,
  settingForPlace,
  weatherScore,
  weatherPhrase,
  weatherFitPhrase,
} from "../../src/lib/weather";
import type { PlaceIndexEntry } from "../../src/lib/types";
import type { DayForecast } from "../../src/lib/integrations/enrichment-types";

const basePlaceEntry: PlaceIndexEntry = {
  slug: "test",
  name: "Test",
  type: "swim",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  cost: "free",
  highlights: [],
  status: { site: "open", lastVerified: "2026-01-01" },
  tags: [],
};

describe("classifyWeather", () => {
  it("classifies clear/sunny as clear", () => {
    expect(classifyWeather("Sunny.")).toBe("clear");
    expect(classifyWeather("Fine and warm.")).toBe("clear");
  });

  it("classifies rain keywords", () => {
    expect(classifyWeather("Showers.")).toBe("rain");
    expect(classifyWeather("Possible shower or two.")).toBe("rain");
    expect(classifyWeather("Rain developing.")).toBe("rain");
  });

  it("classifies storms", () => {
    expect(classifyWeather("Thunderstorm expected.")).toBe("storm");
    expect(classifyWeather("Storm warning.")).toBe("storm");
  });

  it("classifies overcast", () => {
    expect(classifyWeather("Mostly cloudy.")).toBe("overcast");
    expect(classifyWeather("Overcast.")).toBe("overcast");
    expect(classifyWeather("Fog patches.")).toBe("overcast");
  });

  it("returns clear for empty/undefined", () => {
    expect(classifyWeather(undefined)).toBe("clear");
    expect(classifyWeather("")).toBe("clear");
  });
});

describe("settingForPlace", () => {
  it("returns outdoor-water for swim/beach/pool types", () => {
    expect(settingForPlace({ ...basePlaceEntry, type: "swim" })).toBe("outdoor-water");
    expect(settingForPlace({ ...basePlaceEntry, type: "beach" })).toBe("outdoor-water");
    expect(settingForPlace({ ...basePlaceEntry, type: "pool" })).toBe("outdoor-water");
  });

  it("returns outdoor for playground/walk types", () => {
    expect(settingForPlace({ ...basePlaceEntry, type: "playground" })).toBe("outdoor");
    expect(settingForPlace({ ...basePlaceEntry, type: "walk" })).toBe("outdoor");
    expect(settingForPlace({ ...basePlaceEntry, type: "bushwalk" })).toBe("outdoor");
  });

  it("returns indoor for museum/eatery/cave types", () => {
    expect(settingForPlace({ ...basePlaceEntry, type: "museum" })).toBe("indoor");
    expect(settingForPlace({ ...basePlaceEntry, type: "eatery" })).toBe("indoor");
    expect(settingForPlace({ ...basePlaceEntry, type: "cave" })).toBe("indoor");
  });

  it("uses tags for event types", () => {
    expect(settingForPlace({ ...basePlaceEntry, type: "event", tags: ["indoor"] })).toBe("indoor");
    expect(settingForPlace({ ...basePlaceEntry, type: "event", tags: ["outdoor"] })).toBe("outdoor");
    expect(settingForPlace({ ...basePlaceEntry, type: "event", tags: [] })).toBe("outdoor");
  });
});

describe("weatherScore", () => {
  it("returns positive score for outdoor on clear days", () => {
    const forecast: DayForecast = { date: "2026-04-17", precis: "Sunny." };
    expect(weatherScore("outdoor", forecast)).toBeGreaterThan(0);
  });

  it("returns negative score for outdoor-water on rainy days", () => {
    const forecast: DayForecast = { date: "2026-04-17", precis: "Rain." };
    expect(weatherScore("outdoor-water", forecast)).toBeLessThan(0);
  });

  it("returns positive score for indoor on rainy days", () => {
    const forecast: DayForecast = { date: "2026-04-17", precis: "Showers." };
    expect(weatherScore("indoor", forecast)).toBeGreaterThan(0);
  });

  it("boosts outdoor-water on hot clear days", () => {
    const hot: DayForecast = { date: "2026-04-17", precis: "Sunny.", max: 35 };
    const mild: DayForecast = { date: "2026-04-17", precis: "Sunny.", max: 22 };
    expect(weatherScore("outdoor-water", hot)).toBeGreaterThan(weatherScore("outdoor-water", mild));
  });

  it("returns 0 when no forecast", () => {
    expect(weatherScore("outdoor", null)).toBe(0);
  });
});

describe("weatherPhrase", () => {
  it("returns appropriate phrases", () => {
    expect(weatherPhrase({ date: "2026-04-17", precis: "Rain." })).toBe("rain is on the way");
    expect(weatherPhrase({ date: "2026-04-17", precis: "Thunderstorm." })).toBe("storms are forecast");
    expect(weatherPhrase({ date: "2026-04-17", precis: "Sunny.", max: 35 })).toBe("it's going to be a scorcher");
    expect(weatherPhrase({ date: "2026-04-17", precis: "Fine.", max: 25 })).toBe("the weather looks great");
  });

  it("returns null for no forecast", () => {
    expect(weatherPhrase(null)).toBeNull();
  });
});

describe("weatherFitPhrase", () => {
  it("suggests indoor alternative on rainy outdoor days", () => {
    const rain: DayForecast = { date: "2026-04-17", precis: "Rain." };
    expect(weatherFitPhrase("outdoor", rain)).toContain("indoor alternative");
  });

  it("suggests perfect weather for water on hot days", () => {
    const hot: DayForecast = { date: "2026-04-17", precis: "Sunny.", max: 32 };
    expect(weatherFitPhrase("outdoor-water", hot)).toContain("water");
  });

  it("suggests heading indoors on rainy indoor days", () => {
    const rain: DayForecast = { date: "2026-04-17", precis: "Showers." };
    expect(weatherFitPhrase("indoor", rain)).toContain("indoors");
  });

  it("returns setting fallback when no forecast", () => {
    expect(weatherFitPhrase("outdoor", null)).toContain("outdoor");
    expect(weatherFitPhrase("indoor", null)).toContain("indoor");
    expect(weatherFitPhrase("outdoor-water", null)).toContain("water");
  });
});
