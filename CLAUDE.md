# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev              # Dev server on localhost:3000
npm run dev:network      # Dev server on 0.0.0.0 (LAN accessible)
npm run dev:network:https # HTTPS dev server (needed for geolocation API)
npm run build            # Full build: validate YAML → build JSON → Next.js export → generate SW
npm run lint             # ESLint (flat config, ESLint 9)
npm run test             # Vitest unit/integration tests (single run)
npm run test:watch       # Vitest in watch mode
npm run test:e2e         # Full build + Playwright E2E tests (Chromium, port 4173)
npm run validate         # Validate YAML location data against schema
npm run build:data       # Convert YAML locations to JSON in public/generated/
```

Run a single test file: `npx vitest run __tests__/lib/filters.test.ts`
Run a single E2E test: `npx playwright test e2e/home.spec.ts`

## Architecture

**Static PWA** — Next.js 16 with `output: "export"` (no server). Pure client-side app served as static files.

### Data Pipeline

```
data/locations/*.yaml → scripts/validate-locations.ts → scripts/build-locations.ts
    → public/generated/locations-index.json (all locations, summary fields)
    → public/generated/locations/{slug}.json (full detail per location)
```

The `prebuild` hook runs validation and data build automatically before `next build`. Location YAML files have a strict schema (see `scripts/validate-locations.ts` for fields/types).

### App Structure

- **`src/app/`** — Next.js App Router: home page (map + list), `/about`, `/location/[slug]` detail pages
- **`src/components/`** — UI components (all client-side, no server components for interactive parts)
- **`src/lib/`** — Utilities: types, filter logic, location loader, geolocation (haversine), bookmarks (localStorage)

### Key Patterns

- **Leaflet must be dynamically imported** with SSR disabled (`next/dynamic` with `ssr: false`) to avoid hydration errors
- **BottomSheet** (mobile) vs **sidebar** (desktop) — responsive split layout on the home page
- **Offline-first PWA**: Workbox runtime caching for map tiles (OpenStreetMap), location JSON, and images. Service worker generated at build time via `scripts/generate-sw.ts`
- **Geolocation** requires HTTPS — use `dev:network:https` with self-signed certs in `certificates/`
- **Bookmarks** stored in localStorage, no backend

### Testing

- **Unit/integration** (`__tests__/`): Vitest + jsdom + React Testing Library. Tests cover filter logic, bookmarks, YAML validation, component rendering, and full-page integration
- **E2E** (`e2e/`): Playwright with Chromium. Builds the static site and serves it via `npx serve out` on port 4173

### Build Outputs (gitignored)

- `public/generated/` — JSON location data
- `public/sw.js`, `public/workbox-*.js` — Service worker files
- `out/` — Static site export
