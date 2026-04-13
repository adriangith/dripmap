# Drift Phase 1: Schema, Data Pipeline, Rebrand & Category Filtering

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform dripmap into Drift — rebrand the app, migrate to a discriminated-union schema supporting multiple activity types, update the data pipeline, add category filtering with per-type pin icons, and add sample beach + event entries to prove the schema works end-to-end.

**Architecture:** The existing flat `Location` type becomes a discriminated union keyed on `type`. Shared core fields stay at the top level; type-specific fields move into a `details` block. The validator and build scripts become type-aware. The frontend FilterBar and TypeBadge are updated for the expanded type set. YAML files are reorganised into subdirectories by type. The `LocationIndexEntry` gains new fields (`cost`, `highlights`, `region`) needed for upcoming constraint-based filtering.

**Tech Stack:** TypeScript, Next.js 16, Vitest, YAML (js-yaml), Leaflet, Tailwind CSS 4

**Scope note:** This plan covers schema + pipeline + rebrand + category UI. The constraint-based discovery UX (context bar, weather API, date filtering, group chips) is a separate Phase 2 plan.

---

### Task 1: Update type definitions (`src/lib/types.ts`)

**Files:**
- Modify: `src/lib/types.ts`
- Test: `__tests__/lib/types.test.ts` (new)

The type system is the foundation — everything else depends on these definitions.

- [ ] **Step 1: Write failing test for new type definitions**

Create `__tests__/lib/types.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import type {
  PlaceType,
  Place,
  SwimDetails,
  BeachDetails,
  EventDetails,
  PlaceIndexEntry,
  Recurrence,
} from "../../src/lib/types";

describe("type definitions", () => {
  it("allows constructing a swim Place", () => {
    const place: Place = {
      slug: "test-falls",
      name: "Test Falls",
      type: "swim",
      coordinates: { lat: -37.8, lng: 144.9 },
      region: "Victoria, Australia",
      country: "AU",
      description: "A test swim spot.",
      photos: [{ url: "/images/test.jpg", alt: "Test" }],
      highlights: ["Crystal clear water"],
      cost: "free",
      ageSuitability: { minAge: null, ideal: ["toddlers", "primary", "teens", "adults"] },
      accessibility: "easy",
      parking: "available",
      facilities: ["restrooms"],
      bestSeason: ["summer"],
      directions: "Head north.",
      tips: ["Bring sunscreen."],
      tags: ["family-friendly"],
      status: { site: "open", lastVerified: "2026-04-01" },
      details: {
        dangerLevel: "low",
        waterAccess: "open",
        depth: null,
      },
    };
    expect(place.type).toBe("swim");
    expect(place.details.dangerLevel).toBe("low");
  });

  it("allows constructing a beach Place", () => {
    const place: Place = {
      slug: "test-beach",
      name: "Test Beach",
      type: "beach",
      coordinates: { lat: -38.3, lng: 144.6 },
      region: "Victoria, Australia",
      country: "AU",
      description: "Rock pools and cliff jumping.",
      photos: [],
      highlights: ["Cliff jumping", "Rock pools"],
      cost: "free",
      ageSuitability: { minAge: 8, ideal: ["teens", "adults"] },
      accessibility: "moderate",
      parking: "limited",
      facilities: [],
      bestSeason: ["summer"],
      directions: "Drive south.",
      tips: [],
      tags: ["adventure"],
      status: { site: "open", lastVerified: "2026-04-01" },
      details: {
        beachType: "rock-pools",
        patrolled: { seasonal: true, months: ["dec", "jan", "feb"], hours: "9am-5pm" },
        dogPolicy: "prohibited",
        waveExposure: "exposed",
        waterHazards: ["rips", "rocks"],
        crowdLevel: "moderate",
      },
    };
    expect(place.type).toBe("beach");
    expect(place.details.beachType).toBe("rock-pools");
  });

  it("allows constructing an event Place", () => {
    const recurrence: Recurrence = { type: "weekly", days: ["wed"], season: "summer" };
    const place: Place = {
      slug: "night-market",
      name: "Night Market",
      type: "event",
      coordinates: { lat: -37.8, lng: 144.9 },
      region: "Victoria, Australia",
      country: "AU",
      description: "Weekly summer night market.",
      photos: [],
      highlights: ["Street food", "Live music"],
      cost: "$",
      ageSuitability: { minAge: null, ideal: ["toddlers", "primary", "teens", "adults"] },
      accessibility: "wheelchair-accessible",
      parking: "street",
      facilities: ["restrooms", "food"],
      bestSeason: ["summer"],
      directions: "Central Melbourne.",
      tips: [],
      tags: ["market", "food"],
      status: { site: "open", lastVerified: "2026-04-01" },
      details: {
        recurrence,
        confirmedDates: null,
        venue: "Queen Victoria Market",
        venueType: "outdoor",
        bookingRequired: false,
        bookingUrl: null,
        organiser: "City of Melbourne",
        organiserUrl: null,
      },
    };
    expect(place.type).toBe("event");
    expect(place.details.recurrence.type).toBe("weekly");
  });

  it("allows constructing a PlaceIndexEntry with new fields", () => {
    const entry: PlaceIndexEntry = {
      slug: "test-beach",
      name: "Test Beach",
      type: "beach",
      coordinates: { lat: -38.3, lng: 144.6 },
      region: "Victoria, Australia",
      country: "AU",
      cost: "free",
      highlights: ["Cliff jumping"],
      status: { site: "open", lastVerified: "2026-04-01" },
      tags: ["adventure"],
    };
    expect(entry.cost).toBe("free");
    expect(entry.highlights).toEqual(["Cliff jumping"]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run __tests__/lib/types.test.ts`
Expected: FAIL — cannot resolve imports (types don't exist yet)

- [ ] **Step 3: Implement new type definitions**

Replace the contents of `src/lib/types.ts` with:

```typescript
// ── Shared enums ──────────────────────────────────────────────

export type PlaceType =
  | "swim"
  | "beach"
  | "event"
  | "bushwalk"
  | "lookout"
  | "waterfall"
  | "cave"
  | "wildlife"
  | "pool"
  | "cycling"
  | "fishing";

export type CostLevel = "free" | "$" | "$$" | "$$$";

export type SiteStatus = "open" | "closed" | "seasonal" | "unknown";

export type Season = "spring" | "summer" | "fall" | "winter";

// ── Shared value objects ──────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Photo {
  url: string;
  alt: string;
  credit?: string;
}

export interface AgeSuitability {
  minAge: number | null;
  ideal: string[];
}

export interface PlaceStatus {
  site: SiteStatus;
  lastVerified: string;
  note?: string;
}

// ── Type-specific details ─────────────────────────────────────

export interface SwimDetails {
  dangerLevel: "low" | "moderate" | "high" | "extreme";
  waterAccess: "open" | "closed" | "seasonal" | "restricted" | "unknown";
  depth: string | null;
}

export interface BeachDetails {
  beachType: "surf" | "bay" | "rock-pools" | "river" | "estuary";
  patrolled: { seasonal: boolean; months: string[]; hours: string | null };
  dogPolicy: "allowed" | "seasonal-offleash" | "prohibited";
  waveExposure: "sheltered" | "moderate" | "exposed";
  waterHazards: string[];
  crowdLevel: "quiet" | "moderate" | "busy";
}

export type Recurrence =
  | { type: "once"; date: string; startTime?: string; endTime?: string }
  | { type: "range"; startDate: string; endDate: string; days?: string[]; startTime?: string; endTime?: string }
  | { type: "weekly"; days: string[]; season?: string; startTime?: string; endTime?: string }
  | { type: "annual"; month: number; typicalWeek?: number; duration?: string };

export interface EventDetails {
  recurrence: Recurrence;
  confirmedDates: { year: number; startDate: string; endDate: string } | null;
  venue: string;
  venueType: "outdoor" | "indoor" | "mixed";
  bookingRequired: boolean;
  bookingUrl: string | null;
  organiser: string;
  organiserUrl: string | null;
}

// ── Discriminated union ───────────────────────────────────────

interface PlaceBase {
  slug: string;
  name: string;
  coordinates: Coordinates;
  region: string;
  country: string;
  description: string;
  photos: Photo[];
  highlights: string[];
  cost: CostLevel;
  ageSuitability: AgeSuitability;
  accessibility: string;
  parking: string;
  facilities: string[];
  bestSeason: Season[];
  directions: string;
  tips: string[];
  tags: string[];
  status: PlaceStatus;
}

export interface SwimPlace extends PlaceBase {
  type: "swim";
  details: SwimDetails;
}

export interface BeachPlace extends PlaceBase {
  type: "beach";
  details: BeachDetails;
}

export interface EventPlace extends PlaceBase {
  type: "event";
  details: EventDetails;
}

export type Place = SwimPlace | BeachPlace | EventPlace;

// ── Index entry (lightweight, used in list/map) ───────────────

export interface PlaceIndexEntry {
  slug: string;
  name: string;
  type: PlaceType;
  coordinates: Coordinates;
  region: string;
  country: string;
  cost: CostLevel;
  highlights: string[];
  status: PlaceStatus;
  tags: string[];
}

// ── Filters (updated for new types) ──────────────────────────

export interface Filters {
  type: PlaceType | null;
  siteStatus: SiteStatus | null;
  search: string;
}

// ── Legacy re-exports for migration ──────────────────────────
// These aliases keep existing code compiling during the transition.
// Remove once all consumers are migrated.

/** @deprecated Use PlaceType */
export type LocationType = PlaceType;
/** @deprecated Use Place */
export type Location = Place;
/** @deprecated Use PlaceIndexEntry */
export type LocationIndexEntry = PlaceIndexEntry;
/** @deprecated Use PlaceStatus */
export type LocationStatus = PlaceStatus;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run __tests__/lib/types.test.ts`
Expected: PASS

- [ ] **Step 5: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: Existing tests should still pass due to the legacy re-exports. Some tests that reference removed types (`AccessibilityLevel`, `ParkingType`, `DangerLevel`, `CostType`, `WaterAccessStatus`, `PracticalInfo`, `Filters.accessibility`, `Filters.season`, `Filters.cost`) may fail — note these for Task 2.

- [ ] **Step 6: Commit**

```bash
git add src/lib/types.ts __tests__/lib/types.test.ts
git commit -m "feat: add discriminated-union Place types for multi-category support"
```

---

### Task 2: Update filters to work with new types

**Files:**
- Modify: `src/lib/filters.ts`
- Modify: `__tests__/lib/filters.test.ts`

- [ ] **Step 1: Update test file for new types**

Replace `__tests__/lib/filters.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { filterLocations } from "../../src/lib/filters";
import type { PlaceIndexEntry, Filters } from "../../src/lib/types";

const emptyFilters: Filters = {
  type: null,
  siteStatus: null,
  search: "",
};

const locations: PlaceIndexEntry[] = [
  {
    slug: "niagara-falls",
    name: "Niagara Falls",
    type: "swim",
    coordinates: { lat: 43.0, lng: -79.0 },
    region: "North America",
    country: "CA",
    cost: "free",
    highlights: ["Massive waterfall"],
    status: { site: "open", lastVerified: "2026-01-01" },
    tags: ["family-friendly", "iconic"],
  },
  {
    slug: "test-beach",
    name: "Test Beach",
    type: "beach",
    coordinates: { lat: -38.3, lng: 144.6 },
    region: "Victoria, Australia",
    country: "AU",
    cost: "free",
    highlights: ["Rock pools"],
    status: { site: "open", lastVerified: "2026-01-01" },
    tags: ["adventure"],
  },
  {
    slug: "night-market",
    name: "Night Market",
    type: "event",
    coordinates: { lat: -37.8, lng: 144.9 },
    region: "Victoria, Australia",
    country: "AU",
    cost: "$",
    highlights: ["Street food"],
    status: { site: "seasonal", lastVerified: "2026-01-01" },
    tags: ["food", "market"],
  },
];

describe("filterLocations", () => {
  it("returns all locations when no filters are active", () => {
    const result = filterLocations(locations, emptyFilters);
    expect(result).toHaveLength(3);
  });

  it("filters by type", () => {
    const result = filterLocations(locations, { ...emptyFilters, type: "beach" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("test-beach");
  });

  it("filters by site status", () => {
    const result = filterLocations(locations, { ...emptyFilters, siteStatus: "seasonal" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("night-market");
  });

  it("searches by name (case-insensitive)", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "night" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("night-market");
  });

  it("searches by region", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "victoria" });
    expect(result).toHaveLength(2);
  });

  it("searches by tag", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "iconic" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("niagara-falls");
  });

  it("searches by highlight", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "rock pools" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("test-beach");
  });

  it("combines type filter with search", () => {
    const result = filterLocations(locations, {
      ...emptyFilters,
      type: "swim",
      search: "niagara",
    });
    expect(result).toHaveLength(1);
  });

  it("returns empty when no match", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "nonexistent" });
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify failures**

Run: `npx vitest run __tests__/lib/filters.test.ts`
Expected: FAIL — `filterLocations` doesn't search `region` or `highlights` yet

- [ ] **Step 3: Update filters implementation**

Replace `src/lib/filters.ts`:

```typescript
import type { PlaceIndexEntry, Filters } from "./types";

export function filterLocations(
  locations: PlaceIndexEntry[],
  filters: Filters
): PlaceIndexEntry[] {
  return locations.filter((loc) => {
    if (filters.type && loc.type !== filters.type) return false;
    if (filters.siteStatus && loc.status.site !== filters.siteStatus) return false;

    if (filters.search) {
      const term = filters.search.toLowerCase();
      const searchable = [
        loc.name,
        loc.region,
        loc.country,
        ...loc.tags,
        ...loc.highlights,
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(term)) return false;
    }

    return true;
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/filters.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/filters.ts __tests__/lib/filters.test.ts
git commit -m "feat: update filters for new PlaceIndexEntry schema with region and highlights search"
```

---

### Task 3: Update validator for discriminated-union schema

**Files:**
- Modify: `scripts/validate-locations.ts`
- Modify: `__tests__/scripts/validate-locations.test.ts`

- [ ] **Step 1: Write failing tests for new validator**

Replace `__tests__/scripts/validate-locations.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { validatePlace } from "../../scripts/validate-locations";

const validSwim = {
  slug: "test-falls",
  name: "Test Falls",
  type: "swim",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  description: "A test swim spot.",
  photos: [{ url: "/images/test.jpg", alt: "Test photo" }],
  highlights: ["Crystal clear water"],
  cost: "free",
  ageSuitability: { minAge: null, ideal: ["adults"] },
  accessibility: "easy",
  parking: "available",
  facilities: ["restrooms"],
  bestSeason: ["summer"],
  directions: "Head north.",
  tips: ["Bring sunscreen."],
  tags: ["family-friendly"],
  status: { site: "open", lastVerified: "2026-04-01" },
  details: {
    dangerLevel: "low",
    waterAccess: "open",
    depth: null,
  },
};

const validBeach = {
  slug: "test-beach",
  name: "Test Beach",
  type: "beach",
  coordinates: { lat: -38.3, lng: 144.6 },
  region: "Victoria, Australia",
  country: "AU",
  description: "Rock pools and cliff jumping.",
  photos: [],
  highlights: ["Cliff jumping", "Rock pools"],
  cost: "free",
  ageSuitability: { minAge: 8, ideal: ["teens", "adults"] },
  accessibility: "moderate",
  parking: "limited",
  facilities: [],
  bestSeason: ["summer"],
  directions: "Drive south.",
  tips: [],
  tags: ["adventure"],
  status: { site: "open", lastVerified: "2026-04-01" },
  details: {
    beachType: "rock-pools",
    patrolled: { seasonal: true, months: ["dec", "jan", "feb"], hours: "9am-5pm" },
    dogPolicy: "prohibited",
    waveExposure: "exposed",
    waterHazards: ["rips"],
    crowdLevel: "moderate",
  },
};

const validEvent = {
  slug: "night-market",
  name: "Night Market",
  type: "event",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  description: "Weekly summer night market.",
  photos: [],
  highlights: ["Street food", "Live music"],
  cost: "$",
  ageSuitability: { minAge: null, ideal: ["adults"] },
  accessibility: "wheelchair-accessible",
  parking: "street",
  facilities: ["restrooms"],
  bestSeason: ["summer"],
  directions: "Central Melbourne.",
  tips: [],
  tags: ["market"],
  status: { site: "open", lastVerified: "2026-04-01" },
  details: {
    recurrence: { type: "weekly", days: ["wed"], season: "summer" },
    confirmedDates: null,
    venue: "Queen Victoria Market",
    venueType: "outdoor",
    bookingRequired: false,
    bookingUrl: null,
    organiser: "City of Melbourne",
    organiserUrl: null,
  },
};

describe("validatePlace", () => {
  it("accepts a valid swim", () => {
    expect(validatePlace(validSwim)).toEqual([]);
  });

  it("accepts a valid beach", () => {
    expect(validatePlace(validBeach)).toEqual([]);
  });

  it("accepts a valid event", () => {
    expect(validatePlace(validEvent)).toEqual([]);
  });

  it("rejects missing required core fields", () => {
    const { slug, ...missing } = validSwim;
    const errors = validatePlace(missing);
    expect(errors).toContainEqual(expect.stringContaining("slug"));
  });

  it("rejects invalid type", () => {
    const errors = validatePlace({ ...validSwim, type: "lake" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("type");
  });

  it("rejects invalid cost", () => {
    const errors = validatePlace({ ...validSwim, cost: "expensive" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("cost");
  });

  it("rejects swim with missing details.dangerLevel", () => {
    const bad = { ...validSwim, details: { ...validSwim.details, dangerLevel: undefined } };
    const errors = validatePlace(bad);
    expect(errors).toContainEqual(expect.stringContaining("dangerLevel"));
  });

  it("rejects beach with missing details.beachType", () => {
    const bad = { ...validBeach, details: { ...validBeach.details, beachType: undefined } };
    const errors = validatePlace(bad);
    expect(errors).toContainEqual(expect.stringContaining("beachType"));
  });

  it("rejects event with missing details.recurrence", () => {
    const bad = { ...validEvent, details: { ...validEvent.details, recurrence: undefined } };
    const errors = validatePlace(bad);
    expect(errors).toContainEqual(expect.stringContaining("recurrence"));
  });

  it("rejects event with invalid recurrence type", () => {
    const bad = {
      ...validEvent,
      details: { ...validEvent.details, recurrence: { type: "biweekly" } },
    };
    const errors = validatePlace(bad);
    expect(errors).toContainEqual(expect.stringContaining("recurrence.type"));
  });

  it("rejects missing highlights with a warning", () => {
    const noHighlights = { ...validSwim, highlights: [] };
    const errors = validatePlace(noHighlights);
    expect(errors).toContainEqual(expect.stringContaining("highlights"));
  });

  it("rejects invalid coordinates", () => {
    const errors = validatePlace({
      ...validSwim,
      coordinates: { lat: 200, lng: 144.9 },
    });
    expect(errors).toContainEqual(expect.stringContaining("lat"));
  });

  it("rejects malformed lastVerified dates", () => {
    const errors = validatePlace({
      ...validSwim,
      status: { ...validSwim.status, lastVerified: "not-a-date" },
    });
    expect(errors).toContainEqual(expect.stringContaining("lastVerified"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/scripts/validate-locations.test.ts`
Expected: FAIL — `validatePlace` doesn't exist yet

- [ ] **Step 3: Implement the new validator**

Replace `scripts/validate-locations.ts`:

```typescript
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const VALID_TYPES = [
  "swim", "beach", "event", "bushwalk", "lookout", "waterfall",
  "cave", "wildlife", "pool", "cycling", "fishing",
];
const VALID_COST = ["free", "$", "$$", "$$$"];
const VALID_SEASONS = ["spring", "summer", "fall", "winter"];
const VALID_SITE_STATUS = ["open", "closed", "seasonal", "unknown"];

// Swim detail enums
const VALID_DANGER = ["low", "moderate", "high", "extreme"];
const VALID_WATER_ACCESS = ["open", "closed", "seasonal", "restricted", "unknown"];

// Beach detail enums
const VALID_BEACH_TYPE = ["surf", "bay", "rock-pools", "river", "estuary"];
const VALID_DOG_POLICY = ["allowed", "seasonal-offleash", "prohibited"];
const VALID_WAVE_EXPOSURE = ["sheltered", "moderate", "exposed"];
const VALID_CROWD_LEVEL = ["quiet", "moderate", "busy"];

// Event detail enums
const VALID_VENUE_TYPE = ["outdoor", "indoor", "mixed"];
const VALID_RECURRENCE_TYPE = ["once", "range", "weekly", "annual"];

function checkEnum(value: unknown, allowed: string[], fieldName: string): string[] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    return [`${fieldName}: must be one of [${allowed.join(", ")}], got "${value}"`];
  }
  return [];
}

function checkArrayEnum(value: unknown, allowed: string[], fieldName: string): string[] {
  if (!Array.isArray(value)) {
    return [`${fieldName}: must be an array`];
  }
  const errors: string[] = [];
  for (const item of value) {
    if (!allowed.includes(item)) {
      errors.push(`${fieldName}: invalid value "${item}", must be one of [${allowed.join(", ")}]`);
    }
  }
  return errors;
}

function validateCoreFields(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  const requiredStrings = ["slug", "name", "region", "country", "description", "directions"];
  for (const field of requiredStrings) {
    if (typeof data[field] !== "string" || (data[field] as string).trim() === "") {
      errors.push(`${field}: required string field is missing or empty`);
    }
  }

  errors.push(...checkEnum(data.type, VALID_TYPES, "type"));
  errors.push(...checkEnum(data.cost, VALID_COST, "cost"));

  const coords = data.coordinates as Record<string, unknown> | undefined;
  if (!coords || typeof coords !== "object") {
    errors.push("coordinates: required object is missing");
  } else {
    if (typeof coords.lat !== "number" || coords.lat < -90 || coords.lat > 90) {
      errors.push("coordinates.lat: must be a number between -90 and 90");
    }
    if (typeof coords.lng !== "number" || coords.lng < -180 || coords.lng > 180) {
      errors.push("coordinates.lng: must be a number between -180 and 180");
    }
  }

  if (!Array.isArray(data.photos)) {
    errors.push("photos: must be an array");
  }

  if (!Array.isArray(data.highlights) || (data.highlights as unknown[]).length === 0) {
    errors.push("highlights: must be a non-empty array (every entry should have at least one highlight)");
  }

  if (!Array.isArray(data.tags)) {
    errors.push("tags: must be an array");
  }

  if (!Array.isArray(data.tips)) {
    errors.push("tips: must be an array");
  }

  errors.push(...checkArrayEnum(data.bestSeason, VALID_SEASONS, "bestSeason"));

  // ageSuitability
  const age = data.ageSuitability as Record<string, unknown> | undefined;
  if (!age || typeof age !== "object") {
    errors.push("ageSuitability: required object is missing");
  } else {
    if (age.minAge !== null && typeof age.minAge !== "number") {
      errors.push("ageSuitability.minAge: must be a number or null");
    }
    if (!Array.isArray(age.ideal)) {
      errors.push("ageSuitability.ideal: must be an array");
    }
  }

  // status
  const status = data.status as Record<string, unknown> | undefined;
  if (!status || typeof status !== "object") {
    errors.push("status: required object is missing");
  } else {
    errors.push(...checkEnum(status.site, VALID_SITE_STATUS, "status.site"));
    if (typeof status.lastVerified !== "string") {
      errors.push("status.lastVerified: required string field is missing");
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(status.lastVerified) || isNaN(Date.parse(status.lastVerified))) {
      errors.push("status.lastVerified: must be a valid YYYY-MM-DD date");
    }
  }

  return errors;
}

function validateSwimDetails(details: Record<string, unknown>): string[] {
  const errors: string[] = [];
  errors.push(...checkEnum(details.dangerLevel, VALID_DANGER, "details.dangerLevel"));
  errors.push(...checkEnum(details.waterAccess, VALID_WATER_ACCESS, "details.waterAccess"));
  return errors;
}

function validateBeachDetails(details: Record<string, unknown>): string[] {
  const errors: string[] = [];
  errors.push(...checkEnum(details.beachType, VALID_BEACH_TYPE, "details.beachType"));
  errors.push(...checkEnum(details.dogPolicy, VALID_DOG_POLICY, "details.dogPolicy"));
  errors.push(...checkEnum(details.waveExposure, VALID_WAVE_EXPOSURE, "details.waveExposure"));
  errors.push(...checkEnum(details.crowdLevel, VALID_CROWD_LEVEL, "details.crowdLevel"));

  const patrolled = details.patrolled as Record<string, unknown> | undefined;
  if (!patrolled || typeof patrolled !== "object") {
    errors.push("details.patrolled: required object is missing");
  }

  if (!Array.isArray(details.waterHazards)) {
    errors.push("details.waterHazards: must be an array");
  }

  return errors;
}

function validateEventDetails(details: Record<string, unknown>): string[] {
  const errors: string[] = [];

  const recurrence = details.recurrence as Record<string, unknown> | undefined;
  if (!recurrence || typeof recurrence !== "object") {
    errors.push("details.recurrence: required object is missing");
  } else {
    errors.push(...checkEnum(recurrence.type, VALID_RECURRENCE_TYPE, "details.recurrence.type"));
  }

  if (typeof details.venue !== "string") {
    errors.push("details.venue: required string field is missing");
  }
  errors.push(...checkEnum(details.venueType, VALID_VENUE_TYPE, "details.venueType"));

  if (typeof details.bookingRequired !== "boolean") {
    errors.push("details.bookingRequired: must be a boolean");
  }

  return errors;
}

export function validatePlace(data: Record<string, unknown>): string[] {
  const errors = validateCoreFields(data);

  const details = data.details as Record<string, unknown> | undefined;
  if (!details || typeof details !== "object") {
    errors.push("details: required object is missing");
    return errors;
  }

  switch (data.type) {
    case "swim":
      errors.push(...validateSwimDetails(details));
      break;
    case "beach":
      errors.push(...validateBeachDetails(details));
      break;
    case "event":
      errors.push(...validateEventDetails(details));
      break;
    // Future types — core validation only for now
  }

  return errors;
}

/** @deprecated Use validatePlace */
export const validateLocation = validatePlace;

// CLI entrypoint: validate all YAML files in data/locations/ (recursively)
if (process.argv[1] === __filename) {
  const locationsDir = path.resolve(process.cwd(), "data/locations");

  if (!fs.existsSync(locationsDir)) {
    console.error(`Error: ${locationsDir} does not exist`);
    process.exit(1);
  }

  function getYamlFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getYamlFiles(fullPath));
      } else if (entry.name.endsWith(".yaml")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const files = getYamlFiles(locationsDir);

  if (files.length === 0) {
    console.warn("Warning: No YAML files found in data/locations/ — nothing to validate.");
    process.exit(0);
  }

  let hasErrors = false;

  for (const filePath of files) {
    const relPath = path.relative(locationsDir, filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    let data: Record<string, unknown>;
    try {
      data = yaml.load(content) as Record<string, unknown>;
    } catch (e) {
      hasErrors = true;
      console.error(`\n❌ ${relPath}: YAML parse error — ${(e as Error).message}`);
      continue;
    }
    const errors = validatePlace(data);

    if (errors.length > 0) {
      hasErrors = true;
      console.error(`\n❌ ${relPath}:`);
      for (const error of errors) {
        console.error(`   - ${error}`);
      }
    } else {
      console.log(`✓ ${relPath}`);
    }
  }

  if (hasErrors) {
    console.error("\nValidation failed.");
    process.exit(1);
  } else {
    console.log("\nAll locations valid.");
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/scripts/validate-locations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-locations.ts __tests__/scripts/validate-locations.test.ts
git commit -m "feat: type-aware validator supporting swim, beach, and event schemas"
```

---

### Task 4: Update build script for new schema and subdirectories

**Files:**
- Modify: `scripts/build-locations.ts`
- Modify: `__tests__/scripts/build-locations.test.ts`

- [ ] **Step 1: Write failing tests for new build functions**

Replace `__tests__/scripts/build-locations.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { buildIndex, buildDetail } from "../../scripts/build-locations";
import type { Place } from "../../src/lib/types";

const sampleSwim: Place = {
  slug: "test-falls",
  name: "Test Falls",
  type: "swim",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  description: "A test swim spot.",
  photos: [{ url: "/images/test.jpg", alt: "Test photo" }],
  highlights: ["Crystal clear water"],
  cost: "free",
  ageSuitability: { minAge: null, ideal: ["adults"] },
  accessibility: "easy",
  parking: "available",
  facilities: ["restrooms"],
  bestSeason: ["summer"],
  directions: "Head north.",
  tips: ["Bring sunscreen."],
  tags: ["family-friendly"],
  status: { site: "open", lastVerified: "2026-04-01" },
  details: {
    dangerLevel: "low",
    waterAccess: "open",
    depth: null,
  },
};

const sampleEvent: Place = {
  slug: "night-market",
  name: "Night Market",
  type: "event",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  description: "Weekly summer night market.",
  photos: [],
  highlights: ["Street food"],
  cost: "$",
  ageSuitability: { minAge: null, ideal: ["adults"] },
  accessibility: "wheelchair-accessible",
  parking: "street",
  facilities: [],
  bestSeason: ["summer"],
  directions: "Central Melbourne.",
  tips: [],
  tags: ["market"],
  status: { site: "open", lastVerified: "2026-04-01" },
  details: {
    recurrence: { type: "weekly", days: ["wed"], season: "summer" },
    confirmedDates: null,
    venue: "Queen Victoria Market",
    venueType: "outdoor",
    bookingRequired: false,
    bookingUrl: null,
    organiser: "City of Melbourne",
    organiserUrl: null,
  },
};

describe("buildIndex", () => {
  it("produces lightweight index entries with new fields", () => {
    const index = buildIndex([sampleSwim]);
    expect(index).toHaveLength(1);
    expect(index[0]).toEqual({
      slug: "test-falls",
      name: "Test Falls",
      type: "swim",
      coordinates: { lat: -37.8, lng: 144.9 },
      region: "Victoria, Australia",
      country: "AU",
      cost: "free",
      highlights: ["Crystal clear water"],
      status: sampleSwim.status,
      tags: ["family-friendly"],
    });
  });

  it("excludes description, photos, details, directions, tips from index", () => {
    const index = buildIndex([sampleSwim]);
    const entry = index[0] as unknown as Record<string, unknown>;
    expect(entry).not.toHaveProperty("description");
    expect(entry).not.toHaveProperty("photos");
    expect(entry).not.toHaveProperty("details");
    expect(entry).not.toHaveProperty("directions");
    expect(entry).not.toHaveProperty("tips");
  });

  it("handles mixed types", () => {
    const index = buildIndex([sampleSwim, sampleEvent]);
    expect(index).toHaveLength(2);
    expect(index[0].type).toBe("swim");
    expect(index[1].type).toBe("event");
  });
});

describe("buildDetail", () => {
  it("returns the full place object", () => {
    const detail = buildDetail(sampleSwim);
    expect(detail).toEqual(sampleSwim);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/scripts/build-locations.test.ts`
Expected: FAIL — `buildIndex` doesn't include `region`, `cost`, `highlights` yet

- [ ] **Step 3: Update build script**

Replace `scripts/build-locations.ts`:

```typescript
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type { Place, PlaceIndexEntry } from "../src/lib/types";

export function buildIndex(places: Place[]): PlaceIndexEntry[] {
  return places.map((p) => ({
    slug: p.slug,
    name: p.name,
    type: p.type,
    coordinates: p.coordinates,
    region: p.region,
    country: p.country,
    cost: p.cost,
    highlights: p.highlights,
    status: p.status,
    tags: p.tags,
  }));
}

export function buildDetail(place: Place): Place {
  return place;
}

function getYamlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getYamlFiles(fullPath));
    } else if (entry.name.endsWith(".yaml")) {
      results.push(fullPath);
    }
  }
  return results;
}

// CLI entrypoint
if (process.argv[1] === __filename) {
  const locationsDir = path.resolve(process.cwd(), "data/locations");
  const outputDir = path.resolve(process.cwd(), "public/generated");
  const detailDir = path.join(outputDir, "locations");

  fs.mkdirSync(detailDir, { recursive: true });

  if (!fs.existsSync(locationsDir)) {
    console.error(`Error: ${locationsDir} does not exist`);
    process.exit(1);
  }

  const files = getYamlFiles(locationsDir);

  if (files.length === 0) {
    console.warn("Warning: No YAML files found in data/locations/ — nothing to build.");
    process.exit(0);
  }

  const places: Place[] = [];

  for (const filePath of files) {
    const relPath = path.relative(locationsDir, filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    let data: Place;
    try {
      data = yaml.load(content) as Place;
    } catch (e) {
      console.error(`Error parsing ${relPath}: ${(e as Error).message}`);
      process.exit(1);
    }

    if (!/^[a-z0-9][a-z0-9-]*$/.test(data.slug)) {
      console.error(`Invalid slug "${data.slug}" in ${relPath}`);
      process.exit(1);
    }

    places.push(data);

    const detail = buildDetail(data);
    fs.writeFileSync(
      path.join(detailDir, `${data.slug}.json`),
      JSON.stringify(detail, null, 2)
    );
    console.log(`  → ${data.slug}.json`);
  }

  const index = buildIndex(places);
  fs.writeFileSync(
    path.join(outputDir, "locations-index.json"),
    JSON.stringify(index, null, 2)
  );

  console.log(`\nBuilt ${places.length} places → public/generated/`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/scripts/build-locations.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/build-locations.ts __tests__/scripts/build-locations.test.ts
git commit -m "feat: update build script for new Place schema with region, cost, highlights in index"
```

---

### Task 5: Migrate existing YAML data to new schema

**Files:**
- Modify: all files in `data/locations/*.yaml` (move to `data/locations/swim/`)

This is a data migration — no tests needed (the validator will catch errors).

- [ ] **Step 1: Create subdirectory structure**

```bash
mkdir -p data/locations/swim data/locations/beach data/locations/event
```

- [ ] **Step 2: Move existing YAML files into swim subdirectory**

```bash
mv data/locations/*.yaml data/locations/swim/
```

- [ ] **Step 3: Write a migration script to transform YAML files**

Create a temporary `scripts/migrate-to-new-schema.ts` that reads each file in `data/locations/swim/`, transforms it from the old schema to the new one, and writes it back. The transformation:

- Change `type` values: `"waterfall"` → `"swim"`, `"swimming-hole"` → `"swim"`, `"splash-pad"` → `"swim"`, `"spring"` → `"swim"`, `"creek"` → `"swim"`
- Move `practical.dangerLevel` → `details.dangerLevel`
- Move `practical.cost` to top-level `cost` (mapping `"free"` → `"free"`, `"paid"` → `"$"`, `"donation"` → `"free"`)
- Move `practical.accessibility` → top-level `accessibility`
- Move `practical.parking` → top-level `parking`
- Move `practical.facilities` → top-level `facilities`
- Move `practical.bestSeason` → top-level `bestSeason`
- Add `details.waterAccess` from `status.waterAccess`
- Add `details.depth: null`
- Remove `status.waterAccess` (now in details)
- Add `highlights` from first 2 `tips` entries (best available approximation — can be hand-edited later)
- Add `ageSuitability: { minAge: null, ideal: ["toddlers", "primary", "teens", "adults"] }` as default
- Remove `practical` block

```typescript
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const swimDir = path.resolve(process.cwd(), "data/locations/swim");
const files = fs.readdirSync(swimDir).filter((f) => f.endsWith(".yaml"));

const COST_MAP: Record<string, string> = {
  free: "free",
  paid: "$",
  donation: "free",
};

for (const file of files) {
  const filePath = path.join(swimDir, file);
  const content = fs.readFileSync(filePath, "utf-8");
  const data = yaml.load(content) as Record<string, any>;

  const practical = data.practical || {};
  const status = data.status || {};

  const migrated: Record<string, any> = {
    slug: data.slug,
    name: data.name,
    type: "swim",
    coordinates: data.coordinates,
    region: data.region,
    country: data.country,
    description: data.description,
    photos: data.photos,
    highlights: (data.tips || []).slice(0, 2),
    cost: COST_MAP[practical.cost] || "free",
    ageSuitability: { minAge: null, ideal: ["toddlers", "primary", "teens", "adults"] },
    accessibility: practical.accessibility || "moderate",
    parking: practical.parking || "limited",
    facilities: practical.facilities || [],
    bestSeason: practical.bestSeason || ["summer"],
    directions: data.directions,
    tips: data.tips || [],
    tags: data.tags || [],
    status: {
      site: status.site || "unknown",
      lastVerified: status.lastVerified || "2026-01-01",
      ...(status.note ? { note: status.note } : {}),
    },
    details: {
      dangerLevel: practical.dangerLevel || "moderate",
      waterAccess: status.waterAccess || "unknown",
      depth: null,
    },
  };

  fs.writeFileSync(filePath, yaml.dump(migrated, { lineWidth: 120, noRefs: true }));
  console.log(`Migrated: ${file}`);
}

console.log(`\nMigrated ${files.length} files.`);
```

- [ ] **Step 4: Run the migration**

```bash
npx tsx scripts/migrate-to-new-schema.ts
```

- [ ] **Step 5: Validate the migrated files**

```bash
npx tsx scripts/validate-locations.ts
```

Expected: All files pass validation.

- [ ] **Step 6: Build the data to verify JSON output**

```bash
npx tsx scripts/build-locations.ts
```

Expected: All files build successfully.

- [ ] **Step 7: Remove migration script and commit**

```bash
rm scripts/migrate-to-new-schema.ts
git add data/locations/ scripts/validate-locations.ts scripts/build-locations.ts
git commit -m "feat: migrate 55 swim entries to new Place schema in data/locations/swim/"
```

---

### Task 6: Add sample beach and event YAML entries

**Files:**
- Create: `data/locations/beach/portsea-back-beach.yaml`
- Create: `data/locations/beach/sorrento-rock-pools.yaml`
- Create: `data/locations/event/queen-vic-night-market.yaml`
- Create: `data/locations/event/moonlight-cinema.yaml`

- [ ] **Step 1: Create sample beach entries**

`data/locations/beach/portsea-back-beach.yaml`:
```yaml
slug: portsea-back-beach
name: Portsea Back Beach
type: beach
coordinates:
  lat: -38.3128
  lng: 144.7153
region: Victoria, Australia
country: AU
description: >
  A dramatic ocean beach at the tip of the Mornington Peninsula known for its
  cliff jumping platform and powerful surf. The limestone cliffs frame a stunning
  stretch of wild coast — this is where locals come for adventure, not sunbathing.
photos:
  - url: /images/placeholder.jpg
    alt: Portsea Back Beach cliff jumping platform
highlights:
  - Cliff jumping from the rock platform
  - Powerful surf break
  - Dramatic limestone cliff scenery
cost: free
ageSuitability:
  minAge: 12
  ideal:
    - teens
    - adults
accessibility: moderate
parking: available
facilities:
  - restrooms
  - lifeguard-seasonal
bestSeason:
  - summer
directions: >
  Drive to the end of the Mornington Peninsula via the Nepean Highway. Portsea
  Back Beach has its own car park signposted from the main road.
tips:
  - Cliff jumping is from the rock platform on the western end
  - Strong rips — only swim between the flags when patrolled
  - Arrive early in summer as parking fills quickly
tags:
  - cliff-jumping
  - surf
  - adventure
  - mornington-peninsula
status:
  site: open
  lastVerified: "2026-04-10"
details:
  beachType: surf
  patrolled:
    seasonal: true
    months:
      - dec
      - jan
      - feb
      - mar
    hours: 10am-6pm
  dogPolicy: prohibited
  waveExposure: exposed
  waterHazards:
    - rips
    - rocks
    - strong-swell
  crowdLevel: busy
```

`data/locations/beach/sorrento-rock-pools.yaml`:
```yaml
slug: sorrento-rock-pools
name: Sorrento Rock Pools
type: beach
coordinates:
  lat: -38.3392
  lng: 144.7381
region: Victoria, Australia
country: AU
description: >
  A hidden network of natural rock pools carved into the limestone shelf at
  Sorrento's ocean side. At low tide, the pools fill with crystal-clear water
  and are calm enough for young kids to splash in — while the ocean crashes
  just metres away. One of the Peninsula's best-kept secrets.
photos:
  - url: /images/placeholder.jpg
    alt: Sorrento rock pools at low tide
highlights:
  - Natural rock pools safe for kids at low tide
  - Snorkelling in the deeper pools
  - Marine life — sea stars, anemones, crabs
cost: free
ageSuitability:
  minAge: null
  ideal:
    - toddlers
    - primary
    - teens
    - adults
accessibility: moderate
parking: street
facilities: []
bestSeason:
  - summer
  - spring
directions: >
  Park along the Esplanade in Sorrento and walk down the track to the ocean
  side. The rock pools are accessible at low tide — check tide times before
  visiting.
tips:
  - Only accessible at low tide — check Bureau of Meteorology tide charts
  - Wear reef shoes on the limestone
  - Bring a mesh bag for collecting shells (look, don't take)
tags:
  - rock-pools
  - family-friendly
  - snorkelling
  - marine-life
  - mornington-peninsula
status:
  site: open
  lastVerified: "2026-04-10"
details:
  beachType: rock-pools
  patrolled:
    seasonal: false
    months: []
    hours: null
  dogPolicy: allowed
  waveExposure: sheltered
  waterHazards:
    - slippery-rocks
  crowdLevel: quiet
```

- [ ] **Step 2: Create sample event entries**

`data/locations/event/queen-vic-night-market.yaml`:
```yaml
slug: queen-vic-night-market
name: Queen Victoria Night Market
type: event
coordinates:
  lat: -37.8076
  lng: 144.9568
region: Victoria, Australia
country: AU
description: >
  Melbourne's iconic night market transforms the historic Queen Vic sheds into
  a buzzing street food and live music destination every Wednesday evening in
  summer. Over 40 food stalls from Melbourne's best restaurants and pop-ups,
  plus bars, DJs, and a rotating lineup of live acts.
photos:
  - url: /images/placeholder.jpg
    alt: Queen Victoria Night Market food stalls
highlights:
  - 40+ street food stalls from Melbourne's best
  - Live music and DJs every week
  - Covered sheds — rain or shine
cost: free
ageSuitability:
  minAge: null
  ideal:
    - primary
    - teens
    - adults
accessibility: wheelchair-accessible
parking: available
facilities:
  - restrooms
  - food
  - bars
bestSeason:
  - summer
directions: >
  Queen Victoria Market, corner of Elizabeth and Victoria Streets, Melbourne CBD.
  Tram routes 19, 57, 58, 59 stop at the market. Parking available in the
  market's multi-storey car park.
tips:
  - Get there by 6pm to avoid the longest food queues
  - Bring a blanket to sit on the grass area near the stage
  - Food stalls are cash and card — bars are card only
tags:
  - market
  - food
  - live-music
  - melbourne-cbd
status:
  site: seasonal
  lastVerified: "2026-04-10"
details:
  recurrence:
    type: weekly
    days:
      - wed
    season: summer
    startTime: "17:00"
    endTime: "22:00"
  confirmedDates: null
  venue: Queen Victoria Market
  venueType: outdoor
  bookingRequired: false
  bookingUrl: null
  organiser: Queen Victoria Market
  organiserUrl: null
```

`data/locations/event/moonlight-cinema.yaml`:
```yaml
slug: moonlight-cinema
name: Moonlight Cinema
type: event
coordinates:
  lat: -37.8316
  lng: 144.9811
region: Victoria, Australia
country: AU
description: >
  Watch films under the stars in Melbourne's Royal Botanic Gardens. Moonlight
  Cinema runs every summer with a mix of new releases, cult classics, and
  family-friendly screenings. Bring a picnic, a blanket, and arrive early to
  claim a good spot on the grass.
photos:
  - url: /images/placeholder.jpg
    alt: Moonlight Cinema in the Royal Botanic Gardens
highlights:
  - Outdoor cinema in the Botanic Gardens
  - Mix of new releases and cult classics
  - BYO picnic and blanket
cost: "$$"
ageSuitability:
  minAge: null
  ideal:
    - primary
    - teens
    - adults
accessibility: easy
parking: limited
facilities:
  - restrooms
  - food
  - bars
bestSeason:
  - summer
directions: >
  Gate D entrance, Royal Botanic Gardens, Birdwood Avenue, Melbourne. Tram 8
  from the city stops nearby. Limited street parking — public transport
  recommended.
tips:
  - Gates open at 7pm, film starts at sundown (~8:45pm in peak summer)
  - Gold Grass tickets guarantee a prime viewing spot
  - Bring insect repellent — the gardens have mosquitoes after dark
tags:
  - cinema
  - outdoor
  - botanic-gardens
  - melbourne
status:
  site: seasonal
  lastVerified: "2026-04-10"
details:
  recurrence:
    type: range
    startDate: "2026-12-01"
    endDate: "2027-03-31"
    startTime: "19:00"
    endTime: "23:00"
  confirmedDates:
    year: 2026
    startDate: "2026-12-01"
    endDate: "2027-03-31"
  venue: Royal Botanic Gardens
  venueType: outdoor
  bookingRequired: true
  bookingUrl: https://www.moonlight.com.au
  organiser: Moonlight Cinema
  organiserUrl: https://www.moonlight.com.au
```

- [ ] **Step 3: Validate all entries**

```bash
npx tsx scripts/validate-locations.ts
```

Expected: All entries pass.

- [ ] **Step 4: Build data**

```bash
npx tsx scripts/build-locations.ts
```

Expected: 57 places built (55 swim + 2 beach + 2 event — or however many survive migration).

- [ ] **Step 5: Commit**

```bash
git add data/locations/beach/ data/locations/event/
git commit -m "feat: add sample beach and event entries to prove new schema"
```

---

### Task 7: Rebrand dripmap → Drift

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/app/location/[slug]/page.tsx`
- Modify: `src/app/about/page.tsx`
- Modify: `public/manifest.json`
- Modify: `package.json` (name field only)

- [ ] **Step 1: Update layout.tsx**

In `src/app/layout.tsx`, change:
- `title: "dripmap — Find Water Play Locations"` → `title: "Drift — Discover Summer Activities"`
- `description: "Discover waterfalls, swimming holes, splash pads, and more worldwide."` → `description: "Discover beaches, events, swims, and more across Victoria."`
- `title: "dripmap"` (appleWebApp) → `title: "Drift"`

- [ ] **Step 2: Update the logo in page.tsx**

In `src/app/page.tsx`, change:
- `import { Droplets } from "lucide-react"` → `import { Compass } from "lucide-react"` (Compass fits the discovery/exploration brand better than Droplets)
- The logo text from `dripmap` to `Drift`
- `<Droplets className="w-5 h-5 text-blue-600" />` → `<Compass className="w-5 h-5 text-blue-600" />`
- `<span className="font-bold text-blue-700 text-sm">dripmap</span>` → `<span className="font-bold text-blue-700 text-sm">Drift</span>`

- [ ] **Step 3: Update location detail page**

In `src/app/location/[slug]/page.tsx`, change:
- `${location.name} — dripmap` → `${location.name} — Drift`
- `"Location not found — dripmap"` → `"Location not found — Drift"`

- [ ] **Step 4: Update manifest.json**

```json
{
  "name": "Drift",
  "short_name": "Drift",
  "description": "Discover summer activities across Victoria",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

- [ ] **Step 5: Update package.json name**

Change `"name": "dripmap"` → `"name": "drift"`

- [ ] **Step 6: Update about page if it references dripmap**

Check `src/app/about/page.tsx` and replace any "dripmap" references with "Drift".

- [ ] **Step 7: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx src/app/location/\[slug\]/page.tsx src/app/about/page.tsx public/manifest.json package.json
git commit -m "feat: rebrand dripmap → Drift"
```

---

### Task 8: Update TypeBadge and pin icons for new place types

**Files:**
- Modify: `src/components/TypeBadge.tsx`
- Modify: `src/components/LocationMap.tsx` (pin colours)

- [ ] **Step 1: Update TypeBadge**

Replace `src/components/TypeBadge.tsx`:

```tsx
import {
  Waves, Droplets, Compass, Calendar, TreePine, Eye, Mountain,
  Skull, PawPrint, Droplet, Bike, Fish,
  type LucideIcon,
} from "lucide-react";
import type { PlaceType } from "@/lib/types";

const TYPE_CONFIG: Record<PlaceType, { icon: LucideIcon; label: string; color: string }> = {
  swim: { icon: Droplets, label: "Swim", color: "text-cyan-600" },
  beach: { icon: Waves, label: "Beach", color: "text-blue-500" },
  event: { icon: Calendar, label: "Event", color: "text-pink-600" },
  bushwalk: { icon: TreePine, label: "Bushwalk", color: "text-green-700" },
  lookout: { icon: Eye, label: "Lookout", color: "text-amber-600" },
  waterfall: { icon: Droplet, label: "Waterfall", color: "text-blue-700" },
  cave: { icon: Mountain, label: "Cave", color: "text-gray-600" },
  wildlife: { icon: PawPrint, label: "Wildlife", color: "text-orange-600" },
  pool: { icon: Waves, label: "Pool", color: "text-violet-600" },
  cycling: { icon: Bike, label: "Cycling", color: "text-lime-600" },
  fishing: { icon: Fish, label: "Fishing", color: "text-teal-600" },
};

interface TypeBadgeProps {
  type: PlaceType;
  showLabel?: boolean;
}

export default function TypeBadge({ type, showLabel = true }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`}>
      <Icon className="w-4 h-4" />
      {showLabel && <span className="text-sm font-medium">{config.label}</span>}
    </span>
  );
}
```

- [ ] **Step 2: Update pin colours in LocationMap.tsx**

In `src/components/LocationMap.tsx`, replace the `PIN_COLORS` record:

```typescript
const PIN_COLORS: Record<PlaceType, string> = {
  swim: "#0891b2",
  beach: "#3b82f6",
  event: "#db2777",
  bushwalk: "#15803d",
  lookout: "#d97706",
  waterfall: "#1d4ed8",
  cave: "#4b5563",
  wildlife: "#ea580c",
  pool: "#7c3aed",
  cycling: "#65a30d",
  fishing: "#0d9488",
};
```

Also update the import from `LocationType` to `PlaceType`:
```typescript
import type { PlaceIndexEntry, PlaceType, Coordinates } from "@/lib/types";
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: PASS (TypeBadge tests may need fixture updates if they reference old types)

- [ ] **Step 4: Commit**

```bash
git add src/components/TypeBadge.tsx src/components/LocationMap.tsx
git commit -m "feat: update TypeBadge and map pins for all place types"
```

---

### Task 9: Update FilterBar for new place types

**Files:**
- Modify: `src/components/FilterBar.tsx`

- [ ] **Step 1: Update FilterBar chip definitions**

Replace the `TYPE_CHIPS` and update imports in `src/components/FilterBar.tsx`:

```tsx
"use client";

import { Search } from "lucide-react";
import type { Filters, PlaceType, SiteStatus } from "@/lib/types";

const TYPE_CHIPS: { value: PlaceType; label: string }[] = [
  { value: "swim", label: "Swims" },
  { value: "beach", label: "Beaches" },
  { value: "event", label: "Events" },
  { value: "bushwalk", label: "Bushwalks" },
  { value: "lookout", label: "Lookouts" },
  { value: "waterfall", label: "Waterfalls" },
  { value: "cave", label: "Caves" },
  { value: "wildlife", label: "Wildlife" },
  { value: "pool", label: "Pools" },
  { value: "cycling", label: "Cycling" },
  { value: "fishing", label: "Fishing" },
];

const STATUS_CHIPS: { value: SiteStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "seasonal", label: "Seasonal" },
];
```

Also update the `emptyFilters` in the clear handler to use the new `Filters` shape (remove `accessibility`, `season`, `cost` fields):

```tsx
onClick={() =>
  onChange({
    type: null,
    siteStatus: null,
    search: "",
  })
}
```

And update the `hasActiveFilters` check:
```tsx
const hasActiveFilters = filters.type || filters.siteStatus || filters.search;
```

And update the result count label:
```tsx
{resultCount} place{resultCount !== 1 ? "s" : ""}
```

- [ ] **Step 2: Run the dev server to visually verify**

```bash
npm run dev:network:https
```

Verify the filter bar shows the new type chips.

- [ ] **Step 3: Commit**

```bash
git add src/components/FilterBar.tsx
git commit -m "feat: update FilterBar with all place type chips"
```

---

### Task 10: Update LocationDetailPanel for type-specific rendering

**Files:**
- Modify: `src/components/LocationDetailPanel.tsx`

The detail panel currently renders `practical` info hardcoded for swim spots. It needs to switch on `type` to render the correct details.

- [ ] **Step 1: Update the detail panel**

Key changes to `src/components/LocationDetailPanel.tsx`:

1. Update the import to use `Place` instead of `Location`:
```typescript
import type { Place, SwimPlace, BeachPlace, EventPlace, Coordinates } from "@/lib/types";
```

2. Replace the `practical` info rendering with a type-switch:

```tsx
function SwimDetailsSection({ details }: { details: SwimPlace["details"] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0" />
        <div>
          <p className="text-xs text-gray-500">Danger Level</p>
          <p className="text-sm font-medium capitalize">{details.dangerLevel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Droplets className="w-4 h-4 text-gray-400 shrink-0" />
        <div>
          <p className="text-xs text-gray-500">Water Access</p>
          <p className="text-sm font-medium capitalize">{details.waterAccess}</p>
        </div>
      </div>
    </div>
  );
}

function BeachDetailsSection({ details }: { details: BeachPlace["details"] }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="flex items-center gap-2">
        <Waves className="w-4 h-4 text-gray-400 shrink-0" />
        <div>
          <p className="text-xs text-gray-500">Beach Type</p>
          <p className="text-sm font-medium capitalize">{details.beachType.replace("-", " ")}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Shield className="w-4 h-4 text-gray-400 shrink-0" />
        <div>
          <p className="text-xs text-gray-500">Wave Exposure</p>
          <p className="text-sm font-medium capitalize">{details.waveExposure}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-gray-400 shrink-0" />
        <div>
          <p className="text-xs text-gray-500">Patrolled</p>
          <p className="text-sm font-medium">
            {details.patrolled.seasonal
              ? `${details.patrolled.months.join(", ")} ${details.patrolled.hours || ""}`
              : "No"}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 text-gray-400 shrink-0 text-center text-xs">🐕</span>
        <div>
          <p className="text-xs text-gray-500">Dogs</p>
          <p className="text-sm font-medium capitalize">{details.dogPolicy.replace("-", " ")}</p>
        </div>
      </div>
      {details.waterHazards.length > 0 && (
        <div className="col-span-2">
          <p className="text-xs text-gray-500 mb-1">Hazards</p>
          <div className="flex flex-wrap gap-1">
            {details.waterHazards.map((h) => (
              <span key={h} className="px-2 py-0.5 text-xs bg-red-50 text-red-700 rounded capitalize">
                {h.replace("-", " ")}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EventDetailsSection({ details }: { details: EventPlace["details"] }) {
  const rec = details.recurrence;
  let schedule = "";
  switch (rec.type) {
    case "once":
      schedule = rec.date;
      break;
    case "range":
      schedule = `${rec.startDate} – ${rec.endDate}`;
      break;
    case "weekly":
      schedule = `Every ${rec.days.join(", ")}${rec.season ? ` (${rec.season})` : ""}`;
      break;
    case "annual":
      schedule = `Annual — typically month ${rec.month}`;
      break;
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
        <div>
          <p className="text-xs text-gray-500">Schedule</p>
          <p className="text-sm font-medium">{schedule}</p>
          {rec.type !== "annual" && "startTime" in rec && rec.startTime && (
            <p className="text-xs text-gray-500">{rec.startTime}{rec.endTime ? ` – ${rec.endTime}` : ""}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <MapPin className="w-4 h-4 text-gray-400 shrink-0" />
        <div>
          <p className="text-xs text-gray-500">Venue</p>
          <p className="text-sm font-medium">{details.venue} ({details.venueType})</p>
        </div>
      </div>
      {details.bookingRequired && (
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-gray-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-500">Booking</p>
            {details.bookingUrl ? (
              <a href={details.bookingUrl} target="_blank" rel="noopener noreferrer"
                 className="text-sm text-blue-600 hover:underline">
                Book tickets
              </a>
            ) : (
              <p className="text-sm font-medium">Required</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

3. In the main render, replace the `{/* Practical info */}` section with:

```tsx
{/* Type-specific details */}
<section className="mb-4">
  <h3 className="text-base font-semibold text-gray-900 mb-2">Details</h3>
  {location.type === "swim" && <SwimDetailsSection details={location.details} />}
  {location.type === "beach" && <BeachDetailsSection details={location.details} />}
  {location.type === "event" && <EventDetailsSection details={location.details} />}
</section>

{/* Common info */}
<section className="mb-4">
  <div className="grid grid-cols-2 gap-2.5">
    <div className="flex items-center gap-2">
      <Shield className="w-4 h-4 text-gray-400 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">Accessibility</p>
        <p className="text-sm font-medium capitalize">{location.accessibility}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Car className="w-4 h-4 text-gray-400 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">Parking</p>
        <p className="text-sm font-medium capitalize">{location.parking}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <DollarSign className="w-4 h-4 text-gray-400 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">Cost</p>
        <p className="text-sm font-medium capitalize">{location.cost}</p>
      </div>
    </div>
    <div className="flex items-center gap-2">
      <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">Best Season</p>
        <p className="text-sm font-medium capitalize">{location.bestSeason.join(", ")}</p>
      </div>
    </div>
  </div>
  {location.facilities.length > 0 && (
    <div className="mt-2.5">
      <p className="text-xs text-gray-500 mb-1">Facilities</p>
      <div className="flex flex-wrap gap-1">
        {location.facilities.map((f) => (
          <span key={f} className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded capitalize">
            {f.replaceAll("-", " ")}
          </span>
        ))}
      </div>
    </div>
  )}
</section>
```

4. Also add the `Droplets` and `Waves` imports and remove the old `p = location.practical` line.

- [ ] **Step 2: Run dev server and verify detail panels render for swim, beach, event**

```bash
npm run build:data && npm run dev:network:https
```

Navigate to a swim spot, a beach, and an event to verify each detail section renders correctly.

- [ ] **Step 3: Commit**

```bash
git add src/components/LocationDetailPanel.tsx
git commit -m "feat: type-specific detail rendering for swim, beach, and event"
```

---

### Task 11: Update the static location detail page

**Files:**
- Modify: `src/app/location/[slug]/page.tsx`

The static detail page also hardcodes `practical` info. Apply the same type-switch pattern.

- [ ] **Step 1: Update the static page**

Key changes to `src/app/location/[slug]/page.tsx`:

1. Import `Place` type and the lucide icons needed (`Waves`, `Droplets`)
2. Remove `const p = location.practical`
3. Replace the `{/* Practical info */}` section with the same type-switch pattern from Task 10
4. Replace `{/* Status */}` section — remove `waterAccess` badge (it's now in swim details, not top-level status):

```tsx
<div className="flex items-center gap-2 mb-6">
  <StatusBadge status={location.status.site} label={`Site: ${location.status.site}`} />
  {location.type === "swim" && (
    <StatusBadge
      status={location.details.waterAccess}
      label={`Water: ${location.details.waterAccess}`}
    />
  )}
  {location.status.note && (
    <p className="text-sm text-amber-700 ml-2">{location.status.note}</p>
  )}
</div>
```

5. Add a highlights section before the description:

```tsx
{location.highlights.length > 0 && (
  <div className="flex flex-wrap gap-1.5 mb-4">
    {location.highlights.map((h) => (
      <span key={h} className="px-2.5 py-1 text-sm bg-blue-50 text-blue-700 rounded-full font-medium">
        {h}
      </span>
    ))}
  </div>
)}
```

- [ ] **Step 2: Build and verify**

```bash
npm run build
```

Expected: Build succeeds, static pages generated for all 57 places.

- [ ] **Step 3: Commit**

```bash
git add src/app/location/\[slug\]/page.tsx
git commit -m "feat: update static detail page for new Place schema with type-specific rendering"
```

---

### Task 12: Update StatusBadge for new status model

**Files:**
- Modify: `src/components/StatusBadge.tsx`

The status model no longer has `WaterAccessStatus` at the top level — it's inside swim details. `StatusBadge` should still accept those values (it's used in the swim detail section) but the types need updating.

- [ ] **Step 1: Update StatusBadge**

Replace `src/components/StatusBadge.tsx`:

```tsx
import type { SiteStatus } from "@/lib/types";

type BadgeStatus = SiteStatus | "restricted" | string;

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  closed: "bg-red-100 text-red-800",
  seasonal: "bg-amber-100 text-amber-800",
  restricted: "bg-amber-100 text-amber-800",
  unknown: "bg-gray-100 text-gray-600",
};

interface StatusBadgeProps {
  status: BadgeStatus;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.unknown;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {label ?? status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/StatusBadge.tsx
git commit -m "feat: update StatusBadge to accept any string status"
```

---

### Task 13: Update LocationCard to show highlights

**Files:**
- Modify: `src/components/LocationCard.tsx`

- [ ] **Step 1: Update LocationCard**

In `src/components/LocationCard.tsx`:

1. The card currently shows tags. Replace the tags section with highlights (the editorial hook), keeping tags as a fallback:

```tsx
{location.highlights.length > 0 ? (
  <p className="text-sm text-gray-600 mt-1.5 line-clamp-1">
    {location.highlights[0]}
  </p>
) : location.tags.length > 0 ? (
  <div className="flex flex-wrap gap-1 mt-2">
    {location.tags.slice(0, 3).map((tag) => (
      <span key={tag} className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
        {tag}
      </span>
    ))}
  </div>
) : null}
```

2. Update the distance display to also show cost:

```tsx
{distance && (
  <span className="text-xs text-blue-600 font-medium">{distance}</span>
)}
{location.cost && location.cost !== "free" && (
  <span className="text-xs text-gray-500">{location.cost}</span>
)}
```

3. Update the import to use `PlaceIndexEntry` instead of `LocationIndexEntry` (or rely on the re-export).

- [ ] **Step 2: Run dev server to verify card rendering**

```bash
npm run build:data && npm run dev:network:https
```

- [ ] **Step 3: Commit**

```bash
git add src/components/LocationCard.tsx
git commit -m "feat: show highlights and cost on LocationCard"
```

---

### Task 14: Update HomePage for new Filters shape

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Update emptyFilters**

In `src/app/page.tsx`, update the `emptyFilters` constant:

```typescript
const emptyFilters: Filters = {
  type: null,
  siteStatus: null,
  search: "",
};
```

Remove the old `accessibility`, `season`, `cost` fields.

- [ ] **Step 2: Update the waterAccess badge in the LocationCard rendering**

The `LocationCard` component already handles this, but the `LocationDetailPanel` in the bottom sheet shows a `waterAccess` badge from `location.status.waterAccess` — that field no longer exists at the top level. The `LocationDetailPanel` was already updated in Task 10. Verify it works.

- [ ] **Step 3: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: update HomePage for new Filters shape"
```

---

### Task 15: Fix remaining test fixtures and run full verification

**Files:**
- Modify: `__tests__/components/LocationCard.test.tsx`
- Modify: `__tests__/components/LocationDetailPanel.test.tsx`
- Modify: `__tests__/components/LocationMap.test.tsx`
- Modify: `__tests__/integration/HomePage.test.tsx`

All component tests that create `LocationIndexEntry` or `Location` fixtures need updating for the new shape.

- [ ] **Step 1: Update test fixtures**

For each test file, update the fixture objects:

**LocationIndexEntry fixtures** — add `region`, `cost`, `highlights` fields. Remove `waterAccess` from `status` (it's only in swim details now):

```typescript
const location: PlaceIndexEntry = {
  slug: "test-falls",
  name: "Test Falls",
  type: "swim",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  cost: "free",
  highlights: ["Crystal clear water"],
  status: { site: "open", lastVerified: "2026-01-01" },
  tags: ["family-friendly"],
};
```

**Location (Place) fixtures** — replace `practical` with top-level fields + `details`:

```typescript
const location: Place = {
  slug: "test-falls",
  name: "Test Falls",
  type: "swim",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  description: "A test swim spot.",
  photos: [{ url: "/images/test.jpg", alt: "Test" }],
  highlights: ["Crystal clear water"],
  cost: "free",
  ageSuitability: { minAge: null, ideal: ["adults"] },
  accessibility: "easy",
  parking: "available",
  facilities: ["restrooms"],
  bestSeason: ["summer"],
  directions: "Head north.",
  tips: ["Bring sunscreen."],
  tags: ["family-friendly"],
  status: { site: "open", lastVerified: "2026-04-01" },
  details: { dangerLevel: "low", waterAccess: "open", depth: null },
};
```

- [ ] **Step 2: Run full test suite**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 3: Run full build**

```bash
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add __tests__/
git commit -m "test: update all test fixtures for new Place schema"
```

---

### Task 16: Clean up legacy re-exports

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Search for any remaining references to old type names**

```bash
grep -r "LocationType\|LocationIndexEntry\|LocationStatus\|PracticalInfo\|AccessibilityLevel\|ParkingType\|DangerLevel\|CostType\|WaterAccessStatus" src/ __tests__/ scripts/ --include="*.ts" --include="*.tsx" -l
```

- [ ] **Step 2: Update any remaining files to use new type names**

Replace `LocationType` → `PlaceType`, `LocationIndexEntry` → `PlaceIndexEntry`, `Location` → `Place` in any files still using old names.

- [ ] **Step 3: Remove legacy re-exports from types.ts**

Remove the deprecated aliases at the bottom of `src/lib/types.ts`.

- [ ] **Step 4: Run full test suite and build**

```bash
npx vitest run && npm run build
```

Expected: All pass.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove deprecated type aliases, complete migration to Place types"
```

---

## Summary

| Task | Description | Key files |
|------|-------------|-----------|
| 1 | New type definitions (discriminated union) | `src/lib/types.ts` |
| 2 | Update filters | `src/lib/filters.ts` |
| 3 | Type-aware validator | `scripts/validate-locations.ts` |
| 4 | Updated build script | `scripts/build-locations.ts` |
| 5 | Migrate 55 swim YAML files | `data/locations/swim/` |
| 6 | Add sample beach + event entries | `data/locations/beach/`, `data/locations/event/` |
| 7 | Rebrand dripmap → Drift | layout, manifest, package.json |
| 8 | TypeBadge + pin icons for all types | `TypeBadge.tsx`, `LocationMap.tsx` |
| 9 | FilterBar for new types | `FilterBar.tsx` |
| 10 | Type-specific detail panel | `LocationDetailPanel.tsx` |
| 11 | Static detail page update | `location/[slug]/page.tsx` |
| 12 | StatusBadge update | `StatusBadge.tsx` |
| 13 | LocationCard highlights | `LocationCard.tsx` |
| 14 | HomePage filters shape | `page.tsx` |
| 15 | Fix all test fixtures | `__tests__/` |
| 16 | Remove legacy type aliases | `types.ts` |
