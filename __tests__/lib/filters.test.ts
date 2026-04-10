import { describe, it, expect } from "vitest";
import { filterLocations } from "../../src/lib/filters";
import type { PlaceIndexEntry, Filters } from "../../src/lib/types";

const emptyFilters: Filters = {
  type: null,
  siteStatus: null,
  search: "",
};

const locations: PlaceIndexEntry[] = [
  {
    slug: "niagara-falls",
    name: "Niagara Falls",
    type: "swim",
    coordinates: { lat: 43.0, lng: -79.0 },
    region: "North America",
    country: "CA",
    cost: "free",
    highlights: ["Massive waterfall"],
    status: { site: "open", lastVerified: "2026-01-01" },
    tags: ["family-friendly", "iconic"],
  },
  {
    slug: "test-beach",
    name: "Test Beach",
    type: "beach",
    coordinates: { lat: -38.3, lng: 144.6 },
    region: "Victoria, Australia",
    country: "AU",
    cost: "free",
    highlights: ["Rock pools"],
    status: { site: "open", lastVerified: "2026-01-01" },
    tags: ["adventure"],
  },
  {
    slug: "night-market",
    name: "Night Market",
    type: "event",
    coordinates: { lat: -37.8, lng: 144.9 },
    region: "Victoria, Australia",
    country: "AU",
    cost: "$",
    highlights: ["Street food"],
    status: { site: "seasonal", lastVerified: "2026-01-01" },
    tags: ["food", "market"],
  },
];

describe("filterLocations", () => {
  it("returns all locations when no filters are active", () => {
    const result = filterLocations(locations, emptyFilters);
    expect(result).toHaveLength(3);
  });

  it("filters by type", () => {
    const result = filterLocations(locations, { ...emptyFilters, type: "beach" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("test-beach");
  });

  it("filters by site status", () => {
    const result = filterLocations(locations, { ...emptyFilters, siteStatus: "seasonal" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("night-market");
  });

  it("searches by name (case-insensitive)", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "night" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("night-market");
  });

  it("searches by region", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "victoria" });
    expect(result).toHaveLength(2);
  });

  it("searches by tag", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "iconic" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("niagara-falls");
  });

  it("searches by highlight", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "rock pools" });
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("test-beach");
  });

  it("combines type filter with search", () => {
    const result = filterLocations(locations, { ...emptyFilters, type: "swim", search: "niagara" });
    expect(result).toHaveLength(1);
  });

  it("returns empty when no match", () => {
    const result = filterLocations(locations, { ...emptyFilters, search: "nonexistent" });
    expect(result).toHaveLength(0);
  });
});
