import { describe, it, expect } from "vitest";
import { filterLocations } from "../../src/lib/filters";
import type { LocationIndexEntry, Filters } from "../../src/lib/types";

const emptyFilters: Filters = {
  type: null,
  accessibility: null,
  season: null,
  cost: null,
  siteStatus: null,
  search: "",
};

const locations: LocationIndexEntry[] = [
  {
    slug: "niagara-falls",
    name: "Niagara Falls",
    type: "waterfall",
    coordinates: { lat: 43.0, lng: -79.0 },
    country: "CA",
    status: { site: "open", waterAccess: "open", lastVerified: "2026-01-01" },
    tags: ["family-friendly", "iconic"],
  },
  {
    slug: "hamilton-pool",
    name: "Hamilton Pool",
    type: "swimming-hole",
    coordinates: { lat: 30.3, lng: -98.1 },
    country: "US",
    status: { site: "open", waterAccess: "seasonal", lastVerified: "2026-01-01" },
    tags: ["scenic"],
  },
  {
    slug: "closed-creek",
    name: "Closed Creek",
    type: "creek",
    coordinates: { lat: 0, lng: 0 },
    country: "AU",
    status: { site: "closed", waterAccess: "closed", lastVerified: "2026-01-01" },
    tags: [],
  },
];

describe("filterLocations", () => {
  it("returns all locations when no filters are active", () => {
    const result = filterLocations(locations, emptyFilters);
    expect(result).toHaveLength(3);
  });

  it("filters by type", () => {
    const result = filterLocations(locations, { ...emptyFilters, type: "waterfall" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("niagara-falls");
  });

  it("filters by site status", () => {
    const result = filterLocations(locations, { ...emptyFilters, siteStatus: "closed" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("closed-creek");
  });

  it("searches by name (case-insensitive)", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "hamilton" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("hamilton-pool");
  });

  it("searches by country code", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "AU" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("closed-creek");
  });

  it("searches by tag", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "iconic" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("niagara-falls");
  });

  it("combines type filter with search", () => {
    const result = filterLocations(locations, {
      ...emptyFilters,
      type: "waterfall",
      search: "niagara",
    });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("niagara-falls");
  });

  it("returns empty when no match", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "nonexistent" });
    expect(result).toHaveLength(0);
  });
});
