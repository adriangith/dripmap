import { doc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { Place, PlaceIndexEntry } from "./types";

const FIRESTORE_TIMEOUT_MS = 5000;

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error("Firestore request timeout")), ms);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function getLocationIndex(): Promise<PlaceIndexEntry[]> {
  try {
    const snap = await withTimeout(
      getDoc(doc(db, "meta", "locations-meta")),
      FIRESTORE_TIMEOUT_MS
    );
    if (!snap.exists()) throw new Error("Failed to load location index");
    return snap.data().entries as PlaceIndexEntry[];
  } catch {
    const res = await fetch("/generated/locations-index.json");
    if (!res.ok) throw new Error("Failed to load location index");
    return (await res.json()) as PlaceIndexEntry[];
  }
}

export async function getLocationDetail(slug: string): Promise<Place> {
  try {
    const snap = await withTimeout(
      getDoc(doc(db, "locations", slug)),
      FIRESTORE_TIMEOUT_MS
    );
    if (!snap.exists()) throw new Error(`Failed to load location: ${slug}`);
    return snap.data() as Place;
  } catch {
    const res = await fetch(`/generated/locations/${slug}.json`);
    if (!res.ok) throw new Error(`Failed to load location: ${slug}`);
    return (await res.json()) as Place;
  }
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
