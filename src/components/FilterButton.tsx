"use client";

import { SlidersHorizontal } from "lucide-react";
import { generateSentence, activeFilterCount } from "@/lib/sentence";
import { getForecastForPlace } from "@/lib/weather";
import type { Filters, Constraints } from "@/lib/types";
import type { EnrichmentIndex, DayForecast } from "@/lib/integrations/enrichment-types";

interface FilterButtonProps {
  filters: Filters;
  constraints: Constraints;
  onClick: () => void;
  enrichments?: EnrichmentIndex | null;
}

export default function FilterButton({ filters, constraints, onClick, enrichments }: FilterButtonProps) {
  const count = activeFilterCount(filters, constraints);

  // Pick a representative forecast (first enriched location) for the sentence preamble
  let forecast: DayForecast | null = null;
  if (enrichments) {
    const firstSlug = Object.keys(enrichments).find((k) => enrichments[k]?.forecast?.length);
    if (firstSlug) forecast = getForecastForPlace(firstSlug, enrichments);
  }

  const sentence = generateSentence(filters, constraints, forecast);

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 backdrop-blur-md bg-white/85 dark:bg-gray-900/85
                 rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/60
                 px-3 py-2 transition-all hover:shadow-xl active:scale-[0.98]"
    >
      <div className="relative">
        <SlidersHorizontal className="w-4 h-4 text-gray-600 dark:text-gray-300" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {count}
          </span>
        )}
      </div>
      <span className="text-sm text-gray-700 dark:text-gray-300 max-w-[240px] truncate">
        {sentence}
      </span>
    </button>
  );
}
