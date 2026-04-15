import { describe, it, expect } from "vitest";
import {
  mergeEnrichments,
  haversineKm,
} from "../../src/lib/integrations/enrichment-types";
import type {
  LocationEnrichment,
} from "../../src/lib/integrations/enrichment-types";
import {
  parseOsmOpeningHours,
  nameSimilarity,
} from "../../src/lib/integrations/providers/overpass";
import { parseBomForecastXml } from "../../src/lib/integrations/providers/bom";

// ── mergeEnrichments ─────────────────────────────────────────

describe("mergeEnrichments", () => {
  it("merges enrichments from multiple providers", () => {
    const batch1: LocationEnrichment[] = [
      { slug: "loc-a", facilities: ["restrooms", "parking"] },
      { slug: "loc-b", facilities: ["restrooms"] },
    ];
    const batch2: LocationEnrichment[] = [
      { slug: "loc-a", forecast: [{ date: "2026-04-15", precis: "Sunny" }] },
      { slug: "loc-c", forecast: [{ date: "2026-04-15", precis: "Rain" }] },
    ];

    const result = mergeEnrichments(batch1, batch2);

    expect(Object.keys(result)).toHaveLength(3);
    expect(result["loc-a"].facilities).toEqual(["restrooms", "parking"]);
    expect(result["loc-a"].forecast).toEqual([
      { date: "2026-04-15", precis: "Sunny" },
    ]);
    expect(result["loc-b"].facilities).toEqual(["restrooms"]);
    expect(result["loc-c"].forecast).toEqual([
      { date: "2026-04-15", precis: "Rain" },
    ]);
  });

  it("later provider overwrites earlier per-field", () => {
    const batch1: LocationEnrichment[] = [
      { slug: "loc-a", facilities: ["old"] },
    ];
    const batch2: LocationEnrichment[] = [
      { slug: "loc-a", facilities: ["new"] },
    ];

    const result = mergeEnrichments(batch1, batch2);
    expect(result["loc-a"].facilities).toEqual(["new"]);
  });

  it("returns empty index for no inputs", () => {
    const result = mergeEnrichments();
    expect(result).toEqual({});
  });
});

// ── haversineKm ──────────────────────────────────────────────

describe("haversineKm", () => {
  it("returns 0 for same point", () => {
    const p = { lat: -37.8136, lng: 144.9631 };
    expect(haversineKm(p, p)).toBeCloseTo(0, 5);
  });

  it("calculates Melbourne to Geelong (~75km)", () => {
    const melbourne = { lat: -37.8136, lng: 144.9631 };
    const geelong = { lat: -38.1499, lng: 144.3617 };
    const dist = haversineKm(melbourne, geelong);
    expect(dist).toBeGreaterThan(60);
    expect(dist).toBeLessThan(90);
  });
});

// ── parseOsmOpeningHours ─────────────────────────────────────

describe("parseOsmOpeningHours", () => {
  it("parses simple weekday range", () => {
    const result = parseOsmOpeningHours("Mo-Fr 09:00-17:00");
    expect(result).toEqual([
      {
        days: ["mon", "tue", "wed", "thu", "fri"],
        open: "09:00",
        close: "17:00",
      },
    ]);
  });

  it("parses multiple rules separated by semicolons", () => {
    const result = parseOsmOpeningHours(
      "Mo-Fr 09:00-17:00; Sa 10:00-16:00"
    );
    expect(result).toHaveLength(2);
    expect(result![0].days).toEqual(["mon", "tue", "wed", "thu", "fri"]);
    expect(result![1].days).toEqual(["sat"]);
    expect(result![1].open).toBe("10:00");
  });

  it("parses comma-separated days", () => {
    const result = parseOsmOpeningHours("Mo,We,Fr 08:00-18:00");
    expect(result).toEqual([
      { days: ["mon", "wed", "fri"], open: "08:00", close: "18:00" },
    ]);
  });

  it("returns null for 24/7", () => {
    expect(parseOsmOpeningHours("24/7")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseOsmOpeningHours("")).toBeNull();
  });

  it("skips rules with 'off' or 'closed'", () => {
    const result = parseOsmOpeningHours(
      "Mo-Fr 09:00-17:00; Sa off; Su closed"
    );
    expect(result).toHaveLength(1);
    expect(result![0].days).toEqual(["mon", "tue", "wed", "thu", "fri"]);
  });

  it("returns null for unparseable format", () => {
    expect(parseOsmOpeningHours("sunrise-sunset")).toBeNull();
  });
});

// ── nameSimilarity ───────────────────────────────────────────

describe("nameSimilarity", () => {
  it("returns 1 for identical names", () => {
    expect(nameSimilarity("Sealife Aquarium", "Sealife Aquarium")).toBe(1);
  });

  it("is case- and punctuation-insensitive", () => {
    expect(
      nameSimilarity("Queen Vic Night Market", "queen-vic night market!")
    ).toBe(1);
  });

  it("returns a partial score when tokens overlap", () => {
    // ["sealife", "aquarium"] vs ["sea", "life", "aquarium"] — "sea"/"life" <3 chars filtered
    // Effectively ["sealife","aquarium"] vs ["aquarium"] → 1/2 = 0.5
    const s = nameSimilarity("Sealife Aquarium", "Sea Life Aquarium");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThan(1);
  });

  it("drops common stopwords so they don't inflate the score", () => {
    // "Melbourne" is a stopword — only remaining match is "museum"
    const s = nameSimilarity("Melbourne Holocaust Museum", "Melbourne Museum");
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(0.5);
  });

  it("returns 0 when names share no substantive tokens", () => {
    expect(nameSimilarity("Eastern Beach Geelong", "Big W")).toBe(0);
  });

  it("returns 0 for empty input", () => {
    expect(nameSimilarity("", "Sealife Aquarium")).toBe(0);
    expect(nameSimilarity("Foo", "")).toBe(0);
  });

  it("returns 0 when both sides are only stopwords/short tokens", () => {
    expect(nameSimilarity("The A An", "Of And")).toBe(0);
  });
});

// ── parseBomForecastXml ──────────────────────────────────────

describe("parseBomForecastXml", () => {
  const sampleXml = `
    <product version="1.7">
      <forecast>
        <area aac="VIC_PT042" description="Melbourne" type="location" parent-aac="VIC_ME001">
          <forecast-period index="0" start-time-local="2026-04-15T10:00:00+10:00" end-time-local="2026-04-16T00:00:00+10:00">
            <element type="air_temperature_maximum" units="Celsius">20</element>
            <text type="precis">Possible shower.</text>
            <text type="probability_of_precipitation">40%</text>
          </forecast-period>
          <forecast-period index="1" start-time-local="2026-04-16T00:00:00+10:00" end-time-local="2026-04-17T00:00:00+10:00">
            <element type="air_temperature_minimum" units="Celsius">13</element>
            <element type="air_temperature_maximum" units="Celsius">25</element>
            <text type="precis">Showers developing.</text>
            <text type="probability_of_precipitation">95%</text>
          </forecast-period>
        </area>
        <area aac="VIC_ME001" description="Melbourne" type="metropolitan" parent-aac="VIC_FA001">
          <forecast-period index="0" start-time-local="2026-04-15T00:00:00+10:00" end-time-local="2026-04-16T00:00:00+10:00">
            <text type="forecast">Cloudy. Medium chance of showers.</text>
            <text type="fire_danger">Moderate</text>
            <text type="uv_alert">Sun protection 10:00am to 2:40pm</text>
          </forecast-period>
        </area>
      </forecast>
    </product>
  `;

  it("parses location-type areas with forecast periods", () => {
    const areas = parseBomForecastXml(sampleXml);
    const locationAreas = areas.filter((a) => a.type === "location");
    expect(locationAreas).toHaveLength(1);

    const melb = locationAreas[0];
    expect(melb.aac).toBe("VIC_PT042");
    expect(melb.description).toBe("Melbourne");
    expect(melb.periods).toHaveLength(2);
  });

  it("extracts text and element values from periods", () => {
    const areas = parseBomForecastXml(sampleXml);
    const melb = areas.find((a) => a.aac === "VIC_PT042")!;

    expect(melb.periods[0].texts.precis).toBe("Possible shower.");
    expect(melb.periods[0].elements.air_temperature_maximum).toBe("20");
    expect(melb.periods[0].startDate).toBe("2026-04-15");

    expect(melb.periods[1].texts.precis).toBe("Showers developing.");
    expect(melb.periods[1].elements.air_temperature_minimum).toBe("13");
  });

  it("parses metropolitan areas with warnings", () => {
    const areas = parseBomForecastXml(sampleXml);
    const metro = areas.find((a) => a.type === "metropolitan");
    expect(metro).toBeDefined();
    expect(metro!.periods[0].texts.fire_danger).toBe("Moderate");
    expect(metro!.periods[0].texts.uv_alert).toBe(
      "Sun protection 10:00am to 2:40pm"
    );
  });

  it("returns empty array for empty XML", () => {
    expect(parseBomForecastXml("")).toEqual([]);
  });
});
