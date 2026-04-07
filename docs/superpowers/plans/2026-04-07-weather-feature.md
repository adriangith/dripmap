# Weather Feature Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a weather panel to dripmap that shows current conditions and a derived "good/fair/poor" suitability rating per location type, helping users decide whether water-play activities are worthwhile right now.

**Architecture:** A `WeatherProvider` React context resolves the user's location (cached → IP geo → browser geo upgrade), fetches a single Open-Meteo forecast, and exposes it via `useWeather()`. A pure `suitability(weather, type)` function maps the weather to a per-location-type rating. A `WeatherBanner` sits at the top of the home screen; a `WeatherSection` slots into `LocationDetailPanel` and uses a forecast offset by the location's drive time.

**Tech Stack:** Open-Meteo (free, no API key), ipapi.co for IP geolocation, React context, Workbox runtime caching, Vitest + RTL for tests, Playwright for E2E. No new npm dependencies — `lucide-react`, `react`, `next` already in the project.

**Spec:** [`docs/superpowers/specs/2026-04-07-weather-feature-design.md`](../specs/2026-04-07-weather-feature-design.md)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/weather/types.ts` (create) | Type definitions: `Forecast`, `WeatherSnapshot`, `Suitability`, `LocationSource` |
| `src/lib/weather/suitability.ts` (create) | Pure rules engine — maps weather + location type → `good/fair/poor` rating with reason |
| `src/lib/weather/openMeteo.ts` (create) | Open-Meteo API client: fetch + parse forecast |
| `src/lib/weather/ipLocation.ts` (create) | IP geolocation client (ipapi.co) |
| `src/lib/weather/locationCascade.ts` (create) | Progressive resolver: cached → IP → browser geo |
| `src/lib/weather/cache.ts` (create) | localStorage helpers for location & forecast persistence |
| `src/lib/weather/WeatherProvider.tsx` (create) | React context, holds location/forecast/refresh logic |
| `src/lib/weather/useWeather.ts` (create) | Consumer hook |
| `src/components/WeatherBanner.tsx` (create) | Compact home-screen banner with expandable per-type grid |
| `src/components/WeatherSection.tsx` (create) | Detail-panel section with arrival row + collapsible forecast strip |
| `__tests__/lib/weather/suitability.test.ts` (create) | Table-driven tests for each location type × condition |
| `__tests__/lib/weather/openMeteo.test.ts` (create) | Mocked-fetch tests for Open-Meteo client |
| `__tests__/lib/weather/ipLocation.test.ts` (create) | Mocked-fetch tests for IP geolocation |
| `__tests__/lib/weather/cache.test.ts` (create) | localStorage round-trip and staleness tests |
| `__tests__/lib/weather/locationCascade.test.ts` (create) | Cascade ordering and upgrade tests |
| `__tests__/components/WeatherBanner.test.tsx` (create) | Render states, expand/collapse |
| `__tests__/components/WeatherSection.test.tsx` (create) | Arrival row indexing, forecast strip toggle |
| `e2e/weather.spec.ts` (create) | Happy-path with mocked network |
| `src/app/layout.tsx` (modify) | Wrap children in `<WeatherProvider>` |
| `src/app/page.tsx` (modify) | Render `<WeatherBanner>` above filter bar |
| `src/components/LocationDetailPanel.tsx` (modify) | Render `<WeatherSection>` between status badges and description |
| `scripts/generate-sw.ts` (modify) | Add Workbox runtime route for Open-Meteo + IP geo |

---

## Task 1: Type definitions

**Files:**
- Create: `src/lib/weather/types.ts`

- [ ] **Step 1: Create types file**

Create `src/lib/weather/types.ts`:

```ts
import type { Coordinates, LocationType } from "../types";

export type LocationSource = "cache" | "ip" | "precise";

export interface ResolvedLocation {
  coordinates: Coordinates;
  source: LocationSource;
  /** ms epoch */
  timestamp: number;
}

/** A single hour of weather (current or forecast). */
export interface WeatherSnapshot {
  /** ISO 8601 timestamp */
  time: string;
  /** Celsius */
  temperatureC: number;
  /** Open-Meteo WMO weather code */
  weatherCode: number;
  /** mm of rain in this hour */
  precipitationMm: number;
  /** % chance of precipitation (hourly only; 0 for current) */
  precipitationProbability: number;
  /** UV index (0–11+) */
  uvIndex: number;
  /** km/h (current only; 0 for hourly) */
  windKmh: number;
}

export interface Forecast {
  location: Coordinates;
  /** ms epoch when this forecast was fetched */
  fetchedAt: number;
  current: WeatherSnapshot;
  /** Up to 72 hourly entries (3 days). Sorted by time ascending. */
  hourly: WeatherSnapshot[];
}

export type SuitabilityRating = "good" | "fair" | "poor";

export interface Suitability {
  rating: SuitabilityRating;
  reason: string;
}

export interface WeatherContextValue {
  location: ResolvedLocation | null;
  forecast: Forecast | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

export type { LocationType };
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: PASS (no type errors).

- [ ] **Step 3: Commit**

```bash
git add src/lib/weather/types.ts
git commit -m "feat(weather): add type definitions for forecast and suitability"
```

---

## Task 2: Suitability rules engine

**Files:**
- Create: `src/lib/weather/suitability.ts`
- Create: `__tests__/lib/weather/suitability.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/weather/suitability.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { suitability } from "../../../src/lib/weather/suitability";
import type { WeatherSnapshot } from "../../../src/lib/weather/types";

const base: WeatherSnapshot = {
  time: "2026-04-07T12:00:00Z",
  temperatureC: 25,
  weatherCode: 0, // clear
  precipitationMm: 0,
  precipitationProbability: 0,
  uvIndex: 5,
  windKmh: 8,
};

const w = (overrides: Partial<WeatherSnapshot>): WeatherSnapshot => ({ ...base, ...overrides });

describe("suitability — swimming-hole", () => {
  it("good: warm, dry, moderate UV", () => {
    expect(suitability(w({ temperatureC: 26 }), "swimming-hole").rating).toBe("good");
  });

  it("fair: mild temperature", () => {
    expect(suitability(w({ temperatureC: 21 }), "swimming-hole").rating).toBe("fair");
  });

  it("poor: too cold", () => {
    expect(suitability(w({ temperatureC: 15 }), "swimming-hole").rating).toBe("poor");
  });

  it("poor: raining", () => {
    expect(suitability(w({ precipitationMm: 2 }), "swimming-hole").rating).toBe("poor");
  });

  it("includes a non-empty reason for every rating", () => {
    for (const temp of [15, 21, 26]) {
      const result = suitability(w({ temperatureC: temp }), "swimming-hole");
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("suitability — splash-pad", () => {
  it("good: warm and clear", () => {
    expect(suitability(w({ temperatureC: 24, weatherCode: 0 }), "splash-pad").rating).toBe("good");
  });

  it("fair: mild", () => {
    expect(suitability(w({ temperatureC: 19 }), "splash-pad").rating).toBe("fair");
  });

  it("poor: raining", () => {
    expect(suitability(w({ precipitationMm: 1 }), "splash-pad").rating).toBe("poor");
  });

  it("poor: cold", () => {
    expect(suitability(w({ temperatureC: 14 }), "splash-pad").rating).toBe("poor");
  });
});

describe("suitability — waterfall", () => {
  it("good: recent rain", () => {
    expect(suitability(w({ precipitationMm: 3 }), "waterfall").rating).toBe("good");
  });

  it("fair: dry but mild", () => {
    expect(suitability(w({ precipitationMm: 0, temperatureC: 18 }), "waterfall").rating).toBe("fair");
  });

  it("poor: thunderstorm code 95", () => {
    expect(suitability(w({ weatherCode: 95 }), "waterfall").rating).toBe("poor");
  });

  it("poor: extreme heat", () => {
    expect(suitability(w({ temperatureC: 40 }), "waterfall").rating).toBe("poor");
  });
});

describe("suitability — spring", () => {
  it("good: mild dry", () => {
    expect(suitability(w({ temperatureC: 22 }), "spring").rating).toBe("good");
  });

  it("fair: cool", () => {
    expect(suitability(w({ temperatureC: 12 }), "spring").rating).toBe("fair");
  });

  it("poor: storm", () => {
    expect(suitability(w({ weatherCode: 95 }), "spring").rating).toBe("poor");
  });

  it("poor: freezing", () => {
    expect(suitability(w({ temperatureC: -1 }), "spring").rating).toBe("poor");
  });
});

describe("suitability — creek", () => {
  it("good: warm dry", () => {
    expect(suitability(w({ temperatureC: 22 }), "creek").rating).toBe("good");
  });

  it("fair: mild", () => {
    expect(suitability(w({ temperatureC: 17 }), "creek").rating).toBe("fair");
  });

  it("poor: cold", () => {
    expect(suitability(w({ temperatureC: 12 }), "creek").rating).toBe("poor");
  });

  it("poor: raining", () => {
    expect(suitability(w({ precipitationMm: 1 }), "creek").rating).toBe("poor");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/weather/suitability.test.ts
```

Expected: FAIL — module `../../../src/lib/weather/suitability` does not exist.

- [ ] **Step 3: Implement suitability rules**

Create `src/lib/weather/suitability.ts`:

```ts
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
  if (isStormy(w)) return { rating: "poor", reason: "Storm — splash pads usually closed" };
  if (isRaining(w)) return { rating: "poor", reason: "Raining — no point in a splash pad" };
  if (w.temperatureC < 16) return { rating: "poor", reason: "Too cold for outdoor water play" };
  if (w.temperatureC < 22) return { rating: "fair", reason: "Mild — bring towels for warmth after" };
  return { rating: "good", reason: "Warm and sunny — perfect splash pad weather" };
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
  if (isStormy(w)) return { rating: "poor", reason: "Storm — flash flood risk in creeks" };
  if (isRaining(w)) return { rating: "poor", reason: "Raining — creek may rise quickly" };
  if (w.temperatureC < 14) return { rating: "poor", reason: "Too cold to enjoy a creek" };
  if (w.temperatureC < 20) return { rating: "fair", reason: "Mild — water will feel chilly" };
  return { rating: "good", reason: "Warm and dry — great creek weather" };
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/weather/suitability.test.ts
```

Expected: PASS (all 23 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/weather/suitability.ts __tests__/lib/weather/suitability.test.ts
git commit -m "feat(weather): add suitability rules engine with per-type ratings"
```

---

## Task 3: Open-Meteo client

**Files:**
- Create: `src/lib/weather/openMeteo.ts`
- Create: `__tests__/lib/weather/openMeteo.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/weather/openMeteo.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchForecast } from "../../../src/lib/weather/openMeteo";

const sampleResponse = {
  latitude: -37.81,
  longitude: 144.96,
  current: {
    time: "2026-04-07T12:00",
    temperature_2m: 24.5,
    precipitation: 0,
    weather_code: 1,
    uv_index: 6,
    wind_speed_10m: 12,
  },
  hourly: {
    time: ["2026-04-07T12:00", "2026-04-07T13:00", "2026-04-07T14:00"],
    temperature_2m: [24.5, 25.0, 25.5],
    precipitation_probability: [0, 10, 20],
    precipitation: [0, 0, 0.2],
    uv_index: [6, 7, 7],
    weather_code: [1, 2, 2],
  },
};

describe("fetchForecast", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls Open-Meteo with correct query parameters", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => sampleResponse,
    } as Response);

    await fetchForecast({ lat: -37.81, lng: 144.96 });

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("api.open-meteo.com/v1/forecast");
    expect(url).toContain("latitude=-37.81");
    expect(url).toContain("longitude=144.96");
    expect(url).toContain("current=temperature_2m,precipitation,weather_code,uv_index,wind_speed_10m");
    expect(url).toContain("hourly=temperature_2m,precipitation_probability,precipitation,uv_index,weather_code");
    expect(url).toContain("forecast_days=3");
    expect(url).toContain("timezone=auto");
  });

  it("parses response into Forecast shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => sampleResponse,
    } as Response);

    const forecast = await fetchForecast({ lat: -37.81, lng: 144.96 });

    expect(forecast).not.toBeNull();
    expect(forecast!.location).toEqual({ lat: -37.81, lng: 144.96 });
    expect(forecast!.current.temperatureC).toBe(24.5);
    expect(forecast!.current.weatherCode).toBe(1);
    expect(forecast!.current.uvIndex).toBe(6);
    expect(forecast!.current.windKmh).toBe(12);
    expect(forecast!.hourly).toHaveLength(3);
    expect(forecast!.hourly[1].temperatureC).toBe(25.0);
    expect(forecast!.hourly[1].precipitationProbability).toBe(10);
    expect(forecast!.hourly[2].precipitationMm).toBe(0.2);
    expect(typeof forecast!.fetchedAt).toBe("number");
  });

  it("returns null when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network"));
    const result = await fetchForecast({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);
    const result = await fetchForecast({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it("returns null when response missing required fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ latitude: 0, longitude: 0 }), // no current/hourly
    } as Response);
    const result = await fetchForecast({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it("aborts request after 5 second timeout", async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      capturedSignal = (init as RequestInit)?.signal ?? undefined;
      return new Promise(() => {});
    });

    const promise = fetchForecast({ lat: 0, lng: 0 });
    vi.advanceTimersByTime(5000);

    const result = await promise;
    expect(result).toBeNull();
    expect(capturedSignal?.aborted).toBe(true);

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/weather/openMeteo.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement openMeteo client**

Create `src/lib/weather/openMeteo.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/weather/openMeteo.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/weather/openMeteo.ts __tests__/lib/weather/openMeteo.test.ts
git commit -m "feat(weather): add Open-Meteo forecast client"
```

---

## Task 4: IP geolocation client

**Files:**
- Create: `src/lib/weather/ipLocation.ts`
- Create: `__tests__/lib/weather/ipLocation.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/weather/ipLocation.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchIpLocation } from "../../../src/lib/weather/ipLocation";

describe("fetchIpLocation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns coordinates from ipapi.co response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ latitude: -37.81, longitude: 144.96, city: "Melbourne" }),
    } as Response);

    const result = await fetchIpLocation();
    expect(result).toEqual({ lat: -37.81, lng: 144.96 });
  });

  it("calls the ipapi.co JSON endpoint", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ latitude: 0, longitude: 0 }),
    } as Response);

    await fetchIpLocation();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("ipapi.co");
    expect(url).toContain("json");
  });

  it("returns null when response not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    const result = await fetchIpLocation();
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    const result = await fetchIpLocation();
    expect(result).toBeNull();
  });

  it("returns null when response missing latitude/longitude", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: true, reason: "RateLimited" }),
    } as Response);
    const result = await fetchIpLocation();
    expect(result).toBeNull();
  });

  it("aborts after 4 second timeout", async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      capturedSignal = (init as RequestInit)?.signal ?? undefined;
      return new Promise(() => {});
    });

    const promise = fetchIpLocation();
    vi.advanceTimersByTime(4000);

    const result = await promise;
    expect(result).toBeNull();
    expect(capturedSignal?.aborted).toBe(true);
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/weather/ipLocation.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement IP geolocation**

Create `src/lib/weather/ipLocation.ts`:

```ts
import type { Coordinates } from "../types";

const ENDPOINT = "https://ipapi.co/json/";
const TIMEOUT_MS = 4000;

/**
 * Fetch a rough city-level location for the user's IP. No API key required.
 * Returns null on any failure (network, timeout, rate limit, malformed response).
 */
export async function fetchIpLocation(): Promise<Coordinates | null> {
  const controller = new AbortController();

  const abortPromise = new Promise<null>((resolve) => {
    const timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, TIMEOUT_MS);
    controller.signal.addEventListener("abort", () => clearTimeout(timer));
  });

  const fetchPromise = (async (): Promise<Coordinates | null> => {
    try {
      const res = await fetch(ENDPOINT, { signal: controller.signal });
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data?.latitude !== "number" || typeof data?.longitude !== "number") {
        return null;
      }
      return { lat: data.latitude, lng: data.longitude };
    } catch {
      return null;
    }
  })();

  return Promise.race([fetchPromise, abortPromise]);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/weather/ipLocation.test.ts
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/weather/ipLocation.ts __tests__/lib/weather/ipLocation.test.ts
git commit -m "feat(weather): add IP geolocation client (ipapi.co)"
```

---

## Task 5: localStorage cache helpers

**Files:**
- Create: `src/lib/weather/cache.ts`
- Create: `__tests__/lib/weather/cache.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/weather/cache.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import {
  loadCachedLocation,
  saveCachedLocation,
  loadCachedForecast,
  saveCachedForecast,
  isForecastFresh,
  hasMovedSignificantly,
} from "../../../src/lib/weather/cache";
import type { ResolvedLocation, Forecast } from "../../../src/lib/weather/types";

const sampleLocation: ResolvedLocation = {
  coordinates: { lat: -37.81, lng: 144.96 },
  source: "ip",
  timestamp: 1_700_000_000_000,
};

const sampleForecast: Forecast = {
  location: { lat: -37.81, lng: 144.96 },
  fetchedAt: 1_700_000_000_000,
  current: {
    time: "2026-04-07T12:00",
    temperatureC: 24,
    weatherCode: 0,
    precipitationMm: 0,
    precipitationProbability: 0,
    uvIndex: 5,
    windKmh: 8,
  },
  hourly: [],
};

describe("location cache", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when no cached location", () => {
    expect(loadCachedLocation()).toBeNull();
  });

  it("round-trips a saved location", () => {
    saveCachedLocation(sampleLocation);
    expect(loadCachedLocation()).toEqual(sampleLocation);
  });

  it("returns null when stored data is corrupted", () => {
    localStorage.setItem("dripmap:lastLocation", "not json");
    expect(loadCachedLocation()).toBeNull();
  });

  it("returns null when stored data missing required fields", () => {
    localStorage.setItem("dripmap:lastLocation", JSON.stringify({ coordinates: {} }));
    expect(loadCachedLocation()).toBeNull();
  });
});

describe("forecast cache", () => {
  beforeEach(() => localStorage.clear());

  it("returns null when no cached forecast", () => {
    expect(loadCachedForecast()).toBeNull();
  });

  it("round-trips a saved forecast", () => {
    saveCachedForecast(sampleForecast);
    expect(loadCachedForecast()).toEqual(sampleForecast);
  });

  it("returns null when stored data is corrupted", () => {
    localStorage.setItem("dripmap:lastForecast", "{not json");
    expect(loadCachedForecast()).toBeNull();
  });
});

describe("isForecastFresh", () => {
  it("returns true when fetched within window", () => {
    const now = Date.now();
    expect(isForecastFresh({ ...sampleForecast, fetchedAt: now - 5 * 60 * 1000 }, 15 * 60 * 1000)).toBe(true);
  });

  it("returns false when older than window", () => {
    const now = Date.now();
    expect(isForecastFresh({ ...sampleForecast, fetchedAt: now - 30 * 60 * 1000 }, 15 * 60 * 1000)).toBe(false);
  });
});

describe("hasMovedSignificantly", () => {
  it("returns false for identical coords", () => {
    expect(hasMovedSignificantly({ lat: -37.81, lng: 144.96 }, { lat: -37.81, lng: 144.96 }, 5)).toBe(false);
  });

  it("returns false for sub-threshold movement", () => {
    expect(hasMovedSignificantly({ lat: -37.81, lng: 144.96 }, { lat: -37.82, lng: 144.97 }, 5)).toBe(false);
  });

  it("returns true for movement above threshold", () => {
    // Melbourne to Geelong is ~75 km
    expect(hasMovedSignificantly({ lat: -37.81, lng: 144.96 }, { lat: -38.15, lng: 144.36 }, 5)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/weather/cache.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement cache module**

Create `src/lib/weather/cache.ts`:

```ts
import type { Coordinates } from "../types";
import { haversineDistanceKm } from "../useCurrentLocation";
import type { Forecast, ResolvedLocation } from "./types";

const LOCATION_KEY = "dripmap:lastLocation";
const FORECAST_KEY = "dripmap:lastForecast";

function safeStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function loadCachedLocation(): ResolvedLocation | null {
  const ls = safeStorage();
  if (!ls) return null;
  const raw = ls.getItem(LOCATION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.coordinates?.lat !== "number" ||
      typeof parsed?.coordinates?.lng !== "number" ||
      typeof parsed?.source !== "string" ||
      typeof parsed?.timestamp !== "number"
    ) {
      return null;
    }
    return parsed as ResolvedLocation;
  } catch {
    return null;
  }
}

export function saveCachedLocation(location: ResolvedLocation): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(LOCATION_KEY, JSON.stringify(location));
  } catch {
    /* ignore quota errors */
  }
}

export function loadCachedForecast(): Forecast | null {
  const ls = safeStorage();
  if (!ls) return null;
  const raw = ls.getItem(FORECAST_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (
      typeof parsed?.fetchedAt !== "number" ||
      !parsed?.current ||
      !Array.isArray(parsed?.hourly)
    ) {
      return null;
    }
    return parsed as Forecast;
  } catch {
    return null;
  }
}

export function saveCachedForecast(forecast: Forecast): void {
  const ls = safeStorage();
  if (!ls) return;
  try {
    ls.setItem(FORECAST_KEY, JSON.stringify(forecast));
  } catch {
    /* ignore quota errors */
  }
}

/** Returns true if the forecast was fetched within the freshness window. */
export function isForecastFresh(forecast: Forecast, windowMs: number): boolean {
  return Date.now() - forecast.fetchedAt < windowMs;
}

/** Returns true if the user has moved more than `thresholdKm` from the previous location. */
export function hasMovedSignificantly(prev: Coordinates, next: Coordinates, thresholdKm: number): boolean {
  return haversineDistanceKm(prev, next) >= thresholdKm;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/weather/cache.test.ts
```

Expected: PASS (12 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/weather/cache.ts __tests__/lib/weather/cache.test.ts
git commit -m "feat(weather): add localStorage cache helpers for location and forecast"
```

---

## Task 6: Location cascade resolver

**Files:**
- Create: `src/lib/weather/locationCascade.ts`
- Create: `__tests__/lib/weather/locationCascade.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/lib/weather/locationCascade.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveLocation } from "../../../src/lib/weather/locationCascade";
import * as cache from "../../../src/lib/weather/cache";
import * as ipLocation from "../../../src/lib/weather/ipLocation";

describe("resolveLocation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns cached location immediately when present", async () => {
    vi.spyOn(cache, "loadCachedLocation").mockReturnValue({
      coordinates: { lat: 1, lng: 2 },
      source: "precise",
      timestamp: Date.now(),
    });
    const ipSpy = vi.spyOn(ipLocation, "fetchIpLocation");

    const result = await resolveLocation();

    expect(result?.coordinates).toEqual({ lat: 1, lng: 2 });
    expect(result?.source).toBe("precise");
    expect(ipSpy).not.toHaveBeenCalled();
  });

  it("falls back to IP geolocation when no cache", async () => {
    vi.spyOn(cache, "loadCachedLocation").mockReturnValue(null);
    vi.spyOn(ipLocation, "fetchIpLocation").mockResolvedValue({ lat: 10, lng: 20 });
    const saveSpy = vi.spyOn(cache, "saveCachedLocation").mockImplementation(() => {});

    const result = await resolveLocation();

    expect(result?.coordinates).toEqual({ lat: 10, lng: 20 });
    expect(result?.source).toBe("ip");
    expect(saveSpy).toHaveBeenCalled();
  });

  it("returns null when no cache and IP fails", async () => {
    vi.spyOn(cache, "loadCachedLocation").mockReturnValue(null);
    vi.spyOn(ipLocation, "fetchIpLocation").mockResolvedValue(null);

    const result = await resolveLocation();
    expect(result).toBeNull();
  });
});

describe("upgradeToBrowserLocation", () => {
  it("is exported as a separate function", async () => {
    const mod = await import("../../../src/lib/weather/locationCascade");
    expect(typeof mod.upgradeToBrowserLocation).toBe("function");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/weather/locationCascade.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement locationCascade**

Create `src/lib/weather/locationCascade.ts`:

```ts
import type { Coordinates } from "../types";
import type { ResolvedLocation } from "./types";
import { loadCachedLocation, saveCachedLocation } from "./cache";
import { fetchIpLocation } from "./ipLocation";

/**
 * Resolve a location for weather purposes. Order of preference:
 *   1. localStorage cache (instant)
 *   2. IP geolocation (~instant rough)
 * The browser geolocation upgrade is handled separately via
 * `upgradeToBrowserLocation` so the initial fetch doesn't block on a
 * permission prompt.
 */
export async function resolveLocation(): Promise<ResolvedLocation | null> {
  const cached = loadCachedLocation();
  if (cached) return cached;

  const ip = await fetchIpLocation();
  if (!ip) return null;

  const resolved: ResolvedLocation = {
    coordinates: ip,
    source: "ip",
    timestamp: Date.now(),
  };
  saveCachedLocation(resolved);
  return resolved;
}

/**
 * Attempt to silently upgrade to precise browser geolocation.
 * Resolves with the precise coords or null if unavailable/denied.
 * Does NOT prompt the user — only succeeds when permission was previously granted.
 */
export function upgradeToBrowserLocation(): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.permissions || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.permissions
      .query({ name: "geolocation" })
      .then((perm) => {
        if (perm.state !== "granted") {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
        );
      })
      .catch(() => resolve(null));
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/weather/locationCascade.test.ts
```

Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/weather/locationCascade.ts __tests__/lib/weather/locationCascade.test.ts
git commit -m "feat(weather): add progressive location cascade (cache → IP → browser)"
```

---

## Task 7: WeatherProvider context & useWeather hook

**Files:**
- Create: `src/lib/weather/WeatherProvider.tsx`
- Create: `src/lib/weather/useWeather.ts`

This task wires the resolver, fetcher, and caches into a React context. It is integration-tested via the component tests in later tasks rather than directly, since the hook is mostly orchestration of already-tested units.

- [ ] **Step 1: Create useWeather hook**

Create `src/lib/weather/useWeather.ts`:

```ts
"use client";

import { useContext } from "react";
import { WeatherContext } from "./WeatherProvider";
import type { WeatherContextValue } from "./types";

export function useWeather(): WeatherContextValue {
  const ctx = useContext(WeatherContext);
  if (!ctx) {
    throw new Error("useWeather must be used inside <WeatherProvider>");
  }
  return ctx;
}
```

- [ ] **Step 2: Create WeatherProvider**

Create `src/lib/weather/WeatherProvider.tsx`:

```tsx
"use client";

import { createContext, useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { Forecast, ResolvedLocation, WeatherContextValue } from "./types";
import { fetchForecast } from "./openMeteo";
import { resolveLocation, upgradeToBrowserLocation } from "./locationCascade";
import {
  loadCachedForecast,
  saveCachedForecast,
  saveCachedLocation,
  isForecastFresh,
  hasMovedSignificantly,
} from "./cache";

const FRESH_MS = 15 * 60 * 1000;        // 15 min — in-memory freshness
const STALE_FALLBACK_MS = 2 * 60 * 60 * 1000; // 2 hr — localStorage fallback
const MOVE_THRESHOLD_KM = 5;

export const WeatherContext = createContext<WeatherContextValue | null>(null);

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedFor = useRef<{ lat: number; lng: number } | null>(null);

  const doFetch = useCallback(async (loc: ResolvedLocation) => {
    setLoading(true);
    setError(null);
    const result = await fetchForecast(loc.coordinates);
    if (result) {
      setForecast(result);
      saveCachedForecast(result);
      lastFetchedFor.current = loc.coordinates;
    } else {
      // Try stale localStorage fallback
      const cached = loadCachedForecast();
      if (cached && Date.now() - cached.fetchedAt < STALE_FALLBACK_MS) {
        setForecast(cached);
      } else {
        setError("Weather unavailable");
      }
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    if (location) void doFetch(location);
  }, [location, doFetch]);

  // Initial location resolution + first fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Seed from cached forecast immediately if available
      const cachedForecast = loadCachedForecast();
      if (cachedForecast && Date.now() - cachedForecast.fetchedAt < STALE_FALLBACK_MS) {
        if (!cancelled) setForecast(cachedForecast);
      }

      const resolved = await resolveLocation();
      if (cancelled) return;
      if (!resolved) {
        setError("Weather unavailable");
        return;
      }
      setLocation(resolved);

      // Skip fetch if we already have a fresh forecast for nearby coords
      if (
        cachedForecast &&
        isForecastFresh(cachedForecast, FRESH_MS) &&
        !hasMovedSignificantly(cachedForecast.location, resolved.coordinates, MOVE_THRESHOLD_KM)
      ) {
        lastFetchedFor.current = cachedForecast.location;
        return;
      }
      void doFetch(resolved);
    })();
    return () => { cancelled = true; };
  }, [doFetch]);

  // Try silent upgrade to precise browser location
  useEffect(() => {
    let cancelled = false;
    void upgradeToBrowserLocation().then((coords) => {
      if (cancelled || !coords) return;
      setLocation((prev) => {
        const next: ResolvedLocation = {
          coordinates: coords,
          source: "precise",
          timestamp: Date.now(),
        };
        saveCachedLocation(next);
        // Refetch if we've moved significantly or had no prior location
        if (!prev || hasMovedSignificantly(prev.coordinates, coords, MOVE_THRESHOLD_KM)) {
          void doFetch(next);
        }
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [doFetch]);

  // Refresh on tab visibility if forecast is stale
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      if (forecast && !isForecastFresh(forecast, FRESH_MS) && location) {
        void doFetch(location);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [forecast, location, doFetch]);

  const value: WeatherContextValue = {
    location,
    forecast,
    loading,
    error,
    refresh,
  };

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/weather/WeatherProvider.tsx src/lib/weather/useWeather.ts
git commit -m "feat(weather): add WeatherProvider context and useWeather hook"
```

---

## Task 8: WeatherBanner component

**Files:**
- Create: `src/components/WeatherBanner.tsx`
- Create: `__tests__/components/WeatherBanner.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/WeatherBanner.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WeatherBanner from "../../src/components/WeatherBanner";
import { WeatherContext } from "../../src/lib/weather/WeatherProvider";
import type { WeatherContextValue, Forecast } from "../../src/lib/weather/types";

const sampleForecast: Forecast = {
  location: { lat: -37.81, lng: 144.96 },
  fetchedAt: Date.now(),
  current: {
    time: "2026-04-07T12:00",
    temperatureC: 26,
    weatherCode: 0,
    precipitationMm: 0,
    precipitationProbability: 0,
    uvIndex: 5,
    windKmh: 8,
  },
  hourly: [],
};

function renderWith(ctx: Partial<WeatherContextValue>) {
  const value: WeatherContextValue = {
    location: null,
    forecast: null,
    loading: false,
    error: null,
    refresh: () => {},
    ...ctx,
  };
  return render(
    <WeatherContext.Provider value={value}>
      <WeatherBanner />
    </WeatherContext.Provider>,
  );
}

describe("WeatherBanner", () => {
  it("renders nothing when forecast is null and no error", () => {
    const { container } = renderWith({ loading: true });
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when there is an error and no forecast", () => {
    const { container } = renderWith({ error: "Weather unavailable" });
    expect(container.firstChild).toBeNull();
  });

  it("shows current temperature when forecast loaded", () => {
    renderWith({ forecast: sampleForecast });
    expect(screen.getByText(/26°C/)).toBeInTheDocument();
  });

  it("expands to show per-type suitability when clicked", () => {
    renderWith({ forecast: sampleForecast });
    // Collapsed by default — per-type list not visible
    expect(screen.queryByText(/swimming hole/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByText(/swimming hole/i)).toBeInTheDocument();
    expect(screen.getByText(/waterfall/i)).toBeInTheDocument();
    expect(screen.getByText(/splash pad/i)).toBeInTheDocument();
    expect(screen.getByText(/spring/i)).toBeInTheDocument();
    expect(screen.getByText(/creek/i)).toBeInTheDocument();
  });

  it("collapses when clicked again", () => {
    renderWith({ forecast: sampleForecast });
    const btn = screen.getByRole("button", { name: /toggle weather details/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.queryByText(/swimming hole/i)).not.toBeInTheDocument();
  });

  it("calls refresh when refresh button clicked in expanded view", () => {
    let called = 0;
    renderWith({ forecast: sampleForecast, refresh: () => { called++; } });
    fireEvent.click(screen.getByRole("button", { name: /toggle weather details/i }));
    fireEvent.click(screen.getByRole("button", { name: /refresh weather/i }));
    expect(called).toBe(1);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/components/WeatherBanner.test.tsx
```

Expected: FAIL — `WeatherBanner` does not exist.

- [ ] **Step 3: Implement WeatherBanner**

Create `src/components/WeatherBanner.tsx`:

```tsx
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Sun, CloudRain, Cloud, CloudSnow, Zap } from "lucide-react";
import { useWeather } from "@/lib/weather/useWeather";
import { suitability } from "@/lib/weather/suitability";
import type { LocationType, SuitabilityRating, WeatherSnapshot } from "@/lib/weather/types";

const TYPES: { value: LocationType; label: string }[] = [
  { value: "swimming-hole", label: "Swimming Hole" },
  { value: "splash-pad", label: "Splash Pad" },
  { value: "waterfall", label: "Waterfall" },
  { value: "spring", label: "Spring" },
  { value: "creek", label: "Creek" },
];

function weatherIcon(code: number) {
  if ([0, 1].includes(code)) return <Sun className="w-5 h-5 text-amber-500" />;
  if ([2, 3, 45, 48].includes(code)) return <Cloud className="w-5 h-5 text-gray-500" />;
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain className="w-5 h-5 text-blue-500" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className="w-5 h-5 text-blue-300" />;
  if ([95, 96, 99].includes(code)) return <Zap className="w-5 h-5 text-amber-600" />;
  return <Cloud className="w-5 h-5 text-gray-500" />;
}

function ratingColor(rating: SuitabilityRating): string {
  switch (rating) {
    case "good": return "bg-emerald-100 text-emerald-800";
    case "fair": return "bg-amber-100 text-amber-800";
    case "poor": return "bg-rose-100 text-rose-800";
  }
}

function ratingDot(rating: SuitabilityRating): string {
  switch (rating) {
    case "good": return "bg-emerald-500";
    case "fair": return "bg-amber-500";
    case "poor": return "bg-rose-500";
  }
}

function summary(current: WeatherSnapshot): string {
  const goodTypes = TYPES
    .filter((t) => suitability(current, t.value).rating === "good")
    .map((t) => t.label.toLowerCase());
  if (goodTypes.length === 0) return "Limited water play conditions today";
  if (goodTypes.length === 1) return `Good day for ${goodTypes[0]}s`;
  if (goodTypes.length === TYPES.length) return "Great day — all activities good";
  return `Good day for ${goodTypes.slice(0, 2).join("s & ")}s`;
}

export default function WeatherBanner() {
  const { forecast, refresh, loading } = useWeather();
  const [expanded, setExpanded] = useState(false);

  if (!forecast) return null;

  const c = forecast.current;
  const Icon = weatherIcon(c.weatherCode);

  return (
    <div className="border-b border-blue-100 bg-blue-50">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left min-h-[44px]"
        aria-expanded={expanded}
        aria-label="Toggle weather details"
      >
        {Icon}
        <span className="text-sm font-medium text-gray-900">
          {Math.round(c.temperatureC)}°C
        </span>
        <span className="text-sm text-gray-700 truncate">· {summary(c)}</span>
        <span className="ml-auto text-gray-500">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <ul className="space-y-1.5">
            {TYPES.map((t) => {
              const s = suitability(c, t.value);
              return (
                <li key={t.value} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${ratingDot(s.rating)}`} />
                  <span className="font-medium text-gray-900 w-32">{t.label}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${ratingColor(s.rating)}`}>
                    {s.rating}
                  </span>
                  <span className="text-xs text-gray-600 truncate">{s.reason}</span>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh weather"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 disabled:opacity-50 min-h-[36px]"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/components/WeatherBanner.test.tsx
```

Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/WeatherBanner.tsx __tests__/components/WeatherBanner.test.tsx
git commit -m "feat(weather): add WeatherBanner with expandable per-type suitability"
```

---

## Task 9: WeatherSection component

**Files:**
- Create: `src/components/WeatherSection.tsx`
- Create: `__tests__/components/WeatherSection.test.tsx`

- [ ] **Step 1: Write failing tests**

Create `__tests__/components/WeatherSection.test.tsx`:

```tsx
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WeatherSection from "../../src/components/WeatherSection";
import { WeatherContext } from "../../src/lib/weather/WeatherProvider";
import type { WeatherContextValue, Forecast, WeatherSnapshot } from "../../src/lib/weather/types";

function makeHourly(count: number, startTempC: number): WeatherSnapshot[] {
  const out: WeatherSnapshot[] = [];
  const start = Date.now();
  for (let i = 0; i < count; i++) {
    out.push({
      time: new Date(start + i * 60 * 60 * 1000).toISOString(),
      temperatureC: startTempC + i,
      weatherCode: 0,
      precipitationMm: 0,
      precipitationProbability: 0,
      uvIndex: 5,
      windKmh: 0,
    });
  }
  return out;
}

const sampleForecast: Forecast = {
  location: { lat: -37.81, lng: 144.96 },
  fetchedAt: Date.now(),
  current: {
    time: new Date().toISOString(),
    temperatureC: 24,
    weatherCode: 0,
    precipitationMm: 0,
    precipitationProbability: 0,
    uvIndex: 5,
    windKmh: 8,
  },
  hourly: makeHourly(72, 24),
};

function renderWith(props: { driveSeconds: number | null; type: "swimming-hole" | "waterfall" }) {
  const value: WeatherContextValue = {
    location: { coordinates: { lat: 0, lng: 0 }, source: "ip", timestamp: 0 },
    forecast: sampleForecast,
    loading: false,
    error: null,
    refresh: () => {},
  };
  return render(
    <WeatherContext.Provider value={value}>
      <WeatherSection locationType={props.type} driveSeconds={props.driveSeconds} />
    </WeatherContext.Provider>,
  );
}

describe("WeatherSection", () => {
  it("renders nothing when no forecast", () => {
    const value: WeatherContextValue = {
      location: null, forecast: null, loading: false, error: null, refresh: () => {},
    };
    const { container } = render(
      <WeatherContext.Provider value={value}>
        <WeatherSection locationType="swimming-hole" driveSeconds={null} />
      </WeatherContext.Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("uses current forecast when driveSeconds is null", () => {
    renderWith({ driveSeconds: null, type: "swimming-hole" });
    // current temp is 24
    expect(screen.getByText(/24°C/)).toBeInTheDocument();
  });

  it("offsets into hourly forecast by drive time", () => {
    // 3 hours of driving → hourly index 3 → temp 27
    renderWith({ driveSeconds: 3 * 3600, type: "swimming-hole" });
    expect(screen.getByText(/27°C/)).toBeInTheDocument();
  });

  it("clamps offset when drive time exceeds forecast horizon", () => {
    // 200 hours of driving → clamps to last hourly entry (index 71 → temp 95)
    renderWith({ driveSeconds: 200 * 3600, type: "swimming-hole" });
    expect(screen.getByText(/95°C/)).toBeInTheDocument();
  });

  it("shows suitability rating for the location type", () => {
    renderWith({ driveSeconds: null, type: "swimming-hole" });
    // 24°C is fair for swimming-hole
    expect(screen.getByText(/fair/i)).toBeInTheDocument();
  });

  it("forecast strip is collapsed by default", () => {
    renderWith({ driveSeconds: null, type: "swimming-hole" });
    expect(screen.queryByTestId("forecast-strip")).not.toBeInTheDocument();
  });

  it("forecast strip toggles open and closed", () => {
    renderWith({ driveSeconds: null, type: "swimming-hole" });
    const toggle = screen.getByRole("button", { name: /forecast/i });
    fireEvent.click(toggle);
    expect(screen.getByTestId("forecast-strip")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTestId("forecast-strip")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/components/WeatherSection.test.tsx
```

Expected: FAIL — `WeatherSection` does not exist.

- [ ] **Step 3: Implement WeatherSection**

Create `src/components/WeatherSection.tsx`:

```tsx
"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Sun, CloudRain, Cloud, CloudSnow, Zap } from "lucide-react";
import { useWeather } from "@/lib/weather/useWeather";
import { suitability } from "@/lib/weather/suitability";
import type { LocationType, SuitabilityRating, WeatherSnapshot } from "@/lib/weather/types";

interface Props {
  locationType: LocationType;
  /** Drive time in seconds; null if not yet known */
  driveSeconds: number | null;
}

function weatherIcon(code: number) {
  if ([0, 1].includes(code)) return <Sun className="w-4 h-4 text-amber-500" />;
  if ([2, 3, 45, 48].includes(code)) return <Cloud className="w-4 h-4 text-gray-500" />;
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain className="w-4 h-4 text-blue-500" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className="w-4 h-4 text-blue-300" />;
  if ([95, 96, 99].includes(code)) return <Zap className="w-4 h-4 text-amber-600" />;
  return <Cloud className="w-4 h-4 text-gray-500" />;
}

function ratingColor(r: SuitabilityRating): string {
  switch (r) {
    case "good": return "bg-emerald-100 text-emerald-800";
    case "fair": return "bg-amber-100 text-amber-800";
    case "poor": return "bg-rose-100 text-rose-800";
  }
}

/**
 * Pick the hourly forecast index closest to (now + driveSeconds).
 * Clamps to the last available entry when drive time exceeds horizon.
 */
function pickArrivalSnapshot(
  hourly: WeatherSnapshot[],
  driveSeconds: number | null,
): WeatherSnapshot | null {
  if (hourly.length === 0) return null;
  const offsetHours = driveSeconds == null ? 0 : Math.round(driveSeconds / 3600);
  const idx = Math.min(Math.max(offsetHours, 0), hourly.length - 1);
  return hourly[idx];
}

function dailySummary(hourly: WeatherSnapshot[], dayOffset: number): {
  date: Date;
  high: number;
  low: number;
  code: number;
} | null {
  // Group hourly entries into 24-hour blocks starting at index dayOffset*24
  const start = dayOffset * 24;
  const end = start + 24;
  const slice = hourly.slice(start, end);
  if (slice.length === 0) return null;
  let high = -Infinity;
  let low = Infinity;
  for (const h of slice) {
    if (h.temperatureC > high) high = h.temperatureC;
    if (h.temperatureC < low) low = h.temperatureC;
  }
  // Use noon for representative weather code, fallback to mid-slice
  const middle = slice[Math.floor(slice.length / 2)];
  return {
    date: new Date(slice[0].time),
    high: Math.round(high),
    low: Math.round(low),
    code: middle.weatherCode,
  };
}

export default function WeatherSection({ locationType, driveSeconds }: Props) {
  const { forecast } = useWeather();
  const [open, setOpen] = useState(false);

  const arrival = useMemo(
    () => (forecast ? pickArrivalSnapshot(forecast.hourly, driveSeconds) ?? forecast.current : null),
    [forecast, driveSeconds],
  );

  if (!forecast || !arrival) return null;

  const s = suitability(arrival, locationType);
  const isArrival = driveSeconds != null && driveSeconds > 30 * 60;

  return (
    <section className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
      <div className="flex items-center gap-2">
        {weatherIcon(arrival.weatherCode)}
        <span className="text-sm font-semibold text-gray-900">
          {Math.round(arrival.temperatureC)}°C
        </span>
        <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${ratingColor(s.rating)}`}>
          {s.rating}
        </span>
        <span className="text-xs text-gray-700 truncate">
          {isArrival ? "at arrival · " : ""}{s.reason}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 min-h-[36px]"
        aria-expanded={open}
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Forecast
      </button>

      {open && (
        <div data-testid="forecast-strip" className="mt-2 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((day) => {
            const d = dailySummary(forecast.hourly, day);
            if (!d) return <div key={day} />;
            const noonIdx = day * 24 + 12;
            const sample = forecast.hourly[Math.min(noonIdx, forecast.hourly.length - 1)];
            const dayRating = suitability(sample, locationType);
            return (
              <div key={day} className="text-center bg-white rounded p-2">
                <div className="text-xs text-gray-500">
                  {d.date.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div className="my-1 flex justify-center">{weatherIcon(d.code)}</div>
                <div className="text-xs text-gray-900">
                  {d.high}° / {d.low}°
                </div>
                <span className={`mt-1 inline-block px-1.5 py-0.5 text-[10px] rounded-full capitalize ${ratingColor(dayRating.rating)}`}>
                  {dayRating.rating}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/components/WeatherSection.test.tsx
```

Expected: PASS (7 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/WeatherSection.tsx __tests__/components/WeatherSection.test.tsx
git commit -m "feat(weather): add WeatherSection with arrival row and forecast strip"
```

---

## Task 10: Wire WeatherProvider into root layout

**Files:**
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Wrap children in WeatherProvider**

Edit `src/app/layout.tsx`. Replace the `body` contents:

```tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import { WeatherProvider } from "@/lib/weather/WeatherProvider";

// ...metadata and viewport unchanged...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="h-full text-gray-900 antialiased">
        <WeatherProvider>{children}</WeatherProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 3: Run existing tests to verify no regression**

```bash
npm run test
```

Expected: PASS (all existing tests still pass).

- [ ] **Step 4: Commit**

```bash
git add src/app/layout.tsx
git commit -m "feat(weather): wrap app in WeatherProvider"
```

---

## Task 11: Wire WeatherBanner into home page

**Files:**
- Modify: `src/app/page.tsx`

- [ ] **Step 1: Add the banner above the FilterBar**

Edit `src/app/page.tsx`. Add the import near the other component imports:

```tsx
import WeatherBanner from "@/components/WeatherBanner";
```

Then locate the JSX that renders `<FilterBar ... />` and insert `<WeatherBanner />` immediately before it. The structure should look like:

```tsx
<>
  <WeatherBanner />
  <FilterBar
    filters={filters}
    onChange={setFilters}
    resultCount={filteredLocations.length}
  />
  {/* ... rest of page ... */}
</>
```

(The exact ancestor markup depends on the current `page.tsx`. The banner must appear in both the desktop sidebar layout and the mobile bottom sheet's parent container — wherever `FilterBar` is rendered. If `FilterBar` appears inside `BottomSheet` for mobile, place `WeatherBanner` outside the sheet so it remains visible above the map; mirror it inside the desktop sidebar above its `FilterBar`.)

- [ ] **Step 2: Run dev server and visually verify**

```bash
npm run dev
```

Open `http://localhost:3000`. Expected: a blue banner appears above the filter bar, showing temperature + activity summary. Tapping it expands to show per-type ratings.

(If you see no banner, that means location resolution failed — check the browser console.)

- [ ] **Step 3: Run existing tests**

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(weather): show WeatherBanner above filter bar on home page"
```

---

## Task 12: Wire WeatherSection into LocationDetailPanel

**Files:**
- Modify: `src/components/LocationDetailPanel.tsx`

- [ ] **Step 1: Add the import**

At the top of `src/components/LocationDetailPanel.tsx`:

```tsx
import WeatherSection from "./WeatherSection";
```

- [ ] **Step 2: Render WeatherSection between status badges and description**

In the JSX, locate the block that ends the status badges section (the closing `</div>` after the `note` paragraph) and the `{/* Description */}` comment. Insert between them:

```tsx
{/* Weather */}
<WeatherSection
  locationType={location.type}
  driveSeconds={drivingInfo?.duration ?? null}
/>
```

The resulting structure:

```tsx
{/* Status */}
<div className="flex items-center gap-2 mb-4">
  {/* ... status badges ... */}
</div>

{/* Weather */}
<WeatherSection
  locationType={location.type}
  driveSeconds={drivingInfo?.duration ?? null}
/>

{/* Description */}
<p className="text-gray-700 leading-relaxed text-sm mb-4">
  {location.description}
</p>
```

- [ ] **Step 3: Run existing detail panel tests**

```bash
npx vitest run __tests__/components/LocationDetailPanel.test.tsx
```

Expected: PASS. If the existing test renders the component without a `WeatherProvider`, `useWeather` will throw. If that happens, wrap the test render in a `WeatherContext.Provider` with a null forecast value (the section will render nothing). Update the test file as needed:

```tsx
import { WeatherContext } from "../../src/lib/weather/WeatherProvider";

// inside the test setup, wrap the rendered component:
render(
  <WeatherContext.Provider value={{ location: null, forecast: null, loading: false, error: null, refresh: () => {} }}>
    <LocationDetailPanel slug="..." onBack={() => {}} />
  </WeatherContext.Provider>,
);
```

- [ ] **Step 4: Run all tests**

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/LocationDetailPanel.tsx __tests__/components/LocationDetailPanel.test.tsx
git commit -m "feat(weather): show WeatherSection in location detail panel"
```

---

## Task 13: Service worker runtime caching

**Files:**
- Modify: `scripts/generate-sw.ts`

- [ ] **Step 1: Add Workbox runtime routes**

In `scripts/generate-sw.ts`, locate the `runtimeCaching` array and append two new entries before the closing `]`:

```ts
// Open-Meteo weather forecasts
{
  urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
  handler: "NetworkFirst",
  options: {
    cacheName: "weather-api",
    networkTimeoutSeconds: 5,
    expiration: {
      maxEntries: 5,
      maxAgeSeconds: 60 * 60, // 1 hour
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
  },
},
// IP geolocation
{
  urlPattern: /^https:\/\/ipapi\.co\/.*/i,
  handler: "NetworkFirst",
  options: {
    cacheName: "ip-geo",
    networkTimeoutSeconds: 4,
    expiration: {
      maxEntries: 1,
      maxAgeSeconds: 60 * 60 * 24, // 1 day
    },
    cacheableResponse: {
      statuses: [0, 200],
    },
  },
},
```

- [ ] **Step 2: Run a build and verify SW generation**

```bash
npm run build
```

Expected: build succeeds, "Generated SW" log line printed, no warnings about the new routes.

- [ ] **Step 3: Commit**

```bash
git add scripts/generate-sw.ts
git commit -m "feat(weather): add SW runtime caching for Open-Meteo and ipapi.co"
```

---

## Task 14: E2E happy-path test

**Files:**
- Create: `e2e/weather.spec.ts`

- [ ] **Step 1: Write the E2E test**

Create `e2e/weather.spec.ts`:

```ts
import { test, expect } from "@playwright/test";

const ipResponse = {
  latitude: -37.81,
  longitude: 144.96,
  city: "Melbourne",
};

const weatherResponse = {
  latitude: -37.81,
  longitude: 144.96,
  current: {
    time: "2026-04-07T12:00",
    temperature_2m: 26,
    precipitation: 0,
    weather_code: 0,
    uv_index: 5,
    wind_speed_10m: 10,
  },
  hourly: {
    time: Array.from({ length: 72 }, (_, i) => `2026-04-07T${String(i % 24).padStart(2, "0")}:00`),
    temperature_2m: Array.from({ length: 72 }, () => 26),
    precipitation_probability: Array.from({ length: 72 }, () => 0),
    precipitation: Array.from({ length: 72 }, () => 0),
    uv_index: Array.from({ length: 72 }, () => 5),
    weather_code: Array.from({ length: 72 }, () => 0),
  },
};

test.describe("weather feature", () => {
  test.beforeEach(async ({ context }) => {
    await context.route("https://ipapi.co/json/", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ipResponse) }),
    );
    await context.route(/api\.open-meteo\.com\/.*/, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(weatherResponse) }),
    );
  });

  test("banner appears on home page and expands", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText(/26°C/)).toBeVisible({ timeout: 10_000 });

    // Expand
    await page.getByRole("button", { name: /toggle weather details/i }).click();
    await expect(page.getByText(/Swimming Hole/i)).toBeVisible();
    await expect(page.getByText(/Waterfall/i)).toBeVisible();
  });

  test("weather section appears on detail page", async ({ page }) => {
    await page.goto("/");
    // Wait for the banner so we know weather has loaded
    await expect(page.getByText(/26°C/)).toBeVisible({ timeout: 10_000 });

    // Open the first location
    const firstLink = page.locator("a[href^='/location/']").first();
    await firstLink.click();

    // The section renders 26°C plus a rating
    await expect(page.getByText(/26°C/)).toBeVisible();
    await expect(page.getByRole("button", { name: /forecast/i })).toBeVisible();
  });
});
```

- [ ] **Step 2: Run the E2E test**

```bash
npm run test:e2e -- weather.spec.ts
```

Expected: PASS (2 tests).

(`npm run test:e2e` runs the full build first, which is slow. If you need to iterate, run `npm run build` once and then `npx playwright test e2e/weather.spec.ts`.)

- [ ] **Step 3: Commit**

```bash
git add e2e/weather.spec.ts
git commit -m "test(weather): add E2E happy-path with mocked weather and IP geo"
```

---

## Task 15: Final verification

- [ ] **Step 1: Run the full test suite**

```bash
npm run test
```

Expected: PASS — all unit/integration tests pass, including pre-existing ones.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: PASS — no errors or warnings introduced by the new files.

- [ ] **Step 3: Run a full build**

```bash
npm run build
```

Expected: PASS — YAML validation, data build, Next.js export, and SW generation all succeed.

- [ ] **Step 4: Run E2E**

```bash
npm run test:e2e
```

Expected: PASS — including the new `weather.spec.ts` and all pre-existing E2E tests.

- [ ] **Step 5: Commit (if any tweaks were needed)**

If lint or any test required follow-up fixes, commit them with:

```bash
git add -A
git commit -m "chore(weather): final fixes from verification pass"
```

---

## Notes for the implementer

- **TDD discipline.** Each task starts with a failing test. Resist the urge to write implementation first — the tests are designed to pin the contract.
- **Pure-function bias.** `suitability.ts`, `openMeteo.ts`, `ipLocation.ts`, and `cache.ts` are all pure or near-pure modules. The React-specific code (`WeatherProvider`, components) layers on top.
- **No fallback noise.** If location/weather cannot be resolved, the banner and detail section render nothing. The rest of the app continues to work normally — this is intentional.
- **Trade-offs.** The forecast at "arrival time" is based on the *user's local* forecast, not the destination's. For long drives this is approximate. See the spec for the rationale.
- **No dependency additions.** Everything uses libraries already in `package.json`.
