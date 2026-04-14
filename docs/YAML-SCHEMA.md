# Location YAML Schema

Reference for all fields in `data/locations/**/*.yaml`. Each YAML file describes one location (POI).

Validated by `scripts/validate-locations.ts` — run `npm run validate` to check all files.

---

## Core Fields (all types)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `slug` | string | ✅ | URL-safe identifier (must match filename without `.yaml`) |
| `name` | string | ✅ | Display name |
| `type` | enum | ✅ | Location type (see [Valid Types](#valid-types)) |
| `coordinates` | object | ✅ | `{ lat: number, lng: number }` — WGS84 |
| `region` | string | ✅ | Human-readable region (e.g. `"Victoria, Australia"`) |
| `country` | string | ✅ | Country code (e.g. `"AU"`) |
| `description` | string | ✅ | Full description (multi-line OK with `>` or `\|`) |
| `photos` | array | ✅ | Photo objects (see [Photos](#photos)) |
| `highlights` | array | ✅ | Non-empty list of highlight strings |
| `cost` | enum | ✅ | `free`, `$`, `$$`, `$$$` |
| `duration` | enum | ❌ | `quick`, `half-day`, `full-day` |
| `ageSuitability` | object | ✅ | See [Age Suitability](#age-suitability) |
| `accessibility` | string | ❌ | Free-text (e.g. `"easy"`, `"moderate"`, `"difficult"`) |
| `parking` | string | ❌ | Free-text (e.g. `"street"`, `"limited"`, `"dedicated"`) |
| `facilities` | array | ❌ | Free-text list (e.g. `["toilets", "cafe", "water"]`) |
| `bestSeason` | array | ✅ | One or more of: `spring`, `summer`, `fall`, `winter` |
| `directions` | string | ✅ | How to get there |
| `tips` | array | ✅ | List of visitor tips |
| `tags` | array | ✅ | Free-text tags for search/filtering |
| `status` | object | ✅ | See [Status](#status) |
| `details` | object | ✅ | Type-specific fields (see [Details by Type](#details-by-type)) |
| `fit` | object | ❌ | Personalised fit blurbs (see [Fit](#fit)) |

---

## Valid Types

```
swim, beach, event, bushwalk, walk, lookout, waterfall,
cave, wildlife, pool, cycling, fishing, eatery, playground, museum
```

> **Note:** Only `swim`, `beach`, `event`, `bushwalk`/`walk`, and `eatery` have type-specific `details` validation today. Other types only require the `details` object to exist.

---

## Photos

Each item in the `photos` array:

```yaml
photos:
  - url: https://example.com/photo.jpg
    alt: Description of the photo
    credit: "Photographer Name"
```

---

## Age Suitability

```yaml
ageSuitability:
  minAge: 8          # number or null (null = no minimum)
  ideal:             # array of age group strings
    - toddlers
    - preschool
    - primary
    - teens
    - adults
```

---

## Status

```yaml
status:
  site: open                # open | closed | seasonal | unknown
  lastVerified: "2026-04-01"  # YYYY-MM-DD date string
```

---

## Fit (optional)

Personalised blurbs shown to users based on their preferences. All keys are optional.

```yaml
fit:
  cost: "Free entry, no tickets required."
  group: "Family-friendly with activities for all ages."
  date: "Best visited in summer."
  duration: "Plan for a half-day visit."
```

`duration` can also be an object with per-duration blurbs:

```yaml
fit:
  duration:
    quick: "A brief visit works, though there's more to explore."
    half-day: "Perfect for a half-day outing."
    full-day: "Bring a picnic and make a day of it."
```

Valid keys for the duration object: `quick`, `half-day`, `full-day`.

---

## Details by Type

The `details` object contains type-specific fields. The required fields depend on the `type`.

---

### `swim`

```yaml
details:
  dangerLevel: moderate    # low | moderate | high | extreme
  waterAccess: open        # open | closed | seasonal | restricted | unknown
  depth: "Varies, 1-3m"   # free-text (not validated)
```

---

### `beach`

```yaml
details:
  beachType: rock-pools     # surf | bay | rock-pools | river | estuary
  dogPolicy: allowed        # allowed | seasonal-offleash | prohibited
  waveExposure: moderate    # sheltered | moderate | exposed
  crowdLevel: quiet         # quiet | moderate | busy
  patrolled:                # required object
    seasonal: false
    months: []
    hours: null
  waterHazards:             # required array (can be empty)
    - slippery-rocks
    - strong-swell
```

---

### `event`

```yaml
details:
  recurrence:               # required object
    type: annual            # once | range | weekly | annual
    season: fall            # free-text (not validated)
    startTime: "10:00"
    endTime: "16:00"
  confirmedDates: null      # string or null
  venue: "Williamstown Foreshore"   # required string
  venueType: outdoor        # outdoor | indoor | mixed
  bookingRequired: false    # required boolean
  bookingUrl: null          # string or null
  organiser: "Council"      # free-text (not validated)
  organiserUrl: null        # string or null
```

---

### `bushwalk` / `walk`

```yaml
details:
  distanceKm: 12.5          # required, positive number
  difficulty: easy           # easy | moderate | hard
  terrain: paved             # paved | gravel | trail | mixed
  route:                     # optional array of [lat, lng] pairs (min 2 points)
    - [-37.909, 144.986]
    - [-37.870, 144.960]
    - [-37.845, 144.940]
```

---

### `eatery`

```yaml
details:
  cuisine:                   # required, non-empty array
    - cafe
    - bakery
  seating: both              # indoor | outdoor | both
  booking: walk-in           # required | recommended | walk-in
  bookingUrl: null           # string or null
  dietaryOptions:            # required array (can be empty)
    - vegetarian
    - gluten-free
  kidsMenu: true             # required boolean
```

**Valid cuisine values:** `cafe`, `restaurant`, `pub`, `fish-and-chips`, `ice-cream`, `bakery`, `market`, `farm-gate`, `pick-your-own`, `food-truck`

**Valid dietary options:** `vegetarian`, `vegan`, `gluten-free`, `allergy-aware`

---

### Other types

`lookout`, `waterfall`, `cave`, `wildlife`, `pool`, `cycling`, `fishing`, `playground`, `museum` — these require a `details` object to exist but have no type-specific field validation yet. Use free-form fields as needed.

---

## Minimal Example

```yaml
slug: my-new-spot
name: My New Spot
type: swim
coordinates:
  lat: -37.81
  lng: 144.96
region: Victoria, Australia
country: AU
description: A great place to visit.
photos:
  - url: https://example.com/photo.jpg
    alt: My New Spot
    credit: "Photographer"
highlights:
  - Beautiful scenery
cost: free
ageSuitability:
  minAge: null
  ideal:
    - adults
bestSeason:
  - summer
directions: Head south on the main road.
tips:
  - Bring sunscreen
tags:
  - scenic
status:
  site: open
  lastVerified: "2026-04-14"
details:
  dangerLevel: low
  waterAccess: open
```

---

## File Placement

Place YAML files in subdirectories by type:

```
data/locations/
├── swim/my-swim-spot.yaml
├── beach/my-beach.yaml
├── event/my-event.yaml
├── walk/my-walk.yaml
├── eatery/my-cafe.yaml
├── museum/my-museum.yaml
└── playground/my-playground.yaml
```

The filename should match the `slug` field (e.g. `my-swim-spot.yaml` → `slug: my-swim-spot`).
