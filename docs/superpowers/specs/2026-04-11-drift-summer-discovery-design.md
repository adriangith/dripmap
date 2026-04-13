# Drift — Summer Activity Discovery App

**Date:** 2026-04-11
**Status:** Draft
**Replaces:** dripmap (water play locations only)

## Overview

Drift is a curated discovery app for summer activities across Victoria, Australia. It evolves dripmap from a water-play guide into a broad summer activity finder, answering "what's worth doing given my situation right now?" through constraint-based filtering over an editorially curated dataset.

The core identity is **discovery** — the app surfaces what's worth doing without requiring users to already know what they want. Every entry leads with *why it's worth the trip*, not just what it is.

## Rebrand

- **Name change:** dripmap → Drift
- App name, PWA manifest, meta tags, page titles, all code references updated
- Domain/hosting TBD

## Content Types

### Day 1 (populated)

| Type | Description | Example entries |
|------|-------------|-----------------|
| `swim` | Existing dripmap data (~55 entries), migrated to new schema | Lake Daylesford, Fairy Pools |
| `beach` | Beaches with unique features — jumping spots, rock pools, surf, snorkelling | Portsea Back Beach, Sorrento rock pools |
| `event` | Recurring summer staples + notable one-offs | Queen Vic Night Market, Moomba, Moonlight Cinema |

### Schema-ready (populated later)

`bushwalk`, `lookout`, `waterfall`, `cave`, `wildlife`, `pool`, `cycling`, `fishing`

**Excluded:** camping (own beast — booking systems, multi-day), picnic spots (captured as facility attribute on other entries).

### Geographic scope

All of Victoria from day one. Distance constraint handles "is this realistic today."

### Editorial voice

Every entry leads with the unique feature or hook — the thing that makes it worth the trip. "The one with cliff jumping into crystal clear water" not "a beach in the Mornington Peninsula." Facilities and logistics are secondary.

## Schema Design

Discriminated union by `type`. Shared core fields at top level, type-specific fields in a `details` block. Validator enforces per-type required fields at build time.

### Shared core (all types)

```yaml
slug: string
name: string
type: "swim" | "beach" | "event" | "bushwalk" | "lookout" | "waterfall" | "cave" | "wildlife" | "pool" | "cycling" | "fishing"
coordinates:
  lat: number
  lng: number
region: string
country: string
description: string           # editorial — why this spot is worth the trip
photos: [{ url, alt }]
highlights: string[]          # the unique features that make this entry special
cost: "free" | "$" | "$$" | "$$$"
ageSuitability:
  minAge: number | null       # null = no minimum
  ideal: string[]             # e.g. ["toddlers", "primary", "teens", "adults"]
accessibility: string
parking: string
facilities: string[]
bestSeason: string[]
tags: string[]
status:
  site: "open" | "closed" | "seasonal"
  lastVerified: date
```

### Type-specific details

#### `swim` (migrated from current schema)

```yaml
details:
  dangerLevel: "low" | "moderate" | "high"
  waterAccess: "open" | "closed" | "seasonal"
  depth: string | null
```

#### `beach`

```yaml
details:
  beachType: "surf" | "bay" | "rock-pools" | "river" | "estuary"
  patrolled:
    seasonal: boolean
    months: string[]
    hours: string | null
  dogPolicy: "allowed" | "seasonal-offleash" | "prohibited"
  waveExposure: "sheltered" | "moderate" | "exposed"
  waterHazards: string[]
  crowdLevel: "quiet" | "moderate" | "busy"
```

#### `event`

```yaml
details:
  recurrence:
    type: "once" | "range" | "weekly" | "annual"
    # once: { date, startTime?, endTime? }
    # range: { startDate, endDate, days?, startTime?, endTime? }
    # weekly: { days, season?, startTime?, endTime? }
    # annual: { month, typicalWeek?, duration? }
  confirmedDates: { year: number, startDate: date, endDate: date } | null
  venue: string
  venueType: "outdoor" | "indoor" | "mixed"
  bookingRequired: boolean
  bookingUrl: string | null
  organiser: string
  organiserUrl: string | null
```

#### Future types (schema defined, not populated in v1)

```yaml
# bushwalk
details:
  distanceKm: number
  elevationGain: number
  grade: "easy" | "moderate" | "hard" | "expert"
  duration: string
  loop: boolean

# lookout
details:
  bestTimeOfDay: "sunrise" | "sunset" | "any"
  scenicDrive: boolean
  driveRoute: string | null

# waterfall
details:
  height: string | null
  swimmable: boolean
  flow: "seasonal" | "year-round"

# cave
details:
  guided: boolean
  tourDuration: string | null
  bookingUrl: string | null
  underground: boolean

# wildlife
details:
  species: string[]
  bestTime: "dawn" | "dusk" | "night" | "any"
  commercial: boolean
  bookingUrl: string | null

# pool
details:
  poolType: "outdoor-pool" | "lido" | "hot-spring" | "heritage"
  heated: boolean
  openSeason: string[]

# cycling
details:
  distanceKm: number
  difficulty: "easy" | "moderate" | "hard" | "expert"
  trailType: "mountain-bike" | "gravel" | "road" | "mixed"
  loop: boolean

# fishing
details:
  fishingType: "river" | "lake" | "pier" | "rock" | "surf"
  species: string[]
  licenseRequired: boolean
```

## Discovery UX

### Principle

The app never requires users to choose a category before seeing content. Discovery is the default — open the app, see what's around you that's worth doing. Constraints narrow the field; categories are a secondary refinement for power users.

### Map-first layout

The app opens to a full map with all locations visible. Same layout pattern as current dripmap — bottom sheet on mobile, sidebar on desktop.

**Pin layer:**
- Each category has a distinct icon and colour
- Pin clustering at lower zoom levels with count badge
- Mixed-category clusters use a blended colour treatment
- Tapping a cluster zooms in; tapping a pin opens the preview card

### Context bar

A row of tappable chips at the top showing the app's understanding of the user's situation:

```
[ Near you ]  [ Any distance ]  [ 34° ]  [ Sat 11 Apr ]  [ Any cost ]  [ + Who's coming? ]
```

**Location chip:**
- Inferred from GPS
- Tappable to search a different area ("this weekend in Lorne")

**Distance chip:**
- Options: Under 30 min | Under 1 hr | Under 2 hrs | Day trip | Any distance
- Drive time, not kilometres — estimated using straight-line distance with a 1.4x road factor (good enough for filtering; no routing API needed)
- Default: Any distance

**Weather chip:**
- Inferred from weather API for current/searched location
- Tappable to explore ("what if it's cooler?")
- Shows forecast when a future date is selected
- Hidden when offline or when recurring-day mode is active (no forecast for "all Saturdays")

**Date chip:**
Two modes via toggle in the popover:

*Specific date (default):*
- Quick picks: Today | Tomorrow | This Sat | This Sun | This weekend
- Calendar picker for specific future dates
- Chip shows: `Sat 11 Apr`

*Recurring day:*
- Multi-select days: Mon | Tue | Wed | Thu | Fri | Sat | Sun
- Shortcuts: Weekends | Weekdays
- Chip shows: `Every Sat` or `Weekends`
- One-off events excluded in this mode (no specific date to match)
- Weather chip hidden (no forecast for abstract days)

**Cost chip:**
- Options: Free | Free & $ | $$ & under | Any cost
- For events with variable pricing, uses the relevant price for the user's group composition (e.g. if kids are free and group is "family with young kids", counts as free)
- Default: Any cost

**Group chip ("Who's coming?"):**
- Illustrated persona cards: Solo | Adults | Family (young kids) | Family (older kids) | Group of friends
- Selecting a family option prompts for age range of kids
- Default: no constraint (chip shows "+ Who's coming?")

### Constraint engine behaviour

- **No constraints = everything shown.** The app starts fully open.
- **Hard filters:** Category pills (when toggled), date (events must match), distance (beyond threshold hidden)
- **Soft scoring:** Weather, cost, age suitability — these bias sort order rather than hiding entries. A cliff jumping spot still appears when you have toddlers selected; it just won't be at the top.
- **Relevance sort:** proximity x constraint fit x editorial weight. Entries matching more active constraints score higher.

### Category pills

Horizontal scrollable row below context bar: `All | Swims | Beaches | Events | ...`

- Default: All selected
- Multi-select toggle
- Secondary refinement, not primary discovery path

### List view

Mixed-category feed in the bottom sheet / sidebar:
- Each card: photo, name, category icon, distance, one-line hook (from `highlights`), constraint-relevant badges (patrolled, dog-friendly, family safe, "On this Saturday", etc.)
- Scrolling the list pans the map; tapping a pin scrolls the list

## Events: Temporal Behaviour

### Date filtering

- **Default (today):** Events happening today or currently running appear on map. Upcoming events within 7 days appear in list with "Coming up" badge.
- **Specific date selected:** Events on that date appear on map.
- **Recurring day selected:** Recurring events matching that day pattern appear. One-offs excluded.

### Event expiry and maintenance

- One-off events auto-hide after their date passes (YAML stays in repo)
- Recurring events have `lastVerified` field; "Check details" badge appears if not verified within 12 months
- Annual events surface automatically based on `month` + `typicalWeek`; "Dates TBC" badge shown until `confirmedDates` updated for current year

## Technical Changes

### Data pipeline

**Directory restructure:**
```
data/locations/
  swim/
    lake-daylesford.yaml
    ...
  beach/
    portsea-back-beach.yaml
    ...
  event/
    queen-vic-night-market.yaml
    ...
```

Build script globs `data/locations/**/*.yaml`.

**Validation (`validate-locations.ts`):**
- Validate shared core fields for all entries
- Switch on `type` to validate correct `details` shape
- Enforce per-type required fields
- Warn on missing `highlights`

**Build (`build-locations.ts`):**
- Include `type` in index JSON for frontend category filtering
- Include `details.recurrence` summary in index for event date filtering without loading full detail
- Include `cost`, `ageSuitability`, `highlights` in index for constraint filtering and card display

### Frontend

1. **Rebrand** — dripmap → Drift across all UI, manifest, meta
2. **Context bar component** — new component with constraint chips, popovers, persona cards
3. **Constraint engine (`src/lib/constraints.ts`)** — scores and sorts locations against active constraints; uses existing haversine util for distance
4. **Category filter state** — new filter dimension stored in URL params for shareability
5. **Per-category pin icons** — distinct Leaflet marker icons per type, clustered pin style
6. **Detail page** — `/location/[slug]` switches on `type` to render appropriate details section
7. **Date filtering logic** — evaluates specific-date and recurring-day modes against four recurrence types

### Weather API

**Open-Meteo** — free, no API key, CORS-friendly, 7-day forecast.
- Fetched client-side for user's current or searched location
- Cached to avoid repeated calls
- Degrades gracefully offline (weather chip hidden)

### PWA / offline

- All location/event JSON precached as before
- Weather requires network — chip hidden offline
- Date filtering works offline for recurring patterns
- Event expiry logic runs client-side based on device date

### Migration of existing data

The 55 existing swim entries:
- Add `type: swim`
- Move `practical` block fields into `details` and core fields
- Add `highlights`, `cost`, `ageSuitability` fields
- Remove `practical` wrapper

Small enough dataset for a manual pass or simple migration script.

## Out of Scope (future phases)

- Trip planning / itinerary building
- Live data feeds (water quality, fire danger, closures)
- User submissions and reviews
- Bulk import from open data sources (Parks Victoria, OSM)
- "Moods" / intent-based discovery layer ("Beat the heat", "Get active")
- Backend / authentication
- Automated event scraping
