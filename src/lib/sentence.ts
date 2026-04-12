"use client";

import type { Filters, Constraints, FilterDimension } from "@/lib/types";

// ── Sentence fragment generators ─────────────────────────────

const TYPE_WORDS: Record<string, string> = {
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

const DISTANCE_WORDS: Record<string, string> = {
  "30min": "close by",
  "1hr": "within an hour",
  "2hr": "within 2 hours",
  daytrip: "a day trip away",
};

const COST_WORDS: Record<string, string> = {
  free: "free",
  "free-$": "cheap",
  "$$-under": "budget-friendly",
};

const DURATION_WORDS: Record<string, string> = {
  quick: "quick",
  "half-day": "half-day",
  "full-day": "full-day",
};

const GROUP_WORDS: Record<string, string> = {
  solo: "solo",
  adults: "for adults",
  "family-young": "for little kids",
  "family-older": "for older kids",
  friends: "with friends",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDateFragment(d: Constraints["date"]): string | null {
  if (!d) return null;
  if (d.mode === "specific") {
    return `on ${d.date.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" })}`;
  }
  if (d.days.length === 0) return null;
  if (d.days.length === 2 && d.days.includes(0) && d.days.includes(6)) return "on weekends";
  if (d.days.length === 5 && !d.days.includes(0) && !d.days.includes(6)) return "on weekdays";
  return `on ${d.days.map((n) => DAY_LABELS[n]).join("/")}`;
}

function getDimFragment(
  dim: FilterDimension,
  filters: Filters,
  constraints: Constraints,
): string | null {
  switch (dim) {
    case "type":
      return filters.type ? TYPE_WORDS[filters.type] ?? null : null;
    case "distance":
      return DISTANCE_WORDS[constraints.distance] ?? null;
    case "date":
      return getDateFragment(constraints.date);
    case "cost":
      return COST_WORDS[constraints.cost] ?? null;
    case "duration":
      return DURATION_WORDS[constraints.duration] ?? null;
    case "group":
      return constraints.group ? GROUP_WORDS[constraints.group] ?? null : null;
  }
}

/**
 * Generate a natural-language sentence from active filters, ordered by priority.
 * Examples:
 *   - "Showing everything"
 *   - "Showing free swims close by"
 *   - "Showing cheap events on weekends for little kids"
 */
export function generateSentence(
  filters: Filters,
  constraints: Constraints,
): string {
  const fragments: string[] = [];

  for (const dim of constraints.priority) {
    const frag = getDimFragment(dim, filters, constraints);
    if (frag) fragments.push(frag);
  }

  if (fragments.length === 0) return "Showing everything";
  return `Showing ${fragments.join(" · ")}`;
}

/**
 * Count how many filter dimensions have non-default values.
 */
export function activeFilterCount(filters: Filters, constraints: Constraints): number {
  let count = 0;
  if (filters.type !== null) count++;
  if (constraints.distance !== "any") count++;
  if (constraints.date !== null) count++;
  if (constraints.cost !== "any") count++;
  if (constraints.duration !== "any") count++;
  if (constraints.group !== null) count++;
  return count;
}
