import type { LocationIndexEntry, Filters } from "./types";

export function filterLocations(
  locations: LocationIndexEntry[],
  filters: Filters
): LocationIndexEntry[] {
  return locations.filter((loc) => {
    if (filters.type && loc.type !== filters.type) return false;
    if (filters.siteStatus && loc.status.site !== filters.siteStatus) return false;

    if (filters.search) {
      const term = filters.search.toLowerCase();
      const searchable = [
        loc.name,
        loc.country,
        ...loc.tags,
      ]
        .join(" ")
        .toLowerCase();
      if (!searchable.includes(term)) return false;
    }

    return true;
  });
}
