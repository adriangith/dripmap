import { vi } from "vitest";

export function createLeafletMock() {
  const mockMarker = {
    addTo: vi.fn().mockReturnThis(),
    bindPopup: vi.fn().mockReturnThis(),
    bindTooltip: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    openPopup: vi.fn().mockReturnThis(),
    closePopup: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    getTooltip: vi.fn().mockReturnValue(null),
    setZIndexOffset: vi.fn().mockReturnThis(),
    getElement: vi.fn().mockReturnValue(null),
    getLatLng: vi.fn().mockReturnValue({ lat: 0, lng: 0 }),
  };

  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    flyTo: vi.fn().mockReturnThis(),
    fitBounds: vi.fn().mockReturnThis(),
    panBy: vi.fn().mockReturnThis(),
    remove: vi.fn(),
    closePopup: vi.fn(),
    on: vi.fn().mockReturnThis(),
    getZoom: vi.fn().mockReturnValue(7),
    project: vi.fn((_latLng: unknown, _zoom: number) => ({ x: 100, y: 200 })),
    unproject: vi.fn((_point: unknown, _zoom: number) => ({ lat: -37.8, lng: 145.0 })),
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
    latLng: vi.fn((lat: number | [number, number], lng?: number) => {
      if (Array.isArray(lat)) return { lat: lat[0], lng: lat[1] };
      return { lat, lng };
    }),
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
