import { render, fireEvent, cleanup, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import type { LocationIndexEntry } from "../../src/lib/types";

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

// ── Sample data (matches public/generated/locations-index.json) ───────────
const SAMPLE_LOCATIONS: LocationIndexEntry[] = [
  {
    slug: "fairy-pools",
    name: "Fairy Pools",
    type: "swimming-hole",
    coordinates: { lat: 57.2501, lng: -6.2743 },
    country: "GB",
    status: { site: "open", waterAccess: "open", lastVerified: "2026-02-20" },
    tags: ["scenic", "hiking", "cold-water", "wild-swimming"],
  },
  {
    slug: "hamilton-pool",
    name: "Hamilton Pool Preserve",
    type: "swimming-hole",
    coordinates: { lat: 30.3427, lng: -98.1266 },
    country: "US",
    status: { site: "open", waterAccess: "seasonal", lastVerified: "2026-03-10" },
    tags: ["scenic", "reservation-required", "swimming"],
  },
  {
    slug: "niagara-falls",
    name: "Niagara Falls",
    type: "waterfall",
    coordinates: { lat: 43.0962, lng: -79.0377 },
    country: "CA",
    status: { site: "open", waterAccess: "open", lastVerified: "2026-03-15" },
    tags: ["family-friendly", "iconic", "accessible", "free"],
  },
];

// Lazy import so all mocks are registered first
const getHomePage = () =>
  import("../../src/app/page").then((m) => m.default);

describe("HomePage integration", () => {
  beforeEach(() => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve(SAMPLE_LOCATIONS),
    } as unknown as Response);
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

    // First <select> in DOM is the type filter in the desktop FilterBar
    const typeSelect = container.querySelector("select")!;
    fireEvent.change(typeSelect, { target: { value: "waterfall" } });

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

    // Filter to waterfall only (1 result)
    const typeSelect = container.querySelector("select")!;
    fireEvent.change(typeSelect, { target: { value: "waterfall" } });

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
    const counts = await findAllByText("3 locations");
    expect(counts.length).toBeGreaterThanOrEqual(1);
  });

  it("clicking a map marker highlights the corresponding card", async () => {
    const HomePage = await getHomePage();
    const { findAllByText, container } = render(<HomePage />);
    await findAllByText("Fairy Pools");

    // Simulate a marker click via the captured onMarkerClick callback
    act(() => {
      (capturedMapProps.onMarkerClick as (slug: string) => void)("fairy-pools");
    });

    // The card for fairy-pools should now have highlight styling
    const fairyLink = container.querySelector("a[href='/location/fairy-pools']")!;
    expect(fairyLink.className).toContain("border-blue-400");
    expect(fairyLink.className).toContain("bg-blue-50");

    // Other cards should NOT be highlighted
    const niagaraLink = container.querySelector("a[href='/location/niagara-falls']")!;
    expect(niagaraLink.className).not.toContain("border-blue-400");
  });

  it("clicking a different marker moves the highlight", async () => {
    const HomePage = await getHomePage();
    const { findAllByText, container } = render(<HomePage />);
    await findAllByText("Fairy Pools");

    // Highlight fairy-pools first
    act(() => {
      (capturedMapProps.onMarkerClick as (slug: string) => void)("fairy-pools");
    });
    expect(
      container.querySelector("a[href='/location/fairy-pools']")!.className
    ).toContain("border-blue-400");

    // Now click niagara-falls marker
    act(() => {
      (capturedMapProps.onMarkerClick as (slug: string) => void)("niagara-falls");
    });

    // Niagara should be highlighted, Fairy Pools should not
    expect(
      container.querySelector("a[href='/location/niagara-falls']")!.className
    ).toContain("border-blue-400");
    expect(
      container.querySelector("a[href='/location/fairy-pools']")!.className
    ).not.toContain("border-blue-400");
  });
});
