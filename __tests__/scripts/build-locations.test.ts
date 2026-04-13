import { describe, it, expect } from "vitest";
import { buildIndex, buildDetail } from "../../scripts/build-locations";
import type { Place } from "../../src/lib/types";

const sampleSwim: Place = {
  slug: "test-falls",
  name: "Test Falls",
  type: "swim",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  description: "A test swim spot.",
  photos: [{ url: "/images/test.jpg", alt: "Test photo" }],
  highlights: ["Crystal clear water"],
  cost: "free",
  ageSuitability: { minAge: null, ideal: ["adults"] },
  accessibility: "easy",
  parking: "available",
  facilities: ["restrooms"],
  bestSeason: ["summer"],
  directions: "Head north.",
  tips: ["Bring sunscreen."],
  tags: ["family-friendly"],
  status: { site: "open", lastVerified: "2026-04-01" },
  details: { dangerLevel: "low", waterAccess: "open", depth: null },
};

const sampleEvent: Place = {
  slug: "night-market",
  name: "Night Market",
  type: "event",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  description: "Weekly summer night market.",
  photos: [],
  highlights: ["Street food"],
  cost: "$",
  ageSuitability: { minAge: null, ideal: ["adults"] },
  accessibility: "wheelchair-accessible",
  parking: "street",
  facilities: [],
  bestSeason: ["summer"],
  directions: "Central Melbourne.",
  tips: [],
  tags: ["market"],
  status: { site: "open", lastVerified: "2026-04-01" },
  details: {
    recurrence: { type: "weekly", days: ["wed"], season: "summer" },
    confirmedDates: null,
    venue: "Queen Victoria Market",
    venueType: "outdoor",
    bookingRequired: false,
    bookingUrl: null,
    organiser: "City of Melbourne",
    organiserUrl: null,
  },
};

describe("buildIndex", () => {
  it("produces lightweight index entries with new fields", () => {
    const index = buildIndex([sampleSwim]);
    expect(index).toHaveLength(1);
    expect(index[0]).toEqual({
      slug: "test-falls",
      name: "Test Falls",
      type: "swim",
      coordinates: { lat: -37.8, lng: 144.9 },
      region: "Victoria, Australia",
      country: "AU",
      cost: "free",
      photo: "/images/test.jpg",
      highlights: ["Crystal clear water"],
      status: sampleSwim.status,
      tags: ["family-friendly"],
      ageSuitability: sampleSwim.ageSuitability,
    });
  });

  it("excludes description, photos, details, directions, tips from index", () => {
    const index = buildIndex([sampleSwim]);
    const entry = index[0] as unknown as Record<string, unknown>;
    expect(entry).not.toHaveProperty("description");
    expect(entry).not.toHaveProperty("photos");
    expect(entry).not.toHaveProperty("details");
    expect(entry).not.toHaveProperty("directions");
    expect(entry).not.toHaveProperty("tips");
  });

  it("handles mixed types", () => {
    const index = buildIndex([sampleSwim, sampleEvent]);
    expect(index).toHaveLength(2);
    expect(index[0].type).toBe("swim");
    expect(index[1].type).toBe("event");
  });
});

describe("buildDetail", () => {
  it("returns the full place object", () => {
    expect(buildDetail(sampleSwim)).toEqual(sampleSwim);
  });
});
