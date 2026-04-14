import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Place, PlaceIndexEntry } from "./types";

export async function getLocationIndex(): Promise<PlaceIndexEntry[]> {
  const snap = await getDoc(doc(db, "meta", "locations-meta"));
  if (!snap.exists()) throw new Error("Failed to load location index");
  return snap.data().entries as PlaceIndexEntry[];
}

export async function getLocationDetail(slug: string): Promise<Place> {
  const snap = await getDoc(doc(db, "locations", slug));
  if (!snap.exists()) throw new Error(`Failed to load location: ${slug}`);
  return snap.data() as Place;
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
