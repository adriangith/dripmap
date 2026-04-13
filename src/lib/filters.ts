import type { PlaceIndexEntry, Filters } from "./types";

export function filterLocations(
  locations: PlaceIndexEntry[],
  filters: Filters
): PlaceIndexEntry[] {
  return locations.filter((loc) => {
    if (filters.type && loc.type !== filters.type) return false;
    if (filters.siteStatus && loc.status.site !== filters.siteStatus) return false;

    if (filters.search) {
      const term = filters.search.toLowerCase();
      const searchable = [
        loc.name,
        loc.region,
        loc.country,
        ...loc.tags,
        ...loc.highlights,
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(term)) return false;
    }

    return true;
  });
}
