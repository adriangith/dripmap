import { describe, it, expect, vi, afterEach } from "vitest";
import { fetchForecast } from "../../../src/lib/weather/openMeteo";

const sampleResponse = {
  latitude: -37.81,
  longitude: 144.96,
  current: {
    time: "2026-04-07T12:00",
    temperature_2m: 24.5,
    precipitation: 0,
    weather_code: 1,
    uv_index: 6,
    wind_speed_10m: 12,
  },
  hourly: {
    time: ["2026-04-07T12:00", "2026-04-07T13:00", "2026-04-07T14:00"],
    temperature_2m: [24.5, 25.0, 25.5],
    precipitation_probability: [0, 10, 20],
    precipitation: [0, 0, 0.2],
    uv_index: [6, 7, 7],
    weather_code: [1, 2, 2],
  },
};

describe("fetchForecast", () => {
  afterEach(() => vi.restoreAllMocks());

  it("calls Open-Meteo with correct query parameters", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => sampleResponse,
    } as Response);

    await fetchForecast({ lat: -37.81, lng: 144.96 });

    const url = (globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain("api.open-meteo.com/v1/forecast");
    expect(url).toContain("latitude=-37.81");
    expect(url).toContain("longitude=144.96");
    expect(url).toContain("current=temperature_2m");
    expect(url).toContain("hourly=temperature_2m");
    expect(url).toContain("forecast_days=3");
    expect(url).toContain("timezone=auto");
  });

  it("parses response into Forecast shape", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => sampleResponse,
    } as Response);

    const forecast = await fetchForecast({ lat: -37.81, lng: 144.96 });

    expect(forecast).not.toBeNull();
    expect(forecast!.location).toEqual({ lat: -37.81, lng: 144.96 });
    expect(forecast!.current.temperatureC).toBe(24.5);
    expect(forecast!.current.weatherCode).toBe(1);
    expect(forecast!.current.uvIndex).toBe(6);
    expect(forecast!.current.windKmh).toBe(12);
    expect(forecast!.hourly).toHaveLength(3);
    expect(forecast!.hourly[1].temperatureC).toBe(25.0);
    expect(forecast!.hourly[1].precipitationProbability).toBe(10);
    expect(forecast!.hourly[2].precipitationMm).toBe(0.2);
    expect(typeof forecast!.fetchedAt).toBe("number");
  });

  it("returns null when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValueOnce(new Error("network"));
    const result = await fetchForecast({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it("returns null when response is not ok", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);
    const result = await fetchForecast({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it("returns null when response missing required fields", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ latitude: 0, longitude: 0 }),
    } as Response);
    const result = await fetchForecast({ lat: 0, lng: 0 });
    expect(result).toBeNull();
  });

  it("aborts request after 5 second timeout", async () => {
    vi.useFakeTimers();
    let capturedSignal: AbortSignal | undefined;
    vi.spyOn(globalThis, "fetch").mockImplementation((_url, init) => {
      capturedSignal = (init as RequestInit)?.signal ?? undefined;
      return new Promise(() => {});
    });

    const promise = fetchForecast({ lat: 0, lng: 0 });
    vi.advanceTimersByTime(5000);

    const result = await promise;
    expect(result).toBeNull();
    expect(capturedSignal?.aborted).toBe(true);

    vi.useRealTimers();
  });
});
