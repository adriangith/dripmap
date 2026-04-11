import type { PlaceIndexEntry, Constraints, Coordinates } from "./types";
import { haversineDistanceKm } from "./useCurrentLocation";

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
  const tags = place.tags.join(" ").toLowerCase();
  const hasFamily = tags.includes("family") || tags.includes("kids");
  if (group === "family-young" || group === "family-older") {
    return hasFamily ? 5 : -5;
  }
  if (group === "adults" || group === "solo") {
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
