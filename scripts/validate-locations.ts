import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const VALID_TYPES = [
  "swim", "beach", "event", "bushwalk", "lookout", "waterfall",
  "cave", "wildlife", "pool", "cycling", "fishing",
];
const VALID_COST = ["free", "$", "$$", "$$$"];
const VALID_SEASONS = ["spring", "summer", "fall", "winter"];
const VALID_SITE_STATUS = ["open", "closed", "seasonal", "unknown"];

// Swim detail enums
const VALID_DANGER = ["low", "moderate", "high", "extreme"];
const VALID_WATER_ACCESS = ["open", "closed", "seasonal", "restricted", "unknown"];

// Beach detail enums
const VALID_BEACH_TYPE = ["surf", "bay", "rock-pools", "river", "estuary"];
const VALID_DOG_POLICY = ["allowed", "seasonal-offleash", "prohibited"];
const VALID_WAVE_EXPOSURE = ["sheltered", "moderate", "exposed"];
const VALID_CROWD_LEVEL = ["quiet", "moderate", "busy"];

// Event detail enums
const VALID_VENUE_TYPE = ["outdoor", "indoor", "mixed"];
const VALID_RECURRENCE_TYPE = ["once", "range", "weekly", "annual"];

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
