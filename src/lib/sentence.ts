"use client";

import type { Filters, Constraints, FilterDimension } from "@/lib/types";

// ── Natural-language fragments ───────────────────────────────

const DISTANCE_PHRASES: Record<string, string> = {
  "30min": "close by",
  "1hr": "within an hour's drive",
  "2hr": "within a couple of hours",
  daytrip: "for a day trip",
};

const COST_ADJECTIVE: Record<string, string> = {
  free: "free",
  "free-$": "cheap",
  "$$-under": "budget-friendly",
};

const DURATION_PHRASES: Record<string, string> = {
  quick: "for a quick outing",
  "half-day": "for a half-day adventure",
  "full-day": "for a full day out",
};

const GROUP_PHRASES: Record<string, string> = {
  solo: "just for you",
  adults: "for a grown-ups' outing",
  "family-young": "the little ones will love",
  "family-older": "the kids will enjoy",
  friends: "to share with friends",
};

const VISITED_PHRASES: Record<string, string> = {
  new: "you haven't tried",
  familiar: "you know and love",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDatePhrase(d: Constraints["date"]): string | null {
  if (!d) return null;
  if (d.mode === "specific") {
    return `on ${d.date.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" })}`;
  }
  if (d.days.length === 0) return null;
  if (d.days.length === 2 && d.days.includes(0) && d.days.includes(6)) return "this weekend";
  if (d.days.length === 5 && !d.days.includes(0) && !d.days.includes(6)) return "on a weekday";
  return `on ${d.days.map((n) => DAY_LABELS[n]).join("/")}`;
}

function getTimeOfDayPhrase(t: Constraints["timeOfDay"]): string | null {
  if (t === "day") return "during the day";
  if (t === "evening") return "in the evening";
  return null;
}

// ── Default prompts (no filters active) ─────────────────────

const IDLE_SENTENCES = [
  "What should we explore today?",
  "Where shall we wander?",
  "Ready to discover something new?",
];

/**
 * Build a discovery-oriented sentence from the active filters,
 * reading them in priority order to create natural prose.
 *
 * Examples:
 *   No filters     → "What should we explore today?"
 *   cost=free      → "How about something free?"
 *   cost+dist      → "How about something free close by?"
 *   dist+group     → "How about something close by the little ones will love?"
 */
export function generateSentence(
  filters: Filters,
  constraints: Constraints,
): string {
  // Gather active dimensions in priority order
  const parts: { dim: FilterDimension }[] = [];
  for (const dim of constraints.priority) {
    if (isDimActive(dim, filters, constraints)) {
      parts.push({ dim });
    }
  }

  if (parts.length === 0) {
    return IDLE_SENTENCES[new Date().getDay() % IDLE_SENTENCES.length];
  }

  const cost = constraints.cost !== "any" ? COST_ADJECTIVE[constraints.cost] : null;
  const dist = constraints.distance !== "any" ? DISTANCE_PHRASES[constraints.distance] : null;
  const date = getDatePhrase(constraints.date);
  const tod = getTimeOfDayPhrase(constraints.timeOfDay);
  const dur = constraints.duration !== "any" ? DURATION_PHRASES[constraints.duration] : null;
  const group = constraints.group ? GROUP_PHRASES[constraints.group] : null;

  // Subject: "something free" or "something"
  const subject = cost ? `something ${cost}` : "something";

  // Build trailing qualifiers in priority order (skip cost, already in subject)
  const qualifiers: string[] = [];
  for (const p of parts) {
    if (p.dim === "cost") continue;
    if (p.dim === "distance" && dist) qualifiers.push(dist);
    if (p.dim === "date") {
      if (date) qualifiers.push(date);
      if (tod) qualifiers.push(tod);
    }
    if (p.dim === "duration" && dur) qualifiers.push(dur);
    if (p.dim === "group" && group) qualifiers.push(group);
    if (p.dim === "familiarity" && constraints.visited !== "any") qualifiers.push(VISITED_PHRASES[constraints.visited]);
  }

  const tail = qualifiers.length > 0 ? ` ${qualifiers.join(" ")}` : "";

  return `How about ${subject}${tail}?`;
}

function isDimActive(dim: FilterDimension, filters: Filters, constraints: Constraints): boolean {
  switch (dim) {
    case "distance": return constraints.distance !== "any";
    case "date": return constraints.date !== null || constraints.timeOfDay !== null;
    case "cost": return constraints.cost !== "any";
    case "duration": return constraints.duration !== "any";
    case "group": return constraints.group !== null;
    case "familiarity": return constraints.visited !== "any";
  }
}

/**
 * Count how many filter dimensions have non-default values.
 */
export function activeFilterCount(filters: Filters, constraints: Constraints): number {
  let count = 0;
  if (constraints.distance !== "any") count++;
  if (constraints.date !== null || constraints.timeOfDay !== null) count++;
  if (constraints.cost !== "any") count++;
  if (constraints.duration !== "any") count++;
  if (constraints.group !== null) count++;
  if (constraints.visited !== "any") count++;
  return count;
}
