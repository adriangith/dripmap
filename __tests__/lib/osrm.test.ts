import { describe, it, expect, vi, afterEach } from "vitest";
import { formatDriveTime, formatDriveDistance, fetchDrivingInfo } from "../../src/lib/osrm";
import type { Coordinates } from "../../src/lib/types";

describe("formatDriveTime", () => {
  it("rounds short durations to nearest 5 min with minimum of 5", () => {
    expect(formatDriveTime(60)).toBe("~5 min");
    expect(formatDriveTime(180)).toBe("~5 min");
    expect(formatDriveTime(420)).toBe("~5 min");
    expect(formatDriveTime(510)).toBe("~10 min");
    expect(formatDriveTime(1500)).toBe("~25 min");
    expect(formatDriveTime(2700)).toBe("~45 min");
  });

  it("formats durations over 60 min as hours and minutes", () => {
    expect(formatDriveTime(3600)).toBe("~1 hr");
    expect(formatDriveTime(5400)).toBe("~1 hr 30 min");
    expect(formatDriveTime(9000)).toBe("~2 hr 30 min");
    expect(formatDriveTime(7200)).toBe("~2 hr");
  });

  it("rounds hour durations to nearest 5 min", () => {
    expect(formatDriveTime(3720)).toBe("~1 hr");
    expect(formatDriveTime(4080)).toBe("~1 hr 10 min");
  });
});

describe("formatDriveDistance", () => {
  it("formats distances under 10 km with one decimal place", () => {
    expect(formatDriveDistance(500)).toBe("0.5 km");
    expect(formatDriveDistance(3200)).toBe("3.2 km");
    expect(formatDriveDistance(9950)).toBe("10 km");
  });

  it("formats distances 10 km and above as whole numbers", () => {
    expect(formatDriveDistance(10000)).toBe("10 km");
    expect(formatDriveDistance(38000)).toBe("38 km");
    expect(formatDriveDistance(380000)).toBe("380 km");
  });
});

describe("fetchDrivingInfo", () => {
  const origin: Coordinates = { lat: 51.5074, lng: -0.1278 };
  const dest: Coordinates = { lat: 51.4545, lng: -0.9782 };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches route from OSRM and returns distance/duration", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        code: "Ok",
        routes: [{ distance: 75400, duration: 3960 }],
      }),
    } as Response);

    const result = await fetchDrivingInfo(origin, dest);
    expect(result).toEqual({ distance: 75400, duration: 3960 });

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("-0.1278,51.5074");
    expect(url).toContain("-0.9782,51.4545");
    expect(url).toContain("overview=false");
  });

  it("returns null when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("Network error"));
    const result = await fetchDrivingInfo(origin, dest);
    expect(result).toBeNull();
  });

  it("returns null when OSRM returns non-Ok code", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ code: "NoRoute", routes: [] }),
    } as Response);
    const result = await fetchDrivingInfo(origin, dest);
    expect(result).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);
    const result = await fetchDrivingInfo(origin, dest);
    expect(result).toBeNull();
  });

  it("aborts request after 3 second timeout", async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;

    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      capturedSignal = (init as RequestInit)?.signal ?? undefined;
      return new Promise(() => {});
    });

    const promise = fetchDrivingInfo(origin, dest);
    vi.advanceTimersByTime(3000);

    const result = await promise;
    expect(result).toBeNull();
    expect(capturedSignal?.aborted).toBe(true);

    vi.useRealTimers();
  });
});
