import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

const VALID_TYPES = ["waterfall", "swimming-hole", "splash-pad", "spring", "creek"];
const VALID_ACCESSIBILITY = ["wheelchair-accessible", "easy", "moderate", "difficult", "extreme"];
const VALID_PARKING = ["available", "limited", "none", "street"];
const VALID_DANGER = ["low", "moderate", "high", "extreme"];
const VALID_COST = ["free", "paid", "donation"];
const VALID_SEASONS = ["spring", "summer", "fall", "winter"];
const VALID_SITE_STATUS = ["open", "closed", "seasonal", "unknown"];
const VALID_WATER_ACCESS = ["open", "closed", "seasonal", "restricted", "unknown"];

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

export function validateLocation(data: Record<string, unknown>): string[] {
  const errors: string[] = [];

  const requiredStrings = ["slug", "name", "region", "country", "description", "directions"];
  for (const field of requiredStrings) {
    if (typeof data[field] !== "string" || (data[field] as string).trim() === "") {
      errors.push(`${field}: required string field is missing or empty`);
    }
  }

  errors.push(...checkEnum(data.type, VALID_TYPES, "type"));

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

  const practical = data.practical as Record<string, unknown> | undefined;
  if (!practical || typeof practical !== "object") {
    errors.push("practical: required object is missing");
  } else {
    errors.push(...checkEnum(practical.accessibility, VALID_ACCESSIBILITY, "practical.accessibility"));
    errors.push(...checkEnum(practical.parking, VALID_PARKING, "practical.parking"));
    errors.push(...checkEnum(practical.dangerLevel, VALID_DANGER, "practical.dangerLevel"));
    errors.push(...checkEnum(practical.cost, VALID_COST, "practical.cost"));
    errors.push(...checkArrayEnum(practical.bestSeason, VALID_SEASONS, "practical.bestSeason"));
    if (!Array.isArray(practical.facilities)) {
      errors.push("practical.facilities: must be an array");
    }
  }

  if (!Array.isArray(data.tips)) {
    errors.push("tips: must be an array");
  }

  if (!Array.isArray(data.tags)) {
    errors.push("tags: must be an array");
  }

  const status = data.status as Record<string, unknown> | undefined;
  if (!status || typeof status !== "object") {
    errors.push("status: required object is missing");
  } else {
    errors.push(...checkEnum(status.site, VALID_SITE_STATUS, "status.site"));
    errors.push(...checkEnum(status.waterAccess, VALID_WATER_ACCESS, "status.waterAccess"));
    if (typeof status.lastVerified !== "string") {
      errors.push("status.lastVerified: required string field is missing");
    }
  }

  return errors;
}

// CLI entrypoint: validate all YAML files in data/locations/
if (process.argv[1] && process.argv[1].includes("validate-locations")) {
  const locationsDir = path.resolve(process.cwd(), "data/locations");

  if (!fs.existsSync(locationsDir)) {
    console.error(`Error: ${locationsDir} does not exist`);
    process.exit(1);
  }

  const files = fs.readdirSync(locationsDir).filter((f) => f.endsWith(".yaml"));

  if (files.length === 0) {
    console.error("Error: No YAML files found in data/locations/");
    process.exit(1);
  }

  let hasErrors = false;

  for (const file of files) {
    const filePath = path.join(locationsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = yaml.load(content) as Record<string, unknown>;
    const errors = validateLocation(data);

    if (errors.length > 0) {
      hasErrors = true;
      console.error(`\n❌ ${file}:`);
      for (const error of errors) {
        console.error(`   - ${error}`);
      }
    } else {
      console.log(`✓ ${file}`);
    }
  }

  if (hasErrors) {
    console.error("\nValidation failed.");
    process.exit(1);
  } else {
    console.log("\nAll locations valid.");
  }
}
