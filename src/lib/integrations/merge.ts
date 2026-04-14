import type { PlaceIndexEntry } from "../types";

/**
 * Merge external events into the existing location index.
 * Deduplicates by slug — static (YAML-sourced) entries take precedence.
 */
export function mergeExternalEvents(
  staticIndex: PlaceIndexEntry[],
  externalEntries: PlaceIndexEntry[]
): PlaceIndexEntry[] {
  const existingSlugs = new Set(staticIndex.map((p) => p.slug));
  const newEntries = externalEntries.filter((e) => !existingSlugs.has(e.slug));
  return [...staticIndex, ...newEntries];
}
