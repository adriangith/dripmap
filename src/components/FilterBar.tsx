"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Search } from "lucide-react";
import type { Filters, PlaceType, SiteStatus } from "@/lib/types";

const TYPE_CHIPS: { value: PlaceType; label: string }[] = [
  { value: "swim", label: "Swims" },
  { value: "beach", label: "Beaches" },
  { value: "event", label: "Events" },
  { value: "bushwalk", label: "Bushwalks" },
  { value: "walk", label: "Walks" },
  { value: "lookout", label: "Lookouts" },
  { value: "waterfall", label: "Waterfalls" },
  { value: "cave", label: "Caves" },
  { value: "wildlife", label: "Wildlife" },
  { value: "pool", label: "Pools" },
  { value: "cycling", label: "Cycling" },
  { value: "fishing", label: "Fishing" },
  { value: "eatery", label: "Eateries" },
  { value: "playground", label: "Playgrounds" },
  { value: "museum", label: "Museums" },
];

const STATUS_CHIPS: { value: SiteStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "seasonal", label: "Seasonal" },
];

interface FilterBarProps {
  filters: Filters;
  onChange: (filters: Filters) => void;
  resultCount: number;
  hideSearch?: boolean;
}

export default function FilterBar({
  filters,
  onChange,
  resultCount,
  hideSearch,
}: FilterBarProps) {
  const hasActiveFilters =
    filters.type || filters.siteStatus || filters.search;

  const chipsRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [rowHeight, setRowHeight] = useState<number>(36);
  const [fullHeight, setFullHeight] = useState<number>(36);
  const [isDesktop, setIsDesktop] = useState(false);

  // Always promote active chip to front so it's visible when collapsed
  const orderedTypeChips = useMemo(() => {
    if (!filters.type) return TYPE_CHIPS;
    const active = TYPE_CHIPS.find((c) => c.value === filters.type);
    if (!active) return TYPE_CHIPS;
    return [active, ...TYPE_CHIPS.filter((c) => c.value !== filters.type)];
  }, [filters.type]);

  const orderedStatusChips = useMemo(() => {
    if (!filters.siteStatus) return STATUS_CHIPS;
    const active = STATUS_CHIPS.find((c) => c.value === filters.siteStatus);
    if (!active) return STATUS_CHIPS;
    return [active, ...STATUS_CHIPS.filter((c) => c.value !== filters.siteStatus)];
  }, [filters.siteStatus]);

  // Measure heights without touching inline styles — let React handle rendering
  useEffect(() => {
    const el = chipsRef.current;
    if (!el) return;

    const remeasure = () => {
      const desktop = window.innerWidth >= 768;
      setIsDesktop(desktop);
      if (!desktop) return;

      // Temporarily remove constraints to measure natural full height
      const prev = el.style.cssText;
      el.style.maxHeight = "none";
      el.style.overflow = "visible";
      const full = el.scrollHeight;

      // Measure single-row height from first chip
      const firstChip = el.querySelector("button") as HTMLElement | null;
      const py = parseFloat(getComputedStyle(el).paddingTop) || 0;
      const single = firstChip ? firstChip.offsetHeight + py * 2 : 36;

      // Restore previous styles before React re-renders
      el.style.cssText = prev;

      setRowHeight(single);
      setFullHeight(full);
    };

    remeasure();
    window.addEventListener("resize", remeasure);
    return () => window.removeEventListener("resize", remeasure);
  }, [filters, hasActiveFilters]);

  const handleMouseEnter = useCallback(() => {
    if (window.innerWidth < 768) return;
    setCollapsed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (window.innerWidth < 768) return;
    setCollapsed(true);
  }, []);

  // Only apply collapse styles on desktop
  const chipsStyle: React.CSSProperties = isDesktop
    ? {
        maxHeight: collapsed ? `${rowHeight}px` : `${fullHeight}px`,
        overflow: "hidden",
        transition: "max-height 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }
    : {};

  return (
    <div
      className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!hideSearch && (
        <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-100 dark:border-gray-800">
          <Search className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
          <input
            type="text"
            placeholder="Search places..."
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            aria-label="Search places"
            className="flex-1 text-base outline-none bg-transparent dark:text-gray-100 dark:placeholder:text-gray-500"
          />
        </div>
      )}
      <div
        ref={chipsRef}
        className="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide md:flex-wrap md:overflow-x-visible"
        style={chipsStyle}
      >
        {orderedTypeChips.map((chip) => {
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
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
              }`}
              data-filter-chip={chip.value}
            >
              {chip.label}
            </button>
          );
        })}

        <div className="w-px h-5 bg-gray-200 dark:bg-gray-700 shrink-0" />

        {orderedStatusChips.map((chip) => {
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
                  : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
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
                siteStatus: null,
                search: "",
              })
            }
            className="shrink-0 px-3 py-1 text-sm rounded-full border border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
            data-filter-chip="clear"
          >
            Clear all
          </button>
        )}

        <span className="text-xs text-gray-500 dark:text-gray-400 ml-auto whitespace-nowrap shrink-0">
          {resultCount} place{resultCount !== 1 ? "s" : ""}
        </span>
      </div>
    </div>
  );
}
