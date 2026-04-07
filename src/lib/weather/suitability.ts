import type { LocationType } from "../types";
import type { WeatherSnapshot, Suitability } from "./types";

/**
 * Open-Meteo WMO codes that indicate stormy/severe weather.
 * https://open-meteo.com/en/docs (search "WMO Weather interpretation codes")
 */
const STORM_CODES = new Set([95, 96, 99]); // Thunderstorm variants
const HEAVY_RAIN_CODES = new Set([65, 67, 75, 82]); // Heavy rain/snow shower

function isStormy(w: WeatherSnapshot): boolean {
  return STORM_CODES.has(w.weatherCode) || HEAVY_RAIN_CODES.has(w.weatherCode);
}

function isRaining(w: WeatherSnapshot): boolean {
  return w.precipitationMm >= 0.5;
}

function ruleSwimmingHole(w: WeatherSnapshot): Suitability {
  if (isStormy(w)) return { rating: "poor", reason: "Storm — unsafe for swimming" };
  if (isRaining(w)) return { rating: "poor", reason: "Raining — water cold and visibility poor" };
  if (w.temperatureC < 18) return { rating: "poor", reason: "Too cold for swimming" };
  if (w.temperatureC < 24) return { rating: "fair", reason: "Mild — water will feel cool" };
  if (w.uvIndex >= 8) return { rating: "fair", reason: "Warm but UV is extreme — bring shade" };
  return { rating: "good", reason: "Warm and dry — great swimming weather" };
}

function ruleSplashPad(w: WeatherSnapshot): Suitability {
  if (isStormy(w)) return { rating: "poor", reason: "Storm — facility likely closed" };
  if (isRaining(w)) return { rating: "poor", reason: "Raining — not worth the trip" };
  if (w.temperatureC < 16) return { rating: "poor", reason: "Too cold for outdoor water play" };
  if (w.temperatureC < 22) return { rating: "fair", reason: "Mild — bring towels for warmth after" };
  return { rating: "good", reason: "Warm and sunny — perfect conditions" };
}

function ruleWaterfall(w: WeatherSnapshot): Suitability {
  if (isStormy(w)) return { rating: "poor", reason: "Storm — flash flood risk near waterfalls" };
  if (w.temperatureC >= 38) return { rating: "poor", reason: "Extreme heat — avoid hiking exposed terrain" };
  if (w.precipitationMm >= 1) return { rating: "good", reason: "Recent rain — waterfalls flowing strong" };
  if (w.temperatureC >= 15 && w.temperatureC <= 30) return { rating: "fair", reason: "Dry but pleasant for a walk" };
  return { rating: "fair", reason: "Conditions OK but flow may be low" };
}

function ruleSpring(w: WeatherSnapshot): Suitability {
  if (isStormy(w)) return { rating: "poor", reason: "Storm — unsafe to visit" };
  if (w.temperatureC < 0) return { rating: "poor", reason: "Freezing — ice risk" };
  if (isRaining(w)) return { rating: "fair", reason: "Wet — paths may be muddy" };
  if (w.temperatureC < 15 || w.temperatureC > 32) return { rating: "fair", reason: "Cool/warm but spring water is constant" };
  return { rating: "good", reason: "Mild and dry — pleasant visit" };
}

function ruleCreek(w: WeatherSnapshot): Suitability {
  if (isStormy(w)) return { rating: "poor", reason: "Storm — flash flood risk" };
  if (isRaining(w)) return { rating: "poor", reason: "Raining — water level may rise quickly" };
  if (w.temperatureC < 14) return { rating: "poor", reason: "Too cold for water play" };
  if (w.temperatureC < 20) return { rating: "fair", reason: "Mild — water will feel chilly" };
  return { rating: "good", reason: "Warm and dry — ideal conditions" };
}

const RULES: Record<LocationType, (w: WeatherSnapshot) => Suitability> = {
  "swimming-hole": ruleSwimmingHole,
  "splash-pad": ruleSplashPad,
  "waterfall": ruleWaterfall,
  "spring": ruleSpring,
  "creek": ruleCreek,
};

/**
 * Pure function. Given a weather snapshot and a location type,
 * returns a good/fair/poor suitability rating with a one-line reason.
 */
export function suitability(weather: WeatherSnapshot, type: LocationType): Suitability {
  return RULES[type](weather);
}
