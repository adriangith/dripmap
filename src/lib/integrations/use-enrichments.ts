"use client";

import { useState, useEffect } from "react";
import type { EnrichmentIndex } from "./enrichment-types";

const CACHE_KEY = "drift-enrichments";
const CACHE_TS_KEY = "drift-enrichments-ts";
const STALE_MS = 60 * 60 * 1000; // 1 hour

function readCache(): EnrichmentIndex | null {
  try {
    const cachedTs = localStorage.getItem(CACHE_TS_KEY);
    const cachedData = localStorage.getItem(CACHE_KEY);
    if (cachedTs && cachedData && Date.now() - Number(cachedTs) < STALE_MS) {
      return JSON.parse(cachedData);
    }
  } catch {
    // Cache corrupt or localStorage unavailable
  }
  return null;
}

/**
 * Loads enrichment data from /generated/enrichments.json and provides
 * a lookup function. Uses localStorage to cache for 1 hour.
 */
export function useEnrichments(): EnrichmentIndex {
  const [enrichments, setEnrichments] = useState<EnrichmentIndex>(
    () => readCache() ?? {}
  );

  useEffect(() => {
    // If we already have cached data, skip fetch
    if (Object.keys(enrichments).length > 0) return;

    let cancelled = false;

    fetch("/generated/enrichments.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: EnrichmentIndex) => {
        if (cancelled) return;
        localStorage.setItem(CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_TS_KEY, String(Date.now()));
        setEnrichments(data);
      })
      .catch(() => {
        // Enrichments unavailable — that's fine, YAML data is the fallback
      });

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return enrichments;
}
