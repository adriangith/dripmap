import { describe, it, expect } from "vitest";
import { isOpenOnDay, isOpenAt, formatHoursStatus, entriesForDay, todayIdx } from "@/lib/openingHours";
import type { OpeningHoursEntry } from "@/lib/types";

const weekdays: OpeningHoursEntry = {
  days: ["mon", "tue", "wed", "thu", "fri"],
  open: "09:00",
  close: "17:00",
};

const fridayNight: OpeningHoursEntry = {
  days: ["fri", "sat"],
  open: "20:00",
  close: "02:00", // overnight
};

describe("openingHours", () => {
  it("isOpenOnDay respects day membership", () => {
    expect(isOpenOnDay([weekdays], "mon")).toBe(true);
    expect(isOpenOnDay([weekdays], "sat")).toBe(false);
    expect(isOpenOnDay([weekdays, fridayNight], "sat")).toBe(true);
  });

  it("isOpenAt within a simple range", () => {
    // Wed 2026-04-15 at 12:00
    const d = new Date(2026, 3, 15, 12, 0);
    expect(isOpenAt([weekdays], d)).toBe(true);
  });

  it("isOpenAt outside range", () => {
    const d = new Date(2026, 3, 15, 8, 0); // Wed 08:00
    expect(isOpenAt([weekdays], d)).toBe(false);
  });

  it("isOpenAt closed on non-listed day", () => {
    const d = new Date(2026, 3, 18, 12, 0); // Saturday
    expect(isOpenAt([weekdays], d)).toBe(false);
  });

  it("isOpenAt handles overnight ranges — late evening of start day", () => {
    const d = new Date(2026, 3, 17, 22, 0); // Fri 22:00
    expect(isOpenAt([fridayNight], d)).toBe(true);
  });

  it("isOpenAt handles overnight ranges — early morning of next day", () => {
    const d = new Date(2026, 3, 18, 1, 0); // Sat 01:00 — carried over from Fri
    expect(isOpenAt([fridayNight], d)).toBe(true);
  });

  it("isOpenAt overnight closed at 03:00", () => {
    const d = new Date(2026, 3, 18, 3, 0);
    expect(isOpenAt([fridayNight], d)).toBe(false);
  });

  it("isOpenAt exclusive at close time", () => {
    const d = new Date(2026, 3, 15, 17, 0);
    expect(isOpenAt([weekdays], d)).toBe(false);
  });

  it("isOpenAt inclusive at open time", () => {
    const d = new Date(2026, 3, 15, 9, 0);
    expect(isOpenAt([weekdays], d)).toBe(true);
  });

  it("formatHoursStatus returns null for undefined/empty", () => {
    expect(formatHoursStatus(undefined)).toBeNull();
    expect(formatHoursStatus([])).toBeNull();
  });

  it("formatHoursStatus returns status when entries present", () => {
    const d = new Date(2026, 3, 15, 12, 0);
    expect(formatHoursStatus([weekdays], d)).toEqual({ open: true, label: "Open now" });
  });

  it("entriesForDay filters correctly", () => {
    expect(entriesForDay([weekdays, fridayNight], "fri")).toHaveLength(2);
    expect(entriesForDay([weekdays, fridayNight], "sun")).toHaveLength(0);
  });

  it("isOpenAt inside the gap before an overnight range opens", () => {
    const d = new Date(2026, 3, 17, 19, 0); // Fri 19:00, before 20:00 open
    expect(isOpenAt([fridayNight], d)).toBe(false);
  });

  it("isOpenAt between the close and next open of an overnight schedule", () => {
    const d = new Date(2026, 3, 18, 10, 0); // Sat 10:00 — Fri night closed at 02:00, Sat night opens 20:00
    expect(isOpenAt([fridayNight], d)).toBe(false);
  });

  it("isOpenAt with multiple ranges on the same day — lunch split", () => {
    const split: OpeningHoursEntry[] = [
      { days: ["wed"], open: "11:00", close: "14:00" },
      { days: ["wed"], open: "17:00", close: "21:00" },
    ];
    expect(isOpenAt(split, new Date(2026, 3, 15, 12, 0))).toBe(true);   // lunch
    expect(isOpenAt(split, new Date(2026, 3, 15, 15, 0))).toBe(false);  // gap
    expect(isOpenAt(split, new Date(2026, 3, 15, 19, 0))).toBe(true);   // dinner
    expect(isOpenAt(split, new Date(2026, 3, 15, 22, 0))).toBe(false);  // closed
  });

  it("todayIdx returns Monday-origin index", () => {
    expect(todayIdx(new Date(2026, 3, 13))).toBe(0); // Monday
    expect(todayIdx(new Date(2026, 3, 15))).toBe(2); // Wednesday
    expect(todayIdx(new Date(2026, 3, 19))).toBe(6); // Sunday
  });
});
