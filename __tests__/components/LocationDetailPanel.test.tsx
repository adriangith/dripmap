import { render, screen, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";

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

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => mockLocation,
  } as Response);
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
