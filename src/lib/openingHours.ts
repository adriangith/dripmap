import type { DayOfWeek, OpeningHoursEntry } from "./types";

export const DAYS: DayOfWeek[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

export const DAY_LABELS: Record<DayOfWeek, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

export const DAY_LETTERS: Record<DayOfWeek, string> = {
  mon: "M",
  tue: "T",
  wed: "W",
  thu: "T",
  fri: "F",
  sat: "S",
  sun: "S",
};

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function dayOfWeek(date: Date): DayOfWeek {
  return DAYS[todayIdx(date)];
}

/** Monday-origin weekday index (0 = Mon … 6 = Sun). */
export function todayIdx(date: Date = new Date()): number {
  return (date.getDay() + 6) % 7;
}

function prevDay(day: DayOfWeek): DayOfWeek {
  return DAYS[(DAYS.indexOf(day) + 6) % 7];
}

export function entriesForDay(
  entries: OpeningHoursEntry[],
  day: DayOfWeek,
): OpeningHoursEntry[] {
  return entries.filter((e) => e.days.includes(day));
}

export function isOpenOnDay(entries: OpeningHoursEntry[], day: DayOfWeek): boolean {
  return entriesForDay(entries, day).length > 0;
}

export function isOpenAt(entries: OpeningHoursEntry[], date: Date): boolean {
  const today = dayOfWeek(date);
  const yesterday = prevDay(today);
  const mins = date.getHours() * 60 + date.getMinutes();

  for (const e of entriesForDay(entries, today)) {
    const open = toMinutes(e.open);
    const close = toMinutes(e.close);
    if (close > open) {
      if (mins >= open && mins < close) return true;
    } else {
      // Overnight range starting today
      if (mins >= open) return true;
    }
  }
  // Overnight range carried over from yesterday
  for (const e of entriesForDay(entries, yesterday)) {
    const open = toMinutes(e.open);
    const close = toMinutes(e.close);
    if (close <= open && mins < close) return true;
  }
  return false;
}

export interface HoursStatus {
  open: boolean;
  label: string;
}

export function formatHoursStatus(
  entries: OpeningHoursEntry[] | undefined,
  date: Date = new Date(),
): HoursStatus | null {
  if (!entries || entries.length === 0) return null;
  const open = isOpenAt(entries, date);
  return { open, label: open ? "Open now" : "Closed" };
}
