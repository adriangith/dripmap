"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type {
  Constraints,
  DistanceThreshold,
  CostFilter,
  DurationFilter,
  GroupType,
  DateMode,
  PlaceType,
  Filters,
} from "@/lib/types";

// ── Token label maps ─────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  swim: "swims",
  beach: "beaches",
  event: "events",
  bushwalk: "bushwalks",
  lookout: "lookouts",
  waterfall: "waterfalls",
  cave: "caves",
  wildlife: "wildlife",
  pool: "pools",
  cycling: "cycling",
  fishing: "fishing",
};

const TYPE_OPTIONS: { value: PlaceType | null; label: string }[] = [
  { value: null, label: "anything" },
  { value: "swim", label: "swims" },
  { value: "beach", label: "beaches" },
  { value: "event", label: "events" },
  { value: "bushwalk", label: "bushwalks" },
  { value: "lookout", label: "lookouts" },
  { value: "waterfall", label: "waterfalls" },
  { value: "cave", label: "caves" },
  { value: "wildlife", label: "wildlife" },
  { value: "pool", label: "pools" },
  { value: "cycling", label: "cycling" },
  { value: "fishing", label: "fishing" },
];

const DISTANCE_LABELS: Record<DistanceThreshold, string> = {
  "30min": "close by",
  "1hr": "within an hour",
  "2hr": "within 2 hours",
  daytrip: "a day trip away",
  any: "anywhere",
};

const DISTANCE_OPTIONS: { value: DistanceThreshold; label: string }[] = [
  { value: "any", label: "anywhere" },
  { value: "30min", label: "close by" },
  { value: "1hr", label: "within an hour" },
  { value: "2hr", label: "within 2 hours" },
  { value: "daytrip", label: "a day trip away" },
];

const COST_LABELS: Record<CostFilter, string> = {
  free: "free",
  "free-$": "cheap",
  "$$-under": "budget-friendly",
  any: "any budget",
};

const COST_OPTIONS: { value: CostFilter; label: string }[] = [
  { value: "any", label: "any budget" },
  { value: "free", label: "free" },
  { value: "free-$", label: "cheap" },
  { value: "$$-under", label: "budget-friendly" },
];

const DURATION_LABELS: Record<DurationFilter, string> = {
  quick: "a quick visit",
  "half-day": "a few hours",
  "full-day": "all day",
  any: "any length",
};

const DURATION_OPTIONS: { value: DurationFilter; label: string }[] = [
  { value: "any", label: "any length" },
  { value: "quick", label: "a quick visit" },
  { value: "half-day", label: "a few hours" },
  { value: "full-day", label: "all day" },
];

const GROUP_LABELS: Record<string, string> = {
  solo: "myself",
  adults: "adults",
  "family-young": "little kids",
  "family-older": "older kids",
  friends: "friends",
};

const GROUP_OPTIONS: { value: GroupType; label: string }[] = [
  { value: null, label: "anyone" },
  { value: "solo", label: "myself" },
  { value: "adults", label: "adults" },
  { value: "family-young", label: "little kids" },
  { value: "family-older", label: "older kids" },
  { value: "friends", label: "friends" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function dateToLabel(d: DateMode): string {
  if (!d) return "anytime";
  if (d.mode === "specific") {
    return d.date.toLocaleDateString("en-AU", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  if (d.days.length === 0) return "anytime";
  if (d.days.length === 2 && d.days.includes(0) && d.days.includes(6))
    return "on weekends";
  if (d.days.length === 5 && !d.days.includes(0) && !d.days.includes(6))
    return "on weekdays";
  return d.days.map((n) => DAY_LABELS[n]).join(", ");
}

// ── Popover ──────────────────────────────────────────────────

function Popover({
  open,
  onClose,
  children,
  anchorRef,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent | TouchEvent) {
      if (
        ref.current &&
        !ref.current.contains(e.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
                 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-2
                 min-w-[160px] max-w-[280px]"
    >
      {children}
    </div>
  );
}

// ── Tappable token ───────────────────────────────────────────

function Token({
  label,
  active,
  popoverOpen,
  onTap,
  children,
}: {
  label: string;
  active: boolean;
  popoverOpen: boolean;
  onTap: () => void;
  children?: React.ReactNode;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);

  return (
    <span className="relative inline-flex">
      <button
        ref={btnRef}
        onClick={onTap}
        className={`font-semibold transition-colors border-b-2 pb-0.5 ${
          active
            ? "text-blue-700 dark:text-blue-400 border-blue-500 dark:border-blue-400"
            : "text-gray-800 dark:text-gray-200 border-gray-300 dark:border-gray-600 border-dashed"
        } ${popoverOpen ? "text-blue-600 dark:text-blue-400 border-blue-400" : ""}`}
      >
        {label}
      </button>
      {children && (
        <Popover open={popoverOpen} onClose={onTap} anchorRef={btnRef}>
          {children}
        </Popover>
      )}
    </span>
  );
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left text-sm px-3 py-1.5 rounded-lg transition-colors ${
        selected ? "bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-medium" : "hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

// ── Main component ───────────────────────────────────────────

type OpenToken = "type" | "distance" | "date" | "cost" | "duration" | "group" | null;

interface SentenceFilterProps {
  filters: Filters;
  constraints: Constraints;
  onFiltersChange: (filters: Filters) => void;
  onConstraintsChange: (constraints: Constraints) => void;
  hasLocation: boolean;
  onRequestLocation: () => void;
}

export default function SentenceFilter({
  filters,
  constraints,
  onFiltersChange,
  onConstraintsChange,
  hasLocation,
  onRequestLocation,
}: SentenceFilterProps) {
  const [openToken, setOpenToken] = useState<OpenToken>(null);

  const toggle = useCallback(
    (t: OpenToken) => setOpenToken((cur) => (cur === t ? null : t)),
    [],
  );

  const updateConstraint = useCallback(
    (patch: Partial<Constraints>) => {
      onConstraintsChange({ ...constraints, ...patch });
    },
    [constraints, onConstraintsChange],
  );

  // Type label
  const typeLabel = filters.type ? TYPE_LABELS[filters.type] ?? "anything" : "anything";

  // Distance label
  const distLabel = DISTANCE_LABELS[constraints.distance];

  // Date label
  const dtLabel = dateToLabel(constraints.date);

  // Cost label
  const costLbl = COST_LABELS[constraints.cost];

  // Group label
  const groupLbl = constraints.group
    ? GROUP_LABELS[constraints.group] ?? "anyone"
    : "anyone";

  // Is active helpers
  const typeActive = filters.type !== null;
  const distActive = constraints.distance !== "any";
  const dateActive = constraints.date !== null;
  const costActive = constraints.cost !== "any";
  const durActive = constraints.duration !== "any";
  const groupActive = constraints.group !== null;

  return (
    <div
      className="backdrop-blur-md bg-white/80 dark:bg-gray-900/80 rounded-2xl shadow-lg border border-white/60 dark:border-gray-700/60
                 px-4 py-3 text-[15px] leading-relaxed"
    >
      <span className="text-gray-500 dark:text-gray-400">Show me </span>

      {/* Type token */}
      <Token
        label={typeLabel}
        active={typeActive}
        popoverOpen={openToken === "type"}
        onTap={() => toggle("type")}
      >
        <div className="flex flex-col gap-0.5 max-h-[240px] overflow-y-auto">
          {TYPE_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value ?? "any"}
              label={opt.label}
              selected={filters.type === opt.value}
              onClick={() => {
                onFiltersChange({ ...filters, type: opt.value });
                setOpenToken(null);
              }}
            />
          ))}
        </div>
      </Token>

      <span className="text-gray-400"> · </span>

      {/* Distance token */}
      <Token
        label={distLabel}
        active={distActive}
        popoverOpen={openToken === "distance"}
        onTap={() => {
          if (!hasLocation && constraints.distance === "any") {
            onRequestLocation();
          }
          toggle("distance");
        }}
      >
        <div className="flex flex-col gap-0.5">
          {DISTANCE_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={constraints.distance === opt.value}
              onClick={() => {
                if (opt.value !== "any" && !hasLocation) {
                  onRequestLocation();
                }
                updateConstraint({ distance: opt.value });
                setOpenToken(null);
              }}
            />
          ))}
        </div>
      </Token>

      <span className="text-gray-400"> · </span>

      {/* Date token */}
      <Token
        label={dtLabel}
        active={dateActive}
        popoverOpen={openToken === "date"}
        onTap={() => toggle("date")}
      >
        <div className="space-y-2">
          <OptionButton
            label="anytime"
            selected={!constraints.date}
            onClick={() => {
              updateConstraint({ date: null });
              setOpenToken(null);
            }}
          />
          <OptionButton
            label="on weekends"
            selected={
              constraints.date?.mode === "recurring" &&
              constraints.date.days.length === 2 &&
              constraints.date.days.includes(0) &&
              constraints.date.days.includes(6)
            }
            onClick={() => {
              updateConstraint({ date: { mode: "recurring", days: [0, 6] } });
              setOpenToken(null);
            }}
          />
          <OptionButton
            label="on weekdays"
            selected={
              constraints.date?.mode === "recurring" &&
              constraints.date.days.length === 5 &&
              !constraints.date.days.includes(0) &&
              !constraints.date.days.includes(6)
            }
            onClick={() => {
              updateConstraint({
                date: { mode: "recurring", days: [1, 2, 3, 4, 5] },
              });
              setOpenToken(null);
            }}
          />
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2">
            <p className="text-xs text-gray-400 mb-1 px-3">Pick days</p>
            <div className="flex gap-1 px-2">
              {DAY_LABELS.map((label, i) => {
                const isActive =
                  constraints.date?.mode === "recurring" &&
                  constraints.date.days.includes(i);
                return (
                  <button
                    key={label}
                    onClick={() => {
                      const current =
                        constraints.date?.mode === "recurring"
                          ? constraints.date.days
                          : [];
                      const next = isActive
                        ? current.filter((d) => d !== i)
                        : [...current, i].sort();
                      updateConstraint({
                        date:
                          next.length > 0
                            ? { mode: "recurring", days: next }
                            : null,
                      });
                    }}
                    className={`w-7 h-7 text-xs rounded-full border transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:text-gray-300"
                    }`}
                  >
                    {label.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="border-t border-gray-100 dark:border-gray-700 pt-2 px-2">
            <input
              type="date"
              onChange={(e) => {
                if (e.target.value) {
                  updateConstraint({
                    date: {
                      mode: "specific",
                      date: new Date(e.target.value + "T00:00:00"),
                    },
                  });
                  setOpenToken(null);
                }
              }}
              className="w-full text-sm border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 py-1.5"
            />
          </div>
        </div>
      </Token>

      <span className="text-gray-400"> · </span>

      {/* Cost token */}
      <Token
        label={costLbl}
        active={costActive}
        popoverOpen={openToken === "cost"}
        onTap={() => toggle("cost")}
      >
        <div className="flex flex-col gap-0.5">
          {COST_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={constraints.cost === opt.value}
              onClick={() => {
                updateConstraint({ cost: opt.value });
                setOpenToken(null);
              }}
            />
          ))}
        </div>
      </Token>

      <span className="text-gray-400"> · </span>

      {/* Duration token */}
      <Token
        label={DURATION_LABELS[constraints.duration]}
        active={durActive}
        popoverOpen={openToken === "duration"}
        onTap={() => toggle("duration")}
      >
        <div className="flex flex-col gap-0.5">
          {DURATION_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value}
              label={opt.label}
              selected={constraints.duration === opt.value}
              onClick={() => {
                updateConstraint({ duration: opt.value });
                setOpenToken(null);
              }}
            />
          ))}
        </div>
      </Token>

      <span className="text-gray-400"> · </span>

      {/* Group token */}
      <Token
        label={groupLbl === "anyone" ? `for ${groupLbl}` : `with ${groupLbl}`}
        active={groupActive}
        popoverOpen={openToken === "group"}
        onTap={() => toggle("group")}
      >
        <div className="flex flex-col gap-0.5">
          {GROUP_OPTIONS.map((opt) => (
            <OptionButton
              key={opt.value ?? "any"}
              label={
                opt.value === null
                  ? "for anyone"
                  : opt.value === "solo"
                    ? "by myself"
                    : `with ${opt.label}`
              }
              selected={constraints.group === opt.value}
              onClick={() => {
                updateConstraint({ group: opt.value });
                setOpenToken(null);
              }}
            />
          ))}
        </div>
      </Token>
    </div>
  );
}
