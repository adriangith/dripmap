import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import {
  VALID_TYPES, VALID_COST, VALID_SEASONS, VALID_SITE_STATUS,
  VALID_DANGER, VALID_WATER_ACCESS,
  VALID_BEACH_TYPE, VALID_DOG_POLICY, VALID_WAVE_EXPOSURE, VALID_CROWD_LEVEL,
  VALID_VENUE_TYPE, VALID_RECURRENCE_TYPE, VALID_DURATION,
  VALID_EATERY_CUISINE, VALID_DIETARY_OPTION, VALID_SEATING, VALID_BOOKING,
  VALID_DIFFICULTY, VALID_TERRAIN,
  VALID_DAYS, TIME_PATTERN,
} from "./location-enums";

function checkEnum(value: unknown, allowed: string[], fieldName: string): string[] {
  if (typeof value !== "string" || !allowed.includes(value)) {
    return [`${fieldName}: must be one of [${allowed.join(", ")}], got "${value}"`];
  }
  return [];
}

function checkArrayEnum(value: unknown, allowed: string[], fieldName: string): string[] {
  if (!Array.isArray(value)) {
    return [`${fieldName}: must be an array`];
  }
  const errors: string[] = [];
  for (const item of value) {
    if (!allowed.includes(item)) {
      errors.push(`${fieldName}: invalid value "${item}", must be one of [${allowed.join(", ")}]`);
    }
  }
  return errors;
}

function validateOpeningHours(value: unknown): string[] {
  const errors: string[] = [];
  if (!Array.isArray(value)) {
    return ["openingHours: must be an array"];
  }
  if (value.length === 0) {
    return ["openingHours: must be a non-empty array (omit the field if the POI has no published hours)"];
  }
  value.forEach((entry, i) => {
    const prefix = `openingHours[${i}]`;
    if (!entry || typeof entry !== "object") {
      errors.push(`${prefix}: must be an object with { days, open, close }`);
      return;
    }
    const e = entry as Record<string, unknown>;
    if (!Array.isArray(e.days) || e.days.length === 0) {
      errors.push(`${prefix}.days: must be a non-empty array`);
    } else {
      for (const d of e.days) {
        if (typeof d !== "string" || !VALID_DAYS.includes(d)) {
          errors.push(`${prefix}.days: invalid value "${d}", must be one of [${VALID_DAYS.join(", ")}]`);
        }
      }
    }
    const openValid = typeof e.open === "string" && TIME_PATTERN.test(e.open);
    const closeValid = typeof e.close === "string" && TIME_PATTERN.test(e.close);
    if (!openValid) {
      errors.push(`${prefix}.open: must be "HH:MM" 24-hour time`);
    }
    if (!closeValid) {
      errors.push(`${prefix}.close: must be "HH:MM" 24-hour time`);
    }
    if (openValid && closeValid && e.open === e.close) {
      errors.push(`${prefix}: open and close must differ (use 00:00 / 23:59 for all-day)`);
    }
  });
  return errors;
}

function validateCoreFields(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  const requiredStrings = ["slug", "name", "region", "country", "description", "directions"];
  for (const field of requiredStrings) {
    if (typeof data[field] !== "string" || (data[field] as string).trim() === "") {
      errors.push(`${field}: required string field is missing or empty`);
    }
  }

  errors.push(...checkEnum(data.type, VALID_TYPES, "type"));
  errors.push(...checkEnum(data.cost, VALID_COST, "cost"));

  const coords = data.coordinates as Record<string, unknown> | undefined;
  if (!coords || typeof coords !== "object") {
    errors.push("coordinates: required object is missing");
  } else {
    if (typeof coords.lat !== "number" || coords.lat < -90 || coords.lat > 90) {
      errors.push("coordinates.lat: must be a number between -90 and 90");
    }
    if (typeof coords.lng !== "number" || coords.lng < -180 || coords.lng > 180) {
      errors.push("coordinates.lng: must be a number between -180 and 180");
    }
  }

  if (!Array.isArray(data.photos)) {
    errors.push("photos: must be an array");
  }

  if (!Array.isArray(data.highlights) || (data.highlights as unknown[]).length === 0) {
    errors.push("highlights: must be a non-empty array (every entry should have at least one highlight)");
  }

  if (!Array.isArray(data.tags)) {
    errors.push("tags: must be an array");
  }

  if (data.duration !== undefined) {
    errors.push(...checkEnum(data.duration, VALID_DURATION, "duration"));
  }

  if (!Array.isArray(data.tips)) {
    errors.push("tips: must be an array");
  }

  errors.push(...checkArrayEnum(data.bestSeason, VALID_SEASONS, "bestSeason"));

  // ageSuitability
  const age = data.ageSuitability as Record<string, unknown> | undefined;
  if (!age || typeof age !== "object") {
    errors.push("ageSuitability: required object is missing");
  } else {
    if (age.minAge !== null && typeof age.minAge !== "number") {
      errors.push("ageSuitability.minAge: must be a number or null");
    }
    if (!Array.isArray(age.ideal)) {
      errors.push("ageSuitability.ideal: must be an array");
    }
  }

  // status
  const status = data.status as Record<string, unknown> | undefined;
  if (!status || typeof status !== "object") {
    errors.push("status: required object is missing");
  } else {
    errors.push(...checkEnum(status.site, VALID_SITE_STATUS, "status.site"));
    if (typeof status.lastVerified !== "string") {
      errors.push("status.lastVerified: required string field is missing");
    } else if (!/^\d{4}-\d{2}-\d{2}$/.test(status.lastVerified) || isNaN(Date.parse(status.lastVerified))) {
      errors.push("status.lastVerified: must be a valid YYYY-MM-DD date");
    }
  }

  // openingHours (optional)
  if (data.openingHours !== undefined) {
    errors.push(...validateOpeningHours(data.openingHours));
  }

  // fit (optional)
  if (data.fit !== undefined) {
    if (typeof data.fit !== "object" || data.fit === null) {
      errors.push("fit: must be an object");
    } else {
      const fit = data.fit as Record<string, unknown>;
      const validFitKeys = ["cost", "duration", "group", "date", "setting"];
      const validDurationKeys = ["quick", "half-day", "full-day"];
      for (const key of Object.keys(fit)) {
        if (!validFitKeys.includes(key)) {
          errors.push(`fit.${key}: unknown key, must be one of [${validFitKeys.join(", ")}]`);
        } else if (key === "duration") {
          if (typeof fit[key] === "string") {
            if ((fit[key] as string).trim() === "") errors.push("fit.duration: must be a non-empty string");
          } else if (typeof fit[key] === "object" && fit[key] !== null) {
            const durObj = fit[key] as Record<string, unknown>;
            for (const dk of Object.keys(durObj)) {
              if (!validDurationKeys.includes(dk)) {
                errors.push(`fit.duration.${dk}: unknown key, must be one of [${validDurationKeys.join(", ")}]`);
              } else if (typeof durObj[dk] !== "string" || (durObj[dk] as string).trim() === "") {
                errors.push(`fit.duration.${dk}: must be a non-empty string`);
              }
            }
          } else {
            errors.push("fit.duration: must be a string or object with quick/half-day/full-day keys");
          }
        } else if (typeof fit[key] !== "string" || (fit[key] as string).trim() === "") {
          errors.push(`fit.${key}: must be a non-empty string`);
        }
      }
    }
  }

  return errors;
}

function validateSwimDetails(details: Record<string, unknown>): string[] {
  const errors: string[] = [];
  errors.push(...checkEnum(details.dangerLevel, VALID_DANGER, "details.dangerLevel"));
  errors.push(...checkEnum(details.waterAccess, VALID_WATER_ACCESS, "details.waterAccess"));
  return errors;
}

function validateBeachDetails(details: Record<string, unknown>): string[] {
  const errors: string[] = [];
  errors.push(...checkEnum(details.beachType, VALID_BEACH_TYPE, "details.beachType"));
  errors.push(...checkEnum(details.dogPolicy, VALID_DOG_POLICY, "details.dogPolicy"));
  errors.push(...checkEnum(details.waveExposure, VALID_WAVE_EXPOSURE, "details.waveExposure"));
  errors.push(...checkEnum(details.crowdLevel, VALID_CROWD_LEVEL, "details.crowdLevel"));

  const patrolled = details.patrolled as Record<string, unknown> | undefined;
  if (!patrolled || typeof patrolled !== "object") {
    errors.push("details.patrolled: required object is missing");
  }

  if (!Array.isArray(details.waterHazards)) {
    errors.push("details.waterHazards: must be an array");
  }

  return errors;
}

function validateEventDetails(details: Record<string, unknown>): string[] {
  const errors: string[] = [];

  const recurrence = details.recurrence as Record<string, unknown> | undefined;
  if (!recurrence || typeof recurrence !== "object") {
    errors.push("details.recurrence: required object is missing");
  } else {
    errors.push(...checkEnum(recurrence.type, VALID_RECURRENCE_TYPE, "details.recurrence.type"));
  }

  if (typeof details.venue !== "string") {
    errors.push("details.venue: required string field is missing");
  }
  errors.push(...checkEnum(details.venueType, VALID_VENUE_TYPE, "details.venueType"));

  if (typeof details.bookingRequired !== "boolean") {
    errors.push("details.bookingRequired: must be a boolean");
  }

  return errors;
}

function validateBushwalkDetails(details: Record<string, unknown>): string[] {
  const errors: string[] = [];
  if (typeof details.distanceKm !== "number" || details.distanceKm <= 0) {
    errors.push("details.distanceKm: must be a positive number");
  }
  errors.push(...checkEnum(details.difficulty, VALID_DIFFICULTY, "details.difficulty"));
  errors.push(...checkEnum(details.terrain, VALID_TERRAIN, "details.terrain"));

  // Optional route: array of [lat, lng] pairs
  if (details.route !== undefined) {
    if (!Array.isArray(details.route)) {
      errors.push("details.route: must be an array of [lat, lng] pairs");
    } else if ((details.route as unknown[]).length < 2) {
      errors.push("details.route: must have at least 2 points");
    } else {
      for (let i = 0; i < (details.route as unknown[]).length; i++) {
        const point = (details.route as unknown[])[i];
        if (!Array.isArray(point) || (point as unknown[]).length !== 2) {
          errors.push(`details.route[${i}]: must be a [lat, lng] pair`);
          continue;
        }
        const [lat, lng] = point as [unknown, unknown];
        if (typeof lat !== "number" || lat < -90 || lat > 90) {
          errors.push(`details.route[${i}]: lat must be between -90 and 90`);
        }
        if (typeof lng !== "number" || lng < -180 || lng > 180) {
          errors.push(`details.route[${i}]: lng must be between -180 and 180`);
        }
      }
    }
  }

  return errors;
}

function validateEateryDetails(details: Record<string, unknown>): string[] {
  const errors: string[] = [];

  if (!Array.isArray(details.cuisine) || (details.cuisine as unknown[]).length === 0) {
    errors.push("details.cuisine: must be a non-empty array");
  } else {
    for (const item of details.cuisine as unknown[]) {
      if (typeof item !== "string" || !VALID_EATERY_CUISINE.includes(item)) {
        errors.push(`details.cuisine: invalid value "${item}", must be one of [${VALID_EATERY_CUISINE.join(", ")}]`);
      }
    }
  }

  errors.push(...checkEnum(details.seating, VALID_SEATING, "details.seating"));
  errors.push(...checkEnum(details.booking, VALID_BOOKING, "details.booking"));

  if (details.bookingUrl !== null && typeof details.bookingUrl !== "string") {
    errors.push("details.bookingUrl: must be a string or null");
  }

  if (!Array.isArray(details.dietaryOptions)) {
    errors.push("details.dietaryOptions: must be an array");
  } else {
    for (const item of details.dietaryOptions as unknown[]) {
      if (typeof item !== "string" || !VALID_DIETARY_OPTION.includes(item)) {
        errors.push(`details.dietaryOptions: invalid value "${item}", must be one of [${VALID_DIETARY_OPTION.join(", ")}]`);
      }
    }
  }

  if (typeof details.kidsMenu !== "boolean") {
    errors.push("details.kidsMenu: must be a boolean");
  }

  return errors;
}

export function validatePlace(data: Record<string, unknown>): string[] {
  const errors = validateCoreFields(data);

  const details = data.details as Record<string, unknown> | undefined;
  if (!details || typeof details !== "object") {
    errors.push("details: required object is missing");
    return errors;
  }

  switch (data.type) {
    case "swim":
      errors.push(...validateSwimDetails(details));
      break;
    case "beach":
      errors.push(...validateBeachDetails(details));
      break;
    case "event":
      errors.push(...validateEventDetails(details));
      break;
    case "bushwalk":
    case "walk":
      errors.push(...validateBushwalkDetails(details));
      break;
    case "eatery":
      errors.push(...validateEateryDetails(details));
      break;
    // Future types — core validation only for now
  }

  return errors;
}

/** @deprecated Use validatePlace */
export const validateLocation = validatePlace;

// CLI entrypoint: validate all YAML files in data/locations/ (recursively)
if (process.argv[1] === __filename) {
  const locationsDir = path.resolve(process.cwd(), "data/locations");

  if (!fs.existsSync(locationsDir)) {
    console.error(`Error: ${locationsDir} does not exist`);
    process.exit(1);
  }

  function getYamlFiles(dir: string): string[] {
    const results: string[] = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getYamlFiles(fullPath));
      } else if (entry.name.endsWith(".yaml")) {
        results.push(fullPath);
      }
    }
    return results;
  }

  const files = getYamlFiles(locationsDir);

  if (files.length === 0) {
    console.warn("Warning: No YAML files found in data/locations/ — nothing to validate.");
    process.exit(0);
  }

  let hasErrors = false;

  for (const filePath of files) {
    const relPath = path.relative(locationsDir, filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    let data: Record<string, unknown>;
    try {
      data = yaml.load(content) as Record<string, unknown>;
    } catch (e) {
      hasErrors = true;
      console.error(`\n❌ ${relPath}: YAML parse error — ${(e as Error).message}`);
      continue;
    }
    const errors = validatePlace(data);

    if (errors.length > 0) {
      hasErrors = true;
      console.error(`\n❌ ${relPath}:`);
      for (const error of errors) {
        console.error(`   - ${error}`);
      }
    } else {
      console.log(`✓ ${relPath}`);
    }
  }

  if (hasErrors) {
    console.error("\nValidation failed.");
    process.exit(1);
  } else {
    console.log("\nAll locations valid.");
  }
}
