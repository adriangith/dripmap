"use client";

import { Search } from "lucide-react";
import type { Filters, LocationType, SiteStatus } from "@/lib/types";

const TYPE_CHIPS: { value: LocationType; label: string }[] = [
  { value: "waterfall", label: "Waterfall" },
  { value: "swimming-hole", label: "Swimming Hole" },
  { value: "splash-pad", label: "Splash Pad" },
  { value: "spring", label: "Spring" },
  { value: "creek", label: "Creek" },
];

const STATUS_CHIPS: { value: SiteStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "seasonal", label: "Seasonal" },
];

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  resultCount: number;
}

export default function FilterBar({
  filters,
  onChange,
  resultCount,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.type || filters.siteStatus || filters.search;

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
        <Search className="w-4 h-4 text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Search locations..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          aria-label="Search locations"
          className="flex-1 text-sm outline-none bg-transparent"
        />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
        {TYPE_CHIPS.map((chip) => {
          const isActive = filters.type === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() =>
                onChange({
                  ...filters,
                  type: isActive ? null : chip.value,
                })
              }
              className={`shrink-0 px-3 py-1 text-sm rounded-full border transition-colors ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
              data-filter-chip={chip.value}
            >
              {chip.label}
            </button>
          );
        })}

        <div className="w-px h-5 bg-gray-200 shrink-0" />

        {STATUS_CHIPS.map((chip) => {
          const isActive = filters.siteStatus === chip.value;
          return (
            <button
              key={chip.value}
              onClick={() =>
                onChange({
                  ...filters,
                  siteStatus: isActive ? null : chip.value,
                })
              }
              className={`shrink-0 px-3 py-1 text-sm rounded-full border transition-colors ${
                isActive
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
              }`}
              data-filter-chip={chip.value}
            >
              {chip.label}
            </button>
          );
        })}

        {hasActiveFilters && (
          <button
            onClick={() =>
              onChange({
                type: null,
                accessibility: null,
                season: null,
                cost: null,
                siteStatus: null,
                search: "",
              })
            }
            className="shrink-0 px-3 py-1 text-sm rounded-full border border-gray-300 text-blue-600 hover:bg-blue-50 transition-colors"
            data-filter-chip="clear"
          >
            Clear all
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto whitespace-nowrap shrink-0">
          {resultCount} location{resultCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
