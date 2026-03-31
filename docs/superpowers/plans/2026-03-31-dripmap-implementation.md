# dripmap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a PWA for discovering curated water play locations worldwide, with an interactive map, filterable list, offline support, and bookmarking.

**Architecture:** Next.js 15 static export with App Router. Location data stored as YAML files, processed at build time into JSON. Leaflet/OpenStreetMap for maps. Workbox service worker for offline caching of pages, data, and map tiles. Mobile-first with Google Maps-style bottom sheet UI.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Leaflet, js-yaml, Workbox (next-pwa), Vitest, Lucide React

**Note:** Map pin clustering (leaflet.markercluster) is deferred — not needed with the initial dataset. Add it when location count grows past ~50.

---

## File Structure

```
dripmap/
├── data/
│   └── locations/
│       ├── niagara-falls.yaml          # Sample location
│       ├── hamilton-pool.yaml          # Sample location
│       └── fairy-pools.yaml            # Sample location
├── scripts/
│   ├── validate-locations.ts           # YAML schema validation
│   └── build-locations.ts              # YAML → JSON processor
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout (header, metadata)
│   │   ├── page.tsx                    # Home page (map + bottom sheet)
│   │   ├── globals.css                 # Tailwind imports + custom styles
│   │   ├── about/
│   │   │   └── page.tsx                # About page
│   │   └── location/
│   │       └── [slug]/
│   │           └── page.tsx            # Location detail page
│   ├── components/
│   │   ├── Header.tsx                  # Top bar: logo, search, about link
│   │   ├── Footer.tsx                  # Footer for detail/about pages
│   │   ├── LocationMap.tsx             # Main Leaflet map with pins
│   │   ├── LocationCard.tsx            # List item card
│   │   ├── LocationList.tsx            # Scrollable list of cards
│   │   ├── BottomSheet.tsx             # Draggable mobile bottom sheet
│   │   ├── FilterBar.tsx               # Type/accessibility/season/cost/status filters
│   │   ├── StatusBadge.tsx             # Open/closed/seasonal indicator
│   │   ├── TypeBadge.tsx               # Location type with icon
│   │   ├── MiniMap.tsx                 # Small static map for detail page
│   │   └── BookmarkButton.tsx          # Bookmark toggle
│   └── lib/
│       ├── types.ts                    # All TypeScript interfaces/types
│       ├── locations.ts                # Load location data (build-time + client)
│       ├── filters.ts                  # Filter and search logic
│       └── bookmarks.ts               # localStorage bookmark helpers
├── public/
│   ├── icons/
│   │   ├── icon-192.png                # PWA icon
│   │   └── icon-512.png                # PWA icon
│   └── generated/                      # Build output for location JSON
│       ├── locations-index.json
│       └── locations/
│           └── [slug].json
├── __tests__/
│   ├── lib/
│   │   ├── filters.test.ts
│   │   └── bookmarks.test.ts
│   └── scripts/
│       ├── validate-locations.test.ts
│       └── build-locations.test.ts
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `tailwind.config.ts`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`, `.gitignore`

- [ ] **Step 1: Initialize Next.js project**

Run:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --no-turbopack
```

Expected: Project scaffolded with Next.js 15, TypeScript, Tailwind, App Router, `src/` directory.

- [ ] **Step 2: Install additional dependencies**

Run:
```bash
npm install leaflet js-yaml lucide-react
npm install -D @types/leaflet @types/js-yaml vitest @vitejs/plugin-react jsdom next-pwa
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

- [ ] **Step 4: Add npm scripts**

In `package.json`, add to `"scripts"`:
```json
{
  "test": "vitest run",
  "test:watch": "vitest",
  "validate": "npx tsx scripts/validate-locations.ts",
  "build:data": "npx tsx scripts/build-locations.ts",
  "prebuild": "npm run validate && npm run build:data"
}
```

- [ ] **Step 5: Update .gitignore**

Append to `.gitignore`:
```
public/generated/
.superpowers/
```

- [ ] **Step 6: Configure static export**

Update `next.config.ts`:
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
```

- [ ] **Step 7: Verify scaffolding**

Run:
```bash
npm run dev
```

Expected: Dev server starts at localhost:3000 with default Next.js page.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: scaffold Next.js project with TypeScript, Tailwind, Vitest"
```

---

## Task 2: TypeScript Types

**Files:**
- Create: `src/lib/types.ts`

- [ ] **Step 1: Define all types**

Create `src/lib/types.ts`:
```typescript
export type LocationType =
  | "waterfall"
  | "swimming-hole"
  | "splash-pad"
  | "spring"
  | "creek";

export type AccessibilityLevel =
  | "wheelchair-accessible"
  | "easy"
  | "moderate"
  | "difficult"
  | "extreme";

export type ParkingType = "available" | "limited" | "none" | "street";

export type DangerLevel = "low" | "moderate" | "high" | "extreme";

export type CostType = "free" | "paid" | "donation";

export type SiteStatus = "open" | "closed" | "seasonal" | "unknown";

export type WaterAccessStatus =
  | "open"
  | "closed"
  | "seasonal"
  | "restricted"
  | "unknown";

export type Season = "spring" | "summer" | "fall" | "winter";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Photo {
  url: string;
  alt: string;
  credit?: string;
}

export interface PracticalInfo {
  accessibility: AccessibilityLevel;
  parking: ParkingType;
  facilities: string[];
  bestSeason: Season[];
  dangerLevel: DangerLevel;
  cost: CostType;
}

export interface LocationStatus {
  site: SiteStatus;
  waterAccess: WaterAccessStatus;
  note: string;
  lastVerified: string;
}

export interface Location {
  slug: string;
  name: string;
  type: LocationType;
  coordinates: Coordinates;
  region: string;
  country: string;
  description: string;
  photos: Photo[];
  practical: PracticalInfo;
  directions: string;
  tips: string[];
  tags: string[];
  status: LocationStatus;
}

export interface LocationIndexEntry {
  slug: string;
  name: string;
  type: LocationType;
  coordinates: Coordinates;
  country: string;
  status: LocationStatus;
  tags: string[];
}

export interface Filters {
  type: LocationType | null;
  accessibility: AccessibilityLevel | null;
  season: Season | null;
  cost: CostType | null;
  siteStatus: SiteStatus | null;
  search: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add TypeScript type definitions for location data model"
```

---

## Task 3: Sample Location Data

**Files:**
- Create: `data/locations/niagara-falls.yaml`, `data/locations/hamilton-pool.yaml`, `data/locations/fairy-pools.yaml`

- [ ] **Step 1: Create data directory and first sample**

```bash
mkdir -p data/locations
```

Create `data/locations/niagara-falls.yaml`:
```yaml
slug: niagara-falls
name: Niagara Falls
type: waterfall
coordinates:
  lat: 43.0962
  lng: -79.0377
region: North America
country: CA
description: >
  One of the most famous waterfalls in the world, straddling the border between
  Ontario, Canada and New York, USA. The Horseshoe Falls on the Canadian side
  offer the most spectacular views with over 168,000 cubic metres of water
  flowing over every minute during peak flow.
photos:
  - url: /images/locations/niagara-falls/hero.jpg
    alt: Niagara Falls from the Canadian side
    credit: Parks Canada
practical:
  accessibility: wheelchair-accessible
  parking: available
  facilities:
    - restrooms
    - food
    - gift-shop
    - visitor-centre
  bestSeason:
    - spring
    - summer
    - fall
  dangerLevel: low
  cost: free
directions: >
  From Toronto, take the QEW south toward Niagara. Follow signs to Niagara Falls.
  Main parking is at the Niagara Parks Welcome Centre on Niagara Parkway.
tips:
  - Visit early morning to avoid peak crowds
  - The Canadian side (Horseshoe Falls) has the best views
  - Bring a rain jacket for the Hornblower boat cruise
  - The falls are illuminated at night during summer
tags:
  - family-friendly
  - iconic
  - accessible
  - free
status:
  site: open
  waterAccess: open
  note: ""
  lastVerified: "2026-03-15"
```

- [ ] **Step 2: Create second sample**

Create `data/locations/hamilton-pool.yaml`:
```yaml
slug: hamilton-pool
name: Hamilton Pool Preserve
type: swimming-hole
coordinates:
  lat: 30.3427
  lng: -98.1266
region: North America
country: US
description: >
  A stunning natural swimming pool formed when the dome of an underground river
  collapsed thousands of years ago. A 50-foot waterfall spills over the limestone
  overhang into the jade-green pool below. Located in Travis County, Texas.
photos:
  - url: /images/locations/hamilton-pool/hero.jpg
    alt: Hamilton Pool with waterfall and limestone overhang
    credit: Texas Parks & Wildlife
practical:
  accessibility: moderate
  parking: limited
  facilities:
    - restrooms
  bestSeason:
    - spring
    - fall
  dangerLevel: moderate
  cost: paid
directions: >
  From Austin, take TX-71 West to Hamilton Pool Road (FM 3238). Turn left and
  follow for about 13 miles to the preserve entrance. Reservations are required.
tips:
  - Reservations are mandatory — book online well in advance
  - Swimming is sometimes prohibited due to bacteria levels — check before visiting
  - Arrive early as parking fills up quickly
  - The trail to the pool is about 0.25 miles with steep stairs
tags:
  - scenic
  - reservation-required
  - swimming
status:
  site: open
  waterAccess: seasonal
  note: "Swimming is tested weekly; prohibited when bacteria levels are high"
  lastVerified: "2026-03-10"
```

- [ ] **Step 3: Create third sample**

Create `data/locations/fairy-pools.yaml`:
```yaml
slug: fairy-pools
name: Fairy Pools
type: swimming-hole
coordinates:
  lat: 57.2501
  lng: -6.2743
region: Europe
country: GB
description: >
  A series of crystal-clear blue and green pools formed by waterfalls on the
  Allt Coir' a' Mhadaidh river at the foot of the Black Cuillins on the Isle
  of Skye, Scotland. The pools are famous for their clarity and colour.
photos:
  - url: /images/locations/fairy-pools/hero.jpg
    alt: Crystal clear blue pools with mountain backdrop
    credit: Visit Scotland
practical:
  accessibility: moderate
  parking: available
  facilities: []
  bestSeason:
    - summer
  dangerLevel: moderate
  cost: free
directions: >
  From the Glenbrittle road car park on the Isle of Skye, follow the well-marked
  trail along the river. The walk is about 1.2 miles each way over uneven terrain.
tips:
  - Wear waterproof hiking boots — the trail is often muddy
  - Water is cold year-round, even in summer — wetsuits recommended for swimming
  - Visit on a sunny day for the best colour in the pools
  - Midges can be fierce in summer — bring repellent
tags:
  - scenic
  - hiking
  - cold-water
  - wild-swimming
status:
  site: open
  waterAccess: open
  note: ""
  lastVerified: "2026-02-20"
```

- [ ] **Step 4: Commit**

```bash
git add data/locations/
git commit -m "feat: add three sample location YAML files"
```

---

## Task 4: Location Validation Script (TDD)

**Files:**
- Create: `scripts/validate-locations.ts`, `__tests__/scripts/validate-locations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/scripts/validate-locations.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { validateLocation } from "../../scripts/validate-locations";

const validLocation = {
  slug: "test-falls",
  name: "Test Falls",
  type: "waterfall",
  coordinates: { lat: 43.0, lng: -79.0 },
  region: "North America",
  country: "CA",
  description: "A test waterfall.",
  photos: [{ url: "/images/test.jpg", alt: "Test photo" }],
  practical: {
    accessibility: "easy",
    parking: "available",
    facilities: ["restrooms"],
    bestSeason: ["summer"],
    dangerLevel: "low",
    cost: "free",
  },
  directions: "Go north.",
  tips: ["Bring water."],
  tags: ["family-friendly"],
  status: {
    site: "open",
    waterAccess: "open",
    note: "",
    lastVerified: "2026-01-01",
  },
};

describe("validateLocation", () => {
  it("accepts a valid location", () => {
    const errors = validateLocation(validLocation);
    expect(errors).toEqual([]);
  });

  it("rejects missing required fields", () => {
    const { slug, ...missing } = validLocation;
    const errors = validateLocation(missing);
    expect(errors).toContainEqual(
      expect.stringContaining("slug")
    );
  });

  it("rejects invalid type enum", () => {
    const errors = validateLocation({ ...validLocation, type: "lake" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("type");
  });

  it("rejects invalid coordinates", () => {
    const errors = validateLocation({
      ...validLocation,
      coordinates: { lat: 200, lng: -79 },
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("lat");
  });

  it("rejects invalid status values", () => {
    const errors = validateLocation({
      ...validLocation,
      status: { ...validLocation.status, site: "maybe" },
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("status.site");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/scripts/validate-locations.test.ts`

Expected: FAIL — `validateLocation` is not exported from the module.

- [ ] **Step 3: Implement the validation function**

Create `scripts/validate-locations.ts`:
```typescript
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const VALID_TYPES = ["waterfall", "swimming-hole", "splash-pad", "spring", "creek"];
const VALID_ACCESSIBILITY = ["wheelchair-accessible", "easy", "moderate", "difficult", "extreme"];
const VALID_PARKING = ["available", "limited", "none", "street"];
const VALID_DANGER = ["low", "moderate", "high", "extreme"];
const VALID_COST = ["free", "paid", "donation"];
const VALID_SEASONS = ["spring", "summer", "fall", "winter"];
const VALID_SITE_STATUS = ["open", "closed", "seasonal", "unknown"];
const VALID_WATER_ACCESS = ["open", "closed", "seasonal", "restricted", "unknown"];

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

export function validateLocation(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  const requiredStrings = ["slug", "name", "region", "country", "description", "directions"];
  for (const field of requiredStrings) {
    if (typeof data[field] !== "string" || (data[field] as string).trim() === "") {
      errors.push(`${field}: required string field is missing or empty`);
    }
  }

  errors.push(...checkEnum(data.type, VALID_TYPES, "type"));

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

  const practical = data.practical as Record<string, unknown> | undefined;
  if (!practical || typeof practical !== "object") {
    errors.push("practical: required object is missing");
  } else {
    errors.push(...checkEnum(practical.accessibility, VALID_ACCESSIBILITY, "practical.accessibility"));
    errors.push(...checkEnum(practical.parking, VALID_PARKING, "practical.parking"));
    errors.push(...checkEnum(practical.dangerLevel, VALID_DANGER, "practical.dangerLevel"));
    errors.push(...checkEnum(practical.cost, VALID_COST, "practical.cost"));
    errors.push(...checkArrayEnum(practical.bestSeason, VALID_SEASONS, "practical.bestSeason"));
    if (!Array.isArray(practical.facilities)) {
      errors.push("practical.facilities: must be an array");
    }
  }

  if (!Array.isArray(data.tips)) {
    errors.push("tips: must be an array");
  }

  if (!Array.isArray(data.tags)) {
    errors.push("tags: must be an array");
  }

  const status = data.status as Record<string, unknown> | undefined;
  if (!status || typeof status !== "object") {
    errors.push("status: required object is missing");
  } else {
    errors.push(...checkEnum(status.site, VALID_SITE_STATUS, "status.site"));
    errors.push(...checkEnum(status.waterAccess, VALID_WATER_ACCESS, "status.waterAccess"));
    if (typeof status.lastVerified !== "string") {
      errors.push("status.lastVerified: required string field is missing");
    }
  }

  return errors;
}

// CLI entrypoint: validate all YAML files in data/locations/
if (process.argv[1] && process.argv[1].includes("validate-locations")) {
  const locationsDir = path.resolve(process.cwd(), "data/locations");

  if (!fs.existsSync(locationsDir)) {
    console.error(`Error: ${locationsDir} does not exist`);
    process.exit(1);
  }

  const files = fs.readdirSync(locationsDir).filter((f) => f.endsWith(".yaml"));

  if (files.length === 0) {
    console.error("Error: No YAML files found in data/locations/");
    process.exit(1);
  }

  let hasErrors = false;

  for (const file of files) {
    const filePath = path.join(locationsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = yaml.load(content) as Record<string, unknown>;
    const errors = validateLocation(data);

    if (errors.length > 0) {
      hasErrors = true;
      console.error(`\n❌ ${file}:`);
      for (const error of errors) {
        console.error(`   - ${error}`);
      }
    } else {
      console.log(`✓ ${file}`);
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

Expected: All 5 tests PASS.

- [ ] **Step 5: Run validation against sample data**

Run: `npm run validate`

Expected:
```
✓ fairy-pools.yaml
✓ hamilton-pool.yaml
✓ niagara-falls.yaml

All locations valid.
```

- [ ] **Step 6: Commit**

```bash
git add scripts/validate-locations.ts __tests__/scripts/validate-locations.test.ts
git commit -m "feat: add location YAML validation script with tests"
```

---

## Task 5: Build Script (TDD)

**Files:**
- Create: `scripts/build-locations.ts`, `__tests__/scripts/build-locations.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/scripts/build-locations.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { buildIndex, buildDetail } from "../../scripts/build-locations";
import type { Location } from "../../src/lib/types";

const sampleLocation: Location = {
  slug: "test-falls",
  name: "Test Falls",
  type: "waterfall",
  coordinates: { lat: 43.0, lng: -79.0 },
  region: "North America",
  country: "CA",
  description: "A test waterfall.",
  photos: [{ url: "/images/test.jpg", alt: "Test photo" }],
  practical: {
    accessibility: "easy",
    parking: "available",
    facilities: ["restrooms"],
    bestSeason: ["summer"],
    dangerLevel: "low",
    cost: "free",
  },
  directions: "Go north.",
  tips: ["Bring water."],
  tags: ["family-friendly"],
  status: {
    site: "open",
    waterAccess: "open",
    note: "",
    lastVerified: "2026-01-01",
  },
};

describe("buildIndex", () => {
  it("produces lightweight index entries", () => {
    const index = buildIndex([sampleLocation]);
    expect(index).toHaveLength(1);
    expect(index[0]).toEqual({
      slug: "test-falls",
      name: "Test Falls",
      type: "waterfall",
      coordinates: { lat: 43.0, lng: -79.0 },
      country: "CA",
      status: sampleLocation.status,
      tags: ["family-friendly"],
    });
  });

  it("excludes description, photos, practical, directions, tips from index", () => {
    const index = buildIndex([sampleLocation]);
    const entry = index[0] as Record<string, unknown>;
    expect(entry).not.toHaveProperty("description");
    expect(entry).not.toHaveProperty("photos");
    expect(entry).not.toHaveProperty("practical");
    expect(entry).not.toHaveProperty("directions");
    expect(entry).not.toHaveProperty("tips");
  });
});

describe("buildDetail", () => {
  it("returns the full location object", () => {
    const detail = buildDetail(sampleLocation);
    expect(detail).toEqual(sampleLocation);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/scripts/build-locations.test.ts`

Expected: FAIL — `buildIndex` and `buildDetail` are not exported.

- [ ] **Step 3: Implement the build script**

Create `scripts/build-locations.ts`:
```typescript
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type { Location, LocationIndexEntry } from "../src/lib/types";

export function buildIndex(locations: Location[]): LocationIndexEntry[] {
  return locations.map((loc) => ({
    slug: loc.slug,
    name: loc.name,
    type: loc.type,
    coordinates: loc.coordinates,
    country: loc.country,
    status: loc.status,
    tags: loc.tags,
  }));
}

export function buildDetail(location: Location): Location {
  return location;
}

// CLI entrypoint
if (process.argv[1] && process.argv[1].includes("build-locations")) {
  const locationsDir = path.resolve(process.cwd(), "data/locations");
  const outputDir = path.resolve(process.cwd(), "public/generated");
  const detailDir = path.join(outputDir, "locations");

  fs.mkdirSync(detailDir, { recursive: true });

  const files = fs.readdirSync(locationsDir).filter((f) => f.endsWith(".yaml"));
  const locations: Location[] = [];

  for (const file of files) {
    const filePath = path.join(locationsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = yaml.load(content) as Location;
    locations.push(data);

    const detail = buildDetail(data);
    fs.writeFileSync(
      path.join(detailDir, `${data.slug}.json`),
      JSON.stringify(detail, null, 2)
    );
    console.log(`  → ${data.slug}.json`);
  }

  const index = buildIndex(locations);
  fs.writeFileSync(
    path.join(outputDir, "locations-index.json"),
    JSON.stringify(index, null, 2)
  );

  console.log(`\nBuilt ${locations.length} locations → public/generated/`);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/scripts/build-locations.test.ts`

Expected: All 3 tests PASS.

- [ ] **Step 5: Run build against sample data**

Run: `npm run build:data`

Expected:
```
  → fairy-pools.json
  → hamilton-pool.json
  → niagara-falls.json

Built 3 locations → public/generated/
```

Verify output files exist:
```bash
ls public/generated/locations-index.json public/generated/locations/
```

- [ ] **Step 6: Commit**

```bash
git add scripts/build-locations.ts __tests__/scripts/build-locations.test.ts
git commit -m "feat: add build script to generate location JSON from YAML"
```

---

## Task 6: Filter and Search Logic (TDD)

**Files:**
- Create: `src/lib/filters.ts`, `__tests__/lib/filters.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/filters.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import { filterLocations } from "../../src/lib/filters";
import type { LocationIndexEntry, Filters } from "../../src/lib/types";

const emptyFilters: Filters = {
  type: null,
  accessibility: null,
  season: null,
  cost: null,
  siteStatus: null,
  search: "",
};

const locations: LocationIndexEntry[] = [
  {
    slug: "niagara-falls",
    name: "Niagara Falls",
    type: "waterfall",
    coordinates: { lat: 43.0, lng: -79.0 },
    country: "CA",
    status: { site: "open", waterAccess: "open", note: "", lastVerified: "2026-01-01" },
    tags: ["family-friendly", "iconic"],
  },
  {
    slug: "hamilton-pool",
    name: "Hamilton Pool",
    type: "swimming-hole",
    coordinates: { lat: 30.3, lng: -98.1 },
    country: "US",
    status: { site: "open", waterAccess: "seasonal", note: "", lastVerified: "2026-01-01" },
    tags: ["scenic"],
  },
  {
    slug: "closed-creek",
    name: "Closed Creek",
    type: "creek",
    coordinates: { lat: 0, lng: 0 },
    country: "AU",
    status: { site: "closed", waterAccess: "closed", note: "", lastVerified: "2026-01-01" },
    tags: [],
  },
];

describe("filterLocations", () => {
  it("returns all locations when no filters are active", () => {
    const result = filterLocations(locations, emptyFilters);
    expect(result).toHaveLength(3);
  });

  it("filters by type", () => {
    const result = filterLocations(locations, { ...emptyFilters, type: "waterfall" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("niagara-falls");
  });

  it("filters by site status", () => {
    const result = filterLocations(locations, { ...emptyFilters, siteStatus: "closed" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("closed-creek");
  });

  it("searches by name (case-insensitive)", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "hamilton" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("hamilton-pool");
  });

  it("searches by country code", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "AU" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("closed-creek");
  });

  it("searches by tag", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "iconic" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("niagara-falls");
  });

  it("combines type filter with search", () => {
    const result = filterLocations(locations, {
      ...emptyFilters,
      type: "waterfall",
      search: "niagara",
    });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("niagara-falls");
  });

  it("returns empty when no match", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "nonexistent" });
    expect(result).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/filters.test.ts`

Expected: FAIL — `filterLocations` is not exported.

- [ ] **Step 3: Implement filter logic**

Create `src/lib/filters.ts`:
```typescript
import type { LocationIndexEntry, Filters } from "./types";

export function filterLocations(
  locations: LocationIndexEntry[],
  filters: Filters
): LocationIndexEntry[] {
  return locations.filter((loc) => {
    if (filters.type && loc.type !== filters.type) return false;
    if (filters.siteStatus && loc.status.site !== filters.siteStatus) return false;

    if (filters.search) {
      const term = filters.search.toLowerCase();
      const searchable = [
        loc.name,
        loc.country,
        ...loc.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(term)) return false;
    }

    return true;
  });
}
```

Note: The `accessibility`, `season`, and `cost` filters are defined in the `Filters` type but cannot be applied against `LocationIndexEntry` (which doesn't include `practical`). These filters will be applied client-side after loading full location data, or the index can be extended later. For now, the index-level filters cover type, status, and search.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/filters.test.ts`

Expected: All 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/filters.ts __tests__/lib/filters.test.ts
git commit -m "feat: add location filter and search logic with tests"
```

---

## Task 7: Bookmark Utilities (TDD)

**Files:**
- Create: `src/lib/bookmarks.ts`, `__tests__/lib/bookmarks.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/lib/bookmarks.test.ts`:
```typescript
import { describe, it, expect, beforeEach } from "vitest";
import {
  getBookmarks,
  addBookmark,
  removeBookmark,
  isBookmarked,
} from "../../src/lib/bookmarks";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
  get length() { return Object.keys(store).length; },
  key: (i: number) => Object.keys(store)[i] ?? null,
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock });

describe("bookmarks", () => {
  beforeEach(() => {
    localStorageMock.clear();
  });

  it("returns empty array when no bookmarks exist", () => {
    expect(getBookmarks()).toEqual([]);
  });

  it("adds a bookmark", () => {
    addBookmark("niagara-falls");
    expect(getBookmarks()).toEqual(["niagara-falls"]);
  });

  it("does not add duplicate bookmarks", () => {
    addBookmark("niagara-falls");
    addBookmark("niagara-falls");
    expect(getBookmarks()).toEqual(["niagara-falls"]);
  });

  it("removes a bookmark", () => {
    addBookmark("niagara-falls");
    addBookmark("hamilton-pool");
    removeBookmark("niagara-falls");
    expect(getBookmarks()).toEqual(["hamilton-pool"]);
  });

  it("checks if a slug is bookmarked", () => {
    addBookmark("niagara-falls");
    expect(isBookmarked("niagara-falls")).toBe(true);
    expect(isBookmarked("hamilton-pool")).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/lib/bookmarks.test.ts`

Expected: FAIL — functions not found.

- [ ] **Step 3: Implement bookmark utilities**

Create `src/lib/bookmarks.ts`:
```typescript
const STORAGE_KEY = "dripmap-bookmarks";

export function getBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

export function addBookmark(slug: string): void {
  const bookmarks = getBookmarks();
  if (!bookmarks.includes(slug)) {
    bookmarks.push(slug);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
  }
}

export function removeBookmark(slug: string): void {
  const bookmarks = getBookmarks().filter((b) => b !== slug);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(bookmarks));
}

export function isBookmarked(slug: string): boolean {
  return getBookmarks().includes(slug);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/lib/bookmarks.test.ts`

Expected: All 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/bookmarks.ts __tests__/lib/bookmarks.test.ts
git commit -m "feat: add localStorage bookmark utilities with tests"
```

---

## Task 8: Data Loading Utilities

**Files:**
- Create: `src/lib/locations.ts`

- [ ] **Step 1: Implement data loading functions**

Create `src/lib/locations.ts`:
```typescript
import type { Location, LocationIndexEntry } from "./types";

export async function getLocationIndex(): Promise<LocationIndexEntry[]> {
  const res = await fetch("/generated/locations-index.json");
  if (!res.ok) throw new Error("Failed to load location index");
  return res.json();
}

export async function getLocationDetail(slug: string): Promise<Location> {
  const res = await fetch(`/generated/locations/${slug}.json`);
  if (!res.ok) throw new Error(`Failed to load location: ${slug}`);
  return res.json();
}

// For static generation: reads from filesystem at build time
export function getLocationIndexStatic(): LocationIndexEntry[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require("../../public/generated/locations-index.json");
  return data as LocationIndexEntry[];
}

export function getLocationDetailStatic(slug: string): Location {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require(`../../public/generated/locations/${slug}.json`);
  return data as Location;
}

export function getAllLocationSlugs(): string[] {
  const index = getLocationIndexStatic();
  return index.map((loc) => loc.slug);
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/locations.ts
git commit -m "feat: add location data loading utilities"
```

---

## Task 9: Root Layout, Header, Footer

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css`
- Create: `src/components/Header.tsx`, `src/components/Footer.tsx`

- [ ] **Step 1: Update globals.css**

Replace `src/app/globals.css` with:
```css
@import "tailwindcss";

:root {
  --color-water: #3b82f6;
  --color-water-dark: #1d4ed8;
  --color-water-light: #dbeafe;
}

html,
body {
  height: 100%;
  margin: 0;
}

/* Leaflet container needs explicit height */
.leaflet-container {
  height: 100%;
  width: 100%;
}
```

- [ ] **Step 2: Create Header component**

Create `src/components/Header.tsx`:
```tsx
import Link from "next/link";
import { Droplets, Search, Info } from "lucide-react";

interface HeaderProps {
  onSearchClick?: () => void;
  showSearch?: boolean;
}

export default function Header({ onSearchClick, showSearch = true }: HeaderProps) {
  return (
    <header className="flex items-center justify-between px-4 py-3 bg-white border-b border-gray-200 z-50 relative">
      <Link href="/" className="flex items-center gap-2 text-blue-600 font-bold text-lg">
        <Droplets className="w-6 h-6" />
        <span>dripmap</span>
      </Link>
      <nav className="flex items-center gap-3">
        {showSearch && onSearchClick && (
          <button
            onClick={onSearchClick}
            className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
            aria-label="Search locations"
          >
            <Search className="w-5 h-5" />
          </button>
        )}
        <Link
          href="/about"
          className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
          aria-label="About dripmap"
        >
          <Info className="w-5 h-5" />
        </Link>
      </nav>
    </header>
  );
}
```

- [ ] **Step 3: Create Footer component**

Create `src/components/Footer.tsx`:
```tsx
export default function Footer() {
  return (
    <footer className="px-4 py-6 text-center text-sm text-gray-500 border-t border-gray-200">
      <p>dripmap &mdash; Find water play locations worldwide</p>
    </footer>
  );
}
```

- [ ] **Step 4: Update root layout**

Replace `src/app/layout.tsx`:
```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "dripmap — Find Water Play Locations",
  description: "Discover waterfalls, swimming holes, splash pads, and more worldwide.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#3b82f6",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-full bg-white text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/globals.css src/components/Header.tsx src/components/Footer.tsx
git commit -m "feat: add root layout, header, and footer components"
```

---

## Task 10: Status and Type Badge Components

**Files:**
- Create: `src/components/StatusBadge.tsx`, `src/components/TypeBadge.tsx`

- [ ] **Step 1: Create StatusBadge**

Create `src/components/StatusBadge.tsx`:
```tsx
import type { SiteStatus, WaterAccessStatus } from "@/lib/types";

const STATUS_STYLES: Record<string, string> = {
  open: "bg-green-100 text-green-800",
  closed: "bg-red-100 text-red-800",
  seasonal: "bg-amber-100 text-amber-800",
  restricted: "bg-amber-100 text-amber-800",
  unknown: "bg-gray-100 text-gray-600",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  seasonal: "Seasonal",
  restricted: "Restricted",
  unknown: "Unknown",
};

interface StatusBadgeProps {
  status: SiteStatus | WaterAccessStatus;
  label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {label ?? STATUS_LABELS[status]}
    </span>
  );
}
```

- [ ] **Step 2: Create TypeBadge**

Create `src/components/TypeBadge.tsx`:
```tsx
import { Waves, Droplets, CloudRain, Sparkles, TreePine } from "lucide-react";
import type { LocationType } from "@/lib/types";

const TYPE_CONFIG: Record<LocationType, { icon: typeof Waves; label: string; color: string }> = {
  waterfall: { icon: Waves, label: "Waterfall", color: "text-blue-600" },
  "swimming-hole": { icon: Droplets, label: "Swimming Hole", color: "text-cyan-600" },
  "splash-pad": { icon: CloudRain, label: "Splash Pad", color: "text-violet-600" },
  spring: { icon: Sparkles, label: "Spring", color: "text-emerald-600" },
  creek: { icon: TreePine, label: "Creek", color: "text-teal-600" },
};

interface TypeBadgeProps {
  type: LocationType;
  showLabel?: boolean;
}

export default function TypeBadge({ type, showLabel = true }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 ${config.color}`}>
      <Icon className="w-4 h-4" />
      {showLabel && <span className="text-sm font-medium">{config.label}</span>}
    </span>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/StatusBadge.tsx src/components/TypeBadge.tsx
git commit -m "feat: add StatusBadge and TypeBadge components"
```

---

## Task 11: LocationCard Component

**Files:**
- Create: `src/components/LocationCard.tsx`

- [ ] **Step 1: Create LocationCard**

Create `src/components/LocationCard.tsx`:
```tsx
import Link from "next/link";
import type { LocationIndexEntry } from "@/lib/types";
import TypeBadge from "./TypeBadge";
import StatusBadge from "./StatusBadge";

interface LocationCardProps {
  location: LocationIndexEntry;
  onHover?: (slug: string | null) => void;
  isHighlighted?: boolean;
}

export default function LocationCard({
  location,
  onHover,
  isHighlighted,
}: LocationCardProps) {
  return (
    <Link
      href={`/location/${location.slug}`}
      className={`block rounded-lg border p-3 transition-all hover:shadow-md ${
        isHighlighted
          ? "border-blue-400 bg-blue-50 shadow-md"
          : "border-gray-200 bg-white"
      }`}
      onMouseEnter={() => onHover?.(location.slug)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 truncate">{location.name}</h3>
          <div className="flex items-center gap-2 mt-1">
            <TypeBadge type={location.type} showLabel={false} />
            <span className="text-sm text-gray-500">{location.country}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <StatusBadge status={location.status.site} />
          {location.status.site === "open" &&
            location.status.waterAccess !== "open" && (
              <StatusBadge
                status={location.status.waterAccess}
                label={`Water: ${location.status.waterAccess}`}
              />
            )}
        </div>
      </div>
      {location.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {location.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LocationCard.tsx
git commit -m "feat: add LocationCard component"
```

---

## Task 12: LocationList Component

**Files:**
- Create: `src/components/LocationList.tsx`

- [ ] **Step 1: Create LocationList**

Create `src/components/LocationList.tsx`:
```tsx
import type { LocationIndexEntry } from "@/lib/types";
import LocationCard from "./LocationCard";

interface LocationListProps {
  locations: LocationIndexEntry[];
  highlightedSlug: string | null;
  onHover: (slug: string | null) => void;
}

export default function LocationList({
  locations,
  highlightedSlug,
  onHover,
}: LocationListProps) {
  if (locations.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-gray-500">
        <p>No locations match your filters.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      {locations.map((loc) => (
        <LocationCard
          key={loc.slug}
          location={loc}
          onHover={onHover}
          isHighlighted={loc.slug === highlightedSlug}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LocationList.tsx
git commit -m "feat: add LocationList component"
```

---

## Task 13: FilterBar Component

**Files:**
- Create: `src/components/FilterBar.tsx`

- [ ] **Step 1: Create FilterBar**

Create `src/components/FilterBar.tsx`:
```tsx
"use client";

import { Search, X } from "lucide-react";
import type { Filters, LocationType, SiteStatus } from "@/lib/types";

const TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: "waterfall", label: "Waterfall" },
  { value: "swimming-hole", label: "Swimming Hole" },
  { value: "splash-pad", label: "Splash Pad" },
  { value: "spring", label: "Spring" },
  { value: "creek", label: "Creek" },
];

const STATUS_OPTIONS: { value: SiteStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "seasonal", label: "Seasonal" },
];

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  resultCount: number;
  showSearch: boolean;
  onToggleSearch: () => void;
}

export default function FilterBar({
  filters,
  onChange,
  resultCount,
  showSearch,
  onToggleSearch,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.type || filters.siteStatus || filters.search;

  return (
    <div className="border-b border-gray-200 bg-white">
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search locations..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="flex-1 text-sm outline-none bg-transparent"
            autoFocus
          />
          <button
            onClick={onToggleSearch}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">
        <select
          value={filters.type ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              type: (e.target.value as LocationType) || null,
            })
          }
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
        >
          <option value="">All Types</option>
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.siteStatus ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              siteStatus: (e.target.value as SiteStatus) || null,
            })
          }
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
        >
          <option value="">Any Status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        {hasActiveFilters && (
          <button
            onClick={() =>
              onChange({
                type: null,
                accessibility: null,
                season: null,
                cost: null,
                siteStatus: null,
                search: "",
              })
            }
            className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            Clear all
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto whitespace-nowrap">
          {resultCount} location{resultCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/FilterBar.tsx
git commit -m "feat: add FilterBar component with type, status, and search filters"
```

---

## Task 14: BottomSheet Component

**Files:**
- Create: `src/components/BottomSheet.tsx`

- [ ] **Step 1: Create BottomSheet**

Create `src/components/BottomSheet.tsx`:
```tsx
"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface BottomSheetProps {
  children: React.ReactNode;
}

const SNAP_PEEK = 140;     // collapsed: shows drag handle + a bit of content
const SNAP_HALF = 0.5;     // fraction of viewport
const SNAP_FULL = 0.9;     // fraction of viewport

export default function BottomSheet({ children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [sheetHeight, setSheetHeight] = useState(SNAP_PEEK);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartY = useRef(0);
  const dragStartHeight = useRef(0);

  const snapToNearest = useCallback((height: number) => {
    const vh = window.innerHeight;
    const peekDist = Math.abs(height - SNAP_PEEK);
    const halfDist = Math.abs(height - vh * SNAP_HALF);
    const fullDist = Math.abs(height - vh * SNAP_FULL);
    const minDist = Math.min(peekDist, halfDist, fullDist);

    if (minDist === peekDist) return SNAP_PEEK;
    if (minDist === halfDist) return vh * SNAP_HALF;
    return vh * SNAP_FULL;
  }, []);

  const handleDragStart = useCallback(
    (clientY: number) => {
      setIsDragging(true);
      dragStartY.current = clientY;
      dragStartHeight.current = sheetHeight;
    },
    [sheetHeight]
  );

  const handleDragMove = useCallback(
    (clientY: number) => {
      if (!isDragging) return;
      const delta = dragStartY.current - clientY;
      const newHeight = Math.max(
        SNAP_PEEK,
        Math.min(window.innerHeight * SNAP_FULL, dragStartHeight.current + delta)
      );
      setSheetHeight(newHeight);
    },
    [isDragging]
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setSheetHeight((h) => snapToNearest(h));
  }, [snapToNearest]);

  useEffect(() => {
    if (!isDragging) return;

    const onMouseMove = (e: MouseEvent) => handleDragMove(e.clientY);
    const onMouseUp = () => handleDragEnd();
    const onTouchMove = (e: TouchEvent) => handleDragMove(e.touches[0].clientY);
    const onTouchEnd = () => handleDragEnd();

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  return (
    <div
      ref={sheetRef}
      className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-[0_-2px_16px_rgba(0,0,0,0.12)] z-40 flex flex-col lg:hidden"
      style={{
        height: sheetHeight,
        transition: isDragging ? "none" : "height 0.3s ease-out",
      }}
    >
      {/* Drag handle */}
      <div
        className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing shrink-0"
        onMouseDown={(e) => handleDragStart(e.clientY)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
      >
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/BottomSheet.tsx
git commit -m "feat: add draggable BottomSheet component with snap points"
```

---

## Task 15: LocationMap Component

**Files:**
- Create: `src/components/LocationMap.tsx`

- [ ] **Step 1: Create LocationMap**

Create `src/components/LocationMap.tsx`:
```tsx
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { LocationIndexEntry, LocationType } from "@/lib/types";

const PIN_COLORS: Record<LocationType, string> = {
  waterfall: "#2563eb",
  "swimming-hole": "#0891b2",
  "splash-pad": "#7c3aed",
  spring: "#059669",
  creek: "#0d9488",
};

function createPinIcon(type: LocationType): L.DivIcon {
  const color = PIN_COLORS[type];
  return L.divIcon({
    className: "",
    html: `<div style="
      width: 28px; height: 28px;
      background: ${color};
      border: 2px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 28],
    popupAnchor: [0, -28],
  });
}

interface LocationMapProps {
  locations: LocationIndexEntry[];
  highlightedSlug: string | null;
  onMarkerClick: (slug: string) => void;
  onMarkerHover: (slug: string | null) => void;
}

export default function LocationMap({
  locations,
  highlightedSlug,
  onMarkerClick,
  onMarkerHover,
}: LocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
    }).setView([20, 0], 2);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    L.control.zoom({ position: "topright" }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when locations change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add new markers
    for (const loc of locations) {
      const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], {
        icon: createPinIcon(loc.type),
      })
        .addTo(map)
        .bindPopup(
          `<strong>${loc.name}</strong><br/><span style="text-transform:capitalize">${loc.type.replace("-", " ")}</span>`
        );

      marker.on("click", () => onMarkerClick(loc.slug));
      marker.on("mouseover", () => onMarkerHover(loc.slug));
      marker.on("mouseout", () => onMarkerHover(null));

      markersRef.current.set(loc.slug, marker);
    }

    // Fit bounds if there are locations
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((l) => [l.coordinates.lat, l.coordinates.lng])
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 10 });
    }
  }, [locations, onMarkerClick, onMarkerHover]);

  // Highlight effect
  useEffect(() => {
    if (!highlightedSlug) return;

    const marker = markersRef.current.get(highlightedSlug);
    if (marker) {
      marker.openPopup();
    }

    return () => {
      if (marker) marker.closePopup();
    };
  }, [highlightedSlug]);

  return <div ref={mapContainerRef} className="h-full w-full" />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/LocationMap.tsx
git commit -m "feat: add Leaflet LocationMap with colored pins and hover interaction"
```

---

## Task 16: Home Page Assembly

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Build the home page**

Replace `src/app/page.tsx`:
```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import LocationList from "@/components/LocationList";
import BottomSheet from "@/components/BottomSheet";
import { filterLocations } from "@/lib/filters";
import type { LocationIndexEntry, Filters } from "@/lib/types";

const LocationMap = dynamic(() => import("@/components/LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-blue-50 flex items-center justify-center">
      <p className="text-blue-400">Loading map...</p>
    </div>
  ),
});

const emptyFilters: Filters = {
  type: null,
  accessibility: null,
  season: null,
  cost: null,
  siteStatus: null,
  search: "",
};

export default function HomePage() {
  const [allLocations, setAllLocations] = useState<LocationIndexEntry[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    fetch("/generated/locations-index.json")
      .then((res) => res.json())
      .then((data: LocationIndexEntry[]) => setAllLocations(data))
      .catch(() => setAllLocations([]));
  }, []);

  const filteredLocations = filterLocations(allLocations, filters);

  const handleMarkerClick = useCallback((slug: string) => {
    setHighlightedSlug(slug);
  }, []);

  const handleMarkerHover = useCallback((slug: string | null) => {
    setHighlightedSlug(slug);
  }, []);

  const handleToggleSearch = useCallback(() => {
    setShowSearch((prev) => !prev);
    if (showSearch) {
      setFilters((f) => ({ ...f, search: "" }));
    }
  }, [showSearch]);

  return (
    <div className="h-screen flex flex-col">
      <Header onSearchClick={handleToggleSearch} showSearch />

      {/* Desktop layout: side-by-side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <LocationMap
            locations={filteredLocations}
            highlightedSlug={highlightedSlug}
            onMarkerClick={handleMarkerClick}
            onMarkerHover={handleMarkerHover}
          />
        </div>

        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden lg:flex lg:flex-col lg:w-96 lg:border-l lg:border-gray-200">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            resultCount={filteredLocations.length}
            showSearch={showSearch}
            onToggleSearch={handleToggleSearch}
          />
          <div className="flex-1 overflow-y-auto">
            <LocationList
              locations={filteredLocations}
              highlightedSlug={highlightedSlug}
              onHover={setHighlightedSlug}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <BottomSheet>
        <FilterBar
          filters={filters}
          onChange={setFilters}
          resultCount={filteredLocations.length}
          showSearch={showSearch}
          onToggleSearch={handleToggleSearch}
        />
        <LocationList
          locations={filteredLocations}
          highlightedSlug={highlightedSlug}
          onHover={setHighlightedSlug}
        />
      </BottomSheet>
    </div>
  );
}
```

- [ ] **Step 2: Verify home page loads**

Run: `npm run build:data && npm run dev`

Open browser at `http://localhost:3000`. Expected:
- Map renders with 3 colored pins
- Desktop: sidebar with location cards and filter dropdowns
- Hovering a card highlights the map pin (opens popup)
- Clicking a pin highlights the card
- Filters narrow the list and map pins

- [ ] **Step 3: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat: build home page with map, bottom sheet, filters, and list"
```

---

## Task 17: MiniMap and BookmarkButton Components

**Files:**
- Create: `src/components/MiniMap.tsx`, `src/components/BookmarkButton.tsx`

- [ ] **Step 1: Create MiniMap**

Create `src/components/MiniMap.tsx`:
```tsx
"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates } from "@/lib/types";

interface MiniMapProps {
  coordinates: Coordinates;
  name: string;
}

export default function MiniMap({ coordinates, name }: MiniMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    }).setView([coordinates.lat, coordinates.lng], 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    L.marker([coordinates.lat, coordinates.lng])
      .addTo(map)
      .bindPopup(name);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [coordinates, name]);

  return (
    <div
      ref={containerRef}
      className="h-48 w-full rounded-lg overflow-hidden border border-gray-200"
    />
  );
}
```

- [ ] **Step 2: Create BookmarkButton**

Create `src/components/BookmarkButton.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { Bookmark } from "lucide-react";
import { isBookmarked, addBookmark, removeBookmark } from "@/lib/bookmarks";

interface BookmarkButtonProps {
  slug: string;
}

export default function BookmarkButton({ slug }: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false);

  useEffect(() => {
    setBookmarked(isBookmarked(slug));
  }, [slug]);

  const toggle = () => {
    if (bookmarked) {
      removeBookmark(slug);
    } else {
      addBookmark(slug);
    }
    setBookmarked(!bookmarked);
  };

  return (
    <button
      onClick={toggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
        bookmarked
          ? "bg-blue-50 border-blue-300 text-blue-700"
          : "bg-white border-gray-300 text-gray-700 hover:border-blue-300"
      }`}
      aria-label={bookmarked ? "Remove bookmark" : "Bookmark this location"}
    >
      <Bookmark
        className={`w-5 h-5 ${bookmarked ? "fill-blue-600" : ""}`}
      />
      <span className="text-sm font-medium">
        {bookmarked ? "Bookmarked" : "Bookmark"}
      </span>
    </button>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/MiniMap.tsx src/components/BookmarkButton.tsx
git commit -m "feat: add MiniMap and BookmarkButton components"
```

---

## Task 18: Location Detail Page

**Files:**
- Create: `src/app/location/[slug]/page.tsx`

- [ ] **Step 1: Create the detail page**

Create `src/app/location/[slug]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { ArrowLeft, MapPin, Car, Shield, DollarSign, Calendar, AlertTriangle } from "lucide-react";
import { getLocationDetailStatic, getAllLocationSlugs } from "@/lib/locations";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import StatusBadge from "@/components/StatusBadge";
import TypeBadge from "@/components/TypeBadge";
import BookmarkButton from "@/components/BookmarkButton";
import type { Metadata } from "next";

const MiniMap = dynamic(() => import("@/components/MiniMap"), { ssr: false });

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const slugs = getAllLocationSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const location = getLocationDetailStatic(slug);
    return {
      title: `${location.name} — dripmap`,
      description: location.description.slice(0, 160),
    };
  } catch {
    return { title: "Location not found — dripmap" };
  }
}

export default async function LocationPage({ params }: PageProps) {
  const { slug } = await params;

  let location;
  try {
    location = getLocationDetailStatic(slug);
  } catch {
    notFound();
  }

  const p = location.practical;

  return (
    <div className="min-h-screen flex flex-col">
      <Header showSearch={false} />

      <main className="flex-1">
        {/* Hero area */}
        <div className="bg-blue-50 h-48 flex items-center justify-center">
          {location.photos.length > 0 ? (
            <div className="text-center text-gray-500 text-sm">
              <MapPin className="w-8 h-8 mx-auto mb-2 text-blue-400" />
              <p>{location.photos[0].alt}</p>
            </div>
          ) : (
            <MapPin className="w-12 h-12 text-blue-300" />
          )}
        </div>

        <div className="max-w-2xl mx-auto px-4 py-6">
          {/* Back link */}
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to map
          </Link>

          {/* Title and badges */}
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {location.name}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <TypeBadge type={location.type} />
                <span className="text-sm text-gray-500">
                  {location.country}
                </span>
              </div>
            </div>
            <BookmarkButton slug={location.slug} />
          </div>

          {/* Status */}
          <div className="flex items-center gap-2 mb-6">
            <StatusBadge status={location.status.site} label={`Site: ${location.status.site}`} />
            <StatusBadge
              status={location.status.waterAccess}
              label={`Water: ${location.status.waterAccess}`}
            />
            {location.status.note && (
              <p className="text-sm text-amber-700 ml-2">
                {location.status.note}
              </p>
            )}
          </div>

          {/* Description */}
          <section className="mb-6">
            <p className="text-gray-700 leading-relaxed">
              {location.description}
            </p>
          </section>

          {/* Practical info */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Practical Info
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Accessibility</p>
                  <p className="text-sm font-medium capitalize">
                    {p.accessibility.replace("-", " ")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Parking</p>
                  <p className="text-sm font-medium capitalize">{p.parking}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Danger Level</p>
                  <p className="text-sm font-medium capitalize">
                    {p.dangerLevel}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Cost</p>
                  <p className="text-sm font-medium capitalize">{p.cost}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 col-span-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Best Season</p>
                  <p className="text-sm font-medium capitalize">
                    {p.bestSeason.join(", ")}
                  </p>
                </div>
              </div>
            </div>

            {p.facilities.length > 0 && (
              <div className="mt-3">
                <p className="text-xs text-gray-500 mb-1">Facilities</p>
                <div className="flex flex-wrap gap-1">
                  {p.facilities.map((f) => (
                    <span
                      key={f}
                      className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded capitalize"
                    >
                      {f.replace("-", " ")}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>

          {/* Directions */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Directions
            </h2>
            <p className="text-gray-700 text-sm leading-relaxed">
              {location.directions}
            </p>
          </section>

          {/* Tips */}
          {location.tips.length > 0 && (
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Tips
              </h2>
              <ul className="space-y-2">
                {location.tips.map((tip, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="text-blue-500 mt-0.5">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Tags */}
          {location.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-6">
              {location.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Mini map */}
          <section className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Location
            </h2>
            <MiniMap
              coordinates={location.coordinates}
              name={location.name}
            />
            <p className="text-xs text-gray-500 mt-1">
              {location.coordinates.lat.toFixed(4)},{" "}
              {location.coordinates.lng.toFixed(4)}
            </p>
          </section>

          <p className="text-xs text-gray-400 mb-6">
            Last verified: {location.status.lastVerified}
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Verify detail page**

Run: `npm run build:data && npm run dev`

Open `http://localhost:3000/location/niagara-falls`. Expected:
- Hero placeholder area
- Name, type badge, status badges
- Practical info grid
- Directions and tips
- Mini map with pin
- Bookmark button toggles
- Back link returns to home

- [ ] **Step 3: Commit**

```bash
git add src/app/location/
git commit -m "feat: add location detail page with all sections and mini map"
```

---

## Task 19: About Page

**Files:**
- Create: `src/app/about/page.tsx`

- [ ] **Step 1: Create about page**

Create `src/app/about/page.tsx`:
```tsx
import { Droplets } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

export const metadata = {
  title: "About — dripmap",
  description: "Learn about dripmap and how we curate water play locations.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header showSearch={false} />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-12">
        <div className="flex items-center gap-3 mb-6">
          <Droplets className="w-10 h-10 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">About dripmap</h1>
        </div>

        <div className="space-y-4 text-gray-700 leading-relaxed">
          <p>
            dripmap helps you discover water play locations around the world —
            waterfalls, swimming holes, splash pads, springs, and creeks.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            How it works
          </h2>
          <p>
            Every location on dripmap is editorially curated. We verify details
            like accessibility, parking, status, and seasonal availability so
            you can plan your visit with confidence.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            Offline access
          </h2>
          <p>
            dripmap works offline. Once you&apos;ve loaded the app, location data is
            cached on your device. Bookmark your favorites and the details will
            be available even without cell service — perfect for remote
            waterfalls and backcountry swimming holes.
          </p>

          <h2 className="text-xl font-semibold text-gray-900 pt-4">
            Suggest a location
          </h2>
          <p>
            Know a great water play spot that&apos;s not on dripmap yet? We&apos;d love
            to hear about it. Reach out and we&apos;ll review it for inclusion.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/about/
git commit -m "feat: add about page"
```

---

## Task 20: PWA Configuration

**Files:**
- Create: `public/manifest.json`, `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Modify: `next.config.ts`

- [ ] **Step 1: Create PWA manifest**

Create `public/manifest.json`:
```json
{
  "name": "dripmap",
  "short_name": "dripmap",
  "description": "Find water play locations worldwide",
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

- [ ] **Step 2: Generate placeholder icons**

```bash
mkdir -p public/icons
# Generate simple blue circle placeholder icons using ImageMagick (if available)
# or create minimal valid PNGs. These are placeholders — replace with real icons later.
npx tsx -e "
const fs = require('fs');
// Minimal 1x1 blue PNG as placeholder (will be replaced with real icons)
const pngHeader = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
  0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
  0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0x68, 0x60, 0xf8, 0xcf,
  0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00, 0x00,
  0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);
fs.writeFileSync('public/icons/icon-192.png', pngHeader);
fs.writeFileSync('public/icons/icon-512.png', pngHeader);
console.log('Placeholder icons created');
"
```

- [ ] **Step 3: Configure next-pwa**

Update `next.config.ts`:
```typescript
import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/[abc]\.tile\.openstreetmap\.org\/.*/i,
      handler: "CacheFirst",
      options: {
        cacheName: "map-tiles",
        expiration: {
          maxEntries: 1000,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/generated\/locations\/.*\.json$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "location-details",
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/generated\/locations-index\.json$/i,
      handler: "StaleWhileRevalidate",
      options: {
        cacheName: "location-index",
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\/images\/.*$/i,
      handler: "CacheFirst",
      options: {
        cacheName: "images",
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
  ],
});

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
  },
};

export default withPWA(nextConfig);
```

- [ ] **Step 4: Commit**

```bash
git add public/manifest.json public/icons/ next.config.ts
git commit -m "feat: configure PWA with manifest, icons, and Workbox caching"
```

---

## Task 21: Full Build Verification

- [ ] **Step 1: Run all tests**

Run:
```bash
npm test
```

Expected: All tests pass (validation, build, filters, bookmarks).

- [ ] **Step 2: Run full build pipeline**

Run:
```bash
npm run build
```

Expected: Build succeeds. Static export generated in `out/` directory with:
- `index.html` (home page)
- `about.html`
- `location/niagara-falls.html`
- `location/hamilton-pool.html`
- `location/fairy-pools.html`

Verify:
```bash
ls out/ out/location/
```

- [ ] **Step 3: Serve and test the static build**

Run:
```bash
npx serve out -p 3001
```

Open `http://localhost:3001` and verify:
- Map loads with 3 pins
- Filter dropdowns work
- Location cards render
- Clicking a card navigates to detail page
- Detail page shows all sections
- About page renders
- Bookmark button toggles state
- Back to map link works

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "chore: verify full build and static export"
```
