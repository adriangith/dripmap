"use client";

import { useState, useMemo } from "react";
import { ChevronDown, ChevronUp, Sun, CloudRain, Cloud, CloudSnow, Zap } from "lucide-react";
import { useWeather } from "@/lib/weather/useWeather";
import { suitability } from "@/lib/weather/suitability";
import type { LocationType, SuitabilityRating, WeatherSnapshot } from "@/lib/weather/types";

interface Props {
  locationType: LocationType;
  /** Drive time in seconds; null if not yet known */
  driveSeconds: number | null;
}

function weatherIcon(code: number) {
  if ([0, 1].includes(code)) return <Sun className="w-4 h-4 text-amber-500" />;
  if ([2, 3, 45, 48].includes(code)) return <Cloud className="w-4 h-4 text-gray-500" />;
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain className="w-4 h-4 text-blue-500" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className="w-4 h-4 text-blue-300" />;
  if ([95, 96, 99].includes(code)) return <Zap className="w-4 h-4 text-amber-600" />;
  return <Cloud className="w-4 h-4 text-gray-500" />;
}

function ratingColor(r: SuitabilityRating): string {
  switch (r) {
    case "good": return "bg-emerald-100 text-emerald-800";
    case "fair": return "bg-amber-100 text-amber-800";
    case "poor": return "bg-rose-100 text-rose-800";
  }
}

/**
 * Pick the hourly forecast index closest to (now + driveSeconds).
 * Returns null when driveSeconds is null (caller uses forecast.current).
 * Clamps to the last available entry when drive time exceeds horizon.
 */
function pickArrivalSnapshot(
  hourly: WeatherSnapshot[],
  driveSeconds: number | null,
): WeatherSnapshot | null {
  if (driveSeconds == null || hourly.length === 0) return null;
  const offsetHours = Math.round(driveSeconds / 3600);
  const idx = Math.min(Math.max(offsetHours, 0), hourly.length - 1);
  return hourly[idx];
}

function dailySummary(hourly: WeatherSnapshot[], dayOffset: number): {
  date: Date;
  high: number;
  low: number;
  code: number;
} | null {
  const start = dayOffset * 24;
  const end = start + 24;
  const slice = hourly.slice(start, end);
  if (slice.length === 0) return null;
  let high = -Infinity;
  let low = Infinity;
  for (const h of slice) {
    if (h.temperatureC > high) high = h.temperatureC;
    if (h.temperatureC < low) low = h.temperatureC;
  }
  const middle = slice[Math.floor(slice.length / 2)];
  return {
    date: new Date(slice[0].time),
    high: Math.round(high),
    low: Math.round(low),
    code: middle.weatherCode,
  };
}

export default function WeatherSection({ locationType, driveSeconds }: Props) {
  const { forecast } = useWeather();
  const [open, setOpen] = useState(false);

  const arrival = useMemo(
    () => (forecast ? pickArrivalSnapshot(forecast.hourly, driveSeconds) ?? forecast.current : null),
    [forecast, driveSeconds],
  );

  if (!forecast || !arrival) return null;

  const s = suitability(arrival, locationType);
  const isArrival = driveSeconds != null && driveSeconds > 30 * 60;

  return (
    <section className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
      <div className="flex items-center gap-2">
        {weatherIcon(arrival.weatherCode)}
        <span className="text-sm font-semibold text-gray-900">
          {Math.round(arrival.temperatureC)}°C
        </span>
        <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${ratingColor(s.rating)}`}>
          {s.rating}
        </span>
        <span className="text-xs text-gray-700 truncate">
          {isArrival ? "at arrival · " : ""}{s.reason}
        </span>
      </div>

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 min-h-[36px]"
        aria-expanded={open}
      >
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        Forecast
      </button>

      {open && (
        <div data-testid="forecast-strip" className="mt-2 grid grid-cols-3 gap-2">
          {[0, 1, 2].map((day) => {
            const d = dailySummary(forecast.hourly, day);
            if (!d) return <div key={day} />;
            const noonIdx = day * 24 + 12;
            const sample = forecast.hourly[Math.min(noonIdx, forecast.hourly.length - 1)];
            const dayRating = suitability(sample, locationType);
            return (
              <div key={day} className="text-center bg-white rounded p-2">
                <div className="text-xs text-gray-500">
                  {d.date.toLocaleDateString(undefined, { weekday: "short" })}
                </div>
                <div className="my-1 flex justify-center">{weatherIcon(d.code)}</div>
                <div className="text-xs text-gray-900">
                  {d.high}° / {d.low}°
                </div>
                <span className={`mt-1 inline-block px-1.5 py-0.5 text-[10px] rounded-full capitalize ${ratingColor(dayRating.rating)}`}>
                  {dayRating.rating}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
