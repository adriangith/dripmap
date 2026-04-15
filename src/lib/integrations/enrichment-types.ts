import type { Coordinates, OpeningHoursEntry, PlaceIndexEntry } from "../types";

// ── Location enrichment (overlay on existing YAML data) ──────

/** Weather forecast for a single day */
export interface DayForecast {
  date: string; // ISO date
  precis: string; // e.g. "Partly cloudy."
  forecast?: string; // longer description
  min?: number; // °C
  max?: number; // °C
  precipitation?: string; // e.g. "40%"
  fireDanger?: string; // e.g. "Moderate"
  uvAlert?: string; // e.g. "Sun protection 10:00am to 2:40pm"
}

/** Enrichment data for a single location */
export interface LocationEnrichment {
  slug: string;
  /** Facilities discovered from OSM */
  facilities?: string[];
  /** Opening hours discovered from OSM */
  openingHours?: OpeningHoursEntry[];
  /** 7-day weather forecast from BOM */
  forecast?: DayForecast[];
  /** Active weather/fire warnings */
  warnings?: string[];
  /** Forecast area name matched by BOM */
  forecastArea?: string;
}

/** All enrichments keyed by slug for fast lookup */
export type EnrichmentIndex = Record<string, LocationEnrichment>;

// ── Provider interface ───────────────────────────────────────

export interface EnrichmentProvider {
  /** Short name for logging */
  name: string;
  /** Enrich a set of locations, returning partial enrichment data for each */
  enrich(locations: PlaceIndexEntry[]): Promise<LocationEnrichment[]>;
}

// ── Merge helper ─────────────────────────────────────────────

/**
 * Merge enrichment arrays from multiple providers into a single index.
 * Later values overwrite earlier ones per-field (not per-slug).
 */
export function mergeEnrichments(
  ...batches: LocationEnrichment[][]
): EnrichmentIndex {
  const index: EnrichmentIndex = {};

  for (const batch of batches) {
    for (const enrichment of batch) {
      const existing = index[enrichment.slug];
      if (existing) {
        // Merge fields — later provider wins per-field
        if (enrichment.facilities) existing.facilities = enrichment.facilities;
        if (enrichment.openingHours)
          existing.openingHours = enrichment.openingHours;
        if (enrichment.forecast) existing.forecast = enrichment.forecast;
        if (enrichment.warnings) existing.warnings = enrichment.warnings;
        if (enrichment.forecastArea)
          existing.forecastArea = enrichment.forecastArea;
      } else {
        index[enrichment.slug] = { ...enrichment };
      }
    }
  }

  return index;
}

// ── Coordinate helpers ───────────────────────────────────────

/** Haversine distance in km */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng *
      sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
