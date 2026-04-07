import type { Coordinates } from "../types";

const ENDPOINT = "https://ipapi.co/json/";
const TIMEOUT_MS = 4000;

/**
 * Fetch a rough city-level location for the user's IP. No API key required.
 * Returns null on any failure (network, timeout, rate limit, malformed response).
 */
export async function fetchIpLocation(): Promise<Coordinates | null> {
  const controller = new AbortController();

  const abortPromise = new Promise<null>((resolve) => {
    const timer = setTimeout(() => {
      controller.abort();
      resolve(null);
    }, TIMEOUT_MS);
    controller.signal.addEventListener("abort", () => clearTimeout(timer));
  });

  const fetchPromise = (async (): Promise<Coordinates | null> => {
    try {
      const res = await fetch(ENDPOINT, { signal: controller.signal });
      if (!res.ok) return null;
      const data = await res.json();
      if (typeof data?.latitude !== "number" || typeof data?.longitude !== "number") {
        return null;
      }
      return { lat: data.latitude, lng: data.longitude };
    } catch {
      return null;
    }
  })();

  return Promise.race([fetchPromise, abortPromise]);
}
