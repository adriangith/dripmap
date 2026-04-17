import type { PlaceIndexEntry, PlaceType } from "../../types";
import type {
  EnrichmentProvider,
  LocationEnrichment,
  FoursquarePhoto,
} from "../enrichment-types";

// ── Configuration ────────────────────────────────────────────

const FSQ_BASE = "https://api.foursquare.com/v3";
const INTER_REQUEST_DELAY_MS = 200;
const MAX_RETRIES = 3;
const PHOTOS_LIMIT = 3;
const TIPS_LIMIT = 3;

// Place types eligible for Foursquare matching — skip natural features,
// walks, cycling routes, etc. that won't have Foursquare venues.
const ELIGIBLE_TYPES: ReadonlySet<PlaceType> = new Set([
  "eatery",
  "museum",
  "event",
  "pool",
]);

// ── API helpers ──────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.FOURSQUARE_API_KEY;
  if (!key) {
    throw new Error(
      "FOURSQUARE_API_KEY environment variable is not set. " +
        "Get a free API key at https://foursquare.com/developers"
    );
  }
  return key;
}

async function fsqFetch<T>(
  path: string,
  apiKey: string
): Promise<T | null> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(`${FSQ_BASE}${path}`, {
        headers: {
          Authorization: apiKey,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 429) {
        const backoff = 5_000 * attempt;
        console.warn(
          `  ⚠  Foursquare 429 rate-limited, retry ${attempt}/${MAX_RETRIES} after ${backoff / 1000}s`
        );
        await delay(backoff);
        continue;
      }

      if (res.status === 404) return null;

      if (!res.ok) {
        console.warn(`  ⚠  Foursquare ${res.status} for ${path}`);
        return null;
      }

      return (await res.json()) as T;
    } catch (err) {
      console.warn(
        `  ⚠  Foursquare request failed for ${path} (attempt ${attempt}):`,
        err
      );
      if (attempt < MAX_RETRIES) {
        await delay(3_000 * attempt);
      }
    }
  }

  return null;
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// ── Foursquare API response types ────────────────────────────

interface FsqMatchResponse {
  place?: { fsq_id: string };
}

interface FsqPlaceDetails {
  fsq_id: string;
  rating?: number;
  price?: number;
  popularity?: number;
  website?: string;
  hours?: {
    regular?: {
      day: number;
      open: string;
      close: string;
    }[];
  };
}

interface FsqPhoto {
  prefix: string;
  suffix: string;
  width: number;
  height: number;
}

interface FsqTip {
  text: string;
}

// ── Provider ─────────────────────────────────────────────────

export const foursquareProvider: EnrichmentProvider = {
  name: "foursquare",

  async enrich(locations: PlaceIndexEntry[]): Promise<LocationEnrichment[]> {
    const apiKey = getApiKey();
    const eligible = locations.filter((loc) => ELIGIBLE_TYPES.has(loc.type));

    if (eligible.length === 0) {
      console.log("  ℹ  No eligible locations for Foursquare enrichment.");
      return [];
    }

    console.log(
      `  ℹ  ${eligible.length}/${locations.length} locations eligible for Foursquare`
    );

    const enrichments: LocationEnrichment[] = [];

    for (const loc of eligible) {
      const enrichment = await enrichLocation(loc, apiKey);
      if (enrichment) {
        enrichments.push(enrichment);
      }
      await delay(INTER_REQUEST_DELAY_MS);
    }

    return enrichments;
  },
};

async function enrichLocation(
  loc: PlaceIndexEntry,
  apiKey: string
): Promise<LocationEnrichment | null> {
  // Step 1: Match location to Foursquare Place ID
  const ll = `${loc.coordinates.lat},${loc.coordinates.lng}`;
  const matchParams = new URLSearchParams({
    name: loc.name,
    ll,
  });

  const matchResult = await fsqFetch<FsqMatchResponse>(
    `/places/match?${matchParams}`,
    apiKey
  );

  const fsqId = matchResult?.place?.fsq_id;
  if (!fsqId) return null;

  // Step 2: Fetch details
  const detailFields = [
    "rating",
    "price",
    "popularity",
    "website",
    "hours",
  ].join(",");

  const details = await fsqFetch<FsqPlaceDetails>(
    `/places/${fsqId}?fields=${detailFields}`,
    apiKey
  );

  const enrichment: LocationEnrichment = { slug: loc.slug, fsqId };

  if (details) {
    if (details.rating != null) enrichment.fsqRating = details.rating;
    if (details.price != null) enrichment.fsqPrice = details.price;
    if (details.popularity != null) enrichment.fsqPopularity = details.popularity;
    if (details.website) enrichment.fsqWebsite = details.website;
  }

  // Step 3: Fetch photos
  const photos = await fsqFetch<FsqPhoto[]>(
    `/places/${fsqId}/photos?limit=${PHOTOS_LIMIT}`,
    apiKey
  );

  if (photos && photos.length > 0) {
    enrichment.fsqPhotos = photos.map(
      (p): FoursquarePhoto => ({
        url: `${p.prefix}original${p.suffix}`,
        width: p.width,
        height: p.height,
      })
    );
  }

  // Step 4: Fetch tips
  const tips = await fsqFetch<FsqTip[]>(
    `/places/${fsqId}/tips?limit=${TIPS_LIMIT}`,
    apiKey
  );

  if (tips && tips.length > 0) {
    enrichment.fsqTips = tips.map((t) => t.text);
  }

  console.log(`  ✓ Matched "${loc.name}" → ${fsqId}`);
  return enrichment;
}
