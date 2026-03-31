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

export function buildDetail(location: Location): Location {
  return location;
}

// CLI entrypoint
if (process.argv[1] === __filename) {
  const locationsDir = path.resolve(process.cwd(), "data/locations");
  const outputDir = path.resolve(process.cwd(), "public/generated");
  const detailDir = path.join(outputDir, "locations");

  fs.mkdirSync(detailDir, { recursive: true });

  const files = fs.readdirSync(locationsDir).filter((f) => f.endsWith(".yaml"));
  const locations: Location[] = [];

  for (const file of files) {
    const filePath = path.join(locationsDir, file);
    const content = fs.readFileSync(filePath, "utf-8");
    const data = yaml.load(content) as Location;
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
