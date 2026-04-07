"use client";

import { createContext, useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import type { Forecast, ResolvedLocation, WeatherContextValue } from "./types";
import { fetchForecast } from "./openMeteo";
import { resolveLocation, upgradeToBrowserLocation } from "./locationCascade";
import {
  loadCachedForecast,
  saveCachedForecast,
  saveCachedLocation,
  isForecastFresh,
  hasMovedSignificantly,
} from "./cache";

const FRESH_MS = 15 * 60 * 1000;        // 15 min — in-memory freshness
const STALE_FALLBACK_MS = 2 * 60 * 60 * 1000; // 2 hr — localStorage fallback
const MOVE_THRESHOLD_KM = 5;

export const WeatherContext = createContext<WeatherContextValue | null>(null);

export function WeatherProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [forecast, setForecast] = useState<Forecast | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastFetchedFor = useRef<{ lat: number; lng: number } | null>(null);

  const doFetch = useCallback(async (loc: ResolvedLocation) => {
    setLoading(true);
    setError(null);
    const result = await fetchForecast(loc.coordinates);
    if (result) {
      setForecast(result);
      saveCachedForecast(result);
      lastFetchedFor.current = loc.coordinates;
    } else {
      // Try stale localStorage fallback
      const cached = loadCachedForecast();
      if (cached && Date.now() - cached.fetchedAt < STALE_FALLBACK_MS) {
        setForecast(cached);
      } else {
        setError("Weather unavailable");
      }
    }
    setLoading(false);
  }, []);

  const refresh = useCallback(() => {
    if (location) void doFetch(location);
  }, [location, doFetch]);

  // Initial location resolution + first fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Seed from cached forecast immediately if available
      const cachedForecast = loadCachedForecast();
      if (cachedForecast && Date.now() - cachedForecast.fetchedAt < STALE_FALLBACK_MS) {
        if (!cancelled) setForecast(cachedForecast);
      }

      const resolved = await resolveLocation();
      if (cancelled) return;
      if (!resolved) {
        setError("Weather unavailable");
        return;
      }
      setLocation(resolved);

      // Skip fetch if we already have a fresh forecast for nearby coords
      if (
        cachedForecast &&
        isForecastFresh(cachedForecast, FRESH_MS) &&
        !hasMovedSignificantly(cachedForecast.location, resolved.coordinates, MOVE_THRESHOLD_KM)
      ) {
        lastFetchedFor.current = cachedForecast.location;
        return;
      }
      void doFetch(resolved);
    })();
    return () => { cancelled = true; };
  }, [doFetch]);

  // Try silent upgrade to precise browser location
  useEffect(() => {
    let cancelled = false;
    void upgradeToBrowserLocation().then((coords) => {
      if (cancelled || !coords) return;
      setLocation((prev) => {
        const next: ResolvedLocation = {
          coordinates: coords,
          source: "precise",
          timestamp: Date.now(),
        };
        saveCachedLocation(next);
        // Refetch if we've moved significantly or had no prior location
        if (!prev || hasMovedSignificantly(prev.coordinates, coords, MOVE_THRESHOLD_KM)) {
          void doFetch(next);
        }
        return next;
      });
    });
    return () => { cancelled = true; };
  }, [doFetch]);

  // Refresh on tab visibility if forecast is stale
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState !== "visible") return;
      if (forecast && !isForecastFresh(forecast, FRESH_MS) && location) {
        void doFetch(location);
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [forecast, location, doFetch]);

  const value: WeatherContextValue = {
    location,
    forecast,
    loading,
    error,
    refresh,
  };

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
}
