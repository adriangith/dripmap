import type { Coordinates, LocationType } from "../types";

export type LocationSource = "cache" | "ip" | "precise";

export interface ResolvedLocation {
  coordinates: Coordinates;
  source: LocationSource;
  /** ms epoch */
  timestamp: number;
}

/** A single hour of weather (current or forecast). */
export interface WeatherSnapshot {
  /** ISO 8601 timestamp */
  time: string;
  /** Celsius */
  temperatureC: number;
  /** Open-Meteo WMO weather code */
  weatherCode: number;
  /** mm of rain in this hour */
  precipitationMm: number;
  /** % chance of precipitation (hourly only; 0 for current) */
  precipitationProbability: number;
  /** UV index (0–11+) */
  uvIndex: number;
  /** km/h (current only; 0 for hourly) */
  windKmh: number;
}

export interface Forecast {
  location: Coordinates;
  /** ms epoch when this forecast was fetched */
  fetchedAt: number;
  current: WeatherSnapshot;
  /** Up to 72 hourly entries (3 days). Sorted by time ascending. */
  hourly: WeatherSnapshot[];
}

export type SuitabilityRating = "good" | "fair" | "poor";

export interface Suitability {
  rating: SuitabilityRating;
  reason: string;
}

export interface WeatherContextValue {
  location: ResolvedLocation | null;
  forecast: Forecast | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export type { LocationType };
