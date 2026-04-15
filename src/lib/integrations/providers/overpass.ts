import type { PlaceIndexEntry, PlaceType } from "../../types";
import type {
  EnrichmentProvider,
  LocationEnrichment,
} from "../enrichment-types";
import type { OpeningHoursEntry, DayOfWeek } from "../../types";

// Place types where opening hours are meaningful — natural features,
// public playgrounds, beaches etc. don't have hours, and any "nearby hours"
// found in OSM almost always belong to a different venue.
const OPENING_HOURS_ELIGIBLE_TYPES: ReadonlySet<PlaceType> = new Set([
  "eatery",
  "event",
  "museum",
]);

// Jaccard-similarity threshold for matching an OSM element's `name` tag
// to the location's name. Below this, we reject the opening_hours match.
const NAME_MATCH_THRESHOLD = 0.4;

const STOPWORDS = new Set([
  "the", "a", "an", "of", "and", "&", "at", "in", "on",
  "melbourne", "vic", "australia",
]);

function nameTokens(name: string): Set<string> {
  return new Set(
    name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !STOPWORDS.has(t))
  );
}

function nameSimilarity(a: string, b: string): number {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let intersect = 0;
  for (const t of ta) if (tb.has(t)) intersect++;
  const union = ta.size + tb.size - intersect;
  return union === 0 ? 0 : intersect / union;
}

// ── Configuration ────────────────────────────────────────────

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const SEARCH_RADIUS_M = 200; // metres around each location
const TIMEOUT_S = 25;

// Batch locations into a single Overpass query to reduce API calls.
// Overpass has a 2-slot rate limit, so we send one big query.
const MAX_BATCH_SIZE = 25;
const INTER_BATCH_DELAY_MS = 6000;
const MAX_RETRIES = 3;

// ── OSM → app mappings ──────────────────────────────────────

const AMENITY_TO_FACILITY: Record<string, string> = {
  toilets: "restrooms",
  drinking_water: "drinking-water",
  parking: "parking",
  bbq: "barbecues",
  shower: "showers",
  bench: "seating",
  waste_basket: "bins",
  recycling: "recycling",
  bicycle_parking: "bike-parking",
  shelter: "shelter",
  picnic_table: "picnic-tables",
  playground: "playground",
};

const LEISURE_TO_FACILITY: Record<string, string> = {
  picnic_table: "picnic-tables",
  playground: "playground",
  swimming_pool: "pool",
  firepit: "fire-pit",
};

// ── OSM opening_hours parser (simplified) ────────────────────

const DAY_MAP: Record<string, DayOfWeek> = {
  Mo: "mon",
  Tu: "tue",
  We: "wed",
  Th: "thu",
  Fr: "fri",
  Sa: "sat",
  Su: "sun",
};

/**
 * Parse a simplified subset of OSM opening_hours format.
 * Handles: "Mo-Fr 09:00-17:00; Sa 10:00-16:00" style strings.
 * Returns null if the format is too complex to parse.
 */
export function parseOsmOpeningHours(
  raw: string
): OpeningHoursEntry[] | null {
  if (!raw || raw === "24/7") return null;

  // Remove comments in parentheses, trim
  const cleaned = raw.replace(/\([^)]*\)/g, "").trim();
  const rules = cleaned.split(";").map((s) => s.trim()).filter(Boolean);
  const entries: OpeningHoursEntry[] = [];

  for (const rule of rules) {
    // Skip "off", "closed", PH, etc.
    if (/off|closed|PH/i.test(rule)) continue;

    // Match pattern: "Mo-Fr 09:00-17:00" or "Sa,Su 10:00-16:00"
    const match = rule.match(
      /^([A-Za-z, -]+)\s+(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})$/
    );
    if (!match) continue;

    const [, dayPart, open, close] = match;
    const days = parseDayRange(dayPart);
    if (days.length === 0) continue;

    entries.push({ days, open, close });
  }

  return entries.length > 0 ? entries : null;
}

function parseDayRange(dayPart: string): DayOfWeek[] {
  const ALL_DAYS: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  const ALL_DAY_ABBRS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  const days: DayOfWeek[] = [];

  for (const segment of dayPart.split(",")) {
    const trimmed = segment.trim();
    const rangeMatch = trimmed.match(/^(\w{2})-(\w{2})$/);
    if (rangeMatch) {
      const start = ALL_DAY_ABBRS.indexOf(rangeMatch[1]);
      const end = ALL_DAY_ABBRS.indexOf(rangeMatch[2]);
      if (start === -1 || end === -1) continue;
      for (let i = start; i <= end; i++) {
        days.push(ALL_DAYS[i]);
      }
    } else if (DAY_MAP[trimmed]) {
      days.push(DAY_MAP[trimmed]);
    }
  }

  return days;
}

// ── Overpass query builder ───────────────────────────────────

function buildQuery(locations: PlaceIndexEntry[]): string {
  const arounds = locations
    .map(
      (loc) =>
        `node["amenity"](around:${SEARCH_RADIUS_M},${loc.coordinates.lat},${loc.coordinates.lng});` +
        `node["leisure"](around:${SEARCH_RADIUS_M},${loc.coordinates.lat},${loc.coordinates.lng});` +
        `way["opening_hours"](around:${SEARCH_RADIUS_M},${loc.coordinates.lat},${loc.coordinates.lng});` +
        `node["opening_hours"](around:${SEARCH_RADIUS_M},${loc.coordinates.lat},${loc.coordinates.lng});`
    )
    .join("");

  return `[out:json][timeout:${TIMEOUT_S}];(${arounds});out center tags;`;
}

// ── Provider ─────────────────────────────────────────────────

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export const overpassProvider: EnrichmentProvider = {
  name: "overpass",

  async enrich(locations: PlaceIndexEntry[]): Promise<LocationEnrichment[]> {
    const enrichments: LocationEnrichment[] = [];

    // Process in batches
    for (let i = 0; i < locations.length; i += MAX_BATCH_SIZE) {
      const batch = locations.slice(i, i + MAX_BATCH_SIZE);
      const query = buildQuery(batch);

      const batchNum = i / MAX_BATCH_SIZE + 1;
      let elements: OsmElement[] = [];
      let success = false;

      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
          const res = await fetch(OVERPASS_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `data=${encodeURIComponent(query)}`,
            signal: AbortSignal.timeout(30_000),
          });

          if (res.status === 429 || res.status === 504) {
            const backoff = 10_000 * attempt;
            console.warn(
              `  ⚠  Overpass ${res.status} for batch ${batchNum}, retry ${attempt}/${MAX_RETRIES} after ${backoff / 1000}s`
            );
            await new Promise((r) => setTimeout(r, backoff));
            continue;
          }

          if (!res.ok) {
            console.warn(
              `  ⚠  Overpass returned ${res.status} for batch ${batchNum}`
            );
            break;
          }

          const json = (await res.json()) as { elements: OsmElement[] };
          elements = json.elements ?? [];
          success = true;
          break;
        } catch (err) {
          console.warn(
            `  ⚠  Overpass request failed for batch ${batchNum} (attempt ${attempt}):`,
            err
          );
          if (attempt < MAX_RETRIES) {
            await new Promise((r) => setTimeout(r, 5000 * attempt));
          }
        }
      }

      if (!success) {
        console.warn(`  ⚠  Batch ${batchNum} gave up after ${MAX_RETRIES} attempts`);
        continue;
      }

      // Assign each OSM element to the nearest location in this batch
      for (const loc of batch) {
        const nearby = elements.filter((el) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;
          if (elLat == null || elLon == null) return false;
          // Quick bounding-box check (~200m ≈ 0.002°)
          return (
            Math.abs(elLat - loc.coordinates.lat) < 0.003 &&
            Math.abs(elLon - loc.coordinates.lng) < 0.003
          );
        });

        if (nearby.length === 0) continue;

        const facilities = new Set<string>();
        let openingHours: OpeningHoursEntry[] | null = null;

        const hoursEligible = OPENING_HOURS_ELIGIBLE_TYPES.has(loc.type);
        let bestHoursMatch: { similarity: number; hours: OpeningHoursEntry[] } | null = null;

        for (const el of nearby) {
          const tags = el.tags ?? {};

          if (tags.amenity && AMENITY_TO_FACILITY[tags.amenity]) {
            facilities.add(AMENITY_TO_FACILITY[tags.amenity]);
          }

          if (tags.leisure && LEISURE_TO_FACILITY[tags.leisure]) {
            facilities.add(LEISURE_TO_FACILITY[tags.leisure]);
          }

          if (hoursEligible && tags.opening_hours && tags.name) {
            const similarity = nameSimilarity(loc.name, tags.name);
            if (
              similarity >= NAME_MATCH_THRESHOLD &&
              (!bestHoursMatch || similarity > bestHoursMatch.similarity)
            ) {
              const parsed = parseOsmOpeningHours(tags.opening_hours);
              if (parsed) bestHoursMatch = { similarity, hours: parsed };
            }
          }
        }

        if (bestHoursMatch) openingHours = bestHoursMatch.hours;

        const enrichment: LocationEnrichment = { slug: loc.slug };
        if (facilities.size > 0) {
          enrichment.facilities = [...facilities].sort();
        }
        if (openingHours) {
          enrichment.openingHours = openingHours;
        }

        if (enrichment.facilities || enrichment.openingHours) {
          enrichments.push(enrichment);
        }
      }

      if (i + MAX_BATCH_SIZE < locations.length) {
        await new Promise((r) => setTimeout(r, INTER_BATCH_DELAY_MS));
      }
    }

    return enrichments;
  },
};
