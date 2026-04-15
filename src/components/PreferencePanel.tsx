"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  GripVertical,
  Navigation,
  Calendar,
  DollarSign,
  Clock,
  Users,
  X,
  ChevronDown,
  CircleCheck,
} from "lucide-react";
import type {
  Filters,
  Constraints,
  FilterDimension,
  DistanceThreshold,
  CostFilter,
  DurationFilter,
  GroupType,
  DateMode,
  VisitedFilter,
} from "@/lib/types";

// ── Dimension metadata ──────────────────────────────────────

interface DimensionMeta {
  key: FilterDimension;
  icon: React.ElementType;
  label: string;
}

const DIMENSIONS: DimensionMeta[] = [
  { key: "distance", icon: Navigation, label: "Distance" },
  { key: "date", icon: Calendar, label: "When" },
  { key: "cost", icon: DollarSign, label: "Budget" },
  { key: "duration", icon: Clock, label: "Duration" },
  { key: "group", icon: Users, label: "Who" },
  { key: "familiarity", icon: CircleCheck, label: "Familiarity" },
];

// ── Value options ───────────────────────────────────────────

const DISTANCE_OPTIONS: { value: DistanceThreshold; label: string }[] = [
  { value: "30min", label: "Close by" },
  { value: "1hr", label: "Within an hour" },
  { value: "2hr", label: "Within 2 hours" },
  { value: "daytrip", label: "Day trip" },
];

const COST_OPTIONS: { value: CostFilter; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "affordable", label: "Affordable" },
];

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: "quick", label: "Quick visit" },
  { value: "half-day", label: "Half day" },
  { value: "full-day", label: "Full day" },
];

const GROUP_OPTIONS: { value: GroupType; label: string }[] = [
  { value: "solo", label: "Solo" },
  { value: "adults", label: "Adults" },
  { value: "family-young", label: "Little kids" },
  { value: "family-older", label: "Older kids" },
  { value: "friends", label: "Friends" },
];

const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const VISITED_OPTIONS: { value: VisitedFilter; label: string }[] = [
  { value: "new", label: "Somewhere new" },
  { value: "familiar", label: "Somewhere familiar" },
];

// ── Helpers ─────────────────────────────────────────────────

function getValueLabel(dim: FilterDimension, filters: Filters, constraints: Constraints): string {
  switch (dim) {
    case "distance":
      return constraints.distance === "any"
        ? "Flexible"
        : DISTANCE_OPTIONS.find((o) => o.value === constraints.distance)?.label ?? "Flexible";
    case "date": {
      const d = constraints.date;
      if (!d) return "Flexible";
      if (d.mode === "specific") {
        return d.date.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
      }
      if (d.days.length === 2 && d.days.includes(0) && d.days.includes(6)) return "Weekends";
      if (d.days.length === 5 && !d.days.includes(0) && !d.days.includes(6)) return "Weekdays";
      return d.days.map((n) => DAY_LABELS[n]).join(", ");
    }
    case "cost":
      return constraints.cost === "any"
        ? "Flexible"
        : COST_OPTIONS.find((o) => o.value === constraints.cost)?.label ?? "Flexible";
    case "duration":
      return constraints.duration === "any"
        ? "Flexible"
        : DURATION_OPTIONS.find((o) => o.value === constraints.duration)?.label ?? "Flexible";
    case "group":
      return constraints.group === null
        ? "Flexible"
        : GROUP_OPTIONS.find((o) => o.value === constraints.group)?.label ?? "Flexible";
    case "familiarity":
      return constraints.visited === "any"
        ? "Flexible"
        : VISITED_OPTIONS.find((o) => o.value === constraints.visited)?.label ?? "Flexible";
  }
}

function isActive(dim: FilterDimension, filters: Filters, constraints: Constraints): boolean {
  switch (dim) {
    case "distance": return constraints.distance !== "any";
    case "date": return constraints.date !== null;
    case "cost": return constraints.cost !== "any";
    case "duration": return constraints.duration !== "any";
    case "group": return constraints.group !== null;
    case "familiarity": return constraints.visited !== "any";
  }
}

// ── Value picker inline ─────────────────────────────────────

function ValuePicker({
  dimension,
  filters,
  constraints,
  onFiltersChange,
  onConstraintsChange,
  hasLocation,
  onRequestLocation,
}: {
  dimension: FilterDimension;
  filters: Filters;
  constraints: Constraints;
  onFiltersChange: (f: Filters) => void;
  onConstraintsChange: (c: Constraints) => void;
  hasLocation: boolean;
  onRequestLocation: () => void;
}) {
  switch (dimension) {
    case "distance":
      return (
        <div className="flex flex-wrap gap-1.5">
          {DISTANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                const next = constraints.distance === opt.value ? "any" : opt.value;
                if (next !== "any" && !hasLocation) onRequestLocation();
                onConstraintsChange({ ...constraints, distance: next });
              }}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                constraints.distance === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    case "cost":
      return (
        <div className="flex flex-wrap gap-1.5">
          {COST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onConstraintsChange({ ...constraints, cost: constraints.cost === opt.value ? "any" : opt.value })}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                constraints.cost === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    case "duration":
      return (
        <div className="flex flex-wrap gap-1.5">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onConstraintsChange({ ...constraints, duration: constraints.duration === opt.value ? "any" : opt.value })}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                constraints.duration === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    case "group":
      return (
        <div className="flex flex-wrap gap-1.5">
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.value ?? "any"}
              onClick={() => onConstraintsChange({ ...constraints, group: constraints.group === opt.value ? null : opt.value })}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                constraints.group === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
    case "date": {
      const isWeekends =
        constraints.date?.mode === "recurring" &&
        constraints.date.days.length === 2 &&
        constraints.date.days.includes(0) &&
        constraints.date.days.includes(6);
      const isWeekdays =
        constraints.date?.mode === "recurring" &&
        constraints.date.days.length === 5 &&
        !constraints.date.days.includes(0) &&
        !constraints.date.days.includes(6);
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() =>
                onConstraintsChange({
                  ...constraints,
                  date: isWeekends ? null : { mode: "recurring", days: [0, 6] },
                })
              }
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                isWeekends
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300"
              }`}
            >
              Weekends
            </button>
            <button
              onClick={() =>
                onConstraintsChange({
                  ...constraints,
                  date: isWeekdays ? null : { mode: "recurring", days: [1, 2, 3, 4, 5] },
                })
              }
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                isWeekdays
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300"
              }`}
            >
              Weekdays
            </button>
          </div>
          <div className="flex gap-1">
            {DAY_LABELS.map((label, i) => {
              const active =
                constraints.date?.mode === "recurring" && constraints.date.days.includes(i);
              return (
                <button
                  key={label}
                  onClick={() => {
                    const current =
                      constraints.date?.mode === "recurring" ? constraints.date.days : [];
                    const next = active
                      ? current.filter((d) => d !== i)
                      : [...current, i].sort();
                    onConstraintsChange({
                      ...constraints,
                      date: next.length > 0 ? { mode: "recurring", days: next } : null,
                    });
                  }}
                  className={`w-8 h-8 text-xs rounded-full border transition-colors ${
                    active
                      ? "bg-blue-600 text-white border-blue-600"
                      : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <input
            type="date"
            onChange={(e) => {
              if (e.target.value) {
                onConstraintsChange({
                  ...constraints,
                  date: { mode: "specific", date: new Date(e.target.value + "T00:00:00") },
                });
              }
            }}
            className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5"
          />
          <div className="pt-1">
            <p className="text-xs text-gray-400 mb-1">Time of day</p>
            <div className="flex gap-1.5">
              <button
                onClick={() => onConstraintsChange({ ...constraints, timeOfDay: constraints.timeOfDay === "day" ? null : "day" })}
                className={`flex-1 px-2.5 py-1 text-xs rounded-full border transition-colors flex items-center justify-center gap-1 ${
                  constraints.timeOfDay === "day"
                    ? "bg-amber-500 text-white border-amber-500"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-amber-300"
                }`}
              >
                ☀️ Daytime
              </button>
              <button
                onClick={() => onConstraintsChange({ ...constraints, timeOfDay: constraints.timeOfDay === "evening" ? null : "evening" })}
                className={`flex-1 px-2.5 py-1 text-xs rounded-full border transition-colors flex items-center justify-center gap-1 ${
                  constraints.timeOfDay === "evening"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300"
                }`}
              >
                🌙 Evening
              </button>
            </div>
          </div>
        </div>
      );
    }
    case "familiarity":
      return (
        <div className="flex flex-wrap gap-1.5">
          {VISITED_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onConstraintsChange({ ...constraints, visited: constraints.visited === opt.value ? "any" : opt.value })}
              className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                constraints.visited === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-blue-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      );
  }
}
// ── Draggable preference card ───────────────────────────────

function PreferenceCard({
  dimension,
  index,
  filters,
  constraints,
  onFiltersChange,
  onConstraintsChange,
  hasLocation,
  onRequestLocation,
  expanded,
  onToggleExpand,
  onDragStart,
  dragOver,
  isDragging,
}: {
  dimension: DimensionMeta;
  index: number;
  filters: Filters;
  constraints: Constraints;
  onFiltersChange: (f: Filters) => void;
  onConstraintsChange: (c: Constraints) => void;
  hasLocation: boolean;
  onRequestLocation: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  onDragStart: (index: number, e: React.PointerEvent) => void;
  dragOver: boolean;
  isDragging: boolean;
}) {
  const active = isActive(dimension.key, filters, constraints);
  const valueLabel = getValueLabel(dimension.key, filters, constraints);
  const Icon = dimension.icon;

  return (
    <div
      className={`rounded-xl border transition-all duration-150 ${
        isDragging
          ? "opacity-50 scale-95"
          : dragOver
            ? "border-blue-400 dark:border-blue-500 shadow-[var(--shadow-md)]"
            : active
              ? "border-blue-200 dark:border-blue-800 bg-blue-50/40 dark:bg-blue-950/20 shadow-[var(--shadow-xs)]"
              : "border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-800"
      }`}
      data-dimension={dimension.key}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 cursor-pointer" onClick={onToggleExpand}>
        {/* Drag handle */}
        <button
          className="touch-none cursor-grab active:cursor-grabbing p-1 -ml-1 text-gray-300 dark:text-gray-600 hover:text-gray-500"
          onPointerDown={(e) => onDragStart(index, e)}
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="w-4 h-4" />
        </button>

        {/* Priority badge */}
        <span
          className={`w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0 ${
            active
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500"
          }`}
        >
          {index + 1}
        </span>

        {/* Icon + label */}
        <Icon
          className={`w-4 h-4 shrink-0 ${
            active ? "text-blue-600 dark:text-blue-400" : "text-gray-400 dark:text-gray-500"
          }`}
        />
        <span
          className={`text-sm font-medium ${
            active ? "text-gray-900 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"
          }`}
        >
          {dimension.label}
        </span>

        {/* Current value */}
        <span
          className={`text-sm ml-auto ${
            active ? "text-blue-600 dark:text-blue-400 font-medium" : "text-gray-400 dark:text-gray-500"
          }`}
        >
          {valueLabel}
        </span>

        {/* Expand chevron */}
        <div className="p-1 -mr-1">
          <ChevronDown
            className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Expanded value picker */}
      {expanded && (
        <div className="px-3 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700">
          <ValuePicker
            dimension={dimension.key}
            filters={filters}
            constraints={constraints}
            onFiltersChange={onFiltersChange}
            onConstraintsChange={onConstraintsChange}
            hasLocation={hasLocation}
            onRequestLocation={onRequestLocation}
          />
        </div>
      )}
    </div>
  );
}

// ── Main panel component ────────────────────────────────────

interface PreferencePanelProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  constraints: Constraints;
  onFiltersChange: (f: Filters) => void;
  onConstraintsChange: (c: Constraints) => void;
  hasLocation: boolean;
  onRequestLocation: () => void;
}

export default function PreferencePanel({
  open,
  onClose,
  filters,
  constraints,
  onFiltersChange,
  onConstraintsChange,
  hasLocation,
  onRequestLocation,
}: PreferencePanelProps) {
  const [expandedDim, setExpandedDim] = useState<FilterDimension | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRects = useRef<DOMRect[]>([]);

  const priority = constraints.priority;

  const orderedDimensions = priority.map(
    (key) => DIMENSIONS.find((d) => d.key === key)!,
  );

  // Reorder handler
  const reorder = useCallback(
    (fromIdx: number, toIdx: number) => {
      if (fromIdx === toIdx) return;
      const next = [...priority];
      const [moved] = next.splice(fromIdx, 1);
      next.splice(toIdx, 0, moved);
      onConstraintsChange({ ...constraints, priority: next });
    },
    [priority, constraints, onConstraintsChange],
  );

  // Drag handlers using pointer events
  const handleDragStart = useCallback(
    (index: number, e: React.PointerEvent) => {
      e.preventDefault();
      setDragIndex(index);
      setExpandedDim(null);

      // Capture card positions
      if (containerRef.current) {
        const cards = containerRef.current.querySelectorAll("[data-dimension]");
        cardRects.current = Array.from(cards).map((el) => el.getBoundingClientRect());
      }

      const startY = e.clientY;

      const onMove = (ev: PointerEvent) => {
        const dy = ev.clientY - startY;
        // Determine which slot we're over
        const currentRect = cardRects.current[index];
        if (!currentRect) return;
        const centerY = currentRect.top + currentRect.height / 2 + dy;
        let newOver = index;
        for (let i = 0; i < cardRects.current.length; i++) {
          const r = cardRects.current[i];
          if (centerY >= r.top && centerY <= r.bottom) {
            newOver = i;
            break;
          }
        }
        setOverIndex(newOver);
      };

      const onUp = () => {
        setOverIndex((current) => {
          if (current !== null && current !== index) {
            reorder(index, current);
          }
          return null;
        });
        setDragIndex(null);
        document.removeEventListener("pointermove", onMove);
        document.removeEventListener("pointerup", onUp);
      };

      document.addEventListener("pointermove", onMove);
      document.addEventListener("pointerup", onUp);
    },
    [reorder],
  );

  // Close on escape
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [open, onClose]);

    const activeCount = orderedDimensions.filter((d) => isActive(d.key, filters, constraints)).length;

  const handleReset = useCallback(() => {
    onConstraintsChange({
      distance: "any",
      date: null,
      timeOfDay: null,
      cost: "any",
      duration: "any",
      group: null,
      visited: "any",
      priority: [...constraints.priority],
    });
  }, [filters, constraints, onFiltersChange, onConstraintsChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-end lg:items-center lg:justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/25 dark:bg-black/50 backdrop-blur-[2px]" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full lg:w-[400px] max-h-[85vh] bg-white dark:bg-gray-900 rounded-t-2xl lg:rounded-2xl shadow-[var(--shadow-xl)] flex flex-col overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800/80">
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Preferences
          </h2>
          <div className="flex items-center gap-3">
            {activeCount > 0 && (
              <button
                onClick={handleReset}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Reset
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Drag hint */}
        <p className="text-xs text-gray-400 dark:text-gray-500 px-4 pt-2 pb-1">
          Drag to reorder by importance
        </p>

        {/* Cards */}
        <div ref={containerRef} className="flex-1 overflow-y-auto px-3 pb-4 space-y-2">
          {orderedDimensions.map((dim, i) => (
            <PreferenceCard
              key={dim.key}
              dimension={dim}
              index={i}
              filters={filters}
              constraints={constraints}
              onFiltersChange={onFiltersChange}
              onConstraintsChange={onConstraintsChange}
              hasLocation={hasLocation}
              onRequestLocation={onRequestLocation}
              expanded={expandedDim === dim.key}
              onToggleExpand={() =>
                setExpandedDim((cur) => (cur === dim.key ? null : dim.key))
              }
              onDragStart={handleDragStart}
              dragOver={overIndex === i && dragIndex !== i}
              isDragging={dragIndex === i}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
