import * as fs from "fs";
import * as path from "path";
import {
  VALID_TYPES, VALID_COST, VALID_SEASONS, VALID_SITE_STATUS,
  VALID_DANGER, VALID_WATER_ACCESS,
  VALID_BEACH_TYPE, VALID_DOG_POLICY, VALID_WAVE_EXPOSURE, VALID_CROWD_LEVEL,
  VALID_VENUE_TYPE, VALID_RECURRENCE_TYPE, VALID_DURATION,
  VALID_EATERY_CUISINE, VALID_DIETARY_OPTION, VALID_SEATING, VALID_BOOKING,
  VALID_DIFFICULTY, VALID_TERRAIN,
} from "./location-enums";

const photo = {
  type: "object",
  required: ["url", "alt"],
  properties: {
    url: { type: "string", format: "uri" },
    alt: { type: "string" },
    credit: { type: "string" },
  },
};

const ageSuitability = {
  type: "object",
  required: ["minAge", "ideal"],
  properties: {
    minAge: { type: ["number", "null"] },
    ideal: {
      type: "array",
      items: { type: "string" },
    },
  },
};

const status = {
  type: "object",
  required: ["site", "lastVerified"],
  properties: {
    site: { enum: VALID_SITE_STATUS },
    lastVerified: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
  },
};

const fit = {
  type: "object",
  additionalProperties: false,
  properties: {
    cost: { type: "string", minLength: 1 },
    group: { type: "string", minLength: 1 },
    date: { type: "string", minLength: 1 },
    duration: {
      oneOf: [
        { type: "string", minLength: 1 },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            quick: { type: "string", minLength: 1 },
            "half-day": { type: "string", minLength: 1 },
            "full-day": { type: "string", minLength: 1 },
          },
        },
      ],
    },
  },
};

const coordinates = {
  type: "object",
  required: ["lat", "lng"],
  properties: {
    lat: { type: "number", minimum: -90, maximum: 90 },
    lng: { type: "number", minimum: -180, maximum: 180 },
  },
};

const swimDetails = {
  type: "object",
  required: ["dangerLevel", "waterAccess"],
  properties: {
    dangerLevel: { enum: VALID_DANGER },
    waterAccess: { enum: VALID_WATER_ACCESS },
    depth: { type: "string" },
  },
};

const beachDetails = {
  type: "object",
  required: ["beachType", "dogPolicy", "waveExposure", "crowdLevel", "patrolled", "waterHazards"],
  properties: {
    beachType: { enum: VALID_BEACH_TYPE },
    dogPolicy: { enum: VALID_DOG_POLICY },
    waveExposure: { enum: VALID_WAVE_EXPOSURE },
    crowdLevel: { enum: VALID_CROWD_LEVEL },
    patrolled: {
      type: "object",
      properties: {
        seasonal: { type: "boolean" },
        months: { type: "array", items: { type: "string" } },
        hours: { type: ["string", "null"] },
      },
    },
    waterHazards: { type: "array", items: { type: "string" } },
  },
};

const eventDetails = {
  type: "object",
  required: ["recurrence", "venue", "venueType", "bookingRequired"],
  properties: {
    recurrence: {
      type: "object",
      required: ["type"],
      properties: {
        type: { enum: VALID_RECURRENCE_TYPE },
        season: { type: "string" },
        startTime: { type: "string" },
        endTime: { type: "string" },
      },
    },
    confirmedDates: { type: ["string", "null"] },
    venue: { type: "string" },
    venueType: { enum: VALID_VENUE_TYPE },
    bookingRequired: { type: "boolean" },
    bookingUrl: { type: ["string", "null"] },
    organiser: { type: "string" },
    organiserUrl: { type: ["string", "null"] },
  },
};

const walkDetails = {
  type: "object",
  required: ["distanceKm", "difficulty", "terrain"],
  properties: {
    distanceKm: { type: "number", exclusiveMinimum: 0 },
    difficulty: { enum: VALID_DIFFICULTY },
    terrain: { enum: VALID_TERRAIN },
    route: {
      type: "array",
      minItems: 2,
      items: {
        type: "array",
        minItems: 2,
        maxItems: 2,
        items: { type: "number" },
      },
    },
  },
};

const eateryDetails = {
  type: "object",
  required: ["cuisine", "seating", "booking", "dietaryOptions", "kidsMenu"],
  properties: {
    cuisine: {
      type: "array",
      minItems: 1,
      items: { enum: VALID_EATERY_CUISINE },
    },
    seating: { enum: VALID_SEATING },
    booking: { enum: VALID_BOOKING },
    bookingUrl: { type: ["string", "null"] },
    dietaryOptions: {
      type: "array",
      items: { enum: VALID_DIETARY_OPTION },
    },
    kidsMenu: { type: "boolean" },
  },
};

const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "https://dripmap.local/schemas/location.schema.json",
  title: "Dripmap Location",
  description: "A location entry in data/locations/**/*.yaml",
  type: "object",
  required: [
    "slug", "name", "type", "coordinates", "region", "country",
    "description", "photos", "highlights", "cost", "ageSuitability",
    "bestSeason", "directions", "tips", "tags", "status", "details",
  ],
  properties: {
    slug: { type: "string", pattern: "^[a-z0-9-]+$" },
    name: { type: "string", minLength: 1 },
    type: { enum: VALID_TYPES },
    coordinates,
    region: { type: "string", minLength: 1 },
    country: { type: "string", minLength: 1 },
    description: { type: "string", minLength: 1 },
    photos: { type: "array", items: photo },
    highlights: { type: "array", minItems: 1, items: { type: "string" } },
    cost: { enum: VALID_COST },
    duration: { enum: VALID_DURATION },
    ageSuitability,
    accessibility: { type: "string" },
    parking: { type: "string" },
    facilities: { type: "array", items: { type: "string" } },
    bestSeason: {
      type: "array",
      minItems: 1,
      items: { enum: VALID_SEASONS },
    },
    directions: { type: "string", minLength: 1 },
    tips: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    status,
    fit,
    details: { type: "object" },
  },
  allOf: [
    { if: { properties: { type: { const: "swim" } } }, then: { properties: { details: swimDetails } } },
    { if: { properties: { type: { const: "beach" } } }, then: { properties: { details: beachDetails } } },
    { if: { properties: { type: { const: "event" } } }, then: { properties: { details: eventDetails } } },
    { if: { properties: { type: { const: "bushwalk" } } }, then: { properties: { details: walkDetails } } },
    { if: { properties: { type: { const: "walk" } } }, then: { properties: { details: walkDetails } } },
    { if: { properties: { type: { const: "eatery" } } }, then: { properties: { details: eateryDetails } } },
  ],
};

const outPath = path.resolve(process.cwd(), "schemas/location.schema.json");
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(schema, null, 2) + "\n");
console.log(`Wrote ${path.relative(process.cwd(), outPath)}`);
