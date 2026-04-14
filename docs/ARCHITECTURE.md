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

## Merge Conflict Risk Matrix

| File | Risk | Why |
|------|------|-----|
| `src/app/page.tsx` | 🔴 High | Orchestrator — most features touch this file |
| `src/lib/types.ts` | 🟡 Medium | Shared types — additive changes are usually safe |
| `src/components/LocationDetailPanel.tsx` | 🟡 Medium | Large file, many features converge here |
| `src/components/PreferencePanel.tsx` | 🟢 Low | Self-contained, rarely touched by other work |
| `data/locations/*.yaml` | 🟢 Low | Independent files, merge-friendly unless schema changes |
| Everything else | 🟢 Low | Focused scope, minimal cross-cutting |

### Tips for Multi-Agent Branches

1. **Assign by module** — give each agent a work area from above, not individual files.
2. **Avoid `page.tsx` changes on multiple branches** — it's the #1 conflict magnet. If two features need page.tsx changes, sequence them.
3. **Types are additive-safe** — adding new optional fields to `types.ts` rarely conflicts. Renaming or restructuring fields does.
4. **YAML is merge-friendly** — each location is its own file, so content additions parallelize well.
5. **New components are safe** — creating a new component file never conflicts. Wiring it into `page.tsx` is where conflicts arise.
6. **Test files mirror source** — tests for independent modules won't conflict with each other.
