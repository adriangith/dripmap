# Eatery Schema Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `eatery` place type to dripmap with type-specific details, validation, map pin colour, and a data directory.

**Architecture:** Follows the existing discriminated union pattern — add types to `src/lib/types.ts`, validation to `scripts/validate-locations.ts`, pin colour to `LocationMap.tsx`. Data lives in `data/locations/eatery/`. No new dependencies.

**Tech Stack:** TypeScript, Vitest, Leaflet

**Spec:** `docs/superpowers/specs/2026-04-13-eatery-schema-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/lib/types.ts` | Add `EateryCuisine`, `DietaryOption`, `EateryDetails`, `EateryPlace`; update `PlaceType` and `Place` unions |
| Modify | `scripts/validate-locations.ts` | Add eatery enum arrays and `validateEateryDetails()`; wire into `validatePlace()` switch |
| Modify | `__tests__/scripts/validate-locations.test.ts` | Add valid eatery fixture and eatery-specific validation tests |
| Modify | `src/components/LocationMap.tsx` | Add `eatery` pin colour |
| Create | `data/locations/eatery/` | Directory for eatery YAML files |

---

### Task 1: Add eatery types to `src/lib/types.ts`

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Add `"eatery"` to `PlaceType` union**

In `src/lib/types.ts`, add `"eatery"` to the `PlaceType` union:

```ts
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
  | "fishing"
  | "eatery";
```

- [ ] **Step 2: Add eatery-specific types and interface**

After the `EventDetails` interface (around line 80), add:

```ts
export type EateryCuisine =
  | "cafe"
  | "restaurant"
  | "pub"
  | "fish-and-chips"
  | "ice-cream"
  | "bakery"
  | "market"
  | "farm-gate"
  | "pick-your-own"
  | "food-truck";

export type DietaryOption =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "allergy-aware";

export interface EateryDetails {
  cuisine: EateryCuisine[];
  seating: "indoor" | "outdoor" | "both";
  booking: "required" | "recommended" | "walk-in";
  bookingUrl: string | null;
  dietaryOptions: DietaryOption[];
  kidsMenu: boolean;
}
```

- [ ] **Step 3: Add `EateryPlace` and update the `Place` union**

After `EventPlace`:

```ts
export interface EateryPlace extends PlaceBase {
  type: "eatery";
  details: EateryDetails;
}
```

Update the `Place` union:

```ts
export type Place = SwimPlace | BeachPlace | EventPlace | EateryPlace;
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add eatery types to PlaceType and Place union"
```

---

### Task 2: Add eatery validation

**Files:**
- Modify: `scripts/validate-locations.ts`
- Modify: `__tests__/scripts/validate-locations.test.ts`

- [ ] **Step 1: Write the failing test — valid eatery accepted**

In `__tests__/scripts/validate-locations.test.ts`, add the `validEatery` fixture after `validEvent`:

```ts
const validEatery = {
  slug: "test-restaurant",
  name: "Test Restaurant",
  type: "eatery",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  description: "A test eatery.",
  photos: [],
  highlights: ["Great food"],
  cost: "$$",
  ageSuitability: { minAge: null, ideal: ["all-ages"] },
  accessibility: "easy",
  parking: "street",
  facilities: ["highchairs"],
  bestSeason: ["spring", "summer", "fall", "winter"],
  directions: "Central Melbourne.",
  tips: [],
  tags: ["family-friendly"],
  status: { site: "open", lastVerified: "2026-04-13" },
  details: {
    cuisine: ["restaurant"],
    seating: "indoor",
    booking: "recommended",
    bookingUrl: "https://example.com/book",
    dietaryOptions: ["vegetarian", "gluten-free"],
    kidsMenu: false,
  },
};
```

Add these tests inside the `describe("validatePlace", ...)` block:

```ts
it("accepts a valid eatery", () => { expect(validatePlace(validEatery)).toEqual([]); });

it("rejects eatery with invalid cuisine value", () => {
  const bad = { ...validEatery, details: { ...validEatery.details, cuisine: ["sushi-train"] } };
  expect(validatePlace(bad)).toContainEqual(expect.stringContaining("cuisine"));
});

it("rejects eatery with empty cuisine array", () => {
  const bad = { ...validEatery, details: { ...validEatery.details, cuisine: [] } };
  expect(validatePlace(bad)).toContainEqual(expect.stringContaining("cuisine"));
});

it("rejects eatery with invalid seating", () => {
  const bad = { ...validEatery, details: { ...validEatery.details, seating: "standing" } };
  expect(validatePlace(bad)).toContainEqual(expect.stringContaining("seating"));
});

it("rejects eatery with invalid booking", () => {
  const bad = { ...validEatery, details: { ...validEatery.details, booking: "maybe" } };
  expect(validatePlace(bad)).toContainEqual(expect.stringContaining("booking"));
});

it("rejects eatery with non-boolean kidsMenu", () => {
  const bad = { ...validEatery, details: { ...validEatery.details, kidsMenu: "yes" } };
  expect(validatePlace(bad)).toContainEqual(expect.stringContaining("kidsMenu"));
});

it("rejects eatery with invalid dietaryOptions value", () => {
  const bad = { ...validEatery, details: { ...validEatery.details, dietaryOptions: ["keto"] } };
  expect(validatePlace(bad)).toContainEqual(expect.stringContaining("dietaryOptions"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run __tests__/scripts/validate-locations.test.ts`
Expected: "accepts a valid eatery" FAILS (eatery not in VALID_TYPES yet), and all eatery detail tests fail

- [ ] **Step 3: Add eatery validation to `scripts/validate-locations.ts`**

Add `"eatery"` to the `VALID_TYPES` array:

```ts
const VALID_TYPES = [
  "swim", "beach", "event", "bushwalk", "lookout", "waterfall",
  "cave", "wildlife", "pool", "cycling", "fishing", "eatery",
];
```

Add enum arrays after the existing event enums:

```ts
// Eatery detail enums
const VALID_EATERY_CUISINE = [
  "cafe", "restaurant", "pub", "fish-and-chips", "ice-cream",
  "bakery", "market", "farm-gate", "pick-your-own", "food-truck",
];
const VALID_DIETARY_OPTION = ["vegetarian", "vegan", "gluten-free", "allergy-aware"];
const VALID_SEATING = ["indoor", "outdoor", "both"];
const VALID_BOOKING = ["required", "recommended", "walk-in"];
```

Add the validation function after `validateEventDetails`:

```ts
function validateEateryDetails(details: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (!Array.isArray(details.cuisine) || (details.cuisine as unknown[]).length === 0) {
    errors.push("details.cuisine: must be a non-empty array");
  } else {
    for (const item of details.cuisine as unknown[]) {
      if (typeof item !== "string" || !VALID_EATERY_CUISINE.includes(item)) {
        errors.push(`details.cuisine: invalid value "${item}", must be one of [${VALID_EATERY_CUISINE.join(", ")}]`);
      }
    }
  }

  errors.push(...checkEnum(details.seating, VALID_SEATING, "details.seating"));
  errors.push(...checkEnum(details.booking, VALID_BOOKING, "details.booking"));

  if (details.bookingUrl !== null && typeof details.bookingUrl !== "string") {
    errors.push("details.bookingUrl: must be a string or null");
  }

  if (!Array.isArray(details.dietaryOptions)) {
    errors.push("details.dietaryOptions: must be an array");
  } else {
    for (const item of details.dietaryOptions as unknown[]) {
      if (typeof item !== "string" || !VALID_DIETARY_OPTION.includes(item)) {
        errors.push(`details.dietaryOptions: invalid value "${item}", must be one of [${VALID_DIETARY_OPTION.join(", ")}]`);
      }
    }
  }

  if (typeof details.kidsMenu !== "boolean") {
    errors.push("details.kidsMenu: must be a boolean");
  }

  return errors;
}
```

Wire it into the `switch` in `validatePlace`:

```ts
    case "eatery":
      errors.push(...validateEateryDetails(details));
      break;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run __tests__/scripts/validate-locations.test.ts`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add scripts/validate-locations.ts __tests__/scripts/validate-locations.test.ts
git commit -m "feat: add eatery validation with tests"
```

---

### Task 3: Add eatery map pin colour

**Files:**
- Modify: `src/components/LocationMap.tsx`

- [ ] **Step 1: Add `eatery` to `PIN_COLORS`**

In `src/components/LocationMap.tsx`, add to the `PIN_COLORS` object:

```ts
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
  eatery: "#e11d48",
};
```

- [ ] **Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors (TypeScript enforces that `PIN_COLORS` covers all `PlaceType` values since it's typed as `Record<PlaceType, string>`)

- [ ] **Step 3: Commit**

```bash
git add src/components/LocationMap.tsx
git commit -m "feat: add eatery pin colour to map"
```

---

### Task 4: Create eatery data directory

**Files:**
- Create: `data/locations/eatery/.gitkeep`

- [ ] **Step 1: Create directory with gitkeep**

```bash
mkdir -p data/locations/eatery
touch data/locations/eatery/.gitkeep
```

- [ ] **Step 2: Run full validation to confirm nothing is broken**

Run: `npm run validate`
Expected: All existing locations pass validation, no errors

- [ ] **Step 3: Run full test suite**

Run: `npm test`
Expected: All tests pass

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add data/locations/eatery/.gitkeep
git commit -m "feat: add eatery data directory"
```
