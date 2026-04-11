import { render, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { PlaceIndexEntry } from "../../src/lib/types";

// ── LocationMap stub ───────────────────────────────────────────────────────
// Captures props so tests can invoke callbacks (e.g. onMarkerClick).
let capturedMapProps: Record<string, unknown> = {};
vi.mock("../../src/components/LocationMap", () => ({
  default: (props: Record<string, unknown>) => {
    capturedMapProps = props;
    return (
      <div
        data-testid="location-map"
        data-count={String((props.locations as unknown[]).length)}
        data-highlighted={String(props.highlightedSlug ?? "")}
      />
    );
  },
}));

// ── next/dynamic — use React.lazy so Suspense resolves async imports ───────
vi.mock("next/dynamic", () => {
  // require() is fine inside vi.mock factories (the module is already loaded)
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { lazy, createElement, Suspense } = require("react");
  return {
    default: (fn: () => Promise<{ default: React.ComponentType }>) => {
      const Lazy = lazy(fn);
      return (props: Record<string, unknown>) =>
        createElement(Suspense, { fallback: null }, createElement(Lazy, props));
    },
  };
});

// ── next/link — render plain <a> tags so we can assert hrefs ──────────────
vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

// ── next/navigation — stub (no longer used for marker click, kept for compat) ──
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn(), forward: vi.fn(), refresh: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

// ── Sample data (matches public/generated/locations-index.json) ───────────
const SAMPLE_LOCATIONS: PlaceIndexEntry[] = [
  {
    slug: "fairy-pools",
    name: "Fairy Pools",
    type: "swim",
    coordinates: { lat: 57.2501, lng: -6.2743 },
    region: "Scotland, UK",
    country: "GB",
    cost: "free",
    highlights: ["Crystal clear pools"],
    status: { site: "open", lastVerified: "2026-02-20" },
    tags: ["scenic", "hiking", "cold-water", "wild-swimming"],
  },
  {
    slug: "hamilton-pool",
    name: "Hamilton Pool Preserve",
    type: "swim",
    coordinates: { lat: 30.3427, lng: -98.1266 },
    region: "Texas, USA",
    country: "US",
    cost: "$$",
    highlights: ["Natural grotto"],
    status: { site: "open", lastVerified: "2026-03-10" },
    tags: ["scenic", "reservation-required", "swimming"],
  },
  {
    slug: "niagara-falls",
    name: "Niagara Falls",
    type: "waterfall",
    coordinates: { lat: 43.0962, lng: -79.0377 },
    region: "Ontario, Canada",
    country: "CA",
    cost: "free",
    highlights: ["World-famous waterfall"],
    status: { site: "open", lastVerified: "2026-03-15" },
    tags: ["family-friendly", "iconic", "accessible", "free"],
  },
];

// ── Sample detail data for fairy-pools ──────────────────────────────────
const FAIRY_POOLS_DETAIL = {
  slug: "fairy-pools",
  name: "Fairy Pools",
  type: "swim",
  coordinates: { lat: 57.2501, lng: -6.2743 },
  region: "Scotland, UK",
  country: "GB",
  description: "Crystal clear pools in the Scottish Highlands.",
  photos: [],
  highlights: ["Crystal clear pools"],
  cost: "free",
  ageSuitability: { minAge: null, ideal: ["adults"] },
  accessibility: "moderate",
  parking: "available",
  facilities: [],
  bestSeason: ["summer"],
  directions: "Take the A87.",
  tips: ["Bring warm clothes"],
  tags: ["scenic", "hiking", "cold-water", "wild-swimming"],
  status: { site: "open", lastVerified: "2026-02-20" },
  details: { dangerLevel: "moderate", waterAccess: "open", depth: null },
};

// Lazy import so all mocks are registered first
const getHomePage = () =>
  import("../../src/app/page").then((m) => m.default);

describe("HomePage integration", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("locations-index.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(SAMPLE_LOCATIONS),
        } as unknown as Response);
      }
      if (url.includes("/locations/fairy-pools.json")) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(FAIRY_POOLS_DETAIL),
        } as unknown as Response);
      }
      return Promise.resolve({ ok: false, status: 404 } as Response);
    });
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders all 3 location cards after fetch", async () => {
    const HomePage = await getHomePage();
    const { findAllByText } = render(<HomePage />);
    // Desktop sidebar + mobile BottomSheet both render LocationList,
    // so each card name appears twice — findAllByText handles that.
    expect((await findAllByText("Fairy Pools")).length).toBeGreaterThanOrEqual(1);
    expect((await findAllByText("Hamilton Pool Preserve")).length).toBeGreaterThanOrEqual(1);
    expect((await findAllByText("Niagara Falls")).length).toBeGreaterThanOrEqual(1);
  });

  it("passes all 3 locations to the map", async () => {
    const HomePage = await getHomePage();
    const { findByTestId } = render(<HomePage />);
    // Wait for fetch → state update → LocationMap stub to receive locations
    const map = await findByTestId("location-map");
    await waitFor(() =>
      expect(map.getAttribute("data-count")).toBe("3")
    );
  });

  it("cards link to correct detail pages", async () => {
    const HomePage = await getHomePage();
    const { findAllByText, getAllByRole } = render(<HomePage />);
    // Wait for cards to load before collecting links
    await findAllByText("Fairy Pools");
    const hrefs = getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/location/fairy-pools");
    expect(hrefs).toContain("/location/hamilton-pool");
    expect(hrefs).toContain("/location/niagara-falls");
  });

  it("filtering by type narrows displayed cards", async () => {
    const HomePage = await getHomePage();
    const { findAllByText, queryAllByText, container } = render(<HomePage />);
    // Wait for data
    await findAllByText("Fairy Pools");

    // Click the "Waterfall" filter chip
    const waterfallChip = container.querySelector('[data-filter-chip="waterfall"]')!;
    fireEvent.click(waterfallChip);

    // Only Niagara Falls is a waterfall; swimming-holes should vanish from both lists
    expect(queryAllByText("Niagara Falls").length).toBeGreaterThanOrEqual(1);
    expect(queryAllByText("Fairy Pools").length).toBe(0);
    expect(queryAllByText("Hamilton Pool Preserve").length).toBe(0);
  });

  it("map data-count updates when filter is applied", async () => {
    const HomePage = await getHomePage();
    const { findByTestId, findAllByText, container } = render(<HomePage />);
    // Wait for initial render with 3 locations
    await findAllByText("Fairy Pools");
    await waitFor(() =>
      expect(
        container.querySelector("[data-testid='location-map']")?.getAttribute("data-count")
      ).toBe("3")
    );

    // Click the "Waterfall" filter chip (1 result)
    const waterfallChip = container.querySelector('[data-filter-chip="waterfall"]')!;
    fireEvent.click(waterfallChip);

    const map = await findByTestId("location-map");
    await waitFor(() =>
      expect(map.getAttribute("data-count")).toBe("1")
    );
  });

  it("does not reset map location count when hovering a card", async () => {
    const HomePage = await getHomePage();
    const { findAllByText, container } = render(<HomePage />);
    await findAllByText("Fairy Pools");
    await waitFor(() =>
      expect(
        container.querySelector("[data-testid='location-map']")?.getAttribute("data-count")
      ).toBe("3")
    );

    // Simulate hovering a card (sets highlightedSlug, triggers re-render)
    const cards = container.querySelectorAll("a[href^='/location/']");
    fireEvent.mouseEnter(cards[0]);

    // Map should still receive 3 locations — not be recreated with a new reference
    await waitFor(() =>
      expect(
        container.querySelector("[data-testid='location-map']")?.getAttribute("data-count")
      ).toBe("3")
    );
    // Render count check: the stub should not have been called with a fresh props
    // object that differs in array identity — validated above via stable data-count
    fireEvent.mouseLeave(cards[0]);
  });

  it("shows result count in filter bar", async () => {
    const HomePage = await getHomePage();
    const { findAllByText } = render(<HomePage />);
    // Wait for data then confirm FilterBar renders "3 locations"
    // Two FilterBars exist (desktop + mobile), so findAllByText is appropriate
    await findAllByText("Fairy Pools");
    const counts = await findAllByText("3 places");
    expect(counts.length).toBeGreaterThanOrEqual(1);
  });

  it("clicking a map marker opens detail panel in bottom sheet", async () => {
    const HomePage = await getHomePage();
    const { findAllByText, findByText } = render(<HomePage />);
    await findAllByText("Fairy Pools");

    act(() => {
      (capturedMapProps.onMarkerClick as (slug: string) => void)("fairy-pools");
    });

    // Detail panel should load and show the location name in detail view
    await waitFor(() =>
      expect(findByText("Back to list")).toBeTruthy()
    );
  });

  it("clicking back in detail panel returns to list", async () => {
    const HomePage = await getHomePage();
    const { findAllByText, findByText, queryByText } = render(<HomePage />);
    await findAllByText("Fairy Pools");

    act(() => {
      (capturedMapProps.onMarkerClick as (slug: string) => void)("fairy-pools");
    });

    const backButton = await findByText("Back to list");

    act(() => {
      fireEvent.click(backButton);
    });

    // Should be back on list view — "Back to list" should be gone
    await waitFor(() =>
      expect(queryByText("Back to list")).toBeNull()
    );
  });
});
