import type { Coordinates } from "./types";

export interface DrivingInfo {
  distance: number;  // meters
  duration: number;  // seconds
}

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const TIMEOUT_MS = 3000;

/**
 * Fetch driving distance and duration from OSRM.
 * Returns null on any failure (network, timeout, no route).
 */
export async function fetchDrivingInfo(
  origin: Coordinates,
  destination: Coordinates,
): Promise<DrivingInfo | null> {
  const url = `${OSRM_BASE}/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=false`;

  const controller = new AbortController();

  const abortPromise = new Promise<null>((resolve) => {
    const timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, TIMEOUT_MS);
    // Clean up timer if signal is aborted externally before timeout
    controller.signal.addEventListener("abort", () => clearTimeout(timer));
  });

  const fetchPromise = (async (): Promise<DrivingInfo | null> => {
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return null;

      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.[0]) return null;

      return {
        distance: data.routes[0].distance,
        duration: data.routes[0].duration,
      };
    } catch {
      return null;
    }
  })();

  return Promise.race([fetchPromise, abortPromise]);
}

/**
 * Format a duration in seconds as a human-readable drive time.
 * Rounds to nearest 5 minutes, minimum "~5 min".
 */
export function formatDriveTime(seconds: number): string {
  const totalMin = Math.round(seconds / 60);
  const rounded = Math.max(5, Math.round(totalMin / 5) * 5);

  if (rounded < 60) {
    return `~${rounded} min`;
  }

  const hrs = Math.floor(rounded / 60);
  const mins = rounded % 60;

  if (mins === 0) {
    return `~${hrs} hr`;
  }
  return `~${hrs} hr ${mins} min`;
}

/**
 * Format a distance in meters as a human-readable drive distance.
 * Under 10 km: one decimal place. 10 km+: whole numbers.
 */
export function formatDriveDistance(meters: number): string {
  const km = meters / 1000;

  // Round to 1 decimal place first
  const rounded = Math.round(km * 10) / 10;

  if (rounded >= 10) {
    return `${Math.round(km)} km`;
  }

  return `${rounded} km`;
}
