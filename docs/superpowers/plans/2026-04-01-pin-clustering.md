# Pin Clustering Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Leaflet marker clustering so nearby pins merge at low zoom levels and split apart as the user zooms in.

**Architecture:** Replace individual `marker.addTo(map)` calls with a `MarkerClusterGroup` layer from the `leaflet.markercluster` plugin. Markers are added to the cluster group, which handles grouping, animation, and spiderfying automatically. Cluster circles are styled to match dripmap's blue water theme.

**Tech Stack:** leaflet.markercluster 1.5.3, @types/leaflet.markercluster 1.5.6

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install leaflet.markercluster and its types**

```bash
npm install leaflet.markercluster@^1.5.3
npm install -D @types/leaflet.markercluster@^1.5.6
```

- [ ] **Step 2: Verify installation**

```bash
npm ls leaflet.markercluster
```

Expected: `leaflet.markercluster@1.5.3`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add leaflet.markercluster dependency"
```

---

### Task 2: Update the Leaflet mock to support MarkerClusterGroup

**Files:**
- Modify: `__tests__/helpers/leaflet-mock.ts`

The existing tests mock `leaflet` as a module. Since `leaflet.markercluster` extends `L` by adding `L.markerClusterGroup()`, the mock needs to return a fake cluster group object. The cluster group behaves like a layer: it has `addTo`, `addLayer`, `clearLayers`, and `getLayers`.

- [ ] **Step 1: Add mockClusterGroup to the leaflet mock**

In `__tests__/helpers/leaflet-mock.ts`, add a `mockClusterGroup` object and wire up `L.markerClusterGroup`:

```ts
// Add after mockZoomControl declaration:

const mockClusterGroup = {
  addTo: vi.fn().mockReturnThis(),
  addLayer: vi.fn().mockReturnThis(),
  clearLayers: vi.fn().mockReturnThis(),
  getLayers: vi.fn().mockReturnValue([]),
  removeFrom: vi.fn().mockReturnThis(),
};

// Add to the L object:
// markerClusterGroup: vi.fn().mockReturnValue(mockClusterGroup),

// Add mockClusterGroup to the return value:
// return { L, mockMap, mockTileLayer, mockMarker, mockZoomControl, mockClusterGroup };
```

Full updated file:

```ts
import { vi } from "vitest";

export function createLeafletMock() {
  const mockMarker = {
    addTo: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
    closePopup: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
  };

  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    panBy: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    closePopup: vi.fn(),
  };

  const mockTileLayer = {
    addTo: vi.fn().mockReturnThis(),
  };

  const mockZoomControl = {
    addTo: vi.fn().mockReturnThis(),
  };

  const mockClusterGroup = {
    addTo: vi.fn().mockReturnThis(),
    addLayer: vi.fn().mockReturnThis(),
    clearLayers: vi.fn().mockReturnThis(),
    getLayers: vi.fn().mockReturnValue([]),
    removeFrom: vi.fn().mockReturnThis(),
  };

  const mockDivIcon = {};
  const mockBounds = {};

  const L = {
    map: vi.fn().mockReturnValue(mockMap),
    tileLayer: vi.fn().mockReturnValue(mockTileLayer),
    marker: vi.fn().mockReturnValue(mockMarker),
    divIcon: vi.fn().mockReturnValue(mockDivIcon),
    latLngBounds: vi.fn().mockReturnValue(mockBounds),
    point: vi.fn((x: number, y: number) => ({ x, y })),
    control: {
      zoom: vi.fn().mockReturnValue(mockZoomControl),
    },
    Icon: {
      Default: {
        prototype: {} as Record<string, unknown>,
        mergeOptions: vi.fn(),
      },
    },
    markerClusterGroup: vi.fn().mockReturnValue(mockClusterGroup),
  };

  return { L, mockMap, mockTileLayer, mockMarker, mockZoomControl, mockClusterGroup };
}
```

- [ ] **Step 2: Mock the markercluster module and CSS in the test file**

In `__tests__/components/LocationMap.test.tsx`, add after the existing `vi.mock("leaflet/dist/leaflet.css")` line:

```ts
vi.mock("leaflet.markercluster", () => ({}));
vi.mock("leaflet.markercluster/dist/MarkerCluster.css", () => ({}));
vi.mock("leaflet.markercluster/dist/MarkerCluster.Default.css", () => ({}));
```

We mock the entire `leaflet.markercluster` module because the real module tries to extend `L` which is already mocked. The `L.markerClusterGroup` function is provided by our leaflet mock instead.

- [ ] **Step 3: Run existing tests to verify mocks don't break anything**

```bash
npx vitest run __tests__/components/LocationMap.test.tsx
```

Expected: All 8 existing tests PASS.

- [ ] **Step 4: Commit**

```bash
git add __tests__/helpers/leaflet-mock.ts __tests__/components/LocationMap.test.tsx
git commit -m "test: add MarkerClusterGroup to leaflet mock"
```

---

### Task 3: Write failing tests for clustering behavior

**Files:**
- Modify: `__tests__/components/LocationMap.test.tsx`

- [ ] **Step 1: Add clustering tests**

Add these tests to the existing `describe("LocationMap")` block in `__tests__/components/LocationMap.test.tsx`:

```ts
it("creates a MarkerClusterGroup and adds it to the map", async () => {
  const LocationMap = await getLocationMap();
  render(
    <LocationMap
      locations={[]}
      highlightedSlug={null}
      onMarkerClick={vi.fn()}
      onMarkerHover={vi.fn()}
    />
  );
  expect(leafletMock.L.markerClusterGroup).toHaveBeenCalled();
  expect(leafletMock.mockClusterGroup.addTo).toHaveBeenCalledWith(
    leafletMock.mockMap
  );
});

it("adds markers to the cluster group instead of directly to the map", async () => {
  const LocationMap = await getLocationMap();
  const locations = [
    makeLocation("falls-a", 43.0, -79.0),
    makeLocation("pool-b", 30.3, -98.1),
  ];
  render(
    <LocationMap
      locations={locations}
      highlightedSlug={null}
      onMarkerClick={vi.fn()}
      onMarkerHover={vi.fn()}
    />
  );

  // Markers should be added to cluster group, not directly to map
  expect(leafletMock.mockClusterGroup.addLayer).toHaveBeenCalledTimes(2);
  // marker.addTo(map) should NOT be called (markers go through cluster group)
  expect(leafletMock.mockMarker.addTo).not.toHaveBeenCalled();
});

it("clears the cluster group when locations change", async () => {
  const LocationMap = await getLocationMap();
  const locations = [makeLocation("a", 10, 20)];
  const { rerender } = render(
    <LocationMap
      locations={locations}
      highlightedSlug={null}
      onMarkerClick={vi.fn()}
      onMarkerHover={vi.fn()}
    />
  );

  rerender(
    <LocationMap
      locations={[makeLocation("b", 30, 40)]}
      highlightedSlug={null}
      onMarkerClick={vi.fn()}
      onMarkerHover={vi.fn()}
    />
  );

  expect(leafletMock.mockClusterGroup.clearLayers).toHaveBeenCalled();
});
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
npx vitest run __tests__/components/LocationMap.test.tsx
```

Expected: The 3 new tests FAIL (clustering not implemented yet). The 8 existing tests may also fail because `marker.addTo` is still being called.

- [ ] **Step 3: Commit**

```bash
git add __tests__/components/LocationMap.test.tsx
git commit -m "test: add failing tests for marker clustering"
```

---

### Task 4: Implement clustering in LocationMap

**Files:**
- Modify: `src/components/LocationMap.tsx`

- [ ] **Step 1: Add the markercluster import and CSS**

At the top of `src/components/LocationMap.tsx`, add after the existing leaflet imports:

```ts
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
```

- [ ] **Step 2: Create the cluster group in the map init effect**

In the map initialization `useEffect` (the one that creates the map), add a cluster group after the zoom control. Also store it in a ref.

Add a new ref near the other refs:

```ts
const clusterGroupRef = useRef<L.MarkerClusterGroup | null>(null);
```

In the init effect, after `L.control.zoom(...)`, add:

```ts
const clusterGroup = L.markerClusterGroup({
  maxClusterRadius: 50,
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  chunkedLoading: true,
});
clusterGroup.addTo(map);
clusterGroupRef.current = clusterGroup;
```

In the cleanup function of the same effect, add:

```ts
clusterGroupRef.current = null;
```

- [ ] **Step 3: Switch marker management to use the cluster group**

In the "Update markers when locations change" `useEffect`, make these changes:

Replace the "Clear old markers" section:
```ts
// OLD:
markersRef.current.forEach((marker) => marker.remove());
markersRef.current.clear();

// NEW:
const clusterGroup = clusterGroupRef.current;
if (clusterGroup) clusterGroup.clearLayers();
markersRef.current.clear();
```

Replace `marker.addTo(map)` in the marker creation loop:
```ts
// OLD:
const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], {
  icon: createPinIcon(loc.type),
})
  .addTo(map)
  .bindPopup(popupContent, { autoClose: true, closeOnClick: true });

// NEW:
const marker = L.marker([loc.coordinates.lat, loc.coordinates.lng], {
  icon: createPinIcon(loc.type),
}).bindPopup(popupContent, { autoClose: true, closeOnClick: true });

if (clusterGroup) clusterGroup.addLayer(marker);
```

- [ ] **Step 4: Run unit tests**

```bash
npx vitest run __tests__/components/LocationMap.test.tsx
```

Expected: All 11 tests PASS (8 old + 3 new).

Note: The existing test "creates a marker for each location" checks `L.marker` call count, which still works since we still call `L.marker()` — we just don't call `marker.addTo(map)` anymore. The test "calls onMarkerClick when a marker click handler fires" still works because `marker.on("click", ...)` is still called on each marker.

- [ ] **Step 5: Commit**

```bash
git add src/components/LocationMap.tsx
git commit -m "feat: add marker clustering with leaflet.markercluster"
```

---

### Task 5: Style cluster circles to match dripmap theme

**Files:**
- Modify: `src/app/globals.css`

The default MarkerCluster.Default.css uses green/yellow/red. Override with dripmap's blue water palette.

- [ ] **Step 1: Add cluster style overrides to globals.css**

Append to the end of `src/app/globals.css`:

```css
/* Marker cluster overrides — blue water theme */
.marker-cluster-small {
  background-color: rgba(59, 130, 246, 0.3);
}
.marker-cluster-small div {
  background-color: rgba(59, 130, 246, 0.6);
}
.marker-cluster-medium {
  background-color: rgba(37, 99, 235, 0.3);
}
.marker-cluster-medium div {
  background-color: rgba(37, 99, 235, 0.6);
}
.marker-cluster-large {
  background-color: rgba(29, 78, 216, 0.3);
}
.marker-cluster-large div {
  background-color: rgba(29, 78, 216, 0.6);
}
.marker-cluster div {
  color: white;
  font-weight: 600;
  font-size: 13px;
}
```

- [ ] **Step 2: Run full test suite to make sure nothing broke**

```bash
npx vitest run
```

Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "style: blue water theme for marker cluster circles"
```

---

### Task 6: Update E2E tests for clustering

**Files:**
- Modify: `e2e/home.spec.ts`

The clustering plugin wraps markers in its own container. The existing E2E test "markers are visible on the map" checks `.leaflet-marker-icon` which still works — clustered markers also produce `.leaflet-marker-icon` elements. However, at the default world zoom, some markers may be grouped into clusters (which use `.marker-cluster` class instead). The test needs to accept both marker icons and cluster icons as valid.

- [ ] **Step 1: Update the "markers are visible on the map" test**

Replace the existing test in `e2e/home.spec.ts`:

```ts
test("markers and clusters are visible on the map", async ({ page }) => {
  await page.goto("/");
  // Either individual markers or cluster icons should be visible
  const mapElements = page.locator(
    ".leaflet-marker-icon, .marker-cluster"
  );
  await expect(mapElements.first()).toBeVisible({ timeout: 10_000 });
  const count = await mapElements.count();
  expect(count).toBeGreaterThanOrEqual(1);
});
```

- [ ] **Step 2: Run E2E tests**

```bash
npm run test:e2e
```

Expected: All E2E tests PASS.

Note: The "clicking a map marker" test zooms into Australia at zoom 8 before clicking, so markers should be unclustered at that level and the test should still work. If it fails, the `maxClusterRadius: 50` setting keeps the clustering threshold low enough that zoom 8 shows individual pins.

- [ ] **Step 3: Commit**

```bash
git add e2e/home.spec.ts
git commit -m "test: update E2E tests for marker clustering"
```

