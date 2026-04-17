"use client";

import type { Filters, Constraints, FilterDimension } from "@/lib/types";
import type { DayForecast } from "@/lib/integrations/enrichment-types";
import { classifyWeather } from "@/lib/weather";

// ── Poetic idle sentences (no filters active) ────────────────

const IDLE_SENTENCES = [
  "Where shall the day take us?",
  "The world is wide — let's narrow it down",
  "Every path leads somewhere worth finding",
];

// ── Lead phrases (when a dimension drives the sentence) ──────

const COST_LEAD: Record<string, string> = {
  free: "Let's wander where the price is nothing",
  affordable: "Something gentle on the pocket",
};

const DISTANCE_LEAD: Record<string, string> = {
  "30min": "Adventure waits just around the bend",
  "1hr": "An hour down the road, something calls",
  "2hr": "A little further afield, something waits",
  daytrip: "Pack the car — it's worth the winding drive",
};

const DURATION_LEAD: Record<string, string> = {
  quick: "A stolen hour, nothing more",
  "half-day": "A slow, easy half-day ahead",
  "full-day": "From dawn to golden hour",
};

const GROUP_LEAD: Record<string, string> = {
  solo: "Just you and the quiet",
  adults: "Grown-ups only, no permission needed",
  "family-young": "Little legs and big ones, side by side",
  "family-older": "Big enough to keep up, young enough to wonder",
  friends: "Something best shared with good company",
};

const VISITED_LEAD: Record<string, string> = {
  new: "Somewhere your feet haven't been",
  familiar: "An old favourite, waiting",
};

const SETTING_LEAD: Record<string, string> = {
  indoor: "Under a roof, away from it all",
  outdoor: "Out where the sky stretches wide",
  "outdoor-water": "Where the water meets the shore",
};

// ── Trailing phrases (secondary position after em-dash) ──────

const COST_TAIL: Record<string, string> = {
  free: "and it won't cost a thing",
  affordable: "easy on the wallet",
};

const DISTANCE_TAIL: Record<string, string> = {
  "30min": "close at hand",
  "1hr": "an hour away",
  "2hr": "a drive worth taking",
  daytrip: "a day's journey out",
};

const DURATION_TAIL: Record<string, string> = {
  quick: "just a stolen hour",
  "half-day": "half a day to fill",
  "full-day": "the whole day yours",
};

const GROUP_TAIL: Record<string, string> = {
  solo: "just for you",
  adults: "grown-ups only",
  "family-young": "little ones in tow",
  "family-older": "the kids will love it",
  friends: "bring the crew",
};

const VISITED_TAIL: Record<string, string> = {
  new: "somewhere new",
  familiar: "a place you know",
};

const SETTING_TAIL: Record<string, string> = {
  indoor: "under cover",
  outdoor: "in the open air",
  "outdoor-water": "by the water",
};

// ── Weather preambles ────────────────────────────────────────

const WEATHER_PREAMBLE: Record<string, string> = {
  rain: "Rain is whispering outside",
  storm: "A storm rolls in",
};

// ── Date / time helpers ──────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getDateLeadPhrase(d: Constraints["date"], tod: Constraints["timeOfDay"]): string | null {
  const parts: string[] = [];

  if (d) {
    if (d.mode === "specific") {
      const label = d.date.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" });
      parts.push(`On ${label}, the calendar says go`);
    } else if (d.days.length === 2 && d.days.includes(0) && d.days.includes(6)) {
      parts.push("When the weekend stretches out");
    } else if (d.days.length === 5 && !d.days.includes(0) && !d.days.includes(6)) {
      parts.push("On a quiet weekday");
    } else if (d.days.length > 0) {
      parts.push(`On ${d.days.map((n) => DAY_LABELS[n]).join("/")}, let's make it count`);
    }
  }

  if (tod === "day") parts.push(parts.length ? "while the sun is up" : "While the sun is up");
  if (tod === "evening") parts.push(parts.length ? "as the light fades" : "As the light fades");

  return parts.length > 0 ? parts.join(", ") : null;
}

function getDateTailPhrase(d: Constraints["date"], tod: Constraints["timeOfDay"]): string | null {
  const parts: string[] = [];

  if (d) {
    if (d.mode === "specific") {
      parts.push(`on ${d.date.toLocaleDateString("en-AU", { weekday: "short", month: "short", day: "numeric" })}`);
    } else if (d.days.length === 2 && d.days.includes(0) && d.days.includes(6)) {
      parts.push("this weekend");
    } else if (d.days.length === 5 && !d.days.includes(0) && !d.days.includes(6)) {
      parts.push("on a weekday");
    } else if (d.days.length > 0) {
      parts.push(`on ${d.days.map((n) => DAY_LABELS[n]).join("/")}`);
    }
  }

  if (tod === "day") parts.push("while it's light");
  if (tod === "evening") parts.push("under evening sky");

  return parts.length > 0 ? parts.join(", ") : null;
}

// ── Sentence builder ─────────────────────────────────────────

function getLeadPhrase(dim: FilterDimension, constraints: Constraints): string | null {
  switch (dim) {
    case "cost": return COST_LEAD[constraints.cost] ?? null;
    case "distance": return DISTANCE_LEAD[constraints.distance] ?? null;
    case "duration": return DURATION_LEAD[constraints.duration] ?? null;
    case "group": return constraints.group ? (GROUP_LEAD[constraints.group] ?? null) : null;
    case "familiarity": return VISITED_LEAD[constraints.visited] ?? null;
    case "setting": return constraints.setting !== "any" ? (SETTING_LEAD[constraints.setting] ?? null) : null;
    case "date": return getDateLeadPhrase(constraints.date, constraints.timeOfDay);
  }
}

function getTailPhrase(dim: FilterDimension, constraints: Constraints): string | null {
  switch (dim) {
    case "cost": return COST_TAIL[constraints.cost] ?? null;
    case "distance": return DISTANCE_TAIL[constraints.distance] ?? null;
    case "duration": return DURATION_TAIL[constraints.duration] ?? null;
    case "group": return constraints.group ? (GROUP_TAIL[constraints.group] ?? null) : null;
    case "familiarity": return VISITED_TAIL[constraints.visited] ?? null;
    case "setting": return constraints.setting !== "any" ? (SETTING_TAIL[constraints.setting] ?? null) : null;
    case "date": return getDateTailPhrase(constraints.date, constraints.timeOfDay);
  }
}

/**
 * Build a poetic, discovery-oriented sentence from the active filters.
 * The first active dimension (by priority) gets a full lead phrase;
 * remaining dimensions trail after an em-dash.
 * Optionally incorporates weather context from BOM forecast data.
 *
 * Examples:
 *   No filters           → "Where shall the day take us?"
 *   cost=free            → "Let's wander where the price is nothing"
 *   cost+dist            → "Let's wander where the price is nothing — close at hand"
 *   setting=indoor+rain  → "Rain is whispering outside — under a roof, away from it all"
 */
export function generateSentence(
  filters: Filters,
  constraints: Constraints,
  forecast?: DayForecast | null,
): string {
  const activeDims: FilterDimension[] = [];
  for (const dim of constraints.priority) {
    if (isDimActive(dim, filters, constraints)) {
      activeDims.push(dim);
    }
  }

  // Weather preamble for rain/storm — prepended before the main sentence
  const condition = forecast ? classifyWeather(forecast.precis) : "clear";
  const preamble = WEATHER_PREAMBLE[condition] ?? null;

  if (activeDims.length === 0) {
    if (preamble) {
      return `${preamble} — where shall we go?`;
    }
    return IDLE_SENTENCES[new Date().getDay() % IDLE_SENTENCES.length];
  }

  // Find the first dimension that produces a usable lead phrase
  let leadPhrase: string | null = null;
  let leadIndex = 0;
  while (leadIndex < activeDims.length && !leadPhrase) {
    leadPhrase = getLeadPhrase(activeDims[leadIndex], constraints);
    leadIndex++;
  }

  if (!leadPhrase) {
    if (preamble) {
      return `${preamble} — where shall we go?`;
    }
    return IDLE_SENTENCES[new Date().getDay() % IDLE_SENTENCES.length];
  }

  const tailPhrases = activeDims
    .slice(leadIndex)
    .map((dim) => getTailPhrase(dim, constraints))
    .filter((p): p is string => p !== null);

  // Compose: optionally preamble — lead — tails
  let sentence: string;
  if (tailPhrases.length === 0) {
    sentence = leadPhrase;
  } else {
    sentence = `${leadPhrase} — ${tailPhrases.join(", ")}`;
  }

  if (preamble) {
    return `${preamble} — ${sentence.charAt(0).toLowerCase() + sentence.slice(1)}`;
  }

  return sentence;
}

function isDimActive(dim: FilterDimension, filters: Filters, constraints: Constraints): boolean {
  switch (dim) {
    case "distance": return constraints.distance !== "any";
    case "date": return constraints.date !== null || constraints.timeOfDay !== null;
    case "cost": return constraints.cost !== "any";
    case "duration": return constraints.duration !== "any";
    case "group": return constraints.group !== null;
    case "familiarity": return constraints.visited !== "any";
    case "setting": return constraints.setting !== "any";
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
  if (constraints.setting !== "any") count++;
  return count;
}
