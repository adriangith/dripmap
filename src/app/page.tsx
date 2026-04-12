"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Compass, Search, ArrowLeft } from "lucide-react";
import FilterBar from "@/components/FilterBar";
import SentenceFilter from "@/components/SentenceFilter";
import LocationList from "@/components/LocationList";
import LocationDetailPanel from "@/components/LocationDetailPanel";
import BottomSheet, { SNAP_HALF } from "@/components/BottomSheet";
import { filterLocations } from "@/lib/filters";
import { applyConstraints } from "@/lib/constraints";
import type { PlaceIndexEntry, Filters, Coordinates, Constraints } from "@/lib/types";
import type { ScoredPlace } from "@/lib/constraints";

const LocationMap = dynamic(() => import("@/components/LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-blue-50 flex items-center justify-center">
      <p className="text-blue-400">Loading map...</p>
    </div>
  ),
});

const emptyFilters: Filters = {
  type: null,
  siteStatus: null,
  search: "",
};

const defaultConstraints: Constraints = {
  distance: "any",
  date: null,
  cost: "any",
  duration: "any",
  group: null,
};

export default function HomePage() {
  const [allLocations, setAllLocations] = useState<PlaceIndexEntry[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [constraints, setConstraints] = useState<Constraints>(defaultConstraints);
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Apple Maps-style sheet state
  const [sheetView, setSheetView] = useState<"list" | "detail">("list");
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [snapTarget, setSnapTarget] = useState<number | null>(null);
  const [focusSheetHeight, setFocusSheetHeight] = useState<number | undefined>();
  const listScrollRef = useRef(0);

  useEffect(() => {
    fetch("/generated/locations-index.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: PlaceIndexEntry[]) => setAllLocations(data))
      .catch(() => {
        setAllLocations([]);
        setLoadError(true);
      });
  }, []);

  const filteredLocations: ScoredPlace[] = useMemo(() => {
    const filtered = filterLocations(allLocations, filters);
    return applyConstraints(filtered, constraints, userLocation);
  }, [allLocations, filters, constraints, userLocation]);

  // Open detail view in the sheet (from pin tap or card tap)
  const handleOpenDetail = useCallback((slug: string) => {
    // Save list scroll position before switching to detail
    const scrollEl = document.querySelector(".fixed.bottom-0 .overflow-y-auto");
    if (scrollEl) listScrollRef.current = scrollEl.scrollTop;

    setDetailSlug(slug);
    setSheetView("detail");
    // Snap to half position
    const halfHeight = window.innerHeight * SNAP_HALF;
    setSnapTarget(halfHeight);
    setFocusSheetHeight(halfHeight);
  }, []);

  const handleBackToList = useCallback(() => {
    setSheetView("list");
    setDetailSlug(null);
    setHighlightedSlug(null);
    setFocusSheetHeight(undefined);
    // Restore list scroll position after React re-renders the list
    requestAnimationFrame(() => {
      const scrollEl = document.querySelector(".fixed.bottom-0 .overflow-y-auto");
      if (scrollEl) scrollEl.scrollTop = listScrollRef.current;
    });
  }, []);

  const handleMarkerClick = useCallback((slug: string) => {
    // Desktop (lg breakpoint): navigate to detail page
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      window.location.assign("/location/" + slug);
      return;
    }
    // Mobile: open in-sheet detail
    handleOpenDetail(slug);
  }, [handleOpenDetail]);

  const handleMarkerHover = useCallback((slug: string | null) => {
    setHighlightedSlug(slug);
  }, []);

  const handleUserLocation = useCallback((coords: Coordinates) => {
    setUserLocation(coords);
  }, []);

  const handleRequestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const handleSheetHeightChange = useCallback((_height: number) => {
    // Clear snap target after animation to avoid re-triggering
    setSnapTarget((prev) => prev !== null ? null : prev);
  }, []);

  const handleSheetExpandedChange = useCallback((expanded: boolean) => {
    setIsSheetExpanded(expanded);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Desktop layout: side-by-side */}
      <div className="h-full flex overflow-hidden">
        {/* Map — leave room for collapsed bottom sheet on mobile */}
        <div className="flex-1 relative overflow-hidden">
          {/* Faded logo overlay */}
          <div className="absolute left-3 z-10 pointer-events-none" style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}>
            <Link href="/" className="flex items-center gap-1.5 opacity-40 pointer-events-auto">
              <Compass className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-blue-700 text-sm">Drift</span>
            </Link>
          </div>
          <LocationMap
            locations={filteredLocations}
            highlightedSlug={highlightedSlug}
            focusedSlug={detailSlug}
            focusSheetHeight={focusSheetHeight}
            onMarkerClick={handleMarkerClick}
            onMarkerHover={handleMarkerHover}
            onUserLocation={handleUserLocation}
          />
          {/* Floating sentence filter — above the sheet on mobile, hidden on desktop */}
          <div
            className="absolute left-3 right-3 z-20 lg:hidden transition-opacity"
            style={{ bottom: "calc(var(--sheet-height, 96px) + 12px)" }}
          >
            <SentenceFilter
              filters={filters}
              constraints={constraints}
              onFiltersChange={setFilters}
              onConstraintsChange={setConstraints}
              hasLocation={userLocation !== null}
              onRequestLocation={handleRequestLocation}
            />
          </div>
        </div>

        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden lg:flex lg:flex-col lg:w-96 lg:border-l lg:border-gray-200">
          <div className="p-3 border-b border-gray-200">
            <SentenceFilter
              filters={filters}
              constraints={constraints}
              onFiltersChange={setFilters}
              onConstraintsChange={setConstraints}
              hasLocation={userLocation !== null}
              onRequestLocation={handleRequestLocation}
            />
          </div>
          <FilterBar
            filters={filters}
            onChange={setFilters}
            resultCount={filteredLocations.length}
          />
          <div className="flex-1 overflow-y-auto">
            {loadError && (
              <div className="mx-3 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                Failed to load locations. Please try refreshing the page.
              </div>
            )}
            <LocationList
              locations={filteredLocations}
              highlightedSlug={highlightedSlug}
              onHover={setHighlightedSlug}
              userLocation={userLocation}
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <BottomSheet
        snapTo={snapTarget}
        onHeightChange={handleSheetHeightChange}
        onExpandedChange={handleSheetExpandedChange}
        header={
          sheetView === "detail" && detailSlug ? (
            <div className="flex items-center gap-2 px-3 py-1">
              <button onClick={handleBackToList} className="shrink-0 p-1">
                <ArrowLeft className="w-4 h-4 text-gray-500" />
              </button>
              <span className="text-sm font-semibold text-gray-900 truncate">
                {allLocations.find((l) => l.slug === detailSlug)?.name ?? "Details"}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-100">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Search places..."
                  aria-label="Search places"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  onFocus={() => {
                    if (!isSheetExpanded) {
                      const halfHeight = window.innerHeight * SNAP_HALF;
                      setSnapTarget(halfHeight);
                    }
                  }}
                  className="flex-1 text-base outline-none bg-transparent"
                />
                <span className="text-xs text-gray-400 shrink-0">
                  {filteredLocations.length} place{filteredLocations.length !== 1 ? "s" : ""}
                </span>
              </div>
            </>
          )
        }
      >
        {sheetView === "detail" && detailSlug ? (
          isSheetExpanded ? (
            <LocationDetailPanel
              slug={detailSlug}
              userLocation={userLocation}
            />
          ) : null
        ) : isSheetExpanded ? (
          <>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              resultCount={filteredLocations.length}
              hideSearch
            />
            {loadError && (
              <div className="mx-3 mt-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                Failed to load locations. Please try refreshing the page.
              </div>
            )}
            <LocationList
              locations={filteredLocations}
              highlightedSlug={highlightedSlug}
              onHover={setHighlightedSlug}
              userLocation={userLocation}
              onCardClick={handleOpenDetail}
            />
          </>
        ) : null}
      </BottomSheet>
    </div>
  );
}
