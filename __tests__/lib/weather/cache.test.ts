import { describe, it, expect, beforeEach } from "vitest";
import {
  loadCachedLocation,
  saveCachedLocation,
  loadCachedForecast,
  saveCachedForecast,
  isForecastFresh,
  hasMovedSignificantly,
} from "../../../src/lib/weather/cache";
import type { ResolvedLocation, Forecast } from "../../../src/lib/weather/types";

const sampleLocation: ResolvedLocation = {
  coordinates: { lat: -37.81, lng: 144.96 },
  source: "ip",
  timestamp: 1_700_000_000_000,
};

const sampleForecast: Forecast = {
  location: { lat: -37.81, lng: 144.96 },
  fetchedAt: 1_700_000_000_000,
  current: {
    time: "2026-04-07T12:00",
    temperatureC: 24,
    weatherCode: 0,
    precipitationMm: 0,
    precipitationProbability: 0,
    uvIndex: 5,
    windKmh: 8,
  },
  hourly: [],
};

describe("location cache", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when no cached location", () => {
    expect(loadCachedLocation()).toBeNull();
  });

  it("round-trips a saved location", () => {
    saveCachedLocation(sampleLocation);
    expect(loadCachedLocation()).toEqual(sampleLocation);
  });

  it("returns null when stored data is corrupted", () => {
    localStorage.setItem("dripmap:lastLocation", "not json");
    expect(loadCachedLocation()).toBeNull();
  });

  it("returns null when stored data missing required fields", () => {
    localStorage.setItem("dripmap:lastLocation", JSON.stringify({ coordinates: {} }));
    expect(loadCachedLocation()).toBeNull();
  });
});

describe("forecast cache", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when no cached forecast", () => {
    expect(loadCachedForecast()).toBeNull();
  });

  it("round-trips a saved forecast", () => {
    saveCachedForecast(sampleForecast);
    expect(loadCachedForecast()).toEqual(sampleForecast);
  });

  it("returns null when stored data is corrupted", () => {
    localStorage.setItem("dripmap:lastForecast", "{not json");
    expect(loadCachedForecast()).toBeNull();
  });
});

describe("isForecastFresh", () => {
  it("returns true when fetched within window", () => {
    const now = Date.now();
    expect(isForecastFresh({ ...sampleForecast, fetchedAt: now - 5 * 60 * 1000 }, 15 * 60 * 1000)).toBe(true);
  });

  it("returns false when older than window", () => {
    const now = Date.now();
    expect(isForecastFresh({ ...sampleForecast, fetchedAt: now - 30 * 60 * 1000 }, 15 * 60 * 1000)).toBe(false);
  });
});

describe("hasMovedSignificantly", () => {
  it("returns false for identical coords", () => {
    expect(hasMovedSignificantly({ lat: -37.81, lng: 144.96 }, { lat: -37.81, lng: 144.96 }, 5)).toBe(false);
  });

  it("returns false for sub-threshold movement", () => {
    expect(hasMovedSignificantly({ lat: -37.81, lng: 144.96 }, { lat: -37.82, lng: 144.97 }, 5)).toBe(false);
  });

  it("returns true for movement above threshold", () => {
    // Melbourne to Geelong is ~75 km
    expect(hasMovedSignificantly({ lat: -37.81, lng: 144.96 }, { lat: -38.15, lng: 144.36 }, 5)).toBe(true);
  });
});
