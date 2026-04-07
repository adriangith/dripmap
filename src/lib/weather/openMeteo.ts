import type { Coordinates } from "../types";
import type { Forecast, WeatherSnapshot } from "./types";

const BASE = "https://api.open-meteo.com/v1/forecast";
const TIMEOUT_MS = 5000;

interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  current?: {
    time: string;
    temperature_2m: number;
    precipitation: number;
    weather_code: number;
    uv_index: number;
    wind_speed_10m: number;
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    precipitation: number[];
    uv_index: number[];
    weather_code: number[];
  };
}

function buildUrl(coords: Coordinates): string {
  const params = new URLSearchParams({
    latitude: coords.lat.toString(),
    longitude: coords.lng.toString(),
    current: "temperature_2m,precipitation,weather_code,uv_index,wind_speed_10m",
    hourly: "temperature_2m,precipitation_probability,precipitation,uv_index,weather_code",
    forecast_days: "3",
    timezone: "auto",
  });
  return `${BASE}?${params.toString()}`;
}

function parseHourly(h: NonNullable<OpenMeteoResponse["hourly"]>): WeatherSnapshot[] {
  const out: WeatherSnapshot[] = [];
  for (let i = 0; i < h.time.length; i++) {
    out.push({
      time: h.time[i],
      temperatureC: h.temperature_2m[i],
      weatherCode: h.weather_code[i],
      precipitationMm: h.precipitation[i] ?? 0,
      precipitationProbability: h.precipitation_probability[i] ?? 0,
      uvIndex: h.uv_index[i] ?? 0,
      windKmh: 0,
    });
  }
  return out;
}

/**
 * Fetch a forecast from Open-Meteo. Returns null on any failure.
 */
export async function fetchForecast(coords: Coordinates): Promise<Forecast | null> {
  const url = buildUrl(coords);
  const controller = new AbortController();

  const abortPromise = new Promise<null>((resolve) => {
    const timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, TIMEOUT_MS);
    controller.signal.addEventListener("abort", () => clearTimeout(timer));
  });

  const fetchPromise = (async (): Promise<Forecast | null> => {
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;
      const data = (await res.json()) as OpenMeteoResponse;
      if (!data.current || !data.hourly) return null;

      const current: WeatherSnapshot = {
        time: data.current.time,
        temperatureC: data.current.temperature_2m,
        weatherCode: data.current.weather_code,
        precipitationMm: data.current.precipitation ?? 0,
        precipitationProbability: 0,
        uvIndex: data.current.uv_index ?? 0,
        windKmh: data.current.wind_speed_10m ?? 0,
      };

      return {
        location: coords,
        fetchedAt: Date.now(),
        current,
        hourly: parseHourly(data.hourly),
      };
    } catch {
      return null;
    }
  })();

  return Promise.race([fetchPromise, abortPromise]);
}
