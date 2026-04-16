"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Compass, Search, ArrowLeft } from "lucide-react";
import AuthButton from "@/components/AuthButton";
import OnboardingFlow from "@/components/OnboardingFlow";
import FilterBar from "@/components/FilterBar";
import FilterButton from "@/components/FilterButton";
import PreferencePanel from "@/components/PreferencePanel";
import LocationList from "@/components/LocationList";
import LocationDetailPanel from "@/components/LocationDetailPanel";
import BottomSheet, { SNAP_HALF } from "@/components/BottomSheet";
import { filterLocations } from "@/lib/filters";
import { applyConstraints } from "@/lib/constraints";
import type { PlaceIndexEntry, Filters, Coordinates, Constraints } from "@/lib/types";
import { DEFAULT_PRIORITY } from "@/lib/types";
import type { ScoredPlace } from "@/lib/constraints";
import { useUserData } from "@/lib/use-user-data";
import { useExternalEvents } from "@/lib/integrations/use-external-events";
import { getLocationIndex } from "@/lib/locations";

const LocationMap = dynamic(() => import("@/components/LocationMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-blue-50 dark:bg-gray-900 flex items-center justify-center">
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
  timeOfDay: null,
  cost: "any",
  duration: "any",
  group: null,
  visited: "any",
  priority: [...DEFAULT_PRIORITY],
};

const FILTERS_KEY = "drift:filters";
const CONSTRAINTS_KEY = "drift:constraints";

function loadSessionState<T>(key: string, fallback: T): T {
  if (typeof sessionStorage === "undefined") return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export default function HomePage() {
  const { onboardingComplete, preferences } = useUserData();
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [staticLocations, setStaticLocations] = useState<PlaceIndexEntry[]>([]);
  const [filters, setFilters] = useState<Filters>(() => loadSessionState(FILTERS_KEY, emptyFilters));
  const [constraints, setConstraints] = useState<Constraints>(() => {
    const loaded = loadSessionState(CONSTRAINTS_KEY, defaultConstraints);
    // Migrate: ensure "familiarity" is in the priority array
    if (!loaded.priority.includes("familiarity")) {
      loaded.priority = [...loaded.priority, "familiarity"];
    }
    return loaded;
  });
  const [highlightedSlug, setHighlightedSlug] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  // Onboarding gate: show onboarding until completed/skipped
  const showOnboarding = !onboardingComplete && !onboardingDone;

  // Apply saved preferences as session defaults (only for fresh sessions)
  const prefsAppliedRef = useRef(false);
  useEffect(() => {
    if (prefsAppliedRef.current || !preferences) return;
    // Only apply if sessionStorage has no saved constraints (fresh session)
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(CONSTRAINTS_KEY)) return;
    prefsAppliedRef.current = true;
    queueMicrotask(() => {
      setConstraints((prev) => ({
        ...prev,
        ...(preferences.distance ? { distance: preferences.distance } : {}),
        ...(preferences.cost ? { cost: preferences.cost } : {}),
        ...(preferences.group ? { group: preferences.group } : {}),
        ...(preferences.duration ? { duration: preferences.duration } : {}),
      }));
    });
  }, [preferences]);

  // Persist filters & constraints to sessionStorage
  useEffect(() => {
    try { sessionStorage.setItem(FILTERS_KEY, JSON.stringify(filters)); } catch {}
  }, [filters]);
  useEffect(() => {
    try { sessionStorage.setItem(CONSTRAINTS_KEY, JSON.stringify(constraints)); } catch {}
  }, [constraints]);

  // Apple Maps-style sheet state
  const [sheetView, setSheetView] = useState<"list" | "detail">("list");
  const [detailSlug, setDetailSlug] = useState<string | null>(null);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [snapTarget, setSnapTarget] = useState<number | null>(null);
  const [focusSheetHeight, setFocusSheetHeight] = useState<number | undefined>();
  const listScrollRef = useRef(0);

  useEffect(() => {
    getLocationIndex()
      .then((data) => setStaticLocations(data))
      .catch(() => {
        setStaticLocations([]);
        setLoadError(true);
      });
  }, []);

  // Merge in external events (from remote endpoint, if configured)
  const allLocations = useExternalEvents(staticLocations);

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

  const handleOpenDesktopDetail = useCallback((slug: string) => {
    setDetailSlug(slug);
    setSheetView("detail");
  }, []);

  const handleBackToListDesktop = useCallback(() => {
    setSheetView("list");
    setDetailSlug(null);
    setHighlightedSlug(null);
  }, []);

  const handleMarkerClick = useCallback((slug: string) => {
    if (typeof window !== "undefined" && window.innerWidth >= 1024) {
      handleOpenDesktopDetail(slug);
      return;
    }
    // Mobile: open in-sheet detail
    handleOpenDetail(slug);
  }, [handleOpenDetail, handleOpenDesktopDetail]);

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

  if (showOnboarding) {
    return <OnboardingFlow onComplete={() => setOnboardingDone(true)} />;
  }

  return (
    <div className="fixed inset-0 overflow-hidden">
      {/* Desktop layout: side-by-side */}
      <div className="h-full flex overflow-hidden">
        {/* Map — leave room for collapsed bottom sheet on mobile */}
        <div className="flex-1 relative overflow-hidden">
          {/* Faded logo overlay */}
          <div className="absolute left-3 right-3 z-10 flex items-center justify-between" style={{ top: "calc(0.75rem + env(safe-area-inset-top))" }}>
            <Link href="/" className="flex items-center gap-1.5 opacity-40">
              <Compass className="w-5 h-5 text-blue-600" />
              <span className="font-bold text-blue-700 text-sm">Drift</span>
            </Link>
            <div className="opacity-70">
              <AuthButton />
            </div>
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
          {/* Floating filter button — above the sheet on mobile, hidden on desktop */}
          <div
            className="absolute left-3 z-20 lg:hidden transition-opacity"
            style={{ bottom: "calc(var(--sheet-height, 96px) + 12px)" }}
          >
            <FilterButton
              filters={filters}
              constraints={constraints}
              onClick={() => setPrefsOpen(true)}
            />
          </div>
        </div>

        {/* Desktop sidebar (hidden on mobile) */}
        <div data-testid="location-sidebar" className="hidden lg:flex lg:flex-col lg:w-96 lg:border-l lg:border-gray-200 dark:lg:border-gray-700 dark:bg-gray-900">
          {detailSlug && sheetView === "detail" ? (
            <>
              <div className="p-3 border-b border-gray-200 dark:border-gray-700 flex items-center gap-2">
                <button
                  onClick={handleBackToListDesktop}
                  className="flex items-center gap-1.5 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to list</span>
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <LocationDetailPanel slug={detailSlug} userLocation={userLocation} activeConstraints={constraints} />
              </div>
            </>
          ) : (
            <>
              <div className="p-3 border-b border-gray-200 dark:border-gray-700">
                <FilterButton
                  filters={filters}
                  constraints={constraints}
                  onClick={() => setPrefsOpen(true)}
                />
              </div>
              <FilterBar
                filters={filters}
                onChange={setFilters}
                resultCount={filteredLocations.length}
              />
              <div className="flex-1 overflow-y-auto">
                {loadError && (
                  <div className="mx-3 mt-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                    Failed to load locations. Please try refreshing the page.
                  </div>
                )}
                <LocationList
                  locations={filteredLocations}
                  highlightedSlug={highlightedSlug}
                  onHover={setHighlightedSlug}
                  userLocation={userLocation}
                  onCardClick={handleOpenDesktopDetail}
                  activeConstraints={constraints}
                />
              </div>
            </>
          )}
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
              <button onClick={handleBackToList} className="shrink-0 p-1" aria-label="Back to list">
                <ArrowLeft className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              </button>
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                {allLocations.find((l) => l.slug === detailSlug)?.name ?? "Details"}
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2 px-3 py-1 border-b border-gray-100 dark:border-gray-800">
                <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
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
                  className="flex-1 text-base outline-none bg-transparent dark:text-gray-100 dark:placeholder:text-gray-500"
                />
                <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">
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
              activeConstraints={constraints}
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
              <div className="mx-3 mt-2 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300">
                Failed to load locations. Please try refreshing the page.
              </div>
            )}
            <LocationList
              locations={filteredLocations}
              highlightedSlug={highlightedSlug}
              onHover={setHighlightedSlug}
              userLocation={userLocation}
              onCardClick={handleOpenDetail}
              activeConstraints={constraints}
            />
          </>
        ) : null}
      </BottomSheet>

      {/* Preference panel (modal overlay) */}
      <PreferencePanel
        open={prefsOpen}
        onClose={() => setPrefsOpen(false)}
        filters={filters}
        constraints={constraints}
        onFiltersChange={setFilters}
        onConstraintsChange={setConstraints}
        hasLocation={userLocation !== null}
        onRequestLocation={handleRequestLocation}
      />

    </div>
  );
}
