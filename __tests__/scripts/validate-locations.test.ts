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

const validEatery = {
  slug: "test-restaurant",
  name: "Test Restaurant",
  type: "eatery",
  coordinates: { lat: -37.8, lng: 144.9 },
  region: "Victoria, Australia",
  country: "AU",
  description: "A test eatery.",
  photos: [],
  highlights: ["Great food"],
  cost: "$$",
  ageSuitability: { minAge: null, ideal: ["all-ages"] },
  accessibility: "easy",
  parking: "street",
  facilities: ["highchairs"],
  bestSeason: ["spring", "summer", "fall", "winter"],
  directions: "Central Melbourne.",
  tips: [],
  tags: ["family-friendly"],
  status: { site: "open", lastVerified: "2026-04-13" },
  details: {
    cuisine: ["restaurant"],
    seating: "indoor",
    booking: "recommended",
    bookingUrl: "https://example.com/book",
    dietaryOptions: ["vegetarian", "gluten-free"],
    kidsMenu: false,
  },
};

describe("validatePlace", () => {
  it("accepts a valid swim", () => { expect(validatePlace(validSwim)).toEqual([]); });
  it("accepts a valid beach", () => { expect(validatePlace(validBeach)).toEqual([]); });
  it("accepts a valid event", () => { expect(validatePlace(validEvent)).toEqual([]); });

  it("accepts a valid eatery", () => { expect(validatePlace(validEatery)).toEqual([]); });

  // Walk route validation
  const validWalk = {
    slug: "test-walk",
    name: "Test Walk",
    type: "walk",
    coordinates: { lat: -37.8, lng: 144.9 },
    region: "Victoria, Australia",
    country: "AU",
    description: "A test walk.",
    photos: [],
    highlights: ["Great views"],
    cost: "free",
    ageSuitability: { minAge: null, ideal: ["adults"] },
    accessibility: "easy",
    parking: "street",
    facilities: [],
    bestSeason: ["spring", "summer"],
    directions: "Head north.",
    tips: [],
    tags: ["urban-hike"],
    status: { site: "open", lastVerified: "2026-04-13" },
    details: { distanceKm: 10, difficulty: "easy", terrain: "mixed" },
  };

  it("accepts a valid walk without route", () => { expect(validatePlace(validWalk)).toEqual([]); });

  it("accepts a valid walk with route", () => {
    const withRoute = { ...validWalk, details: { ...validWalk.details, route: [[-37.74, 144.96], [-37.78, 144.97], [-37.81, 144.97]] } };
    expect(validatePlace(withRoute)).toEqual([]);
  });

  it("rejects walk route with fewer than 2 points", () => {
    const bad = { ...validWalk, details: { ...validWalk.details, route: [[-37.74, 144.96]] } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("at least 2 points"));
  });

  it("rejects walk route with invalid coordinates", () => {
    const bad = { ...validWalk, details: { ...validWalk.details, route: [[-37.74, 144.96], [200, 144.97]] } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("lat must be between"));
  });

  it("rejects eatery with invalid cuisine value", () => {
    const bad = { ...validEatery, details: { ...validEatery.details, cuisine: ["sushi-train"] } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("cuisine"));
  });

  it("rejects eatery with empty cuisine array", () => {
    const bad = { ...validEatery, details: { ...validEatery.details, cuisine: [] } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("cuisine"));
  });

  it("rejects eatery with invalid seating", () => {
    const bad = { ...validEatery, details: { ...validEatery.details, seating: "standing" } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("seating"));
  });

  it("rejects eatery with invalid booking", () => {
    const bad = { ...validEatery, details: { ...validEatery.details, booking: "maybe" } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("booking"));
  });

  it("rejects eatery with non-boolean kidsMenu", () => {
    const bad = { ...validEatery, details: { ...validEatery.details, kidsMenu: "yes" } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("kidsMenu"));
  });

  it("rejects eatery with invalid dietaryOptions value", () => {
    const bad = { ...validEatery, details: { ...validEatery.details, dietaryOptions: ["keto"] } };
    expect(validatePlace(bad)).toContainEqual(expect.stringContaining("dietaryOptions"));
  });

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

  describe("openingHours", () => {
    it("accepts a valid weekday + weekend schedule", () => {
      const withHours = {
        ...validSwim,
        openingHours: [
          { days: ["mon", "tue", "wed", "thu", "fri"], open: "09:00", close: "17:00" },
          { days: ["sat", "sun"], open: "10:00", close: "16:00" },
        ],
      };
      expect(validatePlace(withHours)).toEqual([]);
    });

    it("accepts split hours sharing a day set", () => {
      const withSplit = {
        ...validSwim,
        openingHours: [
          { days: ["mon", "tue", "wed"], open: "09:00", close: "12:00" },
          { days: ["mon", "tue", "wed"], open: "14:00", close: "17:00" },
        ],
      };
      expect(validatePlace(withSplit)).toEqual([]);
    });

    it("accepts cross-midnight close (close <= open)", () => {
      const lateBar = {
        ...validSwim,
        openingHours: [{ days: ["fri", "sat"], open: "18:00", close: "02:00" }],
      };
      expect(validatePlace(lateBar)).toEqual([]);
    });

    it("rejects non-array openingHours", () => {
      const bad = { ...validSwim, openingHours: "9-5" };
      expect(validatePlace(bad)).toContainEqual(expect.stringContaining("openingHours"));
    });

    it("rejects empty openingHours array", () => {
      const bad = { ...validSwim, openingHours: [] };
      expect(validatePlace(bad)).toContainEqual(expect.stringContaining("openingHours"));
    });

    it("rejects invalid day tokens", () => {
      const bad = {
        ...validSwim,
        openingHours: [{ days: ["monday"], open: "09:00", close: "17:00" }],
      };
      expect(validatePlace(bad)).toContainEqual(expect.stringContaining("days"));
    });

    it("rejects malformed time strings", () => {
      const bad = {
        ...validSwim,
        openingHours: [{ days: ["mon"], open: "9am", close: "5pm" }],
      };
      const errs = validatePlace(bad);
      expect(errs).toContainEqual(expect.stringContaining("open"));
      expect(errs).toContainEqual(expect.stringContaining("close"));
    });

    it("rejects empty days array", () => {
      const bad = {
        ...validSwim,
        openingHours: [{ days: [], open: "09:00", close: "17:00" }],
      };
      expect(validatePlace(bad)).toContainEqual(expect.stringContaining("days"));
    });

    it("rejects equal open and close", () => {
      const bad = {
        ...validSwim,
        openingHours: [{ days: ["mon"], open: "09:00", close: "09:00" }],
      };
      expect(validatePlace(bad)).toContainEqual(expect.stringContaining("must differ"));
    });
  });
});
