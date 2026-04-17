import type { PlaceType, Setting, PlaceIndexEntry } from "./types";
import type { DayForecast, EnrichmentIndex } from "./integrations/enrichment-types";

// ── Weather condition classification ────────────────────────

export type WeatherCondition = "clear" | "overcast" | "rain" | "storm";

/** Keywords in BOM precis that indicate each condition. */
const RAIN_KEYWORDS = ["rain", "shower", "drizzle", "thunderstorm", "storm", "hail"];
const OVERCAST_KEYWORDS = ["cloud", "overcast", "fog", "haze", "mist"];

/**
 * Classify a BOM precis string into a simplified weather condition.
 * Falls back to "clear" when the precis is empty or unrecognised.
 */
export function classifyWeather(precis: string | undefined): WeatherCondition {
  if (!precis) return "clear";
  const lower = precis.toLowerCase();

  if (RAIN_KEYWORDS.some((k) => lower.includes(k))) {
    return lower.includes("storm") || lower.includes("thunder") ? "storm" : "rain";
  }
  if (OVERCAST_KEYWORDS.some((k) => lower.includes(k))) return "overcast";
  return "clear";
}

// ── Setting derivation from place data ──────────────────────

/** Default setting for each place type. */
const TYPE_SETTING: Record<PlaceType, Setting> = {
  swim: "outdoor-water",
  beach: "outdoor-water",
  pool: "outdoor-water",
  waterfall: "outdoor-water",
  fishing: "outdoor-water",
  playground: "outdoor",
  bushwalk: "outdoor",
  walk: "outdoor",
  lookout: "outdoor",
  cycling: "outdoor",
  wildlife: "outdoor",
  cave: "indoor",
  museum: "indoor",
  eatery: "indoor",
  event: "outdoor", // fallback; overridden by venueType if present
};

/**
 * Derive the setting for a place from its type, tags, and event venueType.
 */
export function settingForPlace(place: PlaceIndexEntry): Setting {
  // Events: use venueType from recurrence metadata if available
  if (place.type === "event") {
    // venueType is on the full Place details, but PlaceIndexEntry might
    // carry it via tags. We check tags for explicit indoor/outdoor.
    if (place.tags.includes("indoor")) return "indoor";
    if (place.tags.includes("outdoor")) return "outdoor";
    // Default for events is outdoor
    return "outdoor";
  }
  return TYPE_SETTING[place.type] ?? "outdoor";
}

// ── Forecast lookup ─────────────────────────────────────────

/**
 * Get today's forecast for a place from the enrichment index.
 * If `offsetMinutes` is provided, looks up the forecast for the
 * date that many minutes from now (to account for drive time).
 */
export function getForecastForPlace(
  slug: string,
  enrichments: EnrichmentIndex | null,
  offsetMinutes?: number,
): DayForecast | null {
  if (!enrichments) return null;
  const enrichment = enrichments[slug];
  if (!enrichment?.forecast?.length) return null;

  const now = new Date();
  if (offsetMinutes) now.setMinutes(now.getMinutes() + offsetMinutes);

  // Use local date string — BOM forecasts use Australian local dates
  const targetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  return (
    enrichment.forecast.find((f) => f.date === targetDate) ??
    enrichment.forecast[0] ??
    null
  );
}

// ── Weather × setting scoring matrix ────────────────────────

/**
 * Score adjustment for weather × setting interaction.
 * Positive = boost, negative = penalty.
 */
const WEATHER_SCORE: Record<Setting, Record<WeatherCondition, number>> = {
  indoor: {
    clear: 0,
    overcast: 0,
    rain: 5,    // indoor is a good pick on rainy days
    storm: 8,
  },
  outdoor: {
    clear: 5,
    overcast: -3,
    rain: -12,
    storm: -18,
  },
  "outdoor-water": {
    clear: 8,
    overcast: -5,
    rain: -15,
    storm: -20,
  },
};

/** Temperature bonus for outdoor-water on hot days, penalty on cold days. */
function temperatureAdjustment(setting: Setting, maxTemp: number | undefined): number {
  if (maxTemp === undefined) return 0;
  if (setting === "outdoor-water") {
    if (maxTemp >= 32) return 8;
    if (maxTemp >= 28) return 5;
    if (maxTemp < 18) return -8;
    if (maxTemp < 22) return -4;
    return 0;
  }
  if (setting === "outdoor") {
    if (maxTemp >= 38) return -5;  // too hot for outdoor land activities
    if (maxTemp >= 30) return 2;
    if (maxTemp < 10) return -3;
    return 0;
  }
  return 0;
}

export function weatherScore(
  setting: Setting,
  forecast: DayForecast | null,
): number {
  if (!forecast) return 0;
  const condition = classifyWeather(forecast.precis);
  const base = WEATHER_SCORE[setting][condition];
  const temp = temperatureAdjustment(setting, forecast.max);
  return base + temp;
}

// ── Weather description helpers ─────────────────────────────

/** Short weather description for use in sentences. */
export function weatherPhrase(forecast: DayForecast | null): string | null {
  if (!forecast) return null;
  const condition = classifyWeather(forecast.precis);
  const temp = forecast.max;

  switch (condition) {
    case "storm":
      return "storms are forecast";
    case "rain":
      return "rain is on the way";
    case "overcast":
      return "it's looking overcast";
    case "clear": {
      if (temp !== undefined && temp >= 32) return "it's going to be a scorcher";
      if (temp !== undefined && temp >= 28) return "it's a warm one";
      if (temp !== undefined && temp < 15) return "it's a chilly day";
      return "the weather looks great";
    }
  }
}

/** Setting-aware suggestion for the fit blurb. Only returns a phrase when forecast data is available. */
export function weatherFitPhrase(
  setting: Setting,
  forecast: DayForecast | null,
): string | null {
  if (!forecast) return null;
  const condition = classifyWeather(forecast.precis);

  if (setting === "outdoor" || setting === "outdoor-water") {
    if (condition === "rain" || condition === "storm") {
      return "Weather today might not be ideal — consider an indoor alternative.";
    }
    if (condition === "overcast") {
      return "It's looking overcast — layers might be a good idea.";
    }
    if (setting === "outdoor-water" && forecast.max !== undefined && forecast.max >= 30) {
      return "Perfect weather for getting in the water!";
    }
    if (condition === "clear") {
      return "Great weather for getting outside!";
    }
  }

  if (setting === "indoor") {
    if (condition === "rain" || condition === "storm") {
      return "A perfect day to head indoors.";
    }
  }

  return null;
}
