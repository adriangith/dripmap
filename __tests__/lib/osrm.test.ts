import { describe, it, expect } from "vitest";
import { formatDriveTime, formatDriveDistance } from "../../src/lib/osrm";

describe("formatDriveTime", () => {
  it("rounds short durations to nearest 5 min with minimum of 5", () => {
    expect(formatDriveTime(60)).toBe("~5 min");
    expect(formatDriveTime(180)).toBe("~5 min");
    expect(formatDriveTime(420)).toBe("~5 min");
    expect(formatDriveTime(510)).toBe("~10 min");
    expect(formatDriveTime(1500)).toBe("~25 min");
    expect(formatDriveTime(2700)).toBe("~45 min");
  });

  it("formats durations over 60 min as hours and minutes", () => {
    expect(formatDriveTime(3600)).toBe("~1 hr");
    expect(formatDriveTime(5400)).toBe("~1 hr 30 min");
    expect(formatDriveTime(9000)).toBe("~2 hr 30 min");
    expect(formatDriveTime(7200)).toBe("~2 hr");
  });

  it("rounds hour durations to nearest 5 min", () => {
    expect(formatDriveTime(3720)).toBe("~1 hr");
    expect(formatDriveTime(4080)).toBe("~1 hr 10 min");
  });
});

describe("formatDriveDistance", () => {
  it("formats distances under 10 km with one decimal place", () => {
    expect(formatDriveDistance(500)).toBe("0.5 km");
    expect(formatDriveDistance(3200)).toBe("3.2 km");
    expect(formatDriveDistance(9950)).toBe("10 km");
  });

  it("formats distances 10 km and above as whole numbers", () => {
    expect(formatDriveDistance(10000)).toBe("10 km");
    expect(formatDriveDistance(38000)).toBe("38 km");
    expect(formatDriveDistance(380000)).toBe("380 km");
  });
});
