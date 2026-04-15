// Shared enum constants used by both the runtime validator and the JSON Schema generator.
// Single source of truth for allowed values in location YAML files.

export const VALID_TYPES = [
  "swim", "beach", "event", "bushwalk", "walk", "lookout", "waterfall",
  "cave", "wildlife", "pool", "cycling", "fishing", "eatery", "playground",
  "museum",
];
export const VALID_COST = ["free", "$", "$$", "$$$"];
export const VALID_SEASONS = ["spring", "summer", "fall", "winter"];
export const VALID_SITE_STATUS = ["open", "closed", "seasonal", "unknown"];

export const VALID_DANGER = ["low", "moderate", "high", "extreme"];
export const VALID_WATER_ACCESS = ["open", "closed", "seasonal", "restricted", "unknown"];

export const VALID_BEACH_TYPE = ["surf", "bay", "rock-pools", "river", "estuary"];
export const VALID_DOG_POLICY = ["allowed", "seasonal-offleash", "prohibited"];
export const VALID_WAVE_EXPOSURE = ["sheltered", "moderate", "exposed"];
export const VALID_CROWD_LEVEL = ["quiet", "moderate", "busy"];

export const VALID_VENUE_TYPE = ["outdoor", "indoor", "mixed"];
export const VALID_RECURRENCE_TYPE = ["once", "range", "weekly", "annual"];
export const VALID_DURATION = ["quick", "half-day", "full-day"];

export const VALID_EATERY_CUISINE = [
  "cafe", "restaurant", "pub", "fish-and-chips", "ice-cream",
  "bakery", "market", "farm-gate", "pick-your-own", "food-truck",
];
export const VALID_DIETARY_OPTION = ["vegetarian", "vegan", "gluten-free", "allergy-aware"];
export const VALID_SEATING = ["indoor", "outdoor", "both"];
export const VALID_BOOKING = ["required", "recommended", "walk-in"];

export const VALID_DIFFICULTY = ["easy", "moderate", "hard"];
export const VALID_TERRAIN = ["paved", "gravel", "trail", "mixed"];

export const VALID_DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
