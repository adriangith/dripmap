import { describe, it, expect } from "vitest";
import { validatePlace } from "../../scripts/validate-locations";

const validSwim = {
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

const validBeach = {
  slug: "test-beach",
  name: "Test Beach",
  type: "beach",
  coordinates: { lat: -38.3, lng: 144.6 },
  region: "Victoria, Australia",
  country: "AU",
  description: "Rock pools and cliff jumping.",
  photos: [],
  highlights: ["Cliff jumping", "Rock pools"],
  cost: "free",
  ageSuitability: { minAge: 8, ideal: ["teens", "adults"] },
  accessibility: "moderate",
  parking: "limited",
  facilities: [],
  bestSeason: ["summer"],
  directions: "Drive south.",
  tips: [],
  tags: ["adventure"],
  status: { site: "open", lastVerified: "2026-04-01" },
  details: {
    beachType: "rock-pools",
    patrolled: { seasonal: true, months: ["dec", "jan", "feb"], hours: "9am-5pm" },
    dogPolicy: "prohibited",
    waveExposure: "exposed",
    waterHazards: ["rips"],
    crowdLevel: "moderate",
  },
};

const validEvent = {
  slug: "night-market",
  name: "Night Market",
  type: "event",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  description: "Weekly summer night market.",
  photos: [],
  highlights: ["Street food", "Live music"],
  cost: "$",
  ageSuitability: { minAge: null, ideal: ["adults"] },
  accessibility: "wheelchair-accessible",
  parking: "street",
  facilities: ["restrooms"],
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

describe("validatePlace", () => {
  it("accepts a valid swim", () => { expect(validatePlace(validSwim)).toEqual([]); });
  it("accepts a valid beach", () => { expect(validatePlace(validBeach)).toEqual([]); });
  it("accepts a valid event", () => { expect(validatePlace(validEvent)).toEqual([]); });

  it("rejects missing required core fields", () => {
    const { slug, ...missing } = validSwim;
    const errors = validatePlace(missing);
    expect(errors).toContainEqual(expect.stringContaining("slug"));
  });

  it("rejects invalid type", () => {
    const errors = validatePlace({ ...validSwim, type: "lake" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("type");
  });

  it("rejects invalid cost", () => {
    const errors = validatePlace({ ...validSwim, cost: "expensive" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("cost");
  });

  it("rejects swim with missing details.dangerLevel", () => {
    const bad = { ...validSwim, details: { ...validSwim.details, dangerLevel: undefined } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("dangerLevel"));
  });

  it("rejects beach with missing details.beachType", () => {
    const bad = { ...validBeach, details: { ...validBeach.details, beachType: undefined } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("beachType"));
  });

  it("rejects event with missing details.recurrence", () => {
    const bad = { ...validEvent, details: { ...validEvent.details, recurrence: undefined } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("recurrence"));
  });

  it("rejects event with invalid recurrence type", () => {
    const bad = { ...validEvent, details: { ...validEvent.details, recurrence: { type: "biweekly" } } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("recurrence.type"));
  });

  it("rejects missing highlights with a warning", () => {
    const noHighlights = { ...validSwim, highlights: [] };
    expect(validatePlace(noHighlights)).toContainEqual(expect.stringContaining("highlights"));
  });

  it("rejects invalid coordinates", () => {
    expect(validatePlace({ ...validSwim, coordinates: { lat: 200, lng: 144.9 } }))
      .toContainEqual(expect.stringContaining("lat"));
  });

  it("rejects malformed lastVerified dates", () => {
    expect(validatePlace({ ...validSwim, status: { ...validSwim.status, lastVerified: "not-a-date" } }))
      .toContainEqual(expect.stringContaining("lastVerified"));
  });
});
