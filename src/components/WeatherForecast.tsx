"use client";

import type { DayForecast } from "@/lib/integrations/enrichment-types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(iso: string): { day: string; date: string } {
  const d = new Date(iso + "T00:00:00");
  return {
    day: DAY_NAMES[d.getDay()],
    date: `${d.getDate()}/${d.getMonth() + 1}`,
  };
}

function weatherEmoji(precis: string): string {
  const p = precis.toLowerCase();
  if (p.includes("storm") || p.includes("thunder")) return "⛈️";
  if (p.includes("rain") || p.includes("shower")) return "🌧️";
  if (p.includes("cloud") && p.includes("sun")) return "⛅";
  if (p.includes("cloud") || p.includes("overcast")) return "☁️";
  if (p.includes("fog") || p.includes("haz")) return "🌫️";
  if (p.includes("wind")) return "💨";
  if (p.includes("snow")) return "❄️";
  return "☀️";
}

interface WeatherForecastProps {
  forecast: DayForecast[];
  areaName?: string;
}

export default function WeatherForecast({
  forecast,
  areaName,
}: WeatherForecastProps) {
  if (forecast.length === 0) return null;

  return (
    <section className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-base">🌤️</span>
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Weather Forecast
        </h3>
        {areaName && (
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {areaName}
          </span>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {forecast.map((day, i) => {
          const { day: dayName, date } = formatDate(day.date);
          const isToday = i === 0;
          return (
            <div
              key={day.date}
              className={`flex-shrink-0 w-[72px] rounded-lg border p-2 text-center ${
                isToday
                  ? "border-blue-300 dark:border-blue-600 bg-blue-50 dark:bg-blue-950"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
              }`}
            >
              <p
                className={`text-xs font-medium ${
                  isToday
                    ? "text-blue-700 dark:text-blue-300"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {isToday ? "Today" : dayName}
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500">
                {date}
              </p>
              <p className="text-xl my-1" title={day.precis}>
                {weatherEmoji(day.precis)}
              </p>
              <div className="flex justify-center gap-1 text-xs">
                {day.min != null && (
                  <span className="text-blue-500 dark:text-blue-400">
                    {day.min}°
                  </span>
                )}
                {day.max != null && (
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {day.max}°
                  </span>
                )}
              </div>
              {day.precipitation && (
                <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-0.5">
                  💧 {day.precipitation}
                </p>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
        Source: Bureau of Meteorology
      </p>
    </section>
  );
}
