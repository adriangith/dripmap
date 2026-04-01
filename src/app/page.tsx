"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import Header from "@/components/Header";
import FilterBar from "@/components/FilterBar";
import LocationList from "@/components/LocationList";
import BottomSheet from "@/components/BottomSheet";
import { filterLocations } from "@/lib/filters";
import type { LocationIndexEntry, Filters } from "@/lib/types";

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
  const [showSearch, setShowSearch] = useState(false);

  const [loadError, setLoadError] = useState(false);

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

  const filteredLocations = useMemo(
    () => filterLocations(allLocations, filters),
    [allLocations, filters]
  );

  const handleMarkerClick = useCallback((slug: string) => {
    window.location.href = `/location/${slug}`;
  }, []);

  const handleMarkerHover = useCallback((slug: string | null) => {
    setHighlightedSlug(slug);
  }, []);

  const handleToggleSearch = useCallback(() => {
    setShowSearch((prev) => {
      if (prev) setFilters((f) => ({ ...f, search: "" }));
      return !prev;
    });
  }, []);

  return (
    <div className="h-screen flex flex-col">
      <Header onSearchClick={handleToggleSearch} showSearch />

      {/* Desktop layout: side-by-side */}
      <div className="flex-1 flex overflow-hidden">
        {/* Map — leave room for collapsed bottom sheet on mobile */}
        <div className="flex-1 relative pb-[140px] lg:pb-0">
          <LocationMap
            locations={filteredLocations}
            highlightedSlug={highlightedSlug}
            onMarkerClick={handleMarkerClick}
            onMarkerHover={handleMarkerHover}
          />
        </div>

        {/* Desktop sidebar (hidden on mobile) */}
        <div className="hidden lg:flex lg:flex-col lg:w-96 lg:border-l lg:border-gray-200">
          <FilterBar
            filters={filters}
            onChange={setFilters}
            resultCount={filteredLocations.length}
            showSearch={showSearch}
            onToggleSearch={handleToggleSearch}
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
            />
          </div>
        </div>
      </div>

      {/* Mobile bottom sheet */}
      <BottomSheet>
        <FilterBar
          filters={filters}
          onChange={setFilters}
          resultCount={filteredLocations.length}
          showSearch={showSearch}
          onToggleSearch={handleToggleSearch}
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
        />
      </BottomSheet>
    </div>
  );
}
