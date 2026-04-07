import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { resolveLocation } from "../../../src/lib/weather/locationCascade";
import * as cache from "../../../src/lib/weather/cache";
import * as ipLocation from "../../../src/lib/weather/ipLocation";

describe("resolveLocation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });
  afterEach(() => vi.restoreAllMocks());

  it("returns cached location immediately when present", async () => {
    vi.spyOn(cache, "loadCachedLocation").mockReturnValue({
      coordinates: { lat: 1, lng: 2 },
      source: "precise",
      timestamp: Date.now(),
    });
    const ipSpy = vi.spyOn(ipLocation, "fetchIpLocation");

    const result = await resolveLocation();

    expect(result?.coordinates).toEqual({ lat: 1, lng: 2 });
    expect(result?.source).toBe("precise");
    expect(ipSpy).not.toHaveBeenCalled();
  });

  it("falls back to IP geolocation when no cache", async () => {
    vi.spyOn(cache, "loadCachedLocation").mockReturnValue(null);
    vi.spyOn(ipLocation, "fetchIpLocation").mockResolvedValue({ lat: 10, lng: 20 });
    const saveSpy = vi.spyOn(cache, "saveCachedLocation").mockImplementation(() => {});

    const result = await resolveLocation();

    expect(result?.coordinates).toEqual({ lat: 10, lng: 20 });
    expect(result?.source).toBe("ip");
    expect(saveSpy).toHaveBeenCalled();
  });

  it("returns null when no cache and IP fails", async () => {
    vi.spyOn(cache, "loadCachedLocation").mockReturnValue(null);
    vi.spyOn(ipLocation, "fetchIpLocation").mockResolvedValue(null);

    const result = await resolveLocation();
    expect(result).toBeNull();
  });
});

describe("upgradeToBrowserLocation", () => {
  it("is exported as a separate function", async () => {
    const mod = await import("../../../src/lib/weather/locationCascade");
    expect(typeof mod.upgradeToBrowserLocation).toBe("function");
  });
});
