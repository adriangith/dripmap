import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

vi.mock("../../src/lib/osrm", () => ({
  fetchDrivingInfo: vi.fn(),
  formatDriveTime: vi.fn((s: number) => `~${Math.round(s / 60)} min`),
  formatDriveDistance: vi.fn((m: number) => `${Math.round(m / 1000)} km`),
}));

vi.mock("../../src/lib/locations", () => ({
  getLocationIndex: vi.fn(),
  getLocationDetail: vi.fn(),
  getLocationIndexStatic: vi.fn(),
  getLocationDetailStatic: vi.fn(),
  getAllLocationSlugs: vi.fn(),
}));

import { getLocationDetail } from "../../src/lib/locations";
import { fetchDrivingInfo } from "../../src/lib/osrm";
import type { Place } from "../../src/lib/types";

const mockLocation: Place = {
  slug: "test-falls",
  name: "Test Falls",
  type: "swim",
  coordinates: { lat: 51.45, lng: -0.97 },
  region: "Europe",
  country: "GB",
  description: "A beautiful waterfall.",
  photos: [],
  highlights: ["Stunning cascades"],
  cost: "free",
  ageSuitability: { minAge: null, ideal: ["adults"] },
  accessibility: "easy",
  parking: "available",
  facilities: ["restrooms"],
  bestSeason: ["summer"],
  directions: "Head north.",
  tips: ["Bring a towel."],
  tags: ["scenic"],
  status: {
    site: "open",
    lastVerified: "2026-01-01",
  },
  details: { dangerLevel: "low", waterAccess: "open", depth: null },
};

beforeEach(() => {
  (getLocationDetail as ReturnType<typeof vi.fn>).mockResolvedValue(mockLocation);
});

afterEach(() => {
  vi.restoreAllMocks();
});

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
        userLocation={{ lat: 51.5, lng: -0.12 }}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Test Falls")).toBeTruthy();
    });
    expect(screen.queryByText("Getting There")).toBeNull();
  });
});
