import type { Place, PlaceIndexEntry, Coordinates, CostLevel, Duration, SiteStatus } from "../types";

// ── Normalised external event ────────────────────────────────

export interface ExternalEvent {
  /** Unique ID from the source (used to generate slug) */
  sourceId: string;
  /** Human-readable title */
  title: string;
  /** Where the event takes place */
  coordinates: Coordinates;
  venue: string;
  region: string;
  /** Event dates */
  startDate: string;   // ISO date
  endDate?: string;     // ISO date (omit for single-day)
  startTime?: string;   // HH:mm
  endTime?: string;     // HH:mm
  /** Content */
  description: string;
  imageUrl?: string;
  imageAlt?: string;
  /** Pricing */
  cost: CostLevel;
  /** Ticketing */
  bookingUrl?: string;
  bookingRequired: boolean;
  /** Source attribution */
  source: EventSource;
  /** Optional extras */
  tags?: string[];
  duration?: Duration;
  venueType?: "outdoor" | "indoor" | "mixed";
  organiser?: string;
  organiserUrl?: string;
}

export interface EventSource {
  /** Provider name (e.g. "Eventbrite", "Humanitix") */
  provider: string;
  /** Direct link to the event on the provider's site */
  url: string;
}

// ── Provider interface ───────────────────────────────────────

export interface EventProvider {
  /** Short name for logging and attribution */
  name: string;
  /** Fetch events from the external source */
  fetchEvents(): Promise<ExternalEvent[]>;
}

// ── Mapper ───────────────────────────────────────────────────

function slugify(provider: string, sourceId: string): string {
  const base = `${provider}-${sourceId}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base.slice(0, 80);
}

/**
 * Convert a normalised ExternalEvent into the app's Place type.
 * The resulting Place carries a `source` field for attribution.
 */
export function toPlace(event: ExternalEvent): Place {
  return {
    slug: slugify(event.source.provider, event.sourceId),
    name: event.title,
    type: "event",
    coordinates: event.coordinates,
    region: event.region,
    country: "Australia",
    description: event.description,
    photos: event.imageUrl
      ? [{ url: event.imageUrl, alt: event.imageAlt ?? event.title }]
      : [],
    highlights: [],
    cost: event.cost,
    ageSuitability: { minAge: null, ideal: [] },
    accessibility: "",
    parking: "",
    facilities: [],
    bestSeason: [],
    directions: "",
    tips: [],
    tags: event.tags ?? ["external-event"],
    duration: event.duration,
    status: { site: "open" as SiteStatus, lastVerified: new Date().toISOString().slice(0, 10) },
    source: {
      provider: event.source.provider,
      url: event.source.url,
    },
    details: {
      recurrence: event.endDate
        ? { type: "range", startDate: event.startDate, endDate: event.endDate, startTime: event.startTime, endTime: event.endTime }
        : { type: "once", date: event.startDate, startTime: event.startTime, endTime: event.endTime },
      confirmedDates: null,
      venue: event.venue,
      venueType: event.venueType ?? "mixed",
      bookingRequired: event.bookingRequired,
      bookingUrl: event.bookingUrl ?? null,
      organiser: event.organiser ?? event.source.provider,
      organiserUrl: event.organiserUrl ?? event.source.url,
    },
  };
}

/**
 * Convert a Place (from toPlace) into a lightweight PlaceIndexEntry.
 */
export function toIndexEntry(place: Place): PlaceIndexEntry {
  return {
    slug: place.slug,
    name: place.name,
    type: place.type,
    coordinates: place.coordinates,
    region: place.region,
    country: place.country,
    cost: place.cost,
    ...(place.photos?.[0]?.url ? { photo: place.photos[0].url } : {}),
    highlights: place.highlights,
    status: place.status,
    tags: place.tags,
    ...(place.duration ? { duration: place.duration } : {}),
    ...(place.type === "event" ? { recurrence: place.details.recurrence } : {}),
    ...("source" in place && place.source ? { source: place.source } : {}),
  };
}
