"use client";

import { useEnrichments } from "@/lib/integrations/use-enrichments";
import WeatherForecast from "./WeatherForecast";

interface EnrichmentSectionProps {
  slug: string;
  /** Facilities already defined in YAML, so we can show only extras from OSM */
  existingFacilities?: string[];
}

const PRICE_LABELS = ["", "$", "$$", "$$$", "$$$$"];

function FoursquareRatingBadge({ rating }: { rating: number }) {
  const color =
    rating >= 8
      ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300"
      : rating >= 6
        ? "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
        : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300";

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded ${color}`}>
      ★ {rating.toFixed(1)}
    </span>
  );
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
  const hasFsqRating = data.fsqRating != null;
  const hasFsqPrice = data.fsqPrice != null;
  const hasFsqTips = data.fsqTips && data.fsqTips.length > 0;
  const hasFsqPhotos = data.fsqPhotos && data.fsqPhotos.length > 0;
  const hasFoursquare = hasFsqRating || hasFsqPrice || hasFsqTips || hasFsqPhotos;

  if (!hasWeather && !hasExtraFacilities && !hasWarnings && !hasFoursquare) return null;

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

      {/* Foursquare venue info */}
      {hasFoursquare && (
        <section className="mb-4">
          {(hasFsqRating || hasFsqPrice) && (
            <div className="flex items-center gap-2 mb-2">
              {hasFsqRating && <FoursquareRatingBadge rating={data.fsqRating!} />}
              {hasFsqPrice && (
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {PRICE_LABELS[data.fsqPrice!] || ""}
                </span>
              )}
              <span className="text-xs text-gray-400 dark:text-gray-500">
                via Foursquare
              </span>
            </div>
          )}

          {hasFsqPhotos && (
            <div className="flex gap-2 overflow-x-auto pb-2 mb-2">
              {data.fsqPhotos!.map((photo, i) => (
                <img
                  key={i}
                  src={photo.url}
                  alt={`Venue photo ${i + 1}`}
                  className="w-28 h-20 object-cover rounded-lg shrink-0"
                  loading="lazy"
                />
              ))}
            </div>
          )}

          {hasFsqTips && (
            <div className="space-y-1.5">
              {data.fsqTips!.map((tip, i) => (
                <p
                  key={i}
                  className="text-sm text-gray-600 dark:text-gray-400 italic pl-3 border-l-2 border-gray-200 dark:border-gray-700"
                >
                  &ldquo;{tip}&rdquo;
                </p>
              ))}
            </div>
          )}
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
