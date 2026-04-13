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
