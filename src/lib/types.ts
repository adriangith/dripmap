// ── Shared enums ──────────────────────────────────────────────

export type PlaceType =
  | "swim"
  | "beach"
  | "event"
  | "bushwalk"
  | "lookout"
  | "waterfall"
  | "cave"
  | "wildlife"
  | "pool"
  | "cycling"
  | "fishing";

export type CostLevel = "free" | "$" | "$$" | "$$$";

export type SiteStatus = "open" | "closed" | "seasonal" | "unknown";

export type Season = "spring" | "summer" | "fall" | "winter";

// ── Shared value objects ──────────────────────────────────────

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Photo {
  url: string;
  alt: string;
  credit?: string;
}

export interface AgeSuitability {
  minAge: number | null;
  ideal: string[];
}

export interface PlaceStatus {
  site: SiteStatus;
  lastVerified: string;
  note?: string;
}

// ── Type-specific details ─────────────────────────────────────

export interface SwimDetails {
  dangerLevel: "low" | "moderate" | "high" | "extreme";
  waterAccess: "open" | "closed" | "seasonal" | "restricted" | "unknown";
  depth: string | null;
}

export interface BeachDetails {
  beachType: "surf" | "bay" | "rock-pools" | "river" | "estuary";
  patrolled: { seasonal: boolean; months: string[]; hours: string | null };
  dogPolicy: "allowed" | "seasonal-offleash" | "prohibited";
  waveExposure: "sheltered" | "moderate" | "exposed";
  waterHazards: string[];
  crowdLevel: "quiet" | "moderate" | "busy";
}

export type Recurrence =
  | { type: "once"; date: string; startTime?: string; endTime?: string }
  | { type: "range"; startDate: string; endDate: string; days?: string[]; startTime?: string; endTime?: string }
  | { type: "weekly"; days: string[]; season?: string; startTime?: string; endTime?: string }
  | { type: "annual"; month: number; typicalWeek?: number; duration?: string };

export interface EventDetails {
  recurrence: Recurrence;
  confirmedDates: { year: number; startDate: string; endDate: string } | null;
  venue: string;
  venueType: "outdoor" | "indoor" | "mixed";
  bookingRequired: boolean;
  bookingUrl: string | null;
  organiser: string;
  organiserUrl: string | null;
}

// ── Discriminated union ───────────────────────────────────────

interface PlaceBase {
  slug: string;
  name: string;
  coordinates: Coordinates;
  region: string;
  country: string;
  description: string;
  photos: Photo[];
  highlights: string[];
  cost: CostLevel;
  ageSuitability: AgeSuitability;
  accessibility: string;
  parking: string;
  facilities: string[];
  bestSeason: Season[];
  directions: string;
  tips: string[];
  tags: string[];
  status: PlaceStatus;
}

export interface SwimPlace extends PlaceBase {
  type: "swim";
  details: SwimDetails;
}

export interface BeachPlace extends PlaceBase {
  type: "beach";
  details: BeachDetails;
}

export interface EventPlace extends PlaceBase {
  type: "event";
  details: EventDetails;
}

export type Place = SwimPlace | BeachPlace | EventPlace;

// ── Index entry (lightweight, used in list/map) ───────────────

export interface PlaceIndexEntry {
  slug: string;
  name: string;
  type: PlaceType;
  coordinates: Coordinates;
  region: string;
  country: string;
  cost: CostLevel;
  highlights: string[];
  status: PlaceStatus;
  tags: string[];
}

// ── Filters (updated for new types) ──────────────────────────

export interface Filters {
  type: PlaceType | null;
  siteStatus: SiteStatus | null;
  search: string;
}

// ── Constraints (discovery context) ─────────────────────────

export type DistanceThreshold = "30min" | "1hr" | "2hr" | "daytrip" | "any";
export type CostFilter = "free" | "free-$" | "$$-under" | "any";
export type GroupType = "solo" | "adults" | "family-young" | "family-older" | "friends" | null;

export type DateMode =
  | { mode: "specific"; date: Date }
  | { mode: "recurring"; days: number[] }  // 0=Sun, 1=Mon, ..., 6=Sat
  | null;

export interface Constraints {
  distance: DistanceThreshold;
  date: DateMode;
  cost: CostFilter;
  group: GroupType;
}

