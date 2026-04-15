"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MapPin, Clock, CalendarDays, DollarSign, Users } from "lucide-react";
import type { Constraints, DistanceThreshold, CostFilter, GroupType, DateMode } from "@/lib/types";

interface ContextBarProps {
  constraints: Constraints;
  onConstraintsChange: (constraints: Constraints) => void;
  hasLocation: boolean;
  onRequestLocation: () => void;
}

// ── Chip label helpers ───────────────────────────────────────

const DISTANCE_OPTIONS: { value: DistanceThreshold; label: string }[] = [
  { value: "30min", label: "< 30 min" },
  { value: "1hr", label: "< 1 hr" },
  { value: "2hr", label: "< 2 hrs" },
  { value: "daytrip", label: "Day trip" },
  { value: "any", label: "Any distance" },
];

const COST_OPTIONS: { value: CostFilter; label: string }[] = [
  { value: "free", label: "Free only" },
  { value: "affordable", label: "Affordable" },
  { value: "any", label: "Any cost" },
];

const GROUP_OPTIONS: { value: NonNullable<GroupType>; label: string; emoji: string }[] = [
  { value: "solo", label: "Solo", emoji: "🧍" },
  { value: "adults", label: "Adults", emoji: "👫" },
  { value: "family-young", label: "Family (young kids)", emoji: "👨‍👩‍👧" },
  { value: "family-older", label: "Family (older kids)", emoji: "👨‍👩‍👦‍👦" },
  { value: "friends", label: "Friends", emoji: "👥" },
];

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const QUICK_PICKS = [
  { label: "This weekend", days: [0, 6] },
  { label: "Weekdays", days: [1, 2, 3, 4, 5] },
  { label: "Any day", days: [] as number[] },
];

function distanceLabel(d: DistanceThreshold): string {
  return DISTANCE_OPTIONS.find((o) => o.value === d)?.label ?? "Distance";
}

function costLabel(c: CostFilter): string {
  if (c === "any") return "Cost";
  return COST_OPTIONS.find((o) => o.value === c)?.label ?? "Cost";
}

function groupLabel(g: GroupType): string {
  if (!g) return "Group";
  const opt = GROUP_OPTIONS.find((o) => o.value === g);
  return opt ? `${opt.emoji} ${opt.label}` : "Group";
}

function dateLabel(d: DateMode): string {
  if (!d) return "Date";
  if (d.mode === "specific") {
    return d.date.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
  }
  if (d.days.length === 0) return "Date";
  if (d.days.length === 2 && d.days.includes(0) && d.days.includes(6)) return "Weekends";
  if (d.days.length === 5 && !d.days.includes(0) && !d.days.includes(6)) return "Weekdays";
  return d.days.map((n) => DAY_LABELS[n]).join(", ");
}

// ── Popover wrapper (renders below chip scroll area) ─────────

function PopoverPanel({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("touchstart", handleClick);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      ref={ref}
      className="relative z-50 bg-white dark:bg-gray-800 rounded-xl shadow-[var(--shadow-lg)] border border-gray-200/80 dark:border-gray-700/60 p-3 mx-3 mt-1"
    >
      {children}
    </div>
  );
}

// ── Chip button ──────────────────────────────────────────────

function Chip({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] rounded-full border transition-all duration-150 ${
        active
          ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 shadow-[var(--shadow-xs)]"
          : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
      }`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}

// ── Main component ───────────────────────────────────────────

type PopoverType = "location" | "distance" | "date" | "cost" | "group" | null;

export default function ContextBar({
  constraints,
  onConstraintsChange,
  hasLocation,
  onRequestLocation,
}: ContextBarProps) {
  const [openPopover, setOpenPopover] = useState<PopoverType>(null);

  const toggle = useCallback((p: PopoverType) => {
    setOpenPopover((cur) => (cur === p ? null : p));
  }, []);

  const close = useCallback(() => setOpenPopover(null), []);

  const update = useCallback(
    (patch: Partial<Constraints>) => {
      onConstraintsChange({ ...constraints, ...patch });
    },
    [constraints, onConstraintsChange],
  );

  return (
    <div className="bg-gray-50/80 dark:bg-gray-900/80 border-b border-gray-100 dark:border-gray-800/80">
      {/* Scrollable chip row */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide px-3 py-2">
        <Chip
          icon={<MapPin className="w-3.5 h-3.5" />}
          label={hasLocation ? "Near you" : "Location"}
          active={hasLocation}
          onClick={() => {
            if (!hasLocation) {
              onRequestLocation();
            } else {
              toggle("location");
            }
          }}
        />
        <Chip
          icon={<Clock className="w-3.5 h-3.5" />}
          label={distanceLabel(constraints.distance)}
          active={constraints.distance !== "any"}
          onClick={() => toggle("distance")}
        />
        <Chip
          icon={<CalendarDays className="w-3.5 h-3.5" />}
          label={dateLabel(constraints.date)}
          active={constraints.date !== null}
          onClick={() => toggle("date")}
        />
        <Chip
          icon={<DollarSign className="w-3.5 h-3.5" />}
          label={costLabel(constraints.cost)}
          active={constraints.cost !== "any"}
          onClick={() => toggle("cost")}
        />
        <Chip
          icon={<Users className="w-3.5 h-3.5" />}
          label={groupLabel(constraints.group)}
          active={constraints.group !== null}
          onClick={() => toggle("group")}
        />
      </div>

      {/* Popover panels — rendered outside scroll container so they're not clipped */}
      <PopoverPanel open={openPopover === "location"} onClose={close}>
        <p className="text-xs text-gray-500 mb-2">Location is active</p>
        <button
          onClick={() => { onRequestLocation(); close(); }}
          className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-gray-50"
        >
          📍 Update location
        </button>
      </PopoverPanel>

      <PopoverPanel open={openPopover === "distance"} onClose={close}>
        <div className="flex flex-col gap-1">
          {DISTANCE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { update({ distance: opt.value }); close(); }}
              className={`text-left text-sm px-2 py-1.5 rounded transition-colors ${
                constraints.distance === opt.value
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverPanel>

      <PopoverPanel open={openPopover === "date"} onClose={close}>
        <div className="space-y-3">
          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Quick picks</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PICKS.map((qp) => (
                <button
                  key={qp.label}
                  onClick={() => {
                    if (qp.days.length === 0) {
                      update({ date: null });
                    } else {
                      update({ date: { mode: "recurring", days: qp.days } });
                    }
                    close();
                  }}
                  className="px-2 py-1 text-xs rounded-full border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  {qp.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Specific date</p>
            <input
              type="date"
              onChange={(e) => {
                if (e.target.value) {
                  update({ date: { mode: "specific", date: new Date(e.target.value + "T00:00:00") } });
                  close();
                }
              }}
              className="w-full text-base border border-gray-200 rounded-lg px-2 py-1.5"
            />
          </div>

          <div>
            <p className="text-xs text-gray-500 mb-1.5 font-medium">Recurring days</p>
            <div className="flex gap-1">
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
                      update({
                        date: next.length > 0
                          ? { mode: "recurring", days: next }
                          : null,
                      });
                    }}
                    className={`w-8 h-8 text-xs rounded-full border transition-colors ${
                      isActive
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {label.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </div>

          {constraints.date && (
            <button
              onClick={() => { update({ date: null }); close(); }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear date
            </button>
          )}
        </div>
      </PopoverPanel>

      <PopoverPanel open={openPopover === "cost"} onClose={close}>
        <div className="flex flex-col gap-1">
          {COST_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => { update({ cost: opt.value }); close(); }}
              className={`text-left text-sm px-2 py-1.5 rounded transition-colors ${
                constraints.cost === opt.value
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </PopoverPanel>

      <PopoverPanel open={openPopover === "group"} onClose={close}>
        <div className="flex flex-col gap-1">
          {GROUP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => {
                update({ group: constraints.group === opt.value ? null : opt.value });
                close();
              }}
              className={`text-left text-sm px-2 py-1.5 rounded transition-colors ${
                constraints.group === opt.value
                  ? "bg-blue-50 text-blue-700"
                  : "hover:bg-gray-50"
              }`}
            >
              {opt.emoji} {opt.label}
            </button>
          ))}
          {constraints.group && (
            <button
              onClick={() => { update({ group: null }); close(); }}
              className="text-xs text-blue-600 hover:text-blue-800 mt-1"
            >
              Clear group
            </button>
          )}
        </div>
      </PopoverPanel>
    </div>
  );
}
