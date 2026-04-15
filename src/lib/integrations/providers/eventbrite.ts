import type { EventProvider, ExternalEvent } from "../types";
import type { CostLevel } from "../../types";

// ── Configuration ────────────────────────────────────────────

const EVENTBRITE_API_BASE = "https://www.eventbriteapi.com/v3";
const MELBOURNE_LOCATION = {
  latitude: "-37.8136",
  longitude: "144.9631",
  within: "50km",
};

// ── Eventbrite API types (subset) ────────────────────────────

interface EbEvent {
  id: string;
  name: { text: string };
  description: { text: string };
  start: { local: string; utc: string };
  end: { local: string; utc: string };
  url: string;
  venue_id?: string;
  is_free: boolean;
  logo?: { url: string };
  category_id?: string;
  online_event: boolean;
}

interface EbVenue {
  id: string;
  name: string;
  address: {
    latitude: string;
    longitude: string;
    city: string;
    region: string;
  };
}

interface EbSearchResponse {
  pagination: { page_number: number; page_count: number };
  events: EbEvent[];
}

// ── Helpers ──────────────────────────────────────────────────

function mapCost(event: EbEvent): CostLevel {
  return event.is_free ? "free" : "$";
}

function parseDate(isoLocal: string): string {
  return isoLocal.slice(0, 10); // "2026-04-15"
}

function parseTime(isoLocal: string): string {
  return isoLocal.slice(11, 16); // "17:00"
}

// ── Provider ─────────────────────────────────────────────────

export const eventbriteProvider: EventProvider = {
  name: "eventbrite",

  async fetchEvents(): Promise<ExternalEvent[]> {
    const token = process.env.EVENTBRITE_TOKEN;
    if (!token) {
      console.log(
        "  ℹ  EVENTBRITE_TOKEN not set — skipping Eventbrite provider."
      );
      return [];
    }

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    };

    // Search for events near Melbourne
    const searchUrl = new URL(`${EVENTBRITE_API_BASE}/events/search/`);
    searchUrl.searchParams.set(
      "location.latitude",
      MELBOURNE_LOCATION.latitude
    );
    searchUrl.searchParams.set(
      "location.longitude",
      MELBOURNE_LOCATION.longitude
    );
    searchUrl.searchParams.set("location.within", MELBOURNE_LOCATION.within);
    searchUrl.searchParams.set("expand", "venue");
    searchUrl.searchParams.set("page_size", "50");
    // Only future events
    searchUrl.searchParams.set(
      "start_date.range_start",
      new Date().toISOString().replace(/\.\d{3}Z$/, "Z")
    );

    let events: EbEvent[] = [];
    const venueCache = new Map<string, EbVenue>();

    try {
      const res = await fetch(searchUrl.toString(), {
        headers,
        signal: AbortSignal.timeout(15_000),
      });

      if (res.status === 401) {
        console.warn("  ⚠  Eventbrite token is invalid or expired.");
        return [];
      }

      if (!res.ok) {
        console.warn(`  ⚠  Eventbrite search returned ${res.status}`);
        return [];
      }

      const data = (await res.json()) as EbSearchResponse;
      events = data.events.filter((e) => !e.online_event);
    } catch (err) {
      console.warn("  ⚠  Eventbrite search failed:", err);
      return [];
    }

    // Fetch venues for events that have venue_id
    const venueIds = [
      ...new Set(events.map((e) => e.venue_id).filter(Boolean)),
    ] as string[];

    for (const vid of venueIds) {
      try {
        const res = await fetch(`${EVENTBRITE_API_BASE}/venues/${vid}/`, {
          headers,
          signal: AbortSignal.timeout(10_000),
        });
        if (res.ok) {
          const venue = (await res.json()) as EbVenue;
          venueCache.set(vid, venue);
        }
      } catch {
        // Skip venue — we'll use fallback coordinates
      }
    }

    // Convert to ExternalEvent[]
    const externalEvents: ExternalEvent[] = [];

    for (const event of events) {
      const venue = event.venue_id
        ? venueCache.get(event.venue_id)
        : undefined;

      // Skip events without location data
      if (!venue?.address?.latitude || !venue?.address?.longitude) continue;

      const startDate = parseDate(event.start.local);
      const endDate = parseDate(event.end.local);

      externalEvents.push({
        sourceId: `eb-${event.id}`,
        title: event.name.text,
        coordinates: {
          lat: parseFloat(venue.address.latitude),
          lng: parseFloat(venue.address.longitude),
        },
        venue: venue.name,
        region: venue.address.city || "Melbourne",
        startDate,
        ...(endDate !== startDate ? { endDate } : {}),
        startTime: parseTime(event.start.local),
        endTime: parseTime(event.end.local),
        description:
          event.description.text?.slice(0, 500) ||
          `${event.name.text} at ${venue.name}`,
        imageUrl: event.logo?.url,
        cost: mapCost(event),
        bookingUrl: event.url,
        bookingRequired: !event.is_free,
        source: {
          provider: "Eventbrite",
          url: event.url,
        },
        tags: ["external-event", "eventbrite"],
      });
    }

    return externalEvents;
  },
};
