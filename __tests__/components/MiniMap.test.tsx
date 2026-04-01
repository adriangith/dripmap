import { render } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { createLeafletMock } from "../helpers/leaflet-mock";
import type { Coordinates } from "../../src/lib/types";

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

const getMiniMap = () =>
  import("../../src/components/MiniMap").then((m) => m.default);

const coords: Coordinates = { lat: 57.25, lng: -6.27 };

describe("MiniMap", () => {
  beforeEach(() => {
    leafletMock = createLeafletMock();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders a container div with correct classes", async () => {
    const MiniMap = await getMiniMap();
    const { container } = render(<MiniMap coordinates={coords} name="Fairy Pools" />);
    const div = container.querySelector("div");
    expect(div).toBeTruthy();
    expect(div!.className).toContain("h-48");
    expect(div!.className).toContain("rounded-lg");
  });

  it("initializes the map with all interactions disabled", async () => {
    const MiniMap = await getMiniMap();
    render(<MiniMap coordinates={coords} name="Fairy Pools" />);
    expect(leafletMock.L.map).toHaveBeenCalledWith(
      expect.any(HTMLElement),
      expect.objectContaining({
        zoomControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        touchZoom: false,
      })
    );
  });

  it("sets the view to the provided coordinates at zoom 13", async () => {
    const MiniMap = await getMiniMap();
    render(<MiniMap coordinates={coords} name="Fairy Pools" />);
    expect(leafletMock.mockMap.setView).toHaveBeenCalledWith(
      [coords.lat, coords.lng],
      13
    );
  });

  it("adds a marker at the provided coordinates", async () => {
    const MiniMap = await getMiniMap();
    render(<MiniMap coordinates={coords} name="Fairy Pools" />);
    expect(leafletMock.L.marker).toHaveBeenCalledWith([coords.lat, coords.lng]);
  });

  it("binds a popup with the location name", async () => {
    const MiniMap = await getMiniMap();
    render(<MiniMap coordinates={coords} name="Fairy Pools" />);
    expect(leafletMock.mockMarker.bindPopup).toHaveBeenCalledWith("Fairy Pools");
  });

  it("calls map.remove() on unmount", async () => {
    const MiniMap = await getMiniMap();
    const { unmount } = render(<MiniMap coordinates={coords} name="Fairy Pools" />);
    unmount();
    expect(leafletMock.mockMap.remove).toHaveBeenCalled();
  });
});
