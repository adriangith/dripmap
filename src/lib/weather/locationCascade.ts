import type { Coordinates } from "../types";
import type { ResolvedLocation } from "./types";
import { loadCachedLocation, saveCachedLocation } from "./cache";
import { fetchIpLocation } from "./ipLocation";

/**
 * Resolve a location for weather purposes. Order of preference:
 *   1. localStorage cache (instant)
 *   2. IP geolocation (~instant rough)
 * The browser geolocation upgrade is handled separately via
 * `upgradeToBrowserLocation` so the initial fetch doesn't block on a
 * permission prompt.
 */
export async function resolveLocation(): Promise<ResolvedLocation | null> {
  const cached = loadCachedLocation();
  if (cached) return cached;

  const ip = await fetchIpLocation();
  if (!ip) return null;

  const resolved: ResolvedLocation = {
    coordinates: ip,
    source: "ip",
    timestamp: Date.now(),
  };
  saveCachedLocation(resolved);
  return resolved;
}

/**
 * Attempt to silently upgrade to precise browser geolocation.
 * Resolves with the precise coords or null if unavailable/denied.
 * Does NOT prompt the user — only succeeds when permission was previously granted.
 */
export function upgradeToBrowserLocation(): Promise<Coordinates | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.permissions || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.permissions
      .query({ name: "geolocation" })
      .then((perm) => {
        if (perm.state !== "granted") {
          resolve(null);
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          () => resolve(null),
          { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
        );
      })
      .catch(() => resolve(null));
  });
}
