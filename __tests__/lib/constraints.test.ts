import { describe, it, expect } from "vitest";
import { applyConstraints, estimateDriveMinutes } from "../../src/lib/constraints";
import type { PlaceIndexEntry, Constraints } from "../../src/lib/types";

import { DEFAULT_PRIORITY } from "../../src/lib/types";

const noConstraints: Constraints = {
  distance: "any",
  date: null,
  timeOfDay: null,
  cost: "any",
  duration: "any",
  group: null,
  familyComposition: null,
  visited: "any",
  setting: "any",
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

  it("soft-scores by distance (far places rank lower but are not hidden)", () => {
    const farSwim: PlaceIndexEntry = { ...swim, slug: "far-swim", coordinates: { lat: -36.0, lng: 146.0 } };
    const result = applyConstraints([swim, farSwim], { ...noConstraints, distance: "30min" }, userLocation);
    expect(result).toHaveLength(2); // both still present
    expect(result[0].slug).toBe("test-swim"); // closer place ranks first
    expect(result[0]._score).toBeGreaterThan(result[1]._score);
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

  it("daytrip preference ranks far-away place above nearby one", () => {
    // ~2hr drive away (roughly 140km straight-line ÷ 60kph × 1.4 road factor)
    const farPlace: PlaceIndexEntry = {
      ...swim,
      slug: "far-place",
      name: "Far Place",
      coordinates: { lat: -36.5, lng: 145.5 },
    };
    // ~10min drive away
    const nearPlace: PlaceIndexEntry = {
      ...swim,
      slug: "near-place",
      name: "Near Place",
      coordinates: { lat: -37.805, lng: 144.955 },
    };
    const result = applyConstraints(
      [nearPlace, farPlace],
      { ...noConstraints, distance: "daytrip", priority: ["distance", "cost", "date", "duration", "group"] },
      userLocation,
    );
    expect(result[0].slug).toBe("far-place");
    expect(result[1].slug).toBe("near-place");
  });

  it("boosts indoor places with weather enrichment on rainy days", () => {
    const museum: PlaceIndexEntry = {
      ...swim,
      slug: "test-museum",
      name: "Test Museum",
      type: "museum",
      cost: "$$",
    };
    const enrichments = {
      "test-swim": { slug: "test-swim", forecast: [{ date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })(), precis: "Rain." }] },
      "test-museum": { slug: "test-museum", forecast: [{ date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })(), precis: "Rain." }] },
    };
    const result = applyConstraints(
      [swim, museum],
      noConstraints,
      userLocation,
      enrichments,
    );
    // Museum (indoor) should score higher than swim (outdoor-water) on rainy day
    expect(result[0].slug).toBe("test-museum");
  });

  it("boosts outdoor-water places on hot clear days", () => {
    const museum: PlaceIndexEntry = {
      ...swim,
      slug: "test-museum",
      name: "Test Museum",
      type: "museum",
      cost: "free",
    };
    const enrichments = {
      "test-swim": { slug: "test-swim", forecast: [{ date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })(), precis: "Sunny.", max: 35 }] },
      "test-museum": { slug: "test-museum", forecast: [{ date: (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`; })(), precis: "Sunny.", max: 35 }] },
    };
    const result = applyConstraints(
      [museum, swim],
      noConstraints,
      userLocation,
      enrichments,
    );
    // Swim (outdoor-water) should score higher on a hot clear day
    expect(result[0].slug).toBe("test-swim");
  });

  it("setting preference boosts matching places", () => {
    const museum: PlaceIndexEntry = {
      ...swim,
      slug: "test-museum",
      name: "Test Museum",
      type: "museum",
      cost: "free",
    };
    const result = applyConstraints(
      [swim, museum],
      { ...noConstraints, setting: "indoor" },
      userLocation,
    );
    expect(result[0].slug).toBe("test-museum");
  });
});
