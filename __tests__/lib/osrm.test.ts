import { describe, it, expect } from "vitest";
import { formatDriveTime } from "../../src/lib/osrm";

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
