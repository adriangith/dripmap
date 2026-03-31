# dripmap — Design Spec

## Context

dripmap is a Progressive Web App for discovering water play locations worldwide — waterfalls, swimming holes, splash pads, springs, and creeks. It is a curated guide: location data is editorially maintained (not user-submitted), stored as flat files in the repository. The app must work offline since many water play spots are in areas with poor cell service.

## Core Requirements

- **Curated location guide** — editorially maintained, no user accounts or submissions in v1
- **Global scope** — locations anywhere in the world
- **Map + list** — equal-weight navigation with map-first mobile layout (bottom sheet pattern)
- **Offline-capable PWA** — cached pages, data, and map tiles for use without connectivity
- **Installable** — add-to-home-screen on mobile and desktop

## Location Types

- Waterfall
- Swimming hole
- Splash pad
- Spring
- Creek

## Data Model

Location data lives in `data/locations/` as YAML files. Each file represents one location.

```yaml
slug: niagara-falls             # unique identifier, URL-safe, matches filename (no separate id)
name: Niagara Falls
type: waterfall                 # waterfall | swimming-hole | splash-pad | spring | creek
coordinates:
  lat: 43.0962
  lng: -79.0377
region: North America
country: CA                     # ISO 3166-1 alpha-2
description: >
  One of the most famous waterfalls in the world...

photos:
  - url: /images/locations/niagara-falls/hero.jpg
    alt: Niagara Falls from the Canadian side
    credit: John Doe

practical:
  accessibility: easy           # wheelchair-accessible | easy | moderate | difficult | extreme
  parking: available            # available | limited | none | street
  facilities:                   # freeform list
    - restrooms
    - food
    - gift-shop
  bestSeason:                   # which seasons are best to visit
    - spring
    - summer
    - fall
  dangerLevel: low              # low | moderate | high | extreme
  cost: paid                    # free | paid | donation

directions: >
  From Toronto, take QEW south...

tips:
  - Visit early morning to avoid crowds
  - The Canadian side has the best views

tags:                           # freeform tags for search/filtering
  - family-friendly
  - iconic
  - accessible

status:
  site: open                    # open | closed | seasonal | unknown
  waterAccess: open             # open | closed | seasonal | restricted | unknown
  note: ""                      # optional explanation (e.g., "Swimming prohibited due to high water")
  lastVerified: 2026-03-15      # date status was last confirmed
```

### Build-time Processing

A build script reads all YAML files and produces:
- `locations-index.json` — lightweight array with slug, name, type, coordinates, country, status, tags (used by map and list views)
- `locations/[slug].json` — full detail for each location (used by detail pages)

A validation script ensures all YAML files conform to the schema (required fields, valid enum values, valid coordinates).

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | Next.js 15 (App Router, static export) | Mature SSG, best PWA tooling |
| Language | TypeScript | Type safety for data model |
| Styling | Tailwind CSS | Utility-first, fast iteration |
| Map | Leaflet + react-leaflet + OpenStreetMap | Free, no API key, good enough for v1 |
| Data | YAML files in repo | Zero infrastructure, version controlled |
| PWA | next-pwa (Workbox) | Service worker generation, precaching |
| Icons | Lucide React | Lightweight, good coverage |
| Hosting | Any static host (Vercel, Netlify, Cloudflare Pages) | Free tier sufficient |

## App Architecture

### Pages

**`/` — Home (Map + List)**
- Full-screen interactive map with location pins (color-coded by type)
- Draggable bottom sheet containing the location list (Google Maps pattern)
  - On mobile: map fills viewport, bottom sheet slides up with drag handle
  - On desktop: transforms to side-by-side layout (map left, list right)
- Filter bar: type, accessibility, season, cost, status
- Search: text search across name, description, tags, country
- Clicking a pin opens a preview card; clicking a list item pans the map to the pin
- Map clusters pins at low zoom levels

**`/location/[slug]` — Location Detail**
- Hero photo (full-width)
- Name, type badge, status badges (site + water access)
- Description
- Practical info section: accessibility, parking, facilities, best season, danger level, cost
- Directions section
- Tips section
- Mini-map showing exact location with a single pin
- "Back to map" navigation
- Bookmark button (saves to localStorage for offline priority)

**`/about` — About**
- What dripmap is, how locations are curated, how to suggest additions

### Layout

- Minimal top bar: dripmap logo/wordmark, search icon, about link
- No footer on home (map is full-viewport)
- Simple footer on detail and about pages

## Offline & PWA Strategy

### Service Worker (Workbox via next-pwa)

**Precache (installed with the app):**
- All static HTML pages (SSG output)
- `locations-index.json`
- App shell assets (JS, CSS, icons)

**Runtime cache strategies:**
- **Location detail JSON:** Cache-first with network fallback. Once a user views a location, it's available offline.
- **Map tiles (OpenStreetMap):** Cache-first with network fallback. Tiles the user has browsed are cached. Stale tiles are fine for offline use.
- **Images:** Cache-first. Location photos cached on first view.

### Bookmarks (Offline Priority)

- Users can bookmark locations (stored in localStorage)
- Bookmarked locations get their detail JSON and surrounding map tiles preloaded into cache
- Bookmark list accessible from the UI (not a separate page — part of the filter/list view)

### PWA Manifest

```json
{
  "name": "dripmap",
  "short_name": "dripmap",
  "description": "Find water play locations worldwide",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

## UI Design Direction

- Clean, modern, utility-focused (not flashy)
- Blue-toned color palette (water theme) with white/light gray backgrounds
- Card-based list items with type icon, name, location, and status indicator
- Map pins color-coded by location type
- Status badges: green (open), amber (seasonal/restricted), red (closed), gray (unknown)
- Mobile-first responsive design
- Accessible: proper contrast, focus states, screen reader labels

## Future Considerations (Not in v1)

- Automated status checking from government/park websites
- User-submitted location suggestions (moderated)
- Reviews and ratings
- Trip planning / route building
- Weather integration
- Photo uploads
- Multi-language support

## Verification Plan

1. **Build:** `npm run build` produces static export with all location pages
2. **Data validation:** `npm run validate` checks all YAML files against schema
3. **Dev server:** `npm run dev` — verify map loads, pins render, list populates, filters work, detail pages render
4. **Offline test:** In Chrome DevTools, go offline after first load — verify app shell, location data, and previously-viewed map tiles are available
5. **PWA audit:** Lighthouse PWA audit should pass all criteria
6. **Mobile test:** Verify bottom sheet behavior on mobile viewport, map interaction, install prompt
