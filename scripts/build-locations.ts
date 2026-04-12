import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import type { Place, PlaceIndexEntry } from "../src/lib/types";

export function buildIndex(places: Place[]): PlaceIndexEntry[] {
  return places.map((p) => ({
    slug: p.slug,
    name: p.name,
    type: p.type,
    coordinates: p.coordinates,
    region: p.region,
    country: p.country,
    cost: p.cost,
    highlights: p.highlights,
    status: p.status,
    tags: p.tags,
    ...(p.ageSuitability ? { ageSuitability: p.ageSuitability } : {}),
    ...(p.duration ? { duration: p.duration } : {}),
    ...(p.type === "event" ? { recurrence: p.details.recurrence } : {}),
  }));
}

export function buildDetail(place: Place): Place {
  return place;
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

  const files = getYamlFiles(locationsDir);

  if (files.length === 0) {
    console.warn("Warning: No YAML files found in data/locations/ — nothing to build.");
    process.exit(0);
  }

  const places: Place[] = [];

  for (const filePath of files) {
    const relPath = path.relative(locationsDir, filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    let data: Place;
    try {
      data = yaml.load(content) as Place;
    } catch (e) {
      console.error(`Error parsing ${relPath}: ${(e as Error).message}`);
      process.exit(1);
    }

    if (!/^[a-z0-9][a-z0-9-]*$/.test(data.slug)) {
      console.error(`Invalid slug "${data.slug}" in ${relPath}`);
      process.exit(1);
    }

    places.push(data);

    const detail = buildDetail(data);
    fs.writeFileSync(
      path.join(detailDir, `${data.slug}.json`),
      JSON.stringify(detail, null, 2)
    );
    console.log(`  → ${data.slug}.json`);
  }

  const index = buildIndex(places);
  fs.writeFileSync(
    path.join(outputDir, "locations-index.json"),
    JSON.stringify(index, null, 2)
  );

  console.log(`\nBuilt ${places.length} places → public/generated/`);
}
