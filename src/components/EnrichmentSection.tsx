"use client";

import { useEnrichments } from "@/lib/integrations/use-enrichments";
import WeatherForecast from "./WeatherForecast";

interface EnrichmentSectionProps {
  slug: string;
  /** Facilities already defined in YAML, so we can show only extras from OSM */
  existingFacilities?: string[];
}

export default function EnrichmentSection({
  slug,
  existingFacilities = [],
}: EnrichmentSectionProps) {
  const enrichments = useEnrichments();
  const data = enrichments[slug];

  if (!data) return null;

  const existingSet = new Set(existingFacilities.map((f) => f.toLowerCase()));
  const extraFacilities = (data.facilities ?? []).filter(
    (f) => !existingSet.has(f.toLowerCase())
  );

  const hasWeather = data.forecast && data.forecast.length > 0;
  const hasExtraFacilities = extraFacilities.length > 0;
  const hasWarnings = data.warnings && data.warnings.length > 0;

  if (!hasWeather && !hasExtraFacilities && !hasWarnings) return null;

  return (
    <>
      {/* Warnings */}
      {hasWarnings && (
        <section className="mb-4">
          {data.warnings!.map((warning, i) => (
            <div
              key={i}
              className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg mb-2"
            >
              <span className="text-amber-600 dark:text-amber-400 shrink-0">
                ⚠️
              </span>
              <p className="text-sm text-amber-800 dark:text-amber-300">
                {warning}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Weather forecast */}
      {hasWeather && (
        <WeatherForecast
          forecast={data.forecast!}
          areaName={data.forecastArea}
        />
      )}

      {/* Extra facilities discovered from OpenStreetMap */}
      {hasExtraFacilities && (
        <section className="mb-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Nearby (via OpenStreetMap)
          </p>
          <div className="flex flex-wrap gap-1">
            {extraFacilities.map((f) => (
              <span
                key={f}
                className="px-2 py-0.5 text-xs bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded capitalize"
              >
                {f.replaceAll("-", " ")}
              </span>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
