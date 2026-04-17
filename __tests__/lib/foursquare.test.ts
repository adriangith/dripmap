import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { PlaceIndexEntry } from "../../src/lib/types";
import type { LocationEnrichment } from "../../src/lib/integrations/enrichment-types";
import { mergeEnrichments } from "../../src/lib/integrations/enrichment-types";

// ── Foursquare provider tests ────────────────────────────────

// We test the provider by mocking global fetch and the env var.
// The provider is imported dynamically so env can be set first.

function makeLocation(overrides: Partial<PlaceIndexEntry> = {}): PlaceIndexEntry {
  return {
    slug: "test-cafe",
    name: "Test Cafe",
    type: "eatery",
    coordinates: { lat: -37.8136, lng: 144.9631 },
    region: "Melbourne CBD",
    country: "AU",
    cost: "$",
    highlights: [],
    status: { site: "open", lastVerified: "2026-01-01" },
    tags: [],
    ...overrides,
  };
}

describe("foursquareProvider", () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.FOURSQUARE_API_KEY;

  beforeEach(() => {
    process.env.FOURSQUARE_API_KEY = "fsq3_test_key";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.FOURSQUARE_API_KEY = originalEnv;
    } else {
      delete process.env.FOURSQUARE_API_KEY;
    }
    vi.restoreAllMocks();
  });

  it("enriches an eatery with match + details + photos + tips", async () => {
    const mockResponses: Record<string, unknown> = {
      "/v3/places/match": { place: { fsq_id: "abc123" } },
      "/v3/places/abc123": {
        fsq_id: "abc123",
        rating: 8.5,
        price: 2,
        popularity: 0.85,
        website: "https://testcafe.com",
      },
      "/v3/places/abc123/photos": [
        { prefix: "https://img.fsq.com/", suffix: "/photo.jpg", width: 800, height: 600 },
      ],
      "/v3/places/abc123/tips": [
        { text: "Great flat white!" },
        { text: "Try the avocado toast" },
      ],
    };

    global.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/places/match")) {
        return new Response(JSON.stringify(mockResponses["/v3/places/match"]), { status: 200 });
      }
      if (url.includes("/photos")) {
        return new Response(JSON.stringify(mockResponses["/v3/places/abc123/photos"]), { status: 200 });
      }
      if (url.includes("/tips")) {
        return new Response(JSON.stringify(mockResponses["/v3/places/abc123/tips"]), { status: 200 });
      }
      if (url.includes("/places/abc123")) {
        return new Response(JSON.stringify(mockResponses["/v3/places/abc123"]), { status: 200 });
      }
      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const { foursquareProvider } = await import(
      "../../src/lib/integrations/providers/foursquare"
    );

    const result = await foursquareProvider.enrich([makeLocation()]);

    expect(result).toHaveLength(1);
    expect(result[0].fsqId).toBe("abc123");
    expect(result[0].fsqRating).toBe(8.5);
    expect(result[0].fsqPrice).toBe(2);
    expect(result[0].fsqPopularity).toBe(0.85);
    expect(result[0].fsqWebsite).toBe("https://testcafe.com");
    expect(result[0].fsqPhotos).toEqual([
      { url: "https://img.fsq.com/original/photo.jpg", width: 800, height: 600 },
    ]);
    expect(result[0].fsqTips).toEqual(["Great flat white!", "Try the avocado toast"]);
  });

  it("skips ineligible place types (walk, beach, etc.)", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("Should not be called");
    }) as typeof fetch;

    const { foursquareProvider } = await import(
      "../../src/lib/integrations/providers/foursquare"
    );

    const locations = [
      makeLocation({ slug: "a-walk", name: "Nice Walk", type: "walk" }),
      makeLocation({ slug: "a-beach", name: "Sandy Beach", type: "beach" }),
      makeLocation({ slug: "a-bushwalk", name: "Bush Trail", type: "bushwalk" }),
    ];

    const result = await foursquareProvider.enrich(locations);
    expect(result).toHaveLength(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns empty when Place Match finds no match", async () => {
    global.fetch = vi.fn(async () => {
      return new Response(JSON.stringify({}), { status: 200 });
    }) as typeof fetch;

    const { foursquareProvider } = await import(
      "../../src/lib/integrations/providers/foursquare"
    );

    const result = await foursquareProvider.enrich([makeLocation()]);
    expect(result).toHaveLength(0);
  });

  it("throws when FOURSQUARE_API_KEY is not set", async () => {
    delete process.env.FOURSQUARE_API_KEY;

    // Re-import to get fresh module
    const { foursquareProvider } = await import(
      "../../src/lib/integrations/providers/foursquare"
    );

    await expect(foursquareProvider.enrich([makeLocation()])).rejects.toThrow(
      /FOURSQUARE_API_KEY/
    );
  });

  it("handles 404 from details gracefully", async () => {
    global.fetch = vi.fn(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/places/match")) {
        return new Response(JSON.stringify({ place: { fsq_id: "xyz" } }), { status: 200 });
      }
      // All other endpoints return 404
      return new Response("Not found", { status: 404 });
    }) as typeof fetch;

    const { foursquareProvider } = await import(
      "../../src/lib/integrations/providers/foursquare"
    );

    const result = await foursquareProvider.enrich([makeLocation()]);
    // Should still return an enrichment with just the fsqId
    expect(result).toHaveLength(1);
    expect(result[0].fsqId).toBe("xyz");
    expect(result[0].fsqRating).toBeUndefined();
    expect(result[0].fsqPhotos).toBeUndefined();
  });
});

// ── mergeEnrichments with Foursquare fields ──────────────────

describe("mergeEnrichments with Foursquare fields", () => {
  it("merges Foursquare data alongside OSM and BOM data", () => {
    const osmBatch: LocationEnrichment[] = [
      { slug: "cafe-a", facilities: ["restrooms"] },
    ];
    const bomBatch: LocationEnrichment[] = [
      { slug: "cafe-a", forecast: [{ date: "2026-04-15", precis: "Sunny" }] },
    ];
    const fsqBatch: LocationEnrichment[] = [
      {
        slug: "cafe-a",
        fsqId: "abc123",
        fsqRating: 8.5,
        fsqPrice: 2,
        fsqTips: ["Great coffee"],
        fsqPhotos: [{ url: "https://img.fsq.com/original/photo.jpg", width: 800, height: 600 }],
      },
    ];

    const result = mergeEnrichments(osmBatch, bomBatch, fsqBatch);

    expect(result["cafe-a"].facilities).toEqual(["restrooms"]);
    expect(result["cafe-a"].forecast).toHaveLength(1);
    expect(result["cafe-a"].fsqId).toBe("abc123");
    expect(result["cafe-a"].fsqRating).toBe(8.5);
    expect(result["cafe-a"].fsqPrice).toBe(2);
    expect(result["cafe-a"].fsqTips).toEqual(["Great coffee"]);
    expect(result["cafe-a"].fsqPhotos).toHaveLength(1);
  });

  it("later Foursquare data overwrites earlier per-field", () => {
    const batch1: LocationEnrichment[] = [
      { slug: "cafe-a", fsqRating: 7.0 },
    ];
    const batch2: LocationEnrichment[] = [
      { slug: "cafe-a", fsqRating: 8.5 },
    ];

    const result = mergeEnrichments(batch1, batch2);
    expect(result["cafe-a"].fsqRating).toBe(8.5);
  });
});
