# Drift Phase 2: Constraint-Based Discovery UX

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add constraint-based discovery to Drift — a context bar with tappable chips (distance, date, cost, group) that filter and score places based on the user's situation.

**Architecture:** A new `ContextBar` component sits above the existing `FilterBar`. Constraint state lives in a `Constraints` type alongside existing `Filters`. A new `applyConstraints` function handles hard filtering (date, distance) and soft scoring (cost, group). Weather is deferred to a future iteration to keep scope tight.

**Tech Stack:** TypeScript, React, Tailwind CSS 4, date-fns (new dep for date manipulation)

**Scope decisions:**
- Weather chip: **deferred** (requires API integration, adds complexity; placeholder chip showing temp if available)
- Group chip: **simplified** — persona selection only (Solo, Adults, Family, Group), no detailed age input
- Distance: haversine × 1.4 road factor → approximate drive time (no routing API)
- Date: quick picks + basic date input, recurring day toggle
- Location chip: shows "Near you" or "Victoria" — tappable to re-trigger GPS, no location search yet

---

### Task 1: Add constraint types and event date matching

**Files:**
- Modify: `src/lib/types.ts` (add Constraints type)
- Create: `src/lib/event-dates.ts`
- Create: `__tests__/lib/event-dates.test.ts`

- [ ] **Step 1: Add Constraints type to types.ts**

Add after the `Filters` interface:

```typescript
export type DistanceThreshold = "30min" | "1hr" | "2hr" | "daytrip" | "any";
export type CostFilter = "free" | "free-$" | "$$-under" | "any";
export type GroupType = "solo" | "adults" | "family-young" | "family-older" | "friends" | null;

export type DateMode =
  | { mode: "specific"; date: Date }
  | { mode: "recurring"; days: number[] }  // 0=Sun, 1=Mon, ..., 6=Sat
  | null;

export interface Constraints {
  distance: DistanceThreshold;
  date: DateMode;
  cost: CostFilter;
  group: GroupType;
}
```

- [ ] **Step 2: Write event date matching tests**

Create `__tests__/lib/event-dates.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { isEventOnDate, isEventOnDayOfWeek } from "../../src/lib/event-dates";
import type { Recurrence } from "../../src/lib/types";

describe("isEventOnDate", () => {
  it("matches a one-off event on its date", () => {
    const rec: Recurrence = { type: "once", date: "2026-01-18" };
    expect(isEventOnDate(rec, new Date("2026-01-18"))).toBe(true);
    expect(isEventOnDate(rec, new Date("2026-01-19"))).toBe(false);
  });

  it("matches a range event within its dates", () => {
    const rec: Recurrence = { type: "range", startDate: "2026-01-01", endDate: "2026-01-31" };
    expect(isEventOnDate(rec, new Date("2026-01-15"))).toBe(true);
    expect(isEventOnDate(rec, new Date("2026-02-01"))).toBe(false);
  });

  it("matches a range event with day filter", () => {
    const rec: Recurrence = { type: "range", startDate: "2026-01-01", endDate: "2026-01-31", days: ["wed"] };
    // Jan 7 2026 is a Wednesday
    expect(isEventOnDate(rec, new Date("2026-01-07"))).toBe(true);
    // Jan 8 2026 is a Thursday
    expect(isEventOnDate(rec, new Date("2026-01-08"))).toBe(false);
  });

  it("matches a weekly event on the right day in season", () => {
    const rec: Recurrence = { type: "weekly", days: ["wed"], season: "summer" };
    // Jan 7 2026 is a Wednesday (summer in southern hemisphere)
    expect(isEventOnDate(rec, new Date("2026-01-07"))).toBe(true);
    // Jul 1 2026 is a Wednesday but winter
    expect(isEventOnDate(rec, new Date("2026-07-01"))).toBe(false);
  });

  it("matches a weekly event with no season restriction", () => {
    const rec: Recurrence = { type: "weekly", days: ["fri"] };
    // Jan 2 2026 is a Friday
    expect(isEventOnDate(rec, new Date("2026-01-02"))).toBe(true);
  });

  it("matches annual event in the right month", () => {
    const rec: Recurrence = { type: "annual", month: 3 };
    expect(isEventOnDate(rec, new Date("2026-03-15"))).toBe(true);
    expect(isEventOnDate(rec, new Date("2026-04-15"))).toBe(false);
  });
});

describe("isEventOnDayOfWeek", () => {
  it("matches weekly event on matching day", () => {
    const rec: Recurrence = { type: "weekly", days: ["wed"] };
    expect(isEventOnDayOfWeek(rec, [3])).toBe(true); // 3 = Wednesday
    expect(isEventOnDayOfWeek(rec, [1])).toBe(false);
  });

  it("matches range event with day filter", () => {
    const rec: Recurrence = { type: "range", startDate: "2026-01-01", endDate: "2026-03-31", days: ["sat", "sun"] };
    expect(isEventOnDayOfWeek(rec, [0, 6])).toBe(true); // weekend
    expect(isEventOnDayOfWeek(rec, [1])).toBe(false);
  });

  it("returns true for non-recurring events (always potentially on)", () => {
    const rec: Recurrence = { type: "once", date: "2026-01-18" };
    expect(isEventOnDayOfWeek(rec, [0, 6])).toBe(false); // one-offs excluded from recurring mode
  });

  it("matches annual event (always potentially on recurring days)", () => {
    const rec: Recurrence = { type: "annual", month: 1 };
    expect(isEventOnDayOfWeek(rec, [6])).toBe(true);
  });
});
```

- [ ] **Step 3: Implement event date matching**

Create `src/lib/event-dates.ts`:

```typescript
import type { Recurrence } from "./types";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const SUMMER_MONTHS = [12, 1, 2]; // Southern hemisphere

function isSeason(date: Date, season: string): boolean {
  const month = date.getMonth() + 1;
  switch (season) {
    case "summer": return SUMMER_MONTHS.includes(month);
    case "fall": return [3, 4, 5].includes(month);
    case "winter": return [6, 7, 8].includes(month);
    case "spring": return [9, 10, 11].includes(month);
    default: return true;
  }
}

function dateInRange(date: Date, start: string, end: string): boolean {
  const d = date.toISOString().slice(0, 10);
  return d >= start && d <= end;
}

function dayNameToNumber(name: string): number {
  return DAY_NAMES.indexOf(name.toLowerCase());
}

export function isEventOnDate(rec: Recurrence, date: Date): boolean {
  const dayOfWeek = date.getDay(); // 0=Sun

  switch (rec.type) {
    case "once":
      return date.toISOString().slice(0, 10) === rec.date;

    case "range": {
      if (!dateInRange(date, rec.startDate, rec.endDate)) return false;
      if (rec.days && rec.days.length > 0) {
        return rec.days.some((d) => dayNameToNumber(d) === dayOfWeek);
      }
      return true;
    }

    case "weekly": {
      const matchesDay = rec.days.some((d) => dayNameToNumber(d) === dayOfWeek);
      if (!matchesDay) return false;
      if (rec.season) return isSeason(date, rec.season);
      return true;
    }

    case "annual":
      return (date.getMonth() + 1) === rec.month;
  }
}

export function isEventOnDayOfWeek(rec: Recurrence, days: number[]): boolean {
  switch (rec.type) {
    case "once":
      return false; // one-offs excluded from recurring day mode

    case "range": {
      if (rec.days && rec.days.length > 0) {
        return rec.days.some((d) => days.includes(dayNameToNumber(d)));
      }
      return days.length > 0; // range without day filter runs daily
    }

    case "weekly":
      return rec.days.some((d) => days.includes(dayNameToNumber(d)));

    case "annual":
      return true; // annual events could fall on any day
  }
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run __tests__/lib/event-dates.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/event-dates.ts __tests__/lib/event-dates.test.ts
git commit -m "feat: add Constraints types and event date matching logic"
```

---

### Task 2: Build the constraint engine

**Files:**
- Create: `src/lib/constraints.ts`
- Create: `__tests__/lib/constraints.test.ts`

- [ ] **Step 1: Write constraint engine tests**

Create `__tests__/lib/constraints.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import { applyConstraints, estimateDriveMinutes } from "../../src/lib/constraints";
import type { PlaceIndexEntry, Constraints } from "../../src/lib/types";

const noConstraints: Constraints = {
  distance: "any",
  date: null,
  cost: "any",
  group: null,
};

const swim: PlaceIndexEntry = {
  slug: "test-swim",
  name: "Test Swim",
  type: "swim",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  cost: "free",
  highlights: ["Crystal clear"],
  status: { site: "open", lastVerified: "2026-01-01" },
  tags: ["family-friendly"],
};

const expensiveEvent: PlaceIndexEntry = {
  slug: "fancy-event",
  name: "Fancy Event",
  type: "event",
  coordinates: { lat: -37.82, lng: 144.95 },
  region: "Victoria, Australia",
  country: "AU",
  cost: "$$$",
  highlights: ["Premium experience"],
  status: { site: "open", lastVerified: "2026-01-01" },
  tags: [],
};

const userLocation = { lat: -37.81, lng: 144.96 };

describe("estimateDriveMinutes", () => {
  it("returns approximate drive time using 1.4x road factor", () => {
    // ~1.4km straight line at ~60km/h ≈ ~1.4 minutes
    const mins = estimateDriveMinutes(userLocation, swim.coordinates);
    expect(mins).toBeGreaterThan(0);
    expect(mins).toBeLessThan(30);
  });
});

describe("applyConstraints", () => {
  it("returns all places with no constraints", () => {
    const result = applyConstraints([swim, expensiveEvent], noConstraints, userLocation);
    expect(result).toHaveLength(2);
  });

  it("hard-filters by distance", () => {
    const farSwim = { ...swim, coordinates: { lat: -36.0, lng: 146.0 } }; // ~200km away
    const result = applyConstraints([swim, farSwim], { ...noConstraints, distance: "30min" }, userLocation);
    expect(result.some((r) => r.slug === "test-swim")).toBe(true);
    expect(result.some((r) => r.slug === farSwim.slug)).toBe(false);
  });

  it("soft-scores by cost (free items score higher when cost=free)", () => {
    const result = applyConstraints([swim, expensiveEvent], { ...noConstraints, cost: "free" }, userLocation);
    expect(result).toHaveLength(2); // both still present
    expect(result[0].slug).toBe("test-swim"); // free sorts first
  });

  it("works without user location (skips distance filter)", () => {
    const result = applyConstraints([swim], { ...noConstraints, distance: "30min" }, null);
    expect(result).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Implement constraint engine**

Create `src/lib/constraints.ts`:

```typescript
import type { PlaceIndexEntry, Constraints, Coordinates } from "./types";
import { haversineDistanceKm } from "./useCurrentLocation";

const ROAD_FACTOR = 1.4;
const AVG_SPEED_KMH = 60;

/** Estimate drive time in minutes using straight-line distance × road factor. */
export function estimateDriveMinutes(from: Coordinates, to: Coordinates): number {
  const km = haversineDistanceKm(from, to) * ROAD_FACTOR;
  return (km / AVG_SPEED_KMH) * 60;
}

const DISTANCE_MAX_MINUTES: Record<string, number> = {
  "30min": 30,
  "1hr": 60,
  "2hr": 120,
  "daytrip": 240,
  any: Infinity,
};

function passesDistanceFilter(
  place: PlaceIndexEntry,
  threshold: string,
  userLocation: Coordinates | null,
): boolean {
  if (threshold === "any" || !userLocation) return true;
  const maxMin = DISTANCE_MAX_MINUTES[threshold] ?? Infinity;
  return estimateDriveMinutes(userLocation, place.coordinates) <= maxMin;
}

function costScore(placeCost: string, filter: string): number {
  if (filter === "any") return 0;
  const costRank: Record<string, number> = { free: 0, "$": 1, "$$": 2, "$$$": 3 };
  const placeRank = costRank[placeCost] ?? 2;

  switch (filter) {
    case "free":
      return placeRank === 0 ? 0 : -placeRank * 10;
    case "free-$":
      return placeRank <= 1 ? 0 : -(placeRank - 1) * 10;
    case "$$-under":
      return placeRank <= 2 ? 0 : -(placeRank - 2) * 10;
    default:
      return 0;
  }
}

function groupScore(place: PlaceIndexEntry, group: string | null): number {
  if (!group) return 0;
  // Simple heuristic: family-friendly tags boost for family groups
  const tags = place.tags.join(" ").toLowerCase();
  const hasFamily = tags.includes("family") || tags.includes("kids");
  if (group === "family-young" || group === "family-older") {
    return hasFamily ? 5 : -5;
  }
  if (group === "adults" || group === "solo") {
    // Adventure tags boost for adult groups
    const hasAdventure = tags.includes("adventure") || tags.includes("surf") || tags.includes("cliff");
    return hasAdventure ? 3 : 0;
  }
  return 0;
}

export interface ScoredPlace extends PlaceIndexEntry {
  _score: number;
  _driveMinutes: number | null;
}

export function applyConstraints(
  places: PlaceIndexEntry[],
  constraints: Constraints,
  userLocation: Coordinates | null,
): ScoredPlace[] {
  const scored: ScoredPlace[] = [];

  for (const place of places) {
    // Hard filter: distance
    if (!passesDistanceFilter(place, constraints.distance, userLocation)) continue;

    // Compute drive time for sorting
    const driveMin = userLocation
      ? estimateDriveMinutes(userLocation, place.coordinates)
      : null;

    // Soft scoring
    let score = 0;

    // Proximity bonus (closer = higher score, max 20 points)
    if (driveMin !== null) {
      score += Math.max(0, 20 - driveMin / 6);
    }

    // Cost score
    score += costScore(place.cost, constraints.cost);

    // Group score
    score += groupScore(place, constraints.group);

    scored.push({ ...place, _score: score, _driveMinutes: driveMin });
  }

  // Sort by score descending, then by proximity
  scored.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    if (a._driveMinutes !== null && b._driveMinutes !== null) {
      return a._driveMinutes - b._driveMinutes;
    }
    return 0;
  });

  return scored;
}
```

- [ ] **Step 3: Run tests**

```bash
npx vitest run __tests__/lib/constraints.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/constraints.ts __tests__/lib/constraints.test.ts
git commit -m "feat: constraint engine with distance filtering and soft scoring"
```

---

### Task 3: Build the ContextBar component

**Files:**
- Create: `src/components/ContextBar.tsx`

This is the main UI component — a row of tappable chips. Each chip shows its current value and opens a popover when tapped.

- [ ] **Step 1: Create ContextBar component**

Create `src/components/ContextBar.tsx` — a horizontal row of chip buttons that display current constraint values and toggle popovers for each. Chips: Location, Distance, Date, Cost, Group.

The component receives `constraints`, `onConstraintsChange`, `userLocation`, and handles popover state internally.

Key UI details:
- Chips are compact pill buttons with icons
- Active constraints get a blue highlight
- Popovers are simple dropdown panels positioned below the chip
- Close on outside click
- Mobile-friendly: full-width popovers on small screens

- [ ] **Step 2: Implement chip popovers**

Each popover is inline in the component (not separate components — they're small):
- **Distance**: 5 option buttons in a column
- **Date**: Quick picks row + date input + recurring day toggle
- **Cost**: 4 option buttons
- **Group**: 5 illustrated option buttons (using emoji for v1: 🧍 👫 👨‍👩‍👧 👨‍👩‍👦‍👦 👥)

- [ ] **Step 3: Commit**

```bash
git add src/components/ContextBar.tsx
git commit -m "feat: ContextBar component with constraint chips and popovers"
```

---

### Task 4: Integrate constraints into HomePage

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/LocationList.tsx` (show drive time badge)

- [ ] **Step 1: Add constraint state to HomePage**

Add `Constraints` state, wire up `ContextBar`, pipe constraints through `applyConstraints` alongside `filterLocations`.

Flow: `allLocations → filterLocations(filters) → applyConstraints(constraints, userLocation) → display`

- [ ] **Step 2: Update LocationList/LocationCard to show drive time**

Pass `_driveMinutes` through to cards, display as "~25 min" badge replacing the km distance when available.

- [ ] **Step 3: Add date filtering for events**

In the constraint pipeline, when a date constraint is active:
- Specific date: load full event details for event-type entries, evaluate `isEventOnDate`
- Recurring day: evaluate `isEventOnDayOfWeek`
- Non-event entries always pass date filtering

Since we only have recurrence data in the index for events, add `recurrence` to `PlaceIndexEntry` for event types.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/LocationList.tsx
git commit -m "feat: integrate constraint engine and ContextBar into HomePage"
```

---

### Task 5: Add event recurrence to index and wire up date filtering

**Files:**
- Modify: `src/lib/types.ts` (add optional recurrence to PlaceIndexEntry)
- Modify: `scripts/build-locations.ts` (include recurrence in index for events)
- Modify: `src/lib/constraints.ts` (add date filtering)

- [ ] **Step 1: Add recurrence to index type**

In `PlaceIndexEntry`, add:
```typescript
recurrence?: Recurrence; // only present for event type
```

- [ ] **Step 2: Update build script to include recurrence**

In `buildIndex`, for event-type places, include `details.recurrence` in the index entry.

- [ ] **Step 3: Add date filtering to constraint engine**

In `applyConstraints`, before scoring, filter events based on active date constraint using `isEventOnDate` / `isEventOnDayOfWeek`.

- [ ] **Step 4: Rebuild data, run tests, commit**

```bash
npm run build:data
npx vitest run
git add -A
git commit -m "feat: event date filtering in constraint engine"
```

---

### Task 6: Polish and build verification

**Files:**
- Various touch-ups

- [ ] **Step 1: Ensure ContextBar renders on desktop sidebar too**

Add ContextBar above FilterBar in both the mobile bottom sheet and desktop sidebar.

- [ ] **Step 2: Full build verification**

```bash
npm run build
```

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: Phase 2 complete — constraint-based discovery UX"
```
