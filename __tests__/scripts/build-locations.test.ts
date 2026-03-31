import { describe, it, expect } from "vitest";
import { buildIndex, buildDetail } from "../../scripts/build-locations";
import type { Location } from "../../src/lib/types";

const sampleLocation: Location = {
  slug: "test-falls",
  name: "Test Falls",
  type: "waterfall",
  coordinates: { lat: 43.0, lng: -79.0 },
  region: "North America",
  country: "CA",
  description: "A test waterfall.",
  photos: [{ url: "/images/test.jpg", alt: "Test photo" }],
  practical: {
    accessibility: "easy",
    parking: "available",
    facilities: ["restrooms"],
    bestSeason: ["summer"],
    dangerLevel: "low",
    cost: "free",
  },
  directions: "Go north.",
  tips: ["Bring water."],
  tags: ["family-friendly"],
  status: {
    site: "open",
    waterAccess: "open",
    note: "",
    lastVerified: "2026-01-01",
  },
};

describe("buildIndex", () => {
  it("produces lightweight index entries", () => {
    const index = buildIndex([sampleLocation]);
    expect(index).toHaveLength(1);
    expect(index[0]).toEqual({
      slug: "test-falls",
      name: "Test Falls",
      type: "waterfall",
      coordinates: { lat: 43.0, lng: -79.0 },
      country: "CA",
      status: sampleLocation.status,
      tags: ["family-friendly"],
    });
  });

  it("excludes description, photos, practical, directions, tips from index", () => {
    const index = buildIndex([sampleLocation]);
    const entry = index[0] as Record<string, unknown>;
    expect(entry).not.toHaveProperty("description");
    expect(entry).not.toHaveProperty("photos");
    expect(entry).not.toHaveProperty("practical");
    expect(entry).not.toHaveProperty("directions");
    expect(entry).not.toHaveProperty("tips");
  });
});

describe("buildDetail", () => {
  it("returns the full location object", () => {
    const detail = buildDetail(sampleLocation);
    expect(detail).toEqual(sampleLocation);
  });
});
