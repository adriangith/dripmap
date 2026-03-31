import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type { Location, LocationIndexEntry } from "../src/lib/types";

export function buildIndex(locations: Location[]): LocationIndexEntry[] {
  return locations.map((loc) => ({
    slug: loc.slug,
    name: loc.name,
    type: loc.type,
    coordinates: loc.coordinates,
    country: loc.country,
    status: loc.status,
    tags: loc.tags,
  }));
}

/**
 * Returns the full location object for detail-page JSON output.
 * Intentional extension point: future enrichment (e.g. resolving photo URLs,
 * adding computed fields) belongs here.
 */
export function buildDetail(location: Location): Location {
  return location;
}

// CLI entrypoint
if (process.argv[1] === __filename) {
  const locationsDir = path.resolve(process.cwd(), "data/locations");
  const outputDir = path.resolve(process.cwd(), "public/generated");
  const detailDir = path.join(outputDir, "locations");

  fs.mkdirSync(detailDir, { recursive: true });

  if (!fs.existsSync(locationsDir)) {
    console.error(`Error: ${locationsDir} does not exist`);
    process.exit(1);
  }

  const files = fs.readdirSync(locationsDir).filter((f) => f.endsWith(".yaml"));

  if (files.length === 0) {
    console.warn("Warning: No YAML files found in data/locations/ — nothing to build.");
    process.exit(0);
  }

  const locations: Location[] = [];

  for (const file of files) {
    const filePath = path.join(locationsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    let data: Location;
    try {
      data = yaml.load(content) as Location;
    } catch (e) {
      console.error(`Error parsing ${file}: ${(e as Error).message}`);
      process.exit(1);
    }
    locations.push(data);

    const detail = buildDetail(data);
    fs.writeFileSync(
      path.join(detailDir, `${data.slug}.json`),
      JSON.stringify(detail, null, 2)
    );
    console.log(`  → ${data.slug}.json`);
  }

  const index = buildIndex(locations);
  fs.writeFileSync(
    path.join(outputDir, "locations-index.json"),
    JSON.stringify(index, null, 2)
  );

  console.log(`\nBuilt ${locations.length} locations → public/generated/`);
}
