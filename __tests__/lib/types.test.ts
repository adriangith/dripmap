import { describe, it, expect } from "vitest";
import type {
  PlaceType,
  Place,
  SwimDetails,
  BeachDetails,
  EventDetails,
  PlaceIndexEntry,
  Recurrence,
} from "../../src/lib/types";

describe("type definitions", () => {
  it("allows constructing a swim Place", () => {
    const place: Place = {
      slug: "test-falls",
      name: "Test Falls",
      type: "swim",
      coordinates: { lat: -37.8, lng: 144.9 },
      region: "Victoria, Australia",
      country: "AU",
      description: "A test swim spot.",
      photos: [{ url: "/images/test.jpg", alt: "Test" }],
      highlights: ["Crystal clear water"],
      cost: "free",
      ageSuitability: { minAge: null, ideal: ["toddlers", "primary", "teens", "adults"] },
      accessibility: "easy",
      parking: "available",
      facilities: ["restrooms"],
      bestSeason: ["summer"],
      directions: "Head north.",
      tips: ["Bring sunscreen."],
      tags: ["family-friendly"],
      status: { site: "open", lastVerified: "2026-04-01" },
      details: {
        dangerLevel: "low",
        waterAccess: "open",
        depth: null,
      },
    };
    expect(place.type).toBe("swim");
    expect(place.details.dangerLevel).toBe("low");
  });

  it("allows constructing a beach Place", () => {
    const place: Place = {
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
        waterHazards: ["rips", "rocks"],
        crowdLevel: "moderate",
      },
    };
    expect(place.type).toBe("beach");
    expect(place.details.beachType).toBe("rock-pools");
  });

  it("allows constructing an event Place", () => {
    const recurrence: Recurrence = { type: "weekly", days: ["wed"], season: "summer" };
    const place: Place = {
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
      ageSuitability: { minAge: null, ideal: ["toddlers", "primary", "teens", "adults"] },
      accessibility: "wheelchair-accessible",
      parking: "street",
      facilities: ["restrooms", "food"],
      bestSeason: ["summer"],
      directions: "Central Melbourne.",
      tips: [],
      tags: ["market", "food"],
      status: { site: "open", lastVerified: "2026-04-01" },
      details: {
        recurrence,
        confirmedDates: null,
        venue: "Queen Victoria Market",
        venueType: "outdoor",
        bookingRequired: false,
        bookingUrl: null,
        organiser: "City of Melbourne",
        organiserUrl: null,
      },
    };
    expect(place.type).toBe("event");
    expect(place.details.recurrence.type).toBe("weekly");
  });

  it("allows constructing a PlaceIndexEntry with new fields", () => {
    const entry: PlaceIndexEntry = {
      slug: "test-beach",
      name: "Test Beach",
      type: "beach",
      coordinates: { lat: -38.3, lng: 144.6 },
      region: "Victoria, Australia",
      country: "AU",
      cost: "free",
      highlights: ["Cliff jumping"],
      status: { site: "open", lastVerified: "2026-04-01" },
      tags: ["adventure"],
    };
    expect(entry.cost).toBe("free");
    expect(entry.highlights).toEqual(["Cliff jumping"]);
  });
});
