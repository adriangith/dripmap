"use client";

import { useState, useEffect } from "react";
import type { PlaceIndexEntry } from "../types";
import { mergeExternalEvents } from "./merge";

const CACHE_KEY = "drift-external-events";
const CACHE_TS_KEY = "drift-external-events-ts";
const STALE_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetches external events from a remote endpoint and merges them
 * into the static location index. Includes a localStorage staleness
 * cache so we don't hit the endpoint on every page load.
 *
 * If no endpoint is configured (NEXT_PUBLIC_EXTERNAL_EVENTS_URL),
 * returns the static index unchanged.
 */
export function useExternalEvents(staticIndex: PlaceIndexEntry[]): PlaceIndexEntry[] {
  const [externalEntries, setExternalEntries] = useState<PlaceIndexEntry[]>(() => {
    if (typeof window === "undefined") return [];
    if (!process.env.NEXT_PUBLIC_EXTERNAL_EVENTS_URL) return [];
    const cachedTs = localStorage.getItem(CACHE_TS_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedTs && cachedData && Date.now() - Number(cachedTs) < STALE_MS) {
      try {
        return JSON.parse(cachedData) as PlaceIndexEntry[];
      } catch {
        return [];
      }
    }
    return [];
  });

  useEffect(() => {
    const endpoint = process.env.NEXT_PUBLIC_EXTERNAL_EVENTS_URL;
    if (!endpoint) return;

    // Check localStorage cache
    const cachedTs = localStorage.getItem(CACHE_TS_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);

    if (cachedTs && cachedData && Date.now() - Number(cachedTs) < STALE_MS) {
      return;
    }

    let cancelled = false;

    fetch(endpoint)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((external: PlaceIndexEntry[]) => {
        if (cancelled) return;
        localStorage.setItem(CACHE_KEY, JSON.stringify(external));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        setExternalEntries(external);
      })
      .catch(() => {
        // Endpoint down — use static data only
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Merge is derived — always reflects the latest staticIndex
  return externalEntries.length > 0
    ? mergeExternalEvents(staticIndex, externalEntries)
    : staticIndex;
}
