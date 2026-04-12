import { render, cleanup, fireEvent, act } from "@testing-library/react";
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

const getLocationMap = () =>
  import("../../src/components/LocationMap").then((m) => m.default);

const makeLocation = (slug: string, lat: number, lng: number): PlaceIndexEntry => ({
  slug,
  name: slug,
  type: "beach",
  coordinates: { lat, lng },
  region: "Victoria",
  country: "AU",
  cost: "free",
  highlights: [],
  status: { site: "open", lastVerified: "2026-01-01" },
  tags: [],
});

// Various locations across Victoria
const VICTORIA_LOCATIONS = {
  melbourne: { lat: -37.8136, lng: 144.9631, label: "Melbourne CBD" },
  geelong: { lat: -38.1499, lng: 144.3617, label: "Geelong" },
  ballarat: { lat: -37.5622, lng: 143.8503, label: "Ballarat" },
  bendigo: { lat: -36.7570, lng: 144.2794, label: "Bendigo" },
  wilsonsProm: { lat: -39.0539, lng: 146.3748, label: "Wilsons Promontory" },
  mornington: { lat: -38.2178, lng: 145.0384, label: "Mornington Peninsula" },
  greatOceanRoad: { lat: -38.6627, lng: 143.1050, label: "Great Ocean Road" },
  lakes: { lat: -37.8606, lng: 147.6728, label: "Gippsland Lakes" },
} as const;

/**
 * Helper: mock navigator.geolocation.getCurrentPosition to immediately
 * resolve with the given lat/lng.
 */
function mockGeolocationAt(lat: number, lng: number) {
  const getCurrentPosition = vi.fn(
    (success: PositionCallback) => {
      success({
        coords: {
          latitude: lat,
          longitude: lng,
          accuracy: 20,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
        },
        timestamp: Date.now(),
      } as GeolocationPosition);
    },
  );

  Object.defineProperty(navigator, "geolocation", {
    writable: true,
    configurable: true,
    value: { getCurrentPosition, watchPosition: vi.fn(), clearWatch: vi.fn() },
  });

  return getCurrentPosition;
}

describe("LocationMap geolocation centering", () => {
  beforeEach(() => {
    leafletMock = createLeafletMock();

    // jsdom lacks matchMedia
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(hover: hover)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    // Locate button requires a secure context
    Object.defineProperty(window, "isSecureContext", {
      writable: true,
      configurable: true,
      value: true,
    });

    // Mock permissions API (so initial geolocation check doesn't interfere)
    Object.defineProperty(navigator, "permissions", {
      writable: true,
      configurable: true,
      value: {
        query: vi.fn().mockResolvedValue({ state: "prompt" }),
      },
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  const locations = [
    makeLocation("squeaky-beach", -39.05, 146.32),
    makeLocation("eastern-beach", -38.15, 144.36),
  ];

  it.each(Object.entries(VICTORIA_LOCATIONS))(
    "centres map at %s (%s) when locate button is pressed",
    async (key, { lat, lng, label }) => {
      // Suppress the unused-var lint for the label — it's for test readability
      void label;
      void key;

      mockGeolocationAt(lat, lng);

      const LocationMap = await getLocationMap();
      const onUserLocation = vi.fn();

      const { getByTestId } = render(
        <LocationMap
          locations={locations}
          highlightedSlug={null}
          onMarkerClick={vi.fn()}
          onMarkerHover={vi.fn()}
          onUserLocation={onUserLocation}
        />
      );

      // Reset flyTo calls from initial render
      leafletMock.mockMap.flyTo.mockClear();

      await act(async () => {
        fireEvent.click(getByTestId("locate-button"));
      });

      // Should place a user marker at the geolocated position
      expect(leafletMock.L.marker).toHaveBeenCalledWith(
        [lat, lng],
        expect.any(Object),
      );

      // Should fly to the user's location (via setViewAboveSheet → flyTo)
      expect(leafletMock.mockMap.flyTo).toHaveBeenCalledTimes(1);

      // Should notify parent with the coordinates
      expect(onUserLocation).toHaveBeenCalledWith({ lat, lng });
    },
  );

  it("reports an error when geolocation is denied", async () => {
    Object.defineProperty(navigator, "geolocation", {
      writable: true,
      configurable: true,
      value: {
        getCurrentPosition: vi.fn(
          (_success: PositionCallback, error: PositionErrorCallback) => {
            error({
              code: 1, // PERMISSION_DENIED
              message: "User denied",
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            } as GeolocationPositionError);
          },
        ),
      },
    });

    const LocationMap = await getLocationMap();
    const { getByTestId, getByText } = render(
      <LocationMap
        locations={[]}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(getByTestId("locate-button"));
    });

    expect(getByText("Location permission denied")).toBeTruthy();
    expect(leafletMock.mockMap.flyTo).not.toHaveBeenCalled();
  });

  it("reports an error on insecure context", async () => {
    Object.defineProperty(window, "isSecureContext", {
      writable: true,
      configurable: true,
      value: false,
    });

    const LocationMap = await getLocationMap();
    const { getByTestId, getByText } = render(
      <LocationMap
        locations={[]}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(getByTestId("locate-button"));
    });

    expect(getByText("Location requires HTTPS connection")).toBeTruthy();
  });

  it("places a 'You are here' popup on the user marker", async () => {
    const { lat, lng } = VICTORIA_LOCATIONS.melbourne;
    mockGeolocationAt(lat, lng);

    const LocationMap = await getLocationMap();
    const { getByTestId } = render(
      <LocationMap
        locations={[]}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );

    await act(async () => {
      fireEvent.click(getByTestId("locate-button"));
    });

    expect(leafletMock.mockMarker.bindPopup).toHaveBeenCalledWith("You are here");
  });

  it("replaces the previous user marker on subsequent locates", async () => {
    mockGeolocationAt(
      VICTORIA_LOCATIONS.melbourne.lat,
      VICTORIA_LOCATIONS.melbourne.lng,
    );

    const LocationMap = await getLocationMap();
    const { getByTestId } = render(
      <LocationMap
        locations={[]}
        highlightedSlug={null}
        onMarkerClick={vi.fn()}
        onMarkerHover={vi.fn()}
      />
    );

    // First locate
    await act(async () => {
      fireEvent.click(getByTestId("locate-button"));
    });

    // Update geolocation to Geelong
    mockGeolocationAt(
      VICTORIA_LOCATIONS.geelong.lat,
      VICTORIA_LOCATIONS.geelong.lng,
    );

    // Second locate
    await act(async () => {
      fireEvent.click(getByTestId("locate-button"));
    });

    // The old marker should have been removed before placing the new one
    expect(leafletMock.mockMarker.remove).toHaveBeenCalled();
  });
});
