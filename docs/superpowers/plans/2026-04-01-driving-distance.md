# Driving Distance & Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show driving distance and estimated drive time on the location detail panel using the OSRM public API.

**Architecture:** A new `src/lib/osrm.ts` module handles fetching and formatting driving data from the OSRM `/route/v1/` endpoint. `LocationDetailPanel` calls this when it has both a location and user coordinates, displaying the result in a new "Getting There" section above the navigation buttons. Failures are silent — the section simply doesn't render.

**Tech Stack:** OSRM public API (router.project-osrm.org), no new dependencies

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/lib/osrm.ts` (create) | OSRM API client: fetch driving route, format time/distance, cache results |
| `__tests__/lib/osrm.test.ts` (create) | Unit tests for OSRM formatting and fetch logic |
| `src/components/LocationDetailPanel.tsx` (modify) | Add "Getting There" section above navigation buttons |
| `__tests__/components/LocationDetailPanel.test.tsx` (create) | Component test for driving info rendering |

---

### Task 1: Formatting utilities

**Files:**
- Create: `src/lib/osrm.ts`
- Create: `__tests__/lib/osrm.test.ts`

- [ ] **Step 1: Write failing tests for formatDriveTime**

Create `__tests__/lib/osrm.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { formatDriveTime } from "../../src/lib/osrm";

describe("formatDriveTime", () => {
  it("rounds short durations to nearest 5 min with minimum of 5", () => {
    expect(formatDriveTime(60)).toBe("~5 min");       // 1 min → 5 min minimum
    expect(formatDriveTime(180)).toBe("~5 min");       // 3 min → 5 min minimum
    expect(formatDriveTime(420)).toBe("~5 min");       // 7 min → rounds to 5
    expect(formatDriveTime(510)).toBe("~10 min");      // 8.5 min → rounds to 10
    expect(formatDriveTime(1500)).toBe("~25 min");     // 25 min
    expect(formatDriveTime(2700)).toBe("~45 min");     // 45 min
  });

  it("formats durations over 60 min as hours and minutes", () => {
    expect(formatDriveTime(3600)).toBe("~1 hr");           // exactly 1 hr
    expect(formatDriveTime(5400)).toBe("~1 hr 30 min");    // 1.5 hr
    expect(formatDriveTime(9000)).toBe("~2 hr 30 min");    // 2.5 hr
    expect(formatDriveTime(7200)).toBe("~2 hr");           // exactly 2 hr
  });

  it("rounds hour durations to nearest 5 min", () => {
    expect(formatDriveTime(3720)).toBe("~1 hr");           // 62 min → 1 hr 0 min → "~1 hr"
    expect(formatDriveTime(4080)).toBe("~1 hr 10 min");    // 68 min → rounds to 1 hr 10 min
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/osrm.test.ts
```

Expected: FAIL — module `../../src/lib/osrm` does not exist.

- [ ] **Step 3: Implement formatDriveTime**

Create `src/lib/osrm.ts`:

```ts
/**
 * Format a duration in seconds as a human-readable drive time.
 * Rounds to nearest 5 minutes, minimum "~5 min".
 */
export function formatDriveTime(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  const rounded = Math.max(5, Math.round(totalMin / 5) * 5);

  if (rounded < 60) {
    return `~${rounded} min`;
  }

  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (mins === 0) {
    return `~${hrs} hr`;
  }
  return `~${hrs} hr ${mins} min`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/osrm.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/osrm.ts __tests__/lib/osrm.test.ts
git commit -m "feat: add formatDriveTime utility for OSRM durations"
```

---

### Task 2: Drive distance formatting

**Files:**
- Modify: `src/lib/osrm.ts`
- Modify: `__tests__/lib/osrm.test.ts`

- [ ] **Step 1: Write failing tests for formatDriveDistance**

Add to `__tests__/lib/osrm.test.ts`:

```ts
import { formatDriveTime, formatDriveDistance } from "../../src/lib/osrm";

describe("formatDriveDistance", () => {
  it("formats distances under 10 km with one decimal place", () => {
    expect(formatDriveDistance(500)).toBe("0.5 km");       // 500 m
    expect(formatDriveDistance(3200)).toBe("3.2 km");      // 3.2 km
    expect(formatDriveDistance(9950)).toBe("10 km");       // 9.95 km → rounds to 10, uses whole number
  });

  it("formats distances 10 km and above as whole numbers", () => {
    expect(formatDriveDistance(10000)).toBe("10 km");
    expect(formatDriveDistance(38000)).toBe("38 km");
    expect(formatDriveDistance(380000)).toBe("380 km");
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/osrm.test.ts
```

Expected: FAIL — `formatDriveDistance` is not exported.

- [ ] **Step 3: Implement formatDriveDistance**

Add to `src/lib/osrm.ts`:

```ts
/**
 * Format a distance in meters as a human-readable drive distance.
 * Under 10 km: one decimal place. 10 km+: whole numbers.
 */
export function formatDriveDistance(meters: number): string {
  const km = meters / 1000;
  if (km < 10) {
    const formatted = km.toFixed(1);
    // If rounding pushes to 10.0, use whole number format
    if (parseFloat(formatted) >= 10) return `${Math.round(km)} km`;
    return `${formatted} km`;
  }
  return `${Math.round(km)} km`;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/osrm.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/osrm.ts __tests__/lib/osrm.test.ts
git commit -m "feat: add formatDriveDistance utility"
```

---

### Task 3: OSRM fetch with caching

**Files:**
- Modify: `src/lib/osrm.ts`
- Modify: `__tests__/lib/osrm.test.ts`

- [ ] **Step 1: Write failing tests for fetchDrivingInfo**

Add to `__tests__/lib/osrm.test.ts`:

```ts
import { formatDriveTime, formatDriveDistance, fetchDrivingInfo } from "../../src/lib/osrm";
import type { Coordinates } from "../../src/lib/types";

describe("fetchDrivingInfo", () => {
  const origin: Coordinates = { lat: 51.5074, lng: -0.1278 };
  const dest: Coordinates = { lat: 51.4545, lng: -0.9782 };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches route from OSRM and returns formatted result", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [{ distance: 75400, duration: 3960 }],
      }),
    } as Response);

    const result = await fetchDrivingInfo(origin, dest);
    expect(result).toEqual({ distance: 75400, duration: 3960 });

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    // OSRM uses lng,lat order
    expect(url).toContain("-0.1278,51.5074");
    expect(url).toContain("-0.9782,51.4545");
    expect(url).toContain("overview=false");
  });

  it("returns null when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    const result = await fetchDrivingInfo(origin, dest);
    expect(result).toBeNull();
  });

  it("returns null when OSRM returns non-Ok code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: "NoRoute", routes: [] }),
    } as Response);
    const result = await fetchDrivingInfo(origin, dest);
    expect(result).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);
    const result = await fetchDrivingInfo(origin, dest);
    expect(result).toBeNull();
  });

  it("aborts request after 3 second timeout", async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;

    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      capturedSignal = (init as RequestInit)?.signal ?? undefined;
      return new Promise(() => {}); // never resolves
    });

    const promise = fetchDrivingInfo(origin, dest);
    vi.advanceTimersByTime(3000);

    const result = await promise;
    expect(result).toBeNull();
    expect(capturedSignal?.aborted).toBe(true);

    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run __tests__/lib/osrm.test.ts
```

Expected: FAIL — `fetchDrivingInfo` is not exported.

- [ ] **Step 3: Implement fetchDrivingInfo**

Add to `src/lib/osrm.ts`:

```ts
import type { Coordinates } from "./types";

export interface DrivingInfo {
  distance: number;  // meters
  duration: number;  // seconds
}

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const TIMEOUT_MS = 3000;

/**
 * Fetch driving distance and duration from OSRM.
 * Returns null on any failure (network, timeout, no route).
 */
export async function fetchDrivingInfo(
  origin: Coordinates,
  destination: Coordinates,
): Promise<DrivingInfo | null> {
  const url = `${OSRM_BASE}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;

    const data = await res.json();
    if (data.code !== "Ok" || !data.routes?.[0]) return null;

    return {
      distance: data.routes[0].distance,
      duration: data.routes[0].duration,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run __tests__/lib/osrm.test.ts
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/osrm.ts __tests__/lib/osrm.test.ts
git commit -m "feat: add OSRM fetchDrivingInfo with 3s timeout"
```

---

### Task 4: Add "Getting There" section to LocationDetailPanel

**Files:**
- Modify: `src/components/LocationDetailPanel.tsx:264-287`

- [ ] **Step 1: Add state and effect for driving info**

In `src/components/LocationDetailPanel.tsx`, add the import at the top:

```ts
import { fetchDrivingInfo, formatDriveTime, formatDriveDistance } from "@/lib/osrm";
import type { DrivingInfo } from "@/lib/osrm";
```

Add the `Car` icon import (already imported on line 8, so this is already available).

Inside the component, after the existing `cache` ref (line 35), add:

```ts
const [drivingInfo, setDrivingInfo] = useState<DrivingInfo | null>(null);
const drivingCache = useRef<Map<string, DrivingInfo>>(new Map());
```

After the existing `useEffect` that fetches location JSON (around line 72), add a new effect:

```ts
useEffect(() => {
  if (!userLocation || !location) {
    setDrivingInfo(null);
    return;
  }

  // Cache key: user coords rounded to 3 decimals + destination slug
  const key = `${userLocation.lat.toFixed(3)},${userLocation.lng.toFixed(3)},${location.slug}`;
  const cached = drivingCache.current.get(key);
  if (cached) {
    setDrivingInfo(cached);
    return;
  }

  let aborted = false;
  setDrivingInfo(null);

  fetchDrivingInfo(userLocation, location.coordinates).then((info) => {
    if (aborted) return;
    if (info) {
      drivingCache.current.set(key, info);
      if (drivingCache.current.size > 20) {
        const oldest = drivingCache.current.keys().next().value;
        if (oldest) drivingCache.current.delete(oldest);
      }
    }
    setDrivingInfo(info);
  });

  return () => { aborted = true; };
}, [userLocation, location]);
```

- [ ] **Step 2: Add the "Getting There" UI section**

Replace the `{/* Navigation buttons */}` section (lines 265-287) with:

```tsx
{/* Getting There + Navigation */}
{drivingInfo && (
  <div className="mb-2">
    <h3 className="text-base font-semibold text-gray-900 mb-1.5">
      Getting There
    </h3>
    <div className="flex items-center gap-2 text-sm text-gray-700">
      <Car className="w-4 h-4 text-gray-400 shrink-0" />
      <span>
        {formatDriveTime(drivingInfo.duration)} · {formatDriveDistance(drivingInfo.distance)} driving
      </span>
    </div>
  </div>
)}
<div className="flex gap-3 mb-4">
  <a
    href={`https://www.google.com/maps/dir/?api=1&destination=${location.coordinates.lat},${location.coordinates.lng}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors min-h-[44px]"
  >
    <Navigation className="w-4 h-4" />
    Google Maps
    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
  </a>
  <a
    href={`https://maps.apple.com/?daddr=${location.coordinates.lat},${location.coordinates.lng}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-3 text-sm font-medium text-white shadow-sm hover:bg-gray-800 transition-colors min-h-[44px]"
  >
    <Navigation className="w-4 h-4" />
    Apple Maps
    <ExternalLink className="w-3.5 h-3.5 opacity-70" />
  </a>
</div>
```

- [ ] **Step 3: Run lint and existing tests**

```bash
npm run lint && npx vitest run
```

Expected: All pass. No existing tests cover LocationDetailPanel rendering (it fetches JSON dynamically), so nothing should break.

- [ ] **Step 4: Commit**

```bash
git add src/components/LocationDetailPanel.tsx
git commit -m "feat: show driving distance and time in location detail panel"
```

---

### Task 5: Component test for driving info display

**Files:**
- Create: `__tests__/components/LocationDetailPanel.test.tsx`

- [ ] **Step 1: Write the component test**

Create `__tests__/components/LocationDetailPanel.test.tsx`:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, afterEach } from "vitest";

// Mock the osrm module
vi.mock("../../src/lib/osrm", () => ({
  fetchDrivingInfo: vi.fn(),
  formatDriveTime: vi.fn((s: number) => `~${Math.round(s / 60)} min`),
  formatDriveDistance: vi.fn((m: number) => `${Math.round(m / 1000)} km`),
}));

import { fetchDrivingInfo } from "../../src/lib/osrm";
import type { Location } from "../../src/lib/types";

const mockLocation: Location = {
  slug: "test-falls",
  name: "Test Falls",
  type: "waterfall",
  coordinates: { lat: 51.45, lng: -0.97 },
  region: "Europe",
  country: "GB",
  description: "A beautiful waterfall.",
  photos: [],
  practical: {
    accessibility: "easy",
    parking: "available",
    facilities: ["restrooms"],
    bestSeason: ["summer"],
    dangerLevel: "low",
    cost: "free",
  },
  directions: "Head north.",
  tips: ["Bring a towel."],
  tags: ["scenic"],
  status: {
    site: "open",
    waterAccess: "open",
    lastVerified: "2026-01-01",
  },
};

// Mock fetch for location JSON
beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => mockLocation,
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Dynamically import to ensure mocks are set up
const getPanel = () =>
  import("../../src/components/LocationDetailPanel").then((m) => m.default);

describe("LocationDetailPanel driving info", () => {
  it("shows driving info when userLocation is provided and OSRM succeeds", async () => {
    (fetchDrivingInfo as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      distance: 75400,
      duration: 3960,
    });

    const LocationDetailPanel = await getPanel();
    render(
      <LocationDetailPanel
        slug="test-falls"
        onBack={vi.fn()}
        userLocation={{ lat: 51.5, lng: -0.12 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Getting There")).toBeTruthy();
    });
    expect(screen.getByText(/driving/)).toBeTruthy();
  });

  it("does not show driving info when userLocation is null", async () => {
    const LocationDetailPanel = await getPanel();
    render(
      <LocationDetailPanel
        slug="test-falls"
        onBack={vi.fn()}
        userLocation={null}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test Falls")).toBeTruthy();
    });
    expect(screen.queryByText("Getting There")).toBeNull();
  });

  it("does not show driving info when OSRM fails", async () => {
    (fetchDrivingInfo as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const LocationDetailPanel = await getPanel();
    render(
      <LocationDetailPanel
        slug="test-falls"
        onBack={vi.fn()}
        userLocation={{ lat: 51.5, lng: -0.12 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test Falls")).toBeTruthy();
    });
    expect(screen.queryByText("Getting There")).toBeNull();
  });
});
```

- [ ] **Step 2: Run the test**

```bash
npx vitest run __tests__/components/LocationDetailPanel.test.tsx
```

Expected: All 3 tests PASS.

- [ ] **Step 3: Run the full test suite**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 4: Commit**

```bash
git add __tests__/components/LocationDetailPanel.test.tsx
git commit -m "test: add LocationDetailPanel driving info component tests"
```

---

### Task 6: Run E2E tests

**Files:** None (verification only)

The driving info only appears when geolocation is available. E2E tests don't grant geolocation, so the "Getting There" section won't render during E2E — which is correct fallback behavior. This task verifies nothing is broken.

- [ ] **Step 1: Run E2E tests**

```bash
npm run test:e2e
```

Expected: All existing E2E tests PASS.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: No errors.
