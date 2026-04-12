import { render, cleanup } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { createLeafletMock } from "../helpers/leaflet-mock";
import type { PlaceIndexEntry } from "../../src/lib/types";

// Build a fresh mock for each test
let leafletMock: ReturnType<typeof createLeafletMock>;

vi.mock("leaflet", () => ({
  default: new Proxy(
    {},
    {
      get(_target, prop) {
        return (leafletMock.L as Record<string, unknown>)[prop as string];
      },
    }
  ),
}));

vi.mock("leaflet/dist/leaflet.css", () => ({}));
vi.mock("leaflet.markercluster", () => ({}));
vi.mock("leaflet.markercluster/dist/MarkerCluster.css", () => ({}));
vi.mock("leaflet.markercluster/dist/MarkerCluster.Default.css", () => ({}));

// Lazy import so the mock is set up first
const getLocationMap = () =>
  import("../../src/components/LocationMap").then((m) => m.default);

const makeLocation = (slug: string, lat: number, lng: number): PlaceIndexEntry => ({
  slug,
  name: slug,
  type: "waterfall",
  coordinates: { lat, lng },
  region: "North America",
  country: "US",
  cost: "free",
  highlights: [],
  status: { site: "open", lastVerified: "2026-01-01" },
  tags: [],
});

describe("LocationMap", () => {
  beforeEach(() => {
    leafletMock = createLeafletMock();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a container div", async () => {
    const LocationMap = await getLocationMap();
    const { container: c } = render(
      <LocationMap
        locations={[]}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );
    expect(c.querySelector("div")).toBeTruthy();
  });

  it("initializes the map on mount with zoomControl: false", async () => {
    const LocationMap = await getLocationMap();
    render(
      <LocationMap
        locations={[]}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );
    expect(leafletMock.L.map).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({ zoomControl: false })
    );
  });

  it("adds the OpenStreetMap tile layer", async () => {
    const LocationMap = await getLocationMap();
    render(
      <LocationMap
        locations={[]}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );
    expect(leafletMock.L.tileLayer).toHaveBeenCalledWith(
      expect.stringContaining("cartocdn.com"),
      expect.any(Object)
    );
  });

  it("creates a marker for each location", async () => {
    const LocationMap = await getLocationMap();
    const locations = [
      makeLocation("falls-a", 43.0, -79.0),
      makeLocation("pool-b", 30.3, -98.1),
      makeLocation("spring-c", 57.2, -6.2),
    ];
    render(
      <LocationMap
        locations={locations}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );
    expect(leafletMock.L.marker).toHaveBeenCalledTimes(3);
    expect(leafletMock.L.marker).toHaveBeenCalledWith([43.0, -79.0], expect.any(Object));
    expect(leafletMock.L.marker).toHaveBeenCalledWith([30.3, -98.1], expect.any(Object));
  });

  it("calls onMarkerClick when a marker click handler fires", async () => {
    const LocationMap = await getLocationMap();
    const onMarkerClick = vi.fn();
    const locations = [makeLocation("test-falls", 10, 20)];

    render(
      <LocationMap
        locations={locations}
        highlightedSlug={null}
        onMarkerClick={onMarkerClick}
        onMarkerHover={vi.fn()}
      />
    );

    // Find the click handler registered via marker.on("click", ...)
    const onCalls = leafletMock.mockMarker.on.mock.calls;
    const clickCall = onCalls.find(([event]) => event === "click");
    expect(clickCall).toBeDefined();
    clickCall![1](); // invoke the callback

    expect(onMarkerClick).toHaveBeenCalledWith("test-falls");
  });

  it("calls onMarkerHover when mouseover/mouseout handlers fire", async () => {
    const LocationMap = await getLocationMap();
    const onMarkerHover = vi.fn();
    const locations = [makeLocation("test-falls", 10, 20)];

    render(
      <LocationMap
        locations={locations}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={onMarkerHover}
      />
    );

    const onCalls = leafletMock.mockMarker.on.mock.calls;
    const overCall = onCalls.find(([event]) => event === "mouseover");
    const outCall = onCalls.find(([event]) => event === "mouseout");

    overCall![1]();
    expect(onMarkerHover).toHaveBeenCalledWith("test-falls");

    outCall![1]();
    expect(onMarkerHover).toHaveBeenCalledWith(null);
  });

  it("fits bounds when locations are provided", async () => {
    const LocationMap = await getLocationMap();
    const locations = [makeLocation("a", 10, 20), makeLocation("b", 30, 40)];

    render(
      <LocationMap
        locations={locations}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );

    expect(leafletMock.L.latLngBounds).toHaveBeenCalled();
    expect(leafletMock.mockMap.fitBounds).toHaveBeenCalled();
  });

  it("does not fit bounds when locations list is empty", async () => {
    const LocationMap = await getLocationMap();
    render(
      <LocationMap
        locations={[]}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );
    expect(leafletMock.mockMap.fitBounds).not.toHaveBeenCalled();
  });

  it("calls map.remove() on unmount", async () => {
    const LocationMap = await getLocationMap();
    const { unmount } = render(
      <LocationMap
        locations={[]}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );
    unmount();
    expect(leafletMock.mockMap.remove).toHaveBeenCalled();
  });

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

    expect(leafletMock.mockClusterGroup.addLayer).toHaveBeenCalledTimes(2);
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
});
