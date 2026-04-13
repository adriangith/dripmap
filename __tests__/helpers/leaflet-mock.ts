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
