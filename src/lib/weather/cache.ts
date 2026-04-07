import type { Coordinates } from "../types";
import { haversineDistanceKm } from "../useCurrentLocation";
import type { Forecast, ResolvedLocation } from "./types";

const LOCATION_KEY = "dripmap:lastLocation";
const FORECAST_KEY = "dripmap:lastForecast";

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadCachedLocation(): ResolvedLocation | null {
  const ls = safeStorage();
  if (!ls) return null;
  const raw = ls.getItem(LOCATION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.coordinates?.lat !== "number" ||
      typeof parsed?.coordinates?.lng !== "number" ||
      typeof parsed?.source !== "string" ||
      typeof parsed?.timestamp !== "number"
    ) {
      return null;
    }
    return parsed as ResolvedLocation;
  } catch {
    return null;
  }
}

export function saveCachedLocation(location: ResolvedLocation): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(LOCATION_KEY, JSON.stringify(location));
  } catch {
    /* ignore quota errors */
  }
}

export function loadCachedForecast(): Forecast | null {
  const ls = safeStorage();
  if (!ls) return null;
  const raw = ls.getItem(FORECAST_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.fetchedAt !== "number" ||
      !parsed?.current ||
      !Array.isArray(parsed?.hourly)
    ) {
      return null;
    }
    return parsed as Forecast;
  } catch {
    return null;
  }
}

export function saveCachedForecast(forecast: Forecast): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(FORECAST_KEY, JSON.stringify(forecast));
  } catch {
    /* ignore quota errors */
  }
}

/** Returns true if the forecast was fetched within the freshness window. */
export function isForecastFresh(forecast: Forecast, windowMs: number): boolean {
  return Date.now() - forecast.fetchedAt < windowMs;
}

/** Returns true if the user has moved more than `thresholdKm` from the previous location. */
export function hasMovedSignificantly(prev: Coordinates, next: Coordinates, thresholdKm: number): boolean {
  return haversineDistanceKm(prev, next) >= thresholdKm;
}
