# Weather Feature Design

**Date:** 2026-04-07
**Status:** Approved, awaiting implementation plan

## Goal

Help users decide whether water-play activities are worthwhile right now (or in the near future) by surfacing weather-derived suitability information in the dripmap PWA.

## Core Decisions

| Decision | Choice |
|---|---|
| Primary use case | "Is today a good day to go?" (current conditions, forecast secondary) |
| Output format | Derived `good`/`fair`/`poor` suitability rating per location type |
| Weather source | Single fetch for the user's location (no per-destination weather calls) |
| Time-shift behavior | Detail panel uses forecast at `now + driveTime` (accepts trade-off that this is forecast *near the user*, not at the destination) |
| Weather API | [Open-Meteo](https://open-meteo.com/) — free, no API key |
| Location resolution | Progressive: cached → IP geolocation → browser geolocation upgrade |
| Suitability logic | Hardcoded rule blocks per location type (YAGNI: tunable, no scoring engine) |
| Main screen UI | Compact banner above filter bar, expandable to per-type grid |
| Detail panel UI | Arrival-time conditions row + collapsible 3-day forecast strip |

## Architecture

### Data flow

```
Location cascade
  1. localStorage: dripmap:lastLocation  → instant seed if present
  2. IP geolocation (ipapi.co or similar) → ~instant rough location
  3. Browser geolocation               → silently upgrade to precise

WeatherProvider (React context at app root)
  ├─ holds: { location, forecast, loading, error, refresh() }
  ├─ Open-Meteo fetch (current + hourly, 3 days)
  ├─ in-memory cache (15 min TTL)
  ├─ localStorage cache (2 hour fallback)
  └─ service worker cache (Workbox NetworkFirst)
       │
       ▼
  Forecast object
       │
       ├─→ WeatherBanner          (uses current slice)
       └─→ WeatherSection         (uses forecast.hourly[now + driveTime])
                │
                ▼
          suitability(weather, locationType) → { rating, reason }
```

### Refresh triggers

- App becomes visible after >15 min away (`visibilitychange` listener)
- User location changes by >5 km
- Manual refresh button on the expanded banner

## Weather data

### Open-Meteo request

```
GET https://api.open-meteo.com/v1/forecast
  ?latitude={lat}&longitude={lng}
  &current=temperature_2m,precipitation,weather_code,uv_index,wind_speed_10m
  &hourly=temperature_2m,precipitation_probability,precipitation,uv_index,weather_code
  &forecast_days=3
  &timezone=auto
```

One call returns everything needed for both the banner and the detail panel.

### Suitability rules

Pure function in `src/lib/weather/suitability.ts`:

```typescript
suitability(weather: WeatherSnapshot, type: LocationType): {
  rating: "good" | "fair" | "poor";
  reason: string;
}
```

Rough rule sketch (thresholds tuned during implementation):

| Type | Good | Fair | Poor |
|---|---|---|---|
| swimming-hole | ≥24°C, no rain, UV<8 | 20–24°C or light cloud | <18°C or rain |
| splash-pad | ≥22°C, sunny | 18–22°C | <16°C or rain |
| waterfall | recent rain, any temp | dry but mild | extreme heat or storm |
| spring | mild, dry | cool or warm | storm or freezing |
| creek | ≥20°C, no rain | 16–20°C | <14°C or rain |

Each rule is ~10 lines: easy to read, easy to test, easy to tune. We can graduate to a weighted scoring system later if rules-of-thumb prove insufficient.

## Components

### `WeatherProvider`
**File:** `src/lib/weather/WeatherProvider.tsx`
React context wrapping the app. Owns the location cascade, fetch lifecycle, caches, and refresh logic. Components consume via `useWeather()`.

### `WeatherBanner`
**File:** `src/components/WeatherBanner.tsx`
Compact bar at the top of the home screen, above the filter bar. Single row:

```
☀ 28°C  ·  Great day for swimming holes & splash pads     ⌄
```

Collapsed by default. Tap to expand → per-type suitability grid (5 rows, one per location type, with rating + one-line reason). Tap again to collapse. Uses the `current` slice of the forecast. Icons via `lucide-react` (already a project dependency).

### `WeatherSection`
**File:** `src/components/WeatherSection.tsx`
New section in `LocationDetailPanel`, between status badges and description.

1. **Arrival row** — always visible. Uses `forecast.hourly[now + driveTime]` (rounded to nearest hour). Shows: icon, temp, condition, suitability rating + reason for *this location's type*.
2. **Forecast strip** — collapsed by default. Today + next 2 days, three columns, each with daily summary (high/low, icon) and a per-type rating chip.

If `drivingInfo` isn't loaded yet, the arrival row shows current conditions and updates once driving info arrives.

### Empty / error states

| Scenario | Behavior |
|---|---|
| Location denied + IP geo failed | Small "Weather unavailable" line; rest of UI works normally |
| Forecast fetch failed but cache present | Show cached with `(cached)` suffix |
| Offline + no cache | Hide banner; detail panel weather section shows nothing |

## Caching & offline

| Layer | Contents | TTL |
|---|---|---|
| In-memory (Provider) | Parsed forecast object | 15 min |
| `localStorage: dripmap:lastLocation` | `{lat, lng, source, timestamp}` | seed for next visit |
| `localStorage: dripmap:lastForecast` | `{forecast, fetchedAt, location}` | trusted if <2 hours old |
| Service worker (Workbox) | `api.open-meteo.com` + IP geo endpoint | NetworkFirst, max-age 1 hour, max 5 entries |

The existing offline-first PWA story is preserved: the app loads fully offline, and a recent cached forecast is used when the network fails.

## Testing strategy

### Unit (`__tests__/lib/`)

- **`suitability.test.ts`** — table-driven tests for each location type × representative weather (good/fair/poor cases). The most important file in this feature: it pins the rule logic.
- **`weather-cache.test.ts`** — staleness checks, location-delta detection, localStorage round-trips. `fetch` mocked for Open-Meteo + IP geo responses.

### Component (`__tests__/components/`)

- **`WeatherBanner.test.tsx`** — renders with mock forecast, expand/collapse, all states (loading, error, no-location)
- **`WeatherSection.test.tsx`** — arrival row uses correct forecast index based on drive time, forecast strip toggles, fallback when no driving info

### E2E (`e2e/weather.spec.ts`)

One happy-path test: home page renders with mocked weather (Open-Meteo + IP geo intercepted at network layer), banner visible, expand works, navigate to detail page, weather section visible.

### Out of scope

- Real Open-Meteo responses (we trust their schema)
- Real IP geolocation accuracy
- Service worker cache eviction (Workbox internals)

## File-level changes

### New

- `src/lib/weather/types.ts` — `Forecast`, `WeatherSnapshot`, `Suitability`, `LocationSource`
- `src/lib/weather/openMeteo.ts` — fetch + parse Open-Meteo
- `src/lib/weather/ipLocation.ts` — IP geolocation client
- `src/lib/weather/locationCascade.ts` — IP→browser progressive resolver
- `src/lib/weather/suitability.ts` — pure rules engine
- `src/lib/weather/WeatherProvider.tsx` — React context, cache, refresh logic
- `src/lib/weather/useWeather.ts` — consumer hook
- `src/components/WeatherBanner.tsx` — home screen banner
- `src/components/WeatherSection.tsx` — detail panel section
- `__tests__/lib/suitability.test.ts`
- `__tests__/lib/weather-cache.test.ts`
- `__tests__/components/WeatherBanner.test.tsx`
- `__tests__/components/WeatherSection.test.tsx`
- `e2e/weather.spec.ts`

### Modified

- `src/app/layout.tsx` — wrap children in `<WeatherProvider>`
- `src/app/page.tsx` — render `<WeatherBanner>` above filter bar
- `src/components/LocationDetailPanel.tsx` — render `<WeatherSection>` between status badges and description; pass `drivingInfo` through
- `scripts/generate-sw.ts` — add Workbox runtime route for Open-Meteo + IP geo

### Unchanged

- YAML data pipeline (weather is runtime-only, never in the data files)
- `src/lib/types.ts` (suitability lives in its own module, not on `Location`)
- Existing tests, build/lint config

## Trade-offs explicitly accepted

1. **Forecast at "arrival time" uses the user's local forecast, not the destination's.** For long drives the actual conditions could differ. Avoids per-location API calls.
2. **IP geolocation hits a third-party service on first load.** Slightly at odds with offline-first, but only matters on the very first visit; subsequent visits use cached location.
3. **Hardcoded rules over a scoring engine.** Less flexible, but clearer and immediately tunable. Can graduate later if needed.
