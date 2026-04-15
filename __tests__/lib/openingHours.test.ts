import { describe, it, expect } from "vitest";
import { isOpenOnDay, isOpenAt, formatHoursStatus, entriesForDay } from "@/lib/openingHours";
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
});
