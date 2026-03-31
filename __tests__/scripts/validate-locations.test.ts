import { describe, it, expect } from "vitest";
import { validateLocation } from "../../scripts/validate-locations";

const validLocation = {
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

describe("validateLocation", () => {
  it("accepts a valid location", () => {
    const errors = validateLocation(validLocation);
    expect(errors).toEqual([]);
  });

  it("rejects missing required fields", () => {
    const { slug, ...missing } = validLocation;
    const errors = validateLocation(missing);
    expect(errors).toContainEqual(
      expect.stringContaining("slug")
    );
  });

  it("rejects invalid type enum", () => {
    const errors = validateLocation({ ...validLocation, type: "lake" });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("type");
  });

  it("rejects invalid coordinates", () => {
    const errors = validateLocation({
      ...validLocation,
      coordinates: { lat: 200, lng: -79 },
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("lat");
  });

  it("rejects invalid status values", () => {
    const errors = validateLocation({
      ...validLocation,
      status: { ...validLocation.status, site: "maybe" },
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain("status.site");
  });
});
