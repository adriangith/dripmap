"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, RefreshCw, Sun, CloudRain, Cloud, CloudSnow, Zap } from "lucide-react";
import { useWeather } from "@/lib/weather/useWeather";
import { suitability } from "@/lib/weather/suitability";
import type { LocationType, SuitabilityRating, WeatherSnapshot } from "@/lib/weather/types";

const TYPES: { value: LocationType; label: string }[] = [
  { value: "swimming-hole", label: "Swimming Hole" },
  { value: "splash-pad", label: "Splash Pad" },
  { value: "waterfall", label: "Waterfall" },
  { value: "spring", label: "Spring" },
  { value: "creek", label: "Creek" },
];

function weatherIcon(code: number) {
  if ([0, 1].includes(code)) return <Sun className="w-5 h-5 text-amber-500" />;
  if ([2, 3, 45, 48].includes(code)) return <Cloud className="w-5 h-5 text-gray-500" />;
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return <CloudRain className="w-5 h-5 text-blue-500" />;
  if ([71, 73, 75, 77, 85, 86].includes(code)) return <CloudSnow className="w-5 h-5 text-blue-300" />;
  if ([95, 96, 99].includes(code)) return <Zap className="w-5 h-5 text-amber-600" />;
  return <Cloud className="w-5 h-5 text-gray-500" />;
}

function ratingColor(rating: SuitabilityRating): string {
  switch (rating) {
    case "good": return "bg-emerald-100 text-emerald-800";
    case "fair": return "bg-amber-100 text-amber-800";
    case "poor": return "bg-rose-100 text-rose-800";
  }
}

function ratingDot(rating: SuitabilityRating): string {
  switch (rating) {
    case "good": return "bg-emerald-500";
    case "fair": return "bg-amber-500";
    case "poor": return "bg-rose-500";
  }
}

function summary(current: WeatherSnapshot): string {
  const goodCount = TYPES.filter((t) => suitability(current, t.value).rating === "good").length;
  const fairCount = TYPES.filter((t) => suitability(current, t.value).rating === "fair").length;
  if (goodCount === 0 && fairCount === 0) return "Poor conditions — check details";
  if (goodCount === TYPES.length) return "Great conditions across all activities";
  if (goodCount === 0) return "Mixed conditions today — tap for details";
  if (goodCount >= 3) return `Good conditions for most activities`;
  return `Good conditions for ${goodCount} of ${TYPES.length} activity types`;
}

export default function WeatherBanner() {
  const { forecast, refresh, loading } = useWeather();
  const [expanded, setExpanded] = useState(false);

  if (!forecast) return null;

  const c = forecast.current;
  const Icon = weatherIcon(c.weatherCode);

  return (
    <div className="border-b border-blue-100 bg-blue-50">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left min-h-[44px]"
        aria-expanded={expanded}
        aria-label="Toggle weather details"
      >
        {Icon}
        <span className="text-sm font-medium text-gray-900">
          {Math.round(c.temperatureC)}°C
        </span>
        <span className="text-sm text-gray-700 truncate">· {summary(c)}</span>
        <span className="ml-auto text-gray-500">
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {expanded && (
        <div className="px-3 pb-3">
          <ul className="space-y-1.5">
            {TYPES.map((t) => {
              const s = suitability(c, t.value);
              return (
                <li key={t.value} className="flex items-center gap-2 text-sm">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${ratingDot(s.rating)}`} />
                  <span className="font-medium text-gray-900 w-32">{t.label}</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full capitalize ${ratingColor(s.rating)}`}>
                    {s.rating}
                  </span>
                  <span className="text-xs text-gray-600 truncate">{s.reason}</span>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            onClick={refresh}
            disabled={loading}
            aria-label="Refresh weather"
            className="mt-2 inline-flex items-center gap-1 text-xs text-blue-700 disabled:opacity-50 min-h-[36px]"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      )}
    </div>
  );
}
