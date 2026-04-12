import { describe, it, expect } from "vitest";
import { applyConstraints, estimateDriveMinutes } from "../../src/lib/constraints";
import type { PlaceIndexEntry, Constraints } from "../../src/lib/types";

import { DEFAULT_PRIORITY } from "../../src/lib/types";

const noConstraints: Constraints = {
  distance: "any",
  date: null,
  cost: "any",
  duration: "any",
  group: null,
  priority: [...DEFAULT_PRIORITY],
};

const swim: PlaceIndexEntry = {
  slug: "test-swim",
  name: "Test Swim",
  type: "swim",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  cost: "free",
  highlights: ["Crystal clear"],
  status: { site: "open", lastVerified: "2026-01-01" },
  tags: ["family-friendly"],
  ageSuitability: { minAge: null, ideal: ["toddlers", "primary"] },
};

const expensiveEvent: PlaceIndexEntry = {
  slug: "fancy-event",
  name: "Fancy Event",
  type: "event",
  coordinates: { lat: -37.82, lng: 144.95 },
  region: "Victoria, Australia",
  country: "AU",
  cost: "$$$",
  highlights: ["Premium experience"],
  status: { site: "open", lastVerified: "2026-01-01" },
  tags: [],
  ageSuitability: { minAge: 18, ideal: ["adults"] },
};

const userLocation = { lat: -37.81, lng: 144.96 };

describe("estimateDriveMinutes", () => {
  it("returns approximate drive time using 1.4x road factor", () => {
    const mins = estimateDriveMinutes(userLocation, swim.coordinates);
    expect(mins).toBeGreaterThan(0);
    expect(mins).toBeLessThan(30);
  });
});

describe("applyConstraints", () => {
  it("returns all places with no constraints", () => {
    const result = applyConstraints([swim, expensiveEvent], noConstraints, userLocation);
    expect(result).toHaveLength(2);
  });

  it("hard-filters by distance", () => {
    const farSwim: PlaceIndexEntry = { ...swim, slug: "far-swim", coordinates: { lat: -36.0, lng: 146.0 } };
    const result = applyConstraints([swim, farSwim], { ...noConstraints, distance: "30min" }, userLocation);
    expect(result.some((r) => r.slug === "test-swim")).toBe(true);
    expect(result.some((r) => r.slug === "far-swim")).toBe(false);
  });

  it("soft-scores by cost (free items score higher when cost=free)", () => {
    const result = applyConstraints([swim, expensiveEvent], { ...noConstraints, cost: "free" }, userLocation);
    expect(result).toHaveLength(2); // both still present
    expect(result[0].slug).toBe("test-swim"); // free sorts first
  });

  it("works without user location (skips distance filter)", () => {
    const result = applyConstraints([swim], { ...noConstraints, distance: "30min" }, null);
    expect(result).toHaveLength(1);
  });

  it("boosts family-tagged places for family groups", () => {
    const result = applyConstraints([swim, expensiveEvent], { ...noConstraints, group: "family-young" }, userLocation);
    expect(result[0].slug).toBe("test-swim"); // has family-friendly tag
  });
});
