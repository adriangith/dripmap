export type LocationType =
  | "waterfall"
  | "swimming-hole"
  | "splash-pad"
  | "spring"
  | "creek";

export type AccessibilityLevel =
  | "wheelchair-accessible"
  | "easy"
  | "moderate"
  | "difficult"
  | "extreme";

export type ParkingType = "available" | "limited" | "none" | "street";

export type DangerLevel = "low" | "moderate" | "high" | "extreme";

export type CostType = "free" | "paid" | "donation";

export type SiteStatus = "open" | "closed" | "seasonal" | "unknown";

export type WaterAccessStatus =
  | "open"
  | "closed"
  | "seasonal"
  | "restricted"
  | "unknown";

export type Season = "spring" | "summer" | "fall" | "winter";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Photo {
  url: string;
  alt: string;
  credit?: string;
}

export interface PracticalInfo {
  accessibility: AccessibilityLevel;
  parking: ParkingType;
  facilities: string[];
  bestSeason: Season[];
  dangerLevel: DangerLevel;
  cost: CostType;
}

export interface LocationStatus {
  site: SiteStatus;
  waterAccess: WaterAccessStatus;
  note: string;
  lastVerified: string;
}

export interface Location {
  slug: string;
  name: string;
  type: LocationType;
  coordinates: Coordinates;
  region: string;
  country: string;
  description: string;
  photos: Photo[];
  practical: PracticalInfo;
  directions: string;
  tips: string[];
  tags: string[];
  status: LocationStatus;
}

export interface LocationIndexEntry {
  slug: string;
  name: string;
  type: LocationType;
  coordinates: Coordinates;
  country: string;
  status: LocationStatus;
  tags: string[];
}

export interface Filters {
  type: LocationType | null;
  accessibility: AccessibilityLevel | null;
  season: Season | null;
  cost: CostType | null;
  siteStatus: SiteStatus | null;
  search: string;
}
