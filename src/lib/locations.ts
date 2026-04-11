import type { Place, PlaceIndexEntry } from "./types";

export async function getLocationIndex(): Promise<PlaceIndexEntry[]> {
  const res = await fetch("/generated/locations-index.json");
  if (!res.ok) throw new Error("Failed to load location index");
  return res.json();
}

export async function getLocationDetail(slug: string): Promise<Place> {
  const res = await fetch(`/generated/locations/${slug}.json`);
  if (!res.ok) throw new Error(`Failed to load location: ${slug}`);
  return res.json();
}

// For static generation: reads from filesystem at build time
export function getLocationIndexStatic(): PlaceIndexEntry[] {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require("../../public/generated/locations-index.json");
  return data as PlaceIndexEntry[];
}

export function getLocationDetailStatic(slug: string): Place {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const data = require(`../../public/generated/locations/${slug}.json`);
  return data as Place;
}

export function getAllLocationSlugs(): string[] {
  const index = getLocationIndexStatic();
  return index.map((loc) => loc.slug);
}
