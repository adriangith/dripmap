import { describe, it, expect } from "vitest";
import { suitability } from "../../../src/lib/weather/suitability";
import type { WeatherSnapshot } from "../../../src/lib/weather/types";

const base: WeatherSnapshot = {
  time: "2026-04-07T12:00:00Z",
  temperatureC: 25,
  weatherCode: 0, // clear
  precipitationMm: 0,
  precipitationProbability: 0,
  uvIndex: 5,
  windKmh: 8,
};

const w = (overrides: Partial<WeatherSnapshot>): WeatherSnapshot => ({ ...base, ...overrides });

describe("suitability — swimming-hole", () => {
  it("good: warm, dry, moderate UV", () => {
    expect(suitability(w({ temperatureC: 26 }), "swimming-hole").rating).toBe("good");
  });

  it("fair: mild temperature", () => {
    expect(suitability(w({ temperatureC: 21 }), "swimming-hole").rating).toBe("fair");
  });

  it("poor: too cold", () => {
    expect(suitability(w({ temperatureC: 15 }), "swimming-hole").rating).toBe("poor");
  });

  it("poor: raining", () => {
    expect(suitability(w({ precipitationMm: 2 }), "swimming-hole").rating).toBe("poor");
  });

  it("includes a non-empty reason for every rating", () => {
    for (const temp of [15, 21, 26]) {
      const result = suitability(w({ temperatureC: temp }), "swimming-hole");
      expect(result.reason.length).toBeGreaterThan(0);
    }
  });
});

describe("suitability — splash-pad", () => {
  it("good: warm and clear", () => {
    expect(suitability(w({ temperatureC: 24, weatherCode: 0 }), "splash-pad").rating).toBe("good");
  });

  it("fair: mild", () => {
    expect(suitability(w({ temperatureC: 19 }), "splash-pad").rating).toBe("fair");
  });

  it("poor: raining", () => {
    expect(suitability(w({ precipitationMm: 1 }), "splash-pad").rating).toBe("poor");
  });

  it("poor: cold", () => {
    expect(suitability(w({ temperatureC: 14 }), "splash-pad").rating).toBe("poor");
  });
});

describe("suitability — waterfall", () => {
  it("good: recent rain", () => {
    expect(suitability(w({ precipitationMm: 3 }), "waterfall").rating).toBe("good");
  });

  it("fair: dry but mild", () => {
    expect(suitability(w({ precipitationMm: 0, temperatureC: 18 }), "waterfall").rating).toBe("fair");
  });

  it("poor: thunderstorm code 95", () => {
    expect(suitability(w({ weatherCode: 95 }), "waterfall").rating).toBe("poor");
  });

  it("poor: extreme heat", () => {
    expect(suitability(w({ temperatureC: 40 }), "waterfall").rating).toBe("poor");
  });
});

describe("suitability — spring", () => {
  it("good: mild dry", () => {
    expect(suitability(w({ temperatureC: 22 }), "spring").rating).toBe("good");
  });

  it("fair: cool", () => {
    expect(suitability(w({ temperatureC: 12 }), "spring").rating).toBe("fair");
  });

  it("poor: storm", () => {
    expect(suitability(w({ weatherCode: 95 }), "spring").rating).toBe("poor");
  });

  it("poor: freezing", () => {
    expect(suitability(w({ temperatureC: -1 }), "spring").rating).toBe("poor");
  });
});

describe("suitability — creek", () => {
  it("good: warm dry", () => {
    expect(suitability(w({ temperatureC: 22 }), "creek").rating).toBe("good");
  });

  it("fair: mild", () => {
    expect(suitability(w({ temperatureC: 17 }), "creek").rating).toBe("fair");
  });

  it("poor: cold", () => {
    expect(suitability(w({ temperatureC: 12 }), "creek").rating).toBe("poor");
  });

  it("poor: raining", () => {
    expect(suitability(w({ precipitationMm: 1 }), "creek").rating).toBe("poor");
  });
});
