# Eatery Schema Design

**Date:** 2026-04-13
**Status:** Approved

## Summary

Add a new `eatery` place type to dripmap covering restaurants, cafes, markets, farm gates, and other food experiences. The type follows the existing discriminated union pattern with type-specific `EateryDetails`.

## EateryDetails

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

**Design decisions:**
- `cuisine` is an array — a place can be both a cafe and an ice cream spot.
- `kidsMenu` is a dedicated boolean since it's a key family decision point.
- Kid-friendliness facilities (highchairs, play area, change tables) go in the existing `facilities` array on `PlaceBase`, not duplicated here.
- `bookingUrl` is nullable for walk-in only places.

## Changes Required

### 1. `src/lib/types.ts`

- Add `"eatery"` to the `PlaceType` union
- Add `EateryCuisine`, `DietaryOption`, and `EateryDetails` types
- Add `EateryPlace` extending `PlaceBase` with `type: "eatery"` and `details: EateryDetails`
- Add `EateryPlace` to the `Place` discriminated union

### 2. `scripts/validate-locations.ts`

- Add `"eatery"` to `VALID_TYPES`
- Add enum arrays: `VALID_EATERY_CUISINE`, `VALID_DIETARY_OPTION`, `VALID_SEATING`, `VALID_BOOKING`
- Add `validateEateryDetails()`:
  - `cuisine`: non-empty array, each value in `VALID_EATERY_CUISINE`
  - `seating`: enum check against `VALID_SEATING`
  - `booking`: enum check against `VALID_BOOKING`
  - `bookingUrl`: string or null
  - `dietaryOptions`: array, each value in `VALID_DIETARY_OPTION`
  - `kidsMenu`: boolean check
- Wire into the `switch` in `validatePlace()`

### 3. `src/components/LocationMap.tsx`

- Add pin colour: `eatery: "#e11d48"` (warm rose/red, distinct from existing colours)

### 4. `data/locations/eatery/`

- New subdirectory for eatery YAML files

### 5. No changes needed

- `scripts/build-locations.ts` — type-agnostic, works as-is
- UI filters — type filter already pulls from `PlaceType` dynamically

## Sample YAML Structure

```yaml
slug: the-independent-gembrook
name: The Independent Gembrook
type: eatery
coordinates:
  lat: -37.9508
  lng: 145.5519
region: Dandenong Ranges
country: Australia
description: ...
photos: []
highlights:
  - Regional produce-driven menu
cost: "$$"
ageSuitability:
  minAge: null
  ideal: ["all-ages"]
accessibility: ...
parking: ...
facilities: ["highchairs", "change-table"]
bestSeason: ["spring", "summer", "fall", "winter"]
directions: ...
tips: []
tags: ["family-friendly", "regional"]
duration: quick
status:
  site: open
  lastVerified: "2026-04-13"
details:
  cuisine: ["restaurant"]
  seating: both
  booking: recommended
  bookingUrl: https://www.theindependentgembrook.com.au/bookings
  dietaryOptions: ["vegetarian", "vegan", "gluten-free"]
  kidsMenu: true
```
