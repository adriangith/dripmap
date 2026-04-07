import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WeatherBanner from "../../src/components/WeatherBanner";
import { WeatherContext } from "../../src/lib/weather/WeatherProvider";
import type { WeatherContextValue, Forecast } from "../../src/lib/weather/types";

const sampleForecast: Forecast = {
  location: { lat: -37.81, lng: 144.96 },
  fetchedAt: Date.now(),
  current: {
    time: "2026-04-07T12:00",
    temperatureC: 26,
    weatherCode: 0,
    precipitationMm: 0,
    precipitationProbability: 0,
    uvIndex: 5,
    windKmh: 8,
  },
  hourly: [],
};

function renderWith(ctx: Partial<WeatherContextValue>) {
  const value: WeatherContextValue = {
    location: null,
    forecast: null,
    loading: false,
    error: null,
    refresh: () => {},
    ...ctx,
  };
  return render(
    <WeatherContext.Provider value={value}>
      <WeatherBanner />
    </WeatherContext.Provider>,
  );
}

describe("WeatherBanner", () => {
  it("renders nothing when forecast is null and no error", () => {
    const { container } = renderWith({ loading: true });
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when there is an error and no forecast", () => {
    const { container } = renderWith({ error: "Weather unavailable" });
    expect(container.firstChild).toBeNull();
  });

  it("shows current temperature when forecast loaded", () => {
    renderWith({ forecast: sampleForecast });
    expect(screen.getByText(/26°C/)).toBeInTheDocument();
  });

  it("expands to show per-type suitability when clicked", () => {
    renderWith({ forecast: sampleForecast });
    expect(screen.queryByText(/swimming hole/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /toggle weather details/i }));
    expect(screen.getByText(/swimming hole/i)).toBeInTheDocument();
    expect(screen.getByText(/waterfall/i)).toBeInTheDocument();
    expect(screen.getByText(/splash pad/i)).toBeInTheDocument();
    expect(screen.getByText(/spring/i)).toBeInTheDocument();
    expect(screen.getByText(/creek/i)).toBeInTheDocument();
  });

  it("collapses when clicked again", () => {
    renderWith({ forecast: sampleForecast });
    const btn = screen.getByRole("button", { name: /toggle weather details/i });
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(screen.queryByText(/swimming hole/i)).not.toBeInTheDocument();
  });

  it("calls refresh when refresh button clicked in expanded view", () => {
    let called = 0;
    renderWith({ forecast: sampleForecast, refresh: () => { called++; } });
    fireEvent.click(screen.getByRole("button", { name: /toggle weather details/i }));
    fireEvent.click(screen.getByRole("button", { name: /refresh weather/i }));
    expect(called).toBe(1);
  });
});
