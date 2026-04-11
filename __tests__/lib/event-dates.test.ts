import { describe, it, expect } from "vitest";
import { isEventOnDate, isEventOnDayOfWeek } from "../../src/lib/event-dates";
import type { Recurrence } from "../../src/lib/types";

describe("isEventOnDate", () => {
  it("matches a one-off event on its date", () => {
    const rec: Recurrence = { type: "once", date: "2026-01-18" };
    expect(isEventOnDate(rec, new Date("2026-01-18"))).toBe(true);
    expect(isEventOnDate(rec, new Date("2026-01-19"))).toBe(false);
  });

  it("matches a range event within its dates", () => {
    const rec: Recurrence = { type: "range", startDate: "2026-01-01", endDate: "2026-01-31" };
    expect(isEventOnDate(rec, new Date("2026-01-15"))).toBe(true);
    expect(isEventOnDate(rec, new Date("2026-02-01"))).toBe(false);
  });

  it("matches a range event with day filter", () => {
    const rec: Recurrence = { type: "range", startDate: "2026-01-01", endDate: "2026-01-31", days: ["wed"] };
    // Jan 7 2026 is a Wednesday
    expect(isEventOnDate(rec, new Date("2026-01-07"))).toBe(true);
    // Jan 8 2026 is a Thursday
    expect(isEventOnDate(rec, new Date("2026-01-08"))).toBe(false);
  });

  it("matches a weekly event on the right day in season", () => {
    const rec: Recurrence = { type: "weekly", days: ["wed"], season: "summer" };
    // Jan 7 2026 is a Wednesday (summer in southern hemisphere)
    expect(isEventOnDate(rec, new Date("2026-01-07"))).toBe(true);
    // Jul 1 2026 is a Wednesday but winter
    expect(isEventOnDate(rec, new Date("2026-07-01"))).toBe(false);
  });

  it("matches a weekly event with no season restriction", () => {
    const rec: Recurrence = { type: "weekly", days: ["fri"] };
    // Jan 2 2026 is a Friday
    expect(isEventOnDate(rec, new Date("2026-01-02"))).toBe(true);
  });

  it("matches annual event in the right month", () => {
    const rec: Recurrence = { type: "annual", month: 3 };
    expect(isEventOnDate(rec, new Date("2026-03-15"))).toBe(true);
    expect(isEventOnDate(rec, new Date("2026-04-15"))).toBe(false);
  });
});

describe("isEventOnDayOfWeek", () => {
  it("matches weekly event on matching day", () => {
    const rec: Recurrence = { type: "weekly", days: ["wed"] };
    expect(isEventOnDayOfWeek(rec, [3])).toBe(true); // 3 = Wednesday
    expect(isEventOnDayOfWeek(rec, [1])).toBe(false);
  });

  it("matches range event with day filter", () => {
    const rec: Recurrence = { type: "range", startDate: "2026-01-01", endDate: "2026-03-31", days: ["sat", "sun"] };
    expect(isEventOnDayOfWeek(rec, [0, 6])).toBe(true); // weekend
    expect(isEventOnDayOfWeek(rec, [1])).toBe(false);
  });

  it("returns false for one-off events (excluded from recurring mode)", () => {
    const rec: Recurrence = { type: "once", date: "2026-01-18" };
    expect(isEventOnDayOfWeek(rec, [0, 6])).toBe(false);
  });

  it("matches annual event (always potentially on recurring days)", () => {
    const rec: Recurrence = { type: "annual", month: 1 };
    expect(isEventOnDayOfWeek(rec, [6])).toBe(true);
  });
});
