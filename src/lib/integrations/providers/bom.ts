import type { PlaceIndexEntry } from "../../types";
import type {
  EnrichmentProvider,
  LocationEnrichment,
  DayForecast,
} from "../enrichment-types";
import { haversineKm } from "../enrichment-types";

// ── BOM product IDs ──────────────────────────────────────────

// Victoria 7-day city/town forecasts (precis format with temps)
const PRECIS_FORECAST_URL =
  "ftp://ftp.bom.gov.au/anon/gen/fwo/IDV10450.xml";

// ── Known BOM forecast locations with coordinates ────────────
// These are the "location" type areas in IDV10450.xml

interface BomStation {
  aac: string;
  name: string;
  lat: number;
  lng: number;
}

const BOM_STATIONS: BomStation[] = [
  { aac: "VIC_PT042", name: "Melbourne", lat: -37.8136, lng: 144.9631 },
  { aac: "VIC_PT090", name: "Geelong", lat: -38.1499, lng: 144.3617 },
  { aac: "VIC_PT036", name: "Ballarat", lat: -37.5622, lng: 143.8503 },
  { aac: "VIC_PT012", name: "Bendigo", lat: -36.758, lng: 144.2802 },
  { aac: "VIC_PT075", name: "Traralgon", lat: -38.1954, lng: 146.5343 },
  { aac: "VIC_PT108", name: "Mildura", lat: -34.1855, lng: 142.1625 },
  { aac: "VIC_PT199", name: "Warrnambool", lat: -38.3818, lng: 142.4842 },
  { aac: "VIC_PT122", name: "Wodonga", lat: -36.1218, lng: 146.8882 },
  { aac: "VIC_PT001", name: "Wangaratta", lat: -36.3576, lng: 146.3115 },
  { aac: "VIC_PT082", name: "Shepparton", lat: -36.3833, lng: 145.3988 },
  { aac: "VIC_PT168", name: "Seymour", lat: -37.0266, lng: 145.1386 },
  { aac: "VIC_PT085", name: "Sale", lat: -38.1, lng: 147.0667 },
  { aac: "VIC_PT240", name: "Colac", lat: -38.3397, lng: 143.5848 },
  { aac: "VIC_PT245", name: "Wonthaggi", lat: -38.6057, lng: 145.5913 },
];

// ── XML parsing (lightweight, no deps) ───────────────────────

interface ForecastArea {
  aac: string;
  description: string;
  type: string; // "location", "metropolitan", "coast"
  periods: ForecastPeriod[];
}

interface ForecastPeriod {
  index: number;
  startDate: string; // ISO date portion
  texts: Record<string, string>; // type → text content
  elements: Record<string, string>; // type → value
}

/**
 * Minimal XML parser for BOM forecast products.
 * Avoids pulling in a full XML library for this simple, predictable structure.
 */
export function parseBomForecastXml(xml: string): ForecastArea[] {
  const areas: ForecastArea[] = [];

  // Match each <area> block
  const areaRegex =
    /<area\s+aac="([^"]*)"[^>]*description="([^"]*)"[^>]*type="([^"]*)"[^>]*>([\s\S]*?)<\/area>/g;
  let areaMatch;

  while ((areaMatch = areaRegex.exec(xml)) !== null) {
    const [, aac, description, type, content] = areaMatch;
    const periods: ForecastPeriod[] = [];

    // Match each <forecast-period> within this area
    const periodRegex =
      /<forecast-period\s+index="(\d+)"[^>]*start-time-local="([^"]*)"[^>]*>([\s\S]*?)<\/forecast-period>/g;
    let periodMatch;

    while ((periodMatch = periodRegex.exec(content)) !== null) {
      const [, indexStr, startTime, periodContent] = periodMatch;
      const texts: Record<string, string> = {};
      const elements: Record<string, string> = {};

      // Extract <text type="...">...</text>
      const textRegex = /<text\s+type="([^"]*)">([\s\S]*?)<\/text>/g;
      let textMatch;
      while ((textMatch = textRegex.exec(periodContent)) !== null) {
        texts[textMatch[1]] = textMatch[2].trim();
      }

      // Extract <element type="..." ...>value</element>
      const elRegex =
        /<element\s+type="([^"]*)"[^>]*>([\s\S]*?)<\/element>/g;
      let elMatch;
      while ((elMatch = elRegex.exec(periodContent)) !== null) {
        elements[elMatch[1]] = elMatch[2].trim();
      }

      periods.push({
        index: parseInt(indexStr, 10),
        startDate: startTime.slice(0, 10), // "2026-04-15"
        texts,
        elements,
      });
    }

    if (periods.length > 0) {
      areas.push({ aac, description, type, periods });
    }
  }

  return areas;
}

// ── Match locations to nearest BOM station ───────────────────

function findNearestStation(
  lat: number,
  lng: number
): BomStation | null {
  let nearest: BomStation | null = null;
  let minDist = Infinity;

  for (const station of BOM_STATIONS) {
    const dist = haversineKm(
      { lat, lng },
      { lat: station.lat, lng: station.lng }
    );
    if (dist < minDist) {
      minDist = dist;
      nearest = station;
    }
  }

  // Only match if within 100km
  return minDist <= 100 ? nearest : null;
}

// ── Provider ─────────────────────────────────────────────────

export const bomProvider: EnrichmentProvider = {
  name: "bom",

  async enrich(
    locations: PlaceIndexEntry[]
  ): Promise<LocationEnrichment[]> {
    let xml: string;
    try {
      // BOM FTP is accessible via HTTP proxy on some setups,
      // but the canonical URL is FTP. We try the direct HTTP URL first.
      const res = await fetch(
        "https://reg.bom.gov.au/fwo/IDV10450.xml",
        { signal: AbortSignal.timeout(15_000) }
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      xml = await res.text();
    } catch {
      // Fallback: try FTP via curl (build-time only, not browser)
      try {
        const { spawnSync } = await import("child_process");
        const result = spawnSync(
          "curl",
          ["-s", "--max-time", "15", PRECIS_FORECAST_URL],
          { encoding: "utf-8" }
        );
        if (result.status !== 0 || !result.stdout) {
          throw new Error(`curl exited with ${result.status}`);
        }
        xml = result.stdout;
      } catch {
        console.warn(
          "  ⚠  Could not fetch BOM forecast (both HTTP and FTP failed)"
        );
        return [];
      }
    }

    const areas = parseBomForecastXml(xml);

    // Build lookup: aac → periods
    const aacToPeriods = new Map<string, ForecastPeriod[]>();
    for (const area of areas) {
      if (area.type === "location") {
        aacToPeriods.set(area.aac, area.periods);
      }
    }

    const enrichments: LocationEnrichment[] = [];

    for (const loc of locations) {
      const station = findNearestStation(
        loc.coordinates.lat,
        loc.coordinates.lng
      );
      if (!station) continue;

      const periods = aacToPeriods.get(station.aac);
      if (!periods || periods.length === 0) continue;

      const forecast: DayForecast[] = periods.map((p) => ({
        date: p.startDate,
        precis: p.texts.precis ?? "",
        forecast: p.texts.forecast,
        min: p.elements.air_temperature_minimum
          ? parseInt(p.elements.air_temperature_minimum, 10)
          : undefined,
        max: p.elements.air_temperature_maximum
          ? parseInt(p.elements.air_temperature_maximum, 10)
          : undefined,
        precipitation: p.texts.probability_of_precipitation,
        fireDanger: p.texts.fire_danger,
        uvAlert: p.texts.uv_alert,
      }));

      enrichments.push({
        slug: loc.slug,
        forecast,
        forecastArea: station.name,
      });
    }

    return enrichments;
  },
};
