"use client";

import { Search, X } from "lucide-react";
import type { Filters, LocationType, SiteStatus } from "@/lib/types";

const TYPE_OPTIONS: { value: LocationType; label: string }[] = [
  { value: "waterfall", label: "Waterfall" },
  { value: "swimming-hole", label: "Swimming Hole" },
  { value: "splash-pad", label: "Splash Pad" },
  { value: "spring", label: "Spring" },
  { value: "creek", label: "Creek" },
];

const STATUS_OPTIONS: { value: SiteStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "seasonal", label: "Seasonal" },
];

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  resultCount: number;
  showSearch: boolean;
  onToggleSearch: () => void;
}

export default function FilterBar({
  filters,
  onChange,
  resultCount,
  showSearch,
  onToggleSearch,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.type || filters.siteStatus || filters.search;

  return (
    <div className="border-b border-gray-200 bg-white">
      {showSearch && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Search locations..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            className="flex-1 text-sm outline-none bg-transparent"
            autoFocus
          />
          <button
            onClick={onToggleSearch}
            className="p-1 text-gray-400 hover:text-gray-600"
            aria-label="Close search"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2 overflow-x-auto">
        <select
          value={filters.type ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              type: (e.target.value as LocationType) || null,
            })
          }
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
        >
          <option value="">All Types</option>
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <select
          value={filters.siteStatus ?? ""}
          onChange={(e) =>
            onChange({
              ...filters,
              siteStatus: (e.target.value as SiteStatus) || null,
            })
          }
          className="text-sm border border-gray-300 rounded-md px-2 py-1 bg-white"
        >
          <option value="">Any Status</option>
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

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
            className="text-xs text-blue-600 hover:text-blue-800 whitespace-nowrap"
          >
            Clear all
          </button>
        )}

        <span className="text-xs text-gray-500 ml-auto whitespace-nowrap">
          {resultCount} location{resultCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
