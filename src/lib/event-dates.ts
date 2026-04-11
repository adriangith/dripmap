import type { Recurrence } from "./types";

const DAY_NAMES = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

const SUMMER_MONTHS = [12, 1, 2]; // Southern hemisphere

function isSeason(date: Date, season: string): boolean {
  const month = date.getMonth() + 1;
  switch (season) {
    case "summer": return SUMMER_MONTHS.includes(month);
    case "fall": return [3, 4, 5].includes(month);
    case "winter": return [6, 7, 8].includes(month);
    case "spring": return [9, 10, 11].includes(month);
    default: return true;
  }
}

function dateInRange(date: Date, start: string, end: string): boolean {
  const d = date.toISOString().slice(0, 10);
  return d >= start && d <= end;
}

function dayNameToNumber(name: string): number {
  return DAY_NAMES.indexOf(name.toLowerCase());
}

/** Check if an event with the given recurrence occurs on a specific date. */
export function isEventOnDate(rec: Recurrence, date: Date): boolean {
  const dayOfWeek = date.getDay(); // 0=Sun

  switch (rec.type) {
    case "once":
      return date.toISOString().slice(0, 10) === rec.date;

    case "range": {
      if (!dateInRange(date, rec.startDate, rec.endDate)) return false;
      if (rec.days && rec.days.length > 0) {
        return rec.days.some((d) => dayNameToNumber(d) === dayOfWeek);
      }
      return true;
    }

    case "weekly": {
      const matchesDay = rec.days.some((d) => dayNameToNumber(d) === dayOfWeek);
      if (!matchesDay) return false;
      if (rec.season) return isSeason(date, rec.season);
      return true;
    }

    case "annual":
      return (date.getMonth() + 1) === rec.month;
  }
}

/** Check if an event recurs on any of the given days of the week (0=Sun..6=Sat). */
export function isEventOnDayOfWeek(rec: Recurrence, days: number[]): boolean {
  switch (rec.type) {
    case "once":
      return false; // one-offs excluded from recurring day mode

    case "range": {
      if (rec.days && rec.days.length > 0) {
        return rec.days.some((d) => days.includes(dayNameToNumber(d)));
      }
      return days.length > 0; // range without day filter runs daily
    }

    case "weekly":
      return rec.days.some((d) => days.includes(dayNameToNumber(d)));

    case "annual":
      return true; // annual events could fall on any day
  }
}
