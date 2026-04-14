import { describe, it, expect } from "vitest";
import { toPlace, toIndexEntry } from "../../src/lib/integrations/types";
import { mergeExternalEvents } from "../../src/lib/integrations/merge";
import { stubProvider } from "../../src/lib/integrations/providers/stub";
import type { ExternalEvent } from "../../src/lib/integrations/types";
import type { PlaceIndexEntry } from "../../src/lib/types";

// ── Stub provider ────────────────────────────────────────────

describe("stubProvider", () => {
  it("returns events with required fields", async () => {
    const events = await stubProvider.fetchEvents();
    expect(events.length).toBeGreaterThan(0);
    for (const event of events) {
      expect(event.sourceId).toBeTruthy();
      expect(event.title).toBeTruthy();
      expect(event.coordinates.lat).toBeTypeOf("number");
      expect(event.coordinates.lng).toBeTypeOf("number");
      expect(event.startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(event.source.provider).toBe("stub");
      expect(event.source.url).toBeTruthy();
    }
  });
});

// ── toPlace mapper ───────────────────────────────────────────

describe("toPlace", () => {
  const event: ExternalEvent = {
    sourceId: "test-123",
    title: "Test Event",
    coordinates: { lat: -37.8, lng: 144.9 },
    venue: "Test Venue",
    region: "Melbourne",
    startDate: "2026-06-01",
    endDate: "2026-06-05",
    startTime: "10:00",
    endTime: "17:00",
    description: "A test event.",
    imageUrl: "https://example.com/img.jpg",
    cost: "$",
    bookingRequired: true,
    bookingUrl: "https://example.com/book",
    tags: ["test"],
    duration: "half-day",
    source: { provider: "testprov", url: "https://example.com/event" },
  };

  it("produces a valid Place with correct type and slug", () => {
    const place = toPlace(event);
    expect(place.type).toBe("event");
    expect(place.slug).toBe("testprov-test-123");
    expect(place.name).toBe("Test Event");
    expect(place.coordinates).toEqual({ lat: -37.8, lng: 144.9 });
    expect(place.cost).toBe("$");
    expect(place.duration).toBe("half-day");
  });

  it("sets source attribution", () => {
    const place = toPlace(event);
    expect(place.source).toEqual({
      provider: "testprov",
      url: "https://example.com/event",
    });
  });

  it("creates a range recurrence for multi-day events", () => {
    const place = toPlace(event);
    expect(place.details.recurrence.type).toBe("range");
  });

  it("creates a once recurrence for single-day events", () => {
    const singleDay = { ...event, endDate: undefined };
    const place = toPlace(singleDay);
    expect(place.details.recurrence.type).toBe("once");
  });

  it("includes photo when imageUrl is provided", () => {
    const place = toPlace(event);
    expect(place.photos).toHaveLength(1);
    expect(place.photos[0].url).toBe("https://example.com/img.jpg");
  });

  it("has empty photos when no imageUrl", () => {
    const noImg = { ...event, imageUrl: undefined };
    const place = toPlace(noImg);
    expect(place.photos).toHaveLength(0);
  });

  it("slugifies with safe characters only", () => {
    const weird = { ...event, source: { provider: "My Provider!", url: "x" }, sourceId: "abc/def?g=1" };
    const place = toPlace(weird);
    expect(place.slug).toMatch(/^[a-z0-9][a-z0-9-]*$/);
  });
});

// ── toIndexEntry ─────────────────────────────────────────────

describe("toIndexEntry", () => {
  it("produces a lightweight index entry with source", () => {
    const event: ExternalEvent = {
      sourceId: "idx-test",
      title: "Index Test",
      coordinates: { lat: -37.8, lng: 144.9 },
      venue: "Venue",
      region: "Region",
      startDate: "2026-01-01",
      description: "Desc",
      cost: "free",
      bookingRequired: false,
      source: { provider: "prov", url: "https://x.com" },
    };
    const place = toPlace(event);
    const entry = toIndexEntry(place);
    expect(entry.slug).toBe("prov-idx-test");
    expect(entry.type).toBe("event");
    expect(entry.source).toEqual({ provider: "prov", url: "https://x.com" });
    expect(entry).not.toHaveProperty("description");
  });
});

// ── mergeExternalEvents ──────────────────────────────────────

describe("mergeExternalEvents", () => {
  const staticIndex: PlaceIndexEntry[] = [
    {
      slug: "existing-event",
      name: "Existing",
      type: "event",
      coordinates: { lat: -37.8, lng: 144.9 },
      region: "Melb",
      country: "Australia",
      cost: "free",
      highlights: [],
      status: { site: "open", lastVerified: "2026-01-01" },
      tags: [],
    },
  ];

  const external: PlaceIndexEntry[] = [
    {
      slug: "existing-event", // duplicate
      name: "Duplicate",
      type: "event",
      coordinates: { lat: -37.8, lng: 144.9 },
      region: "Melb",
      country: "Australia",
      cost: "$",
      highlights: [],
      status: { site: "open", lastVerified: "2026-01-01" },
      tags: [],
    },
    {
      slug: "new-event",
      name: "New Event",
      type: "event",
      coordinates: { lat: -37.9, lng: 145.0 },
      region: "Melb",
      country: "Australia",
      cost: "$$",
      highlights: [],
      status: { site: "open", lastVerified: "2026-01-01" },
      tags: [],
    },
  ];

  it("deduplicates by slug, keeping static entries", () => {
    const merged = mergeExternalEvents(staticIndex, external);
    expect(merged).toHaveLength(2);
    expect(merged[0].slug).toBe("existing-event");
    expect(merged[0].cost).toBe("free"); // static wins
    expect(merged[1].slug).toBe("new-event");
  });

  it("returns static index unchanged when no externals", () => {
    const merged = mergeExternalEvents(staticIndex, []);
    expect(merged).toEqual(staticIndex);
  });

  it("returns all externals when static is empty", () => {
    const merged = mergeExternalEvents([], external);
    expect(merged).toHaveLength(2);
  });
});
