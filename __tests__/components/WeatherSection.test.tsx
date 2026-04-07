import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import WeatherSection from "../../src/components/WeatherSection";
import { WeatherContext } from "../../src/lib/weather/WeatherProvider";
import type { WeatherContextValue, Forecast, WeatherSnapshot } from "../../src/lib/weather/types";

function makeHourly(count: number, startTempC: number): WeatherSnapshot[] {
  const out: WeatherSnapshot[] = [];
  const start = Date.now();
  for (let i = 0; i < count; i++) {
    out.push({
      time: new Date(start + i * 60 * 60 * 1000).toISOString(),
      temperatureC: startTempC + i,
      weatherCode: 0,
      precipitationMm: 0,
      precipitationProbability: 0,
      uvIndex: 5,
      windKmh: 0,
    });
  }
  return out;
}

const sampleForecast: Forecast = {
  location: { lat: -37.81, lng: 144.96 },
  fetchedAt: Date.now(),
  current: {
    time: new Date().toISOString(),
    temperatureC: 20,
    weatherCode: 0,
    precipitationMm: 0,
    precipitationProbability: 0,
    uvIndex: 5,
    windKmh: 8,
  },
  hourly: makeHourly(72, 24),
};

function renderWith(props: { driveSeconds: number | null; type: "swimming-hole" | "waterfall" }) {
  const value: WeatherContextValue = {
    location: { coordinates: { lat: 0, lng: 0 }, source: "ip", timestamp: 0 },
    forecast: sampleForecast,
    loading: false,
    error: null,
    refresh: () => {},
  };
  return render(
    <WeatherContext.Provider value={value}>
      <WeatherSection locationType={props.type} driveSeconds={props.driveSeconds} />
    </WeatherContext.Provider>,
  );
}

describe("WeatherSection", () => {
  it("renders nothing when no forecast", () => {
    const value: WeatherContextValue = {
      location: null, forecast: null, loading: false, error: null, refresh: () => {},
    };
    const { container } = render(
      <WeatherContext.Provider value={value}>
        <WeatherSection locationType="swimming-hole" driveSeconds={null} />
      </WeatherContext.Provider>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("uses current forecast when driveSeconds is null", () => {
    renderWith({ driveSeconds: null, type: "swimming-hole" });
    expect(screen.getByText(/20°C/)).toBeInTheDocument();
  });

  it("offsets into hourly forecast by drive time", () => {
    // 3 hours of driving → hourly index 3 → temp 27
    renderWith({ driveSeconds: 3 * 3600, type: "swimming-hole" });
    expect(screen.getByText(/27°C/)).toBeInTheDocument();
  });

  it("clamps offset when drive time exceeds forecast horizon", () => {
    // 200 hours of driving → clamps to last hourly entry (index 71 → temp 95)
    renderWith({ driveSeconds: 200 * 3600, type: "swimming-hole" });
    expect(screen.getByText(/95°C/)).toBeInTheDocument();
  });

  it("shows suitability rating for the location type", () => {
    renderWith({ driveSeconds: null, type: "swimming-hole" });
    // 24°C is fair for swimming-hole
    expect(screen.getByText(/fair/i)).toBeInTheDocument();
  });

  it("forecast strip is collapsed by default", () => {
    renderWith({ driveSeconds: null, type: "swimming-hole" });
    expect(screen.queryByTestId("forecast-strip")).not.toBeInTheDocument();
  });

  it("forecast strip toggles open and closed", () => {
    renderWith({ driveSeconds: null, type: "swimming-hole" });
    const toggle = screen.getByRole("button", { name: /forecast/i });
    fireEvent.click(toggle);
    expect(screen.getByTestId("forecast-strip")).toBeInTheDocument();
    fireEvent.click(toggle);
    expect(screen.queryByTestId("forecast-strip")).not.toBeInTheDocument();
  });
});
