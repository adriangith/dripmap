# Drift

A discovery-oriented PWA for finding places to visit around Melbourne and regional Victoria. Built as a static Next.js app with Leaflet maps, offline support, and a preference-based scoring engine.

## What it does

Drift helps you answer "where should we go today?" by surfacing places based on your preferences — how far you want to travel, what you want to spend, whether you've been before, and what kind of outing you're after. It covers swims, beaches, walks, bushwalks, playgrounds, events, museums, and more across 97 locations.

### Key features

- **Preference-based discovery** — drag to prioritise cost, familiarity, and time-of-day; results are soft-scored, not hard-filtered
- **Personalised descriptions** — each place's description adapts to highlight what matters to you, so you can tell at a glance whether it's the right fit
- **Interactive map** — Leaflet with clustered pins, walk route polylines, and CartoDB Voyager/dark tiles
- **Offline-first PWA** — Workbox service worker precaches map tiles, location data, and images
- **Constraint engine** — distance filtering, event date matching, visited/not-visited tracking
- **Responsive layout** — bottom sheet on mobile, sidebar on desktop
- **Dark mode** — system-aware, applies to both UI and map tiles

## Data

Locations are authored as YAML files in `data/locations/`, organised by type:

| Category | Count | Example |
|----------|-------|---------|
| swim | 56 | Stony Creek Reservoir, Pound Bend |
| walk | 11 | Merri Creek Walk, Bayside Beach Hike |
| event | 11 | NGV Let's Party, Balloon Story |
| playground | 10 | Waltzing Matilda Playground |
| beach | 7 | Half Moon Bay, Eastern Beach |
| museum | 2 | Melbourne Holocaust Museum, Rippon Lea Estate |

The build pipeline validates each YAML against a type-aware schema, then compiles them to JSON in `public/generated/`.

## Development

```bash
npm install
npm run dev                    # Dev server (localhost:3000)
npm run dev:network:https      # HTTPS dev server (required for geolocation)
```

### Commands

| Command | Purpose |
|---------|---------|
| `npm run build` | Full pipeline: validate YAML → build JSON → Next.js export → generate SW |
| `npm run validate` | Validate all location YAML files |
| `npm run build:data` | Build location JSON from YAML |
| `npm run lint` | ESLint |
| `npm run test` | Vitest unit/integration tests |
| `npm run test:e2e` | Build + Playwright E2E tests (Chromium) |
| `npm run enrich` | Fetch external events + enrichments (Overpass, BOM, Foursquare) |
| `npm run upload:data` | Upload location data to Firestore |
| `npm run deploy:data` | Validate + build JSON + upload to Firestore |

### Adding a location

1. Create a YAML file in `data/locations/<type>/` (see existing files for schema)
2. Run `npm run validate` to check it
3. Run `npm run build` to generate the site

### Data deployment (Firestore)

Location data is uploaded to Firestore separately from the static site build:

```bash
npm run deploy:data      # validate → build static JSON → upload to Firestore
```

To upload only (if data is already built):

```bash
npm run upload:data
```

Requires the `GOOGLE_APPLICATION_CREDENTIALS` environment variable pointing to a service account key JSON file, or pass `--service-account path/to/key.json`.

### Foursquare enrichment

The enrichment pipeline can optionally fetch venue ratings, prices, photos, and tips from the [Foursquare Places API](https://docs.foursquare.com/developer/reference/search-data). Set the `FOURSQUARE_API_KEY` environment variable to enable it:

```bash
export FOURSQUARE_API_KEY=fsq3...
npm run enrich
```

To run only the Foursquare provider: `ENRICHMENT_PROVIDERS=foursquare npm run enrich`.

Get a free API key at [foursquare.com/developers](https://foursquare.com/developers). The enrichment runs at build time and caches results — no runtime API calls are made.

## Tech stack

- **Next.js 16** with static export (`output: "export"`)
- **Leaflet** + leaflet.markercluster for maps
- **Vitest** + React Testing Library for unit tests
- **Playwright** for E2E tests
- **Workbox** for service worker / offline support
- **Vercel** for hosting (auto-deploys from `main`)

