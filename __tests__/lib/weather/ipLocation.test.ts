import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchIpLocation } from "../../../src/lib/weather/ipLocation";

describe("fetchIpLocation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("returns coordinates from ipapi.co response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ latitude: -37.81, longitude: 144.96, city: "Melbourne" }),
    } as Response);

    const result = await fetchIpLocation();
    expect(result).toEqual({ lat: -37.81, lng: 144.96 });
  });

  it("calls the ipapi.co JSON endpoint", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ latitude: 0, longitude: 0 }),
    } as Response);

    await fetchIpLocation();
    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("ipapi.co");
    expect(url).toContain("json");
  });

  it("returns null when response not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({ ok: false, status: 429 } as Response);
    const result = await fetchIpLocation();
    expect(result).toBeNull();
  });

  it("returns null when fetch throws", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("offline"));
    const result = await fetchIpLocation();
    expect(result).toBeNull();
  });

  it("returns null when response missing latitude/longitude", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ error: true, reason: "RateLimited" }),
    } as Response);
    const result = await fetchIpLocation();
    expect(result).toBeNull();
  });

  it("aborts after 4 second timeout", async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      capturedSignal = (init as RequestInit)?.signal ?? undefined;
      return new Promise(() => {});
    });

    const promise = fetchIpLocation();
    vi.advanceTimersByTime(4000);

    const result = await promise;
    expect(result).toBeNull();
    expect(capturedSignal?.aborted).toBe(true);
    vi.useRealTimers();
  });
});
