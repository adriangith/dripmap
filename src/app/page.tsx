"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Droplets } from "lucide-react";
import FilterBar from "@/components/FilterBar";
import LocationList from "@/components/LocationList";
import LocationDetailPanel from "@/components/LocationDetailPanel";
import BottomSheet, { SNAP_PEEK, SNAP_HALF } from "@/components/BottomSheet";
import { filterLocations } from "@/lib/filters";
import { haversineDistanceKm } from "@/lib/useCurrentLocation";
import type { LocationIndexEntry, Filters, Coordinates } from "@/lib/types";

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
  accessibility: null,
  season: null,
  cost: null,
  siteStatus: null,
  search: "",
};

export default function HomePage() {
  const [allLocations, setAllLocations] = useState<LocationIndexEntry[]>([]);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [loadError, setLoadError] = useState(false);

  // Apple Maps-style sheet state
  const [sheetView, setSheetView] = useState<"list" | "detail">("list");
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(SNAP_PEEK);
  const [snapTarget, setSnapTarget] = useState<number | null>(null);

  useEffect(() => {
    fetch("/generated/locations-index.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: LocationIndexEntry[]) => setAllLocations(data))
      .catch(() => {
        setAllLocations([]);
        setLoadError(true);
      });
  }, []);

  const filteredLocations = useMemo(() => {
    const filtered = filterLocations(allLocations, filters);
    if (!userLocation) return filtered;
    return [...filtered].sort(
      (a, b) =>
        haversineDistanceKm(userLocation, a.coordinates) -
        haversineDistanceKm(userLocation, b.coordinates),
    );
  }, [allLocations, filters, userLocation]);

  // Open detail view in the sheet (from pin tap or card tap)
  const handleOpenDetail = useCallback((slug: string) => {
    setDetailSlug(slug);
    setSheetView("detail");
    // Snap to half position
    const halfHeight = window.innerHeight * SNAP_HALF;
    setSnapTarget(halfHeight);
  }, []);

  const handleBackToList = useCallback(() => {
    setSheetView("list");
    setDetailSlug(null);
    setHighlightedSlug(null);
  }, []);

  const handleMarkerClick = useCallback((slug: string) => {
    handleOpenDetail(slug);
  }, [handleOpenDetail]);

  const handleMarkerHover = useCallback((slug: string | null) => {
    setHighlightedSlug(slug);
  }, []);

  const handleUserLocation = useCallback((coords: Coordinates) => {
    setUserLocation(coords);
  }, []);

  const handleSheetHeightChange = useCallback((height: number) => {
    setSheetHeight(height);
    // Clear snap target after animation to avoid re-triggering
    setSnapTarget(null);
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
              <Droplets className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-blue-700 text-sm">dripmap</span>
            </Link>
          </div>
          <LocationMap
            locations={filteredLocations}
            highlightedSlug={highlightedSlug}
            focusedSlug={detailSlug}
            onMarkerClick={handleMarkerClick}
            onMarkerHover={handleMarkerHover}
            onUserLocation={handleUserLocation}
            sheetHeight={sheetHeight}
          />
        </div>

        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden lg:flex lg:flex-col lg:w-96 lg:border-l lg:border-gray-200">
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
      >
        {sheetView === "detail" && detailSlug ? (
          <LocationDetailPanel
            slug={detailSlug}
            onBack={handleBackToList}
            userLocation={userLocation}
          />
        ) : (
          <>
            <FilterBar
              filters={filters}
              onChange={setFilters}
              resultCount={filteredLocations.length}
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
        )}
      </BottomSheet>
    </div>
  );
}
