import type { PlaceIndexEntry, Constraints, Coordinates, DateMode, TimeOfDay, FamilyComposition } from "./types";
import type { EnrichmentIndex } from "./integrations/enrichment-types";
import { haversineDistanceKm } from "./useCurrentLocation";
import { isEventOnDate, isEventOnDayOfWeek } from "./event-dates";
import { getVisited } from "./visited";
import { settingForPlace, getForecastForPlace, weatherScore } from "./weather";

const ROAD_FACTOR = 1.4;
const AVG_SPEED_KMH = 60;

/** Estimate drive time in minutes using straight-line distance x road factor. */
export function estimateDriveMinutes(from: Coordinates, to: Coordinates): number {
  const km = haversineDistanceKm(from, to) * ROAD_FACTOR;
  return (km / AVG_SPEED_KMH) * 60;
}

const DISTANCE_MAX_MINUTES: Record<string, number> = {
  "30min": 30,
  "1hr": 60,
  "2hr": 120,
  daytrip: 240,
  any: Infinity,
};

/**
 * Scoring curve for daytrip distance preference.
 * Peaks in the 60–180 min range (the "day trip sweet spot"),
 * lower for very close places (not really a day trip)
 * and tapers for very far ones (over 3 hours).
 */
function daytripProximityBonus(driveMin: number): number {
  if (driveMin <= 30) return 5;           // too close for a day trip
  if (driveMin <= 60) return 5 + (driveMin - 30) * (15 / 30);  // ramp up: 5→20
  if (driveMin <= 180) return 20;         // sweet spot: full bonus
  if (driveMin <= 240) return 20 - (driveMin - 180) * (12 / 60); // taper: 20→8
  return 8;                               // still reachable but far
}

function costScore(placeCost: string, filter: string): number {
  if (filter === "any") return 0;
  const costRank: Record<string, number> = { free: 0, "$": 1, "$$": 2, "$$$": 3 };
  const placeRank = costRank[placeCost] ?? 2;

  switch (filter) {
    case "free":
      return placeRank === 0 ? 0 : -placeRank * 10;
    case "affordable":
      return placeRank <= 2 ? 0 : -(placeRank - 2) * 10;
    default:
      return 0;
  }
}

/** Map group preference to the ageSuitability.ideal values it matches. */
const GROUP_TO_IDEAL: Record<string, string[]> = {
  solo: ["adults", "teens"],
  adults: ["adults", "teens"],
  family: ["toddlers", "preschool", "primary", "teens"],
  "family-young": ["toddlers", "preschool", "primary"],
  "family-older": ["primary", "teens"],
  friends: ["adults", "teens"],
};

/** Map kid ages to ageSuitability ideal labels. */
function kidAgeToIdeals(age: number): string[] {
  if (age <= 3) return ["toddlers"];
  if (age <= 5) return ["toddlers", "preschool"];
  if (age <= 12) return ["primary"];
  return ["teens"];
}

function idealsFromFamily(composition: FamilyComposition): string[] {
  const ideals = new Set<string>(["adults"]);
  for (const age of composition.kidAges) {
    for (const ideal of kidAgeToIdeals(age)) {
      ideals.add(ideal);
    }
  }
  return [...ideals];
}

function passesGroupFilter(place: PlaceIndexEntry, group: string | null, family?: FamilyComposition | null): boolean {
  if (!group) return true;

  // Use family composition for precise filtering when available
  if (family && family.kidAges.length > 0) {
    const ideals = idealsFromFamily(family);
    const placeIdeals = place.ageSuitability?.ideal ?? [];
    if (placeIdeals.length === 0) return true;
    return placeIdeals.some((i) => ideals.includes(i));
  }

  const validIdeals = GROUP_TO_IDEAL[group];
  if (!validIdeals) return true;
  const placeIdeals = place.ageSuitability?.ideal ?? [];
  if (placeIdeals.length === 0) return true;
  return placeIdeals.some((i) => validIdeals.includes(i));
}

function groupScore(place: PlaceIndexEntry, group: string | null, family?: FamilyComposition | null): number {
  if (!group) return 0;

  // Use family composition for precise scoring when available
  if (family && family.kidAges.length > 0) {
    const ideals = idealsFromFamily(family);
    const placeIdeals = place.ageSuitability?.ideal ?? [];
    if (placeIdeals.length === 0) return 0;
    const overlap = placeIdeals.filter((i) => ideals.includes(i)).length;
    return overlap * 3;
  }

  const validIdeals = GROUP_TO_IDEAL[group];
  if (!validIdeals) return 0;
  const placeIdeals = place.ageSuitability?.ideal ?? [];
  if (placeIdeals.length === 0) return 0;
  const overlap = placeIdeals.filter((i) => validIdeals.includes(i)).length;
  return overlap * 3;
}

function passesDateFilter(place: PlaceIndexEntry, date: DateMode): boolean {
  if (!date) return true;
  // Non-event types always pass date filtering
  if (place.type !== "event" || !place.recurrence) return true;

  if (date.mode === "specific") {
    return isEventOnDate(place.recurrence, date.date);
  }
  if (date.mode === "recurring") {
    return isEventOnDayOfWeek(place.recurrence, date.days);
  }
  return true;
}

/** Parse "HH:MM" → hour number, or null if missing. */
function parseHour(time?: string): number | null {
  if (!time) return null;
  const h = parseInt(time.split(":")[0], 10);
  return Number.isNaN(h) ? null : h;
}

function passesTimeOfDayFilter(place: PlaceIndexEntry, timeOfDay: TimeOfDay): boolean {
  if (!timeOfDay) return true;

  // Events with startTime: classify by when they start
  if (place.type === "event" && place.recurrence) {
    const rec = place.recurrence;
    const startTimeStr = rec.type !== "annual" ? rec.startTime : undefined;
    const start = parseHour(startTimeStr);
    if (start !== null) {
      const isEvening = start >= 17;
      return timeOfDay === "evening" ? isEvening : !isEvening;
    }
    // No startTime on event — let it through
    return true;
  }

  // Non-events (swims, beaches, walks, playgrounds) are daytime activities
  return timeOfDay === "day";
}

const DURATION_RANK: Record<string, number> = { quick: 0, "half-day": 1, "full-day": 2 };

function passesDurationFilter(place: PlaceIndexEntry, filter: string): boolean {
  if (filter === "any" || !place.duration) return true;
  const placeRank = DURATION_RANK[place.duration] ?? 2;
  const filterRank = DURATION_RANK[filter] ?? 2;
  return placeRank <= filterRank;
}

export interface ScoredPlace extends PlaceIndexEntry {
  _score: number;
  _driveMinutes: number | null;
}

export function applyConstraints(
  places: PlaceIndexEntry[],
  constraints: Constraints,
  userLocation: Coordinates | null,
  enrichments?: EnrichmentIndex | null,
): ScoredPlace[] {
  const scored: ScoredPlace[] = [];

  const visitedSet = new Set(getVisited());

  for (const place of places) {
    // Hard filter: date (for events)
    if (!passesDateFilter(place, constraints.date)) continue;

    // Hard filter: time of day
    if (!passesTimeOfDayFilter(place, constraints.timeOfDay)) continue;

    // Hard filter: duration
    if (!passesDurationFilter(place, constraints.duration)) continue;

    // Hard filter: group suitability
    if (!passesGroupFilter(place, constraints.group, constraints.familyComposition)) continue;

    // Compute drive time for sorting
    const driveMin = userLocation
      ? estimateDriveMinutes(userLocation, place.coordinates)
      : null;

    // Soft scoring — weighted by priority order
    let score = 0;
    const priorityWeights = constraints.priority.reduce<Record<string, number>>((acc, dim, i) => {
      acc[dim] = Math.max(1, constraints.priority.length - i); // top = highest weight
      return acc;
    }, {});

    // Proximity score — soft preference, never excludes
    if (driveMin !== null) {
      const distWeight = priorityWeights["distance"] ?? 1;
      if (constraints.distance === "daytrip") {
        score += daytripProximityBonus(driveMin) * distWeight;
      } else if (constraints.distance !== "any") {
        const maxMin = DISTANCE_MAX_MINUTES[constraints.distance] ?? Infinity;
        if (driveMin <= maxMin) {
          // Within preferred range — full bonus scaled by closeness
          score += Math.max(0, 20 - driveMin / 6) * distWeight;
        } else {
          // Outside preferred range — penalty that increases with distance over threshold
          const overRatio = (driveMin - maxMin) / maxMin;
          score += -15 * Math.min(overRatio, 2) * distWeight;
        }
      } else {
        score += Math.max(0, 20 - driveMin / 6) * distWeight;
      }
    }

    // Cost score
    score += costScore(place.cost, constraints.cost) * (priorityWeights["cost"] ?? 1);

    // Group score
    score += groupScore(place, constraints.group, constraints.familyComposition) * (priorityWeights["group"] ?? 1);

    // Visited preference score
    if (constraints.visited !== "any") {
      const isVisited = visitedSet.has(place.slug);
      const familiarityWeight = priorityWeights["familiarity"] ?? 1;
      if (constraints.visited === "new" && !isVisited) {
        score += 15 * familiarityWeight;
      } else if (constraints.visited === "familiar" && isVisited) {
        score += 15 * familiarityWeight;
      }
    }

    // Weather × setting score
    if (constraints.setting !== "any" || enrichments) {
      const setting = settingForPlace(place);
      const settingWeight = priorityWeights["setting"] ?? 1;

      // Setting preference match / mismatch
      if (constraints.setting !== "any") {
        if (setting === constraints.setting) {
          score += 10 * settingWeight;
        } else if (
          (constraints.setting === "outdoor" && setting === "outdoor-water") ||
          (constraints.setting === "outdoor-water" && setting === "outdoor")
        ) {
          score += 3 * settingWeight; // partial match
        } else {
          score -= 5 * settingWeight; // clear mismatch penalty
        }
      }

      // Weather-based adjustment
      if (enrichments) {
        const forecast = getForecastForPlace(place.slug, enrichments, driveMin ?? undefined);
        const wScore = weatherScore(setting, forecast);
        score += wScore * settingWeight;
      }
    }

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
