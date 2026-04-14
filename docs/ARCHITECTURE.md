# Drift — Architecture & Module Map

This document maps the app into independent work areas so multiple agents (or developers) can work on separate branches with minimal merge conflicts.

---

## Tech Stack

- **Framework:** Next.js 16 (App Router, `output: "export"` — static PWA, no server)
- **UI:** React 19, Tailwind CSS 4, Lucide icons
- **Maps:** Leaflet (dynamically imported, `ssr: false`)
- **Auth/Sync:** Firebase Auth + Firestore
- **Testing:** Vitest + React Testing Library (unit/integration), Playwright (E2E)
- **Data:** YAML source files → build-time JSON → static assets

---

## Directory Layout

```
dripmap/
├── data/locations/           # Source YAML for all POI (by type subdirectory)
├── public/generated/         # Build output: locations-index.json, per-slug JSON
├── scripts/                  # Build & validation tooling
│   ├── validate-locations.ts
│   ├── build-locations.ts
│   └── generate-sw.ts
├── src/
│   ├── app/
│   │   ├── page.tsx          # Main page (map + list + detail)
│   │   ├── layout.tsx        # Root layout, Providers
│   │   ├── about/            # About page
│   │   ├── location/[slug]/  # Static detail pages (SSG)
│   │   └── globals.css       # Tailwind + custom styles
│   ├── components/           # All React components
│   └── lib/                  # Business logic, types, hooks, services
├── __tests__/                # Unit & integration tests
├── e2e/                      # Playwright E2E tests
└── certificates/             # Local HTTPS dev certs
```

---

## Module Map (Work Areas)

Each section below is a **self-contained area** that can be worked on independently. The "Touch points" note where it connects to other areas — these are the merge-risk zones.

---

### 1. Data Pipeline

**What it does:** Defines POI schema, validates YAML, builds JSON index and per-location files.

**Files:**
- `data/locations/**/*.yaml` — Source data (97 files across type subdirectories)
- `src/lib/types.ts` — `PlaceBase`, `PlaceIndexEntry`, `FitBlurbs`, `Filters`, `Constraints` interfaces
- `scripts/validate-locations.ts` — Schema validation for all YAML
- `scripts/build-locations.ts` — Transforms YAML → JSON in `public/generated/`
- `__tests__/scripts/validate-locations.test.ts`
- `__tests__/scripts/build-locations.test.ts`
- `__tests__/lib/types.test.ts`

**Touch points:**
- `types.ts` is imported everywhere — changes to type shapes ripple broadly
- Adding a new field requires: type → validation → build → component display

**Safe solo work:** Adding new locations, editing existing YAML content, adding new validation rules for existing fields.

---

### 2. Map & Geolocation

**What it does:** Renders the Leaflet map, markers, route polylines, user location dot, and drive-time overlays.

**Files:**
- `src/components/LocationMap.tsx` (555 lines) — Main map with markers, popups, route lines
- `src/components/MiniMap.tsx` / `MiniMapWrapper.tsx` — Small map on detail pages
- `src/components/DrivingInfoBanner.tsx` — Drive time/distance display
- `src/lib/osrm.ts` — OSRM routing API client
- `src/lib/useCurrentLocation.ts` — Browser geolocation hook
- `__tests__/lib/osrm.test.ts`
- `__tests__/components/MiniMap.test.tsx`

**Touch points:**
- `page.tsx` passes selected location, map center, and zoom to `LocationMap`
- `LocationMap` calls `onSelectLocation` callback to parent
- Route polylines depend on location `details.route` data from YAML

**Safe solo work:** Map styling, marker clustering, tile layer changes, geolocation UX, route rendering improvements.

---

### 3. Search, Filters & Scoring

**What it does:** Text search, type/tag filter chips, preference-based scoring and sorting.

**Files:**
- `src/components/FilterBar.tsx` — Type/tag filter chips (horizontal scroll mobile, wrap desktop)
- `src/components/FilterButton.tsx` — Filter toggle button
- `src/components/SentenceFilter.tsx` (602 lines) — Natural-language sentence filter UI
- `src/components/PreferencePanel.tsx` (659 lines) — Preference sliders/selectors panel
- `src/lib/filters.ts` — `filterLocations()` — text search + type/tag filtering
- `src/lib/constraints.ts` — `applyConstraints()` — scoring + sorting by preferences
- `src/lib/sentence.ts` — Sentence filter logic
- `src/lib/fit.ts` — `buildFitParagraph()` — personalised fit blurbs from preferences
- `__tests__/lib/filters.test.ts`
- `__tests__/lib/constraints.test.ts`

**Touch points:**
- `page.tsx` holds filter/constraint state and passes filtered results to `LocationList` and `LocationMap`
- Constraint keys must match `Constraints` type in `types.ts`
- Fit blurbs depend on `fit` field in YAML data and active constraints

**Safe solo work:** New filter types, scoring algorithm tweaks, sentence filter grammar, fit blurb logic.

---

### 4. Location Display (Cards, List & Detail Panel)

**What it does:** Renders location cards in the scrollable list and the expanded detail panel (desktop side panel / mobile full-screen).

**Files:**
- `src/components/LocationCard.tsx` — Card with image, badges, fit blurb, drive time
- `src/components/LocationList.tsx` — Scrollable card list
- `src/components/LocationDetailPanel.tsx` (498 lines) — Full detail view (description, gallery, map, metadata)
- `src/components/StatusBadge.tsx` — Open/closed/seasonal status
- `src/components/TypeBadge.tsx` — Location type icon + label
- `src/components/CostIndicator.tsx` — Free / $ / $$ / $$$ display
- `src/components/ContextBar.tsx` (370 lines) — Context bar UI
- `src/lib/event-dates.ts` — Event date parsing and status logic
- `__tests__/lib/event-dates.test.ts`

**Touch points:**
- `LocationCard` and `LocationDetailPanel` consume `PlaceIndexEntry` / `PlaceBase` types
- `LocationDetailPanel` receives `activeConstraints` for fit blurb rendering
- Cards call `onSelect` callback up to `page.tsx`

**Safe solo work:** Card layout changes, detail panel sections, badge styling, image handling, new metadata display.

---

### 5. Auth & User Data

**What it does:** Firebase authentication, Firestore sync, bookmarks, visited tracking, user preferences persistence.

**Files:**
- `src/lib/firebase.ts` — Firebase app/auth/firestore initialization
- `src/lib/auth-context.tsx` — `AuthProvider` + `useAuth()` hook
- `src/lib/user-data.ts` — Firestore read/write for user document
- `src/lib/use-user-data.tsx` — `useUserData()` hook (preferences, bookmarks, visited, onboarding state)
- `src/lib/bookmarks.ts` — Bookmark helpers
- `src/lib/visited.ts` — Visited/been-here helpers
- `src/components/AuthButton.tsx` — Sign in/out button
- `src/components/BookmarkButton.tsx` — Bookmark toggle
- `src/components/VisitedButton.tsx` — "Been here" toggle
- `src/components/Providers.tsx` — Context provider wrapper
- `__tests__/lib/bookmarks.test.ts`

**Touch points:**
- `useUserData()` is consumed by `page.tsx` for preferences and onboarding state
- `AuthButton` appears in the header area of `page.tsx`
- Bookmark/visited state used in `LocationCard` and `LocationDetailPanel`

**Safe solo work:** Auth providers, sync logic, user profile features, data migration, new user-scoped features.

---

### 6. Onboarding

**What it does:** First-run experience that gates the app — collects group type, distance preference, interests, cost preference, and optional sign-in.

**Files:**
- `src/components/OnboardingFlow.tsx` (331 lines) — Multi-step flow (welcome → account → group → distance → interests → cost)

**Touch points:**
- `page.tsx` renders `OnboardingFlow` as a gate (early return when `showOnboarding` is true)
- Saves preferences via `useUserData().updatePreferences()`
- Uses `useAuth().signIn()` for account step

**Safe solo work:** Adding/removing onboarding steps, changing step order, styling, copy changes.

---

### 7. Layout & Shell

**What it does:** The app shell — responsive layout, bottom sheet (mobile), header, footer, dark mode, PWA service worker.

**Files:**
- `src/app/page.tsx` (385 lines) — **Orchestrator**: holds all state, wires components together
- `src/app/layout.tsx` — Root HTML layout, metadata, Providers
- `src/app/globals.css` — Tailwind config + custom CSS
- `src/components/BottomSheet.tsx` (311 lines) — Mobile bottom sheet with snap points
- `src/components/Footer.tsx` — App footer
- `src/app/about/page.tsx` — About page
- `src/app/not-found.tsx` — 404 page
- `scripts/generate-sw.ts` — Workbox service worker generation

**Touch points:**
- `page.tsx` is the highest-risk file for merge conflicts — it imports and orchestrates nearly everything
- Layout changes may affect all other visual modules

**Safe solo work:** Footer content, about page, PWA manifest, service worker caching rules, global CSS.

#### Offline & PWA Deep Dive

The app is designed to work fully offline after the first visit. Here's how each layer contributes:

**Service Worker (`scripts/generate-sw.ts`)**

Generated post-build by Workbox's `generateSW()`. The script runs against the actual `out/` directory so precache hashes are always correct.

- **Precache (available offline immediately):**
  - All HTML pages (with clean-URL rewriting: `about.html` → `/about`)
  - Next.js static assets (`_next/static/**/*.{js,css,png}`)
  - All location JSON (`generated/**/*.json` — index + per-slug files)
  - PWA icons, manifest, favicon
- **Runtime caching (cached on first access):**

  | Pattern | Strategy | Cache Name | TTL |
  |---------|----------|------------|-----|
  | CartoDB map tiles | CacheFirst | `map-tiles` | 30 days, max 1000 tiles |
  | Location detail JSON | CacheFirst | `location-details` | 7 days, max 500 |
  | Location index JSON | StaleWhileRevalidate | `location-index` | No max age |
  | RSC payloads (`.txt`) | StaleWhileRevalidate | `rsc-payloads` | 7 days, max 500 |
  | Images (`/images/*`) | CacheFirst | `images` | 30 days, max 200 |

- **Navigation:** Falls back to `/` (the SPA shell) for any uncached route, so client-side routing handles it.
- **Update behaviour:** `skipWaiting` + `clientsClaim` — new SW activates immediately on next page load, no refresh prompt.

**What works offline:**
- Full app navigation (home, about, all location detail pages)
- Map browsing (tiles cached from previous sessions)
- Location search, filtering, and scoring (all data is precached JSON)
- Bookmarks and visited markers (localStorage, no network needed)
- User preferences (localStorage, synced to Firestore when back online)

**What requires connectivity:**
- First app load (to populate the precache)
- Sign-in / sign-out (Firebase Auth)
- Firestore sync (preferences, bookmarks — queued until online)
- OSRM routing API (drive time/distance calculations)
- External event feed refresh (`useExternalEvents` — falls back to localStorage cache)
- External photo URLs (Wikipedia-hosted images, not precached)

**PWA Manifest (`public/manifest.json`)**
- `display: standalone` — opens like a native app (no browser chrome)
- 192px + 512px icons with `maskable` purpose
- Theme colour: `#3b82f6` (blue)

---

### 8. Static Detail Pages (SSG)

**What it does:** Pre-rendered `/location/[slug]` pages for SEO and sharing.

**Files:**
- `src/app/location/[slug]/page.tsx` — Static page with full detail, mini-map, metadata

**Touch points:**
- Reads from `public/generated/` JSON (output of data pipeline)
- Largely independent of the main SPA view

**Safe solo work:** SEO metadata, Open Graph tags, page layout, structured data.

---

### 9. External Data Integrations

**What it does:** Source-agnostic event feed system. Fetches live event listings from external providers (Eventbrite, Humanitix, etc.) at build time and optionally refreshes at runtime via a remote JSON endpoint.

**Files:**
- `src/lib/integrations/types.ts` — `EventProvider` interface, `ExternalEvent` type, `toPlace()` mapper
- `src/lib/integrations/providers/stub.ts` — Example provider for development
- `src/lib/integrations/merge.ts` — Deduplication logic (static entries take precedence)
- `src/lib/integrations/use-external-events.ts` — Client-side refresh hook with localStorage caching
- `scripts/fetch-events.ts` — Build-time fetcher (runs in prebuild pipeline)

**Touch points:**
- `page.tsx` calls `useExternalEvents()` to merge external data into the location index
- `types.ts` has optional `source` field on `PlaceBase` and `PlaceIndexEntry` for attribution
- Build pipeline: runs after `build:data` in `prebuild` script
- External events become regular `Place` objects — all display components work unchanged

**Safe solo work:** Adding new providers (one file each), changing cache duration, refresh endpoint URL, attribution display, build-time provider configuration.

#### Active Providers

| Provider | Type | Data Source | Notes |
|----------|------|-------------|-------|
| `stub` | Development | Hardcoded | Example events for testing the adapter pattern |
| `Fever` | Production | Curated YAML | Candlelight concerts and experiences from [feverup.com](https://feverup.com). Events authored as regular `type: event` YAML files in `data/locations/event/fever-*.yaml` with `source: { provider: Fever, url: ... }`. Booking URLs link to Fever ticketing. |

#### Affiliate URL Convention

External providers with booking/ticket links can carry affiliate tracking parameters in their `bookingUrl` field. Convention: append `?ref=drift` (or the provider's specific affiliate parameter) to booking URLs. This is set directly in the YAML — no runtime transformation needed.

---

### 10. Promoted POI & Affiliate Links *(planned — not yet implemented)*

**What it will do:** Allow certain locations to be marked as promoted (sponsored/featured) and optionally carry affiliate links. Promoted POI appear mixed into regular results with a subtle "Promoted" badge so they feel native rather than intrusive. Affiliate links attach to booking URLs, ticket links, or call-to-action buttons on the detail panel.

**Likely files (to be created):**
- `src/lib/promotions/types.ts` — `PromotionConfig` interface (promoted flag, affiliate URL, sponsor name, display priority boost, campaign ID, expiry date)
- `src/lib/promotions/promotions.ts` — Logic for loading promotion configs (from YAML, JSON, or remote endpoint) and applying them to locations
- `src/components/PromotedBadge.tsx` — Small "Promoted" / "Sponsored" badge component
- `data/promotions/` or a `promoted` field in location YAML — Promotion configuration data

**Likely files to modify:**
- `src/lib/types.ts` — Add optional `promotion` field to `PlaceBase` and `PlaceIndexEntry`
- `src/components/LocationCard.tsx` — Render `PromotedBadge`, apply affiliate link wrapping
- `src/components/LocationDetailPanel.tsx` — Show sponsor attribution, affiliate CTA buttons
- `src/lib/constraints.ts` — Optional priority boost for promoted POI in scoring (subtle, not aggressive)
- `src/app/page.tsx` — Load and apply promotion configs

**Design principles:**
- **Transparency** — promoted content is always labelled; users should never feel tricked
- **Non-disruptive** — promoted POI follow the same card/detail layout as organic results; no pop-ups, interstitials, or takeovers
- **Affiliate tracking** — booking/ticket URLs can carry affiliate parameters (e.g. `?ref=drift`) without changing the user experience
- **Time-bound** — promotions should have optional start/expiry dates so stale campaigns auto-expire
- **Scoring nudge, not override** — promoted POI get a small relevance boost but never override strong user preference mismatches (e.g. a promoted full-day event won't rank first when the user selected "quick")

**Touch points:**
- `types.ts` — additive (new optional field)
- `LocationCard` / `LocationDetailPanel` — visual changes only
- `constraints.ts` — scoring adjustment (small, optional)
- `page.tsx` — wiring promotion data in

**Safe solo work:** All of it — this is a greenfield module. No existing code depends on promotions yet.

---

## Merge Conflict Risk Matrix

| File | Risk | Why |
|------|------|-----|
| `src/app/page.tsx` | 🔴 High | Orchestrator — most features touch this file |
| `src/lib/types.ts` | 🟡 Medium | Shared types — additive changes are usually safe |
| `src/components/LocationDetailPanel.tsx` | 🟡 Medium | Large file, many features converge here |
| `src/components/PreferencePanel.tsx` | 🟢 Low | Self-contained, rarely touched by other work |
| `data/locations/*.yaml` | 🟢 Low | Independent files, merge-friendly unless schema changes |
| `src/lib/integrations/` | 🟢 Low | Self-contained module, only `page.tsx` wiring touches other code |
| Everything else | 🟢 Low | Focused scope, minimal cross-cutting |

### Tips for Multi-Agent Branches

1. **Assign by module** — give each agent a work area from above, not individual files.
2. **Avoid `page.tsx` changes on multiple branches** — it's the #1 conflict magnet. If two features need page.tsx changes, sequence them.
3. **Types are additive-safe** — adding new optional fields to `types.ts` rarely conflicts. Renaming or restructuring fields does.
4. **YAML is merge-friendly** — each location is its own file, so content additions parallelize well.
5. **New components are safe** — creating a new component file never conflicts. Wiring it into `page.tsx` is where conflicts arise.
6. **Test files mirror source** — tests for independent modules won't conflict with each other.
