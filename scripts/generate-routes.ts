/**
 * Script to generate route polylines for walk/bushwalk/cycling locations.
 *
 * Supports two providers:
 *   - walkingmaps: Scrapes route data from walkingmaps.com.au (requires
 *     walkingMapsId in the YAML details). Human-traced, accurate trail routes.
 *   - ors: Queries OpenRouteService foot-hiking API (requires ORS_API_KEY,
 *     uses waypoints from YAML). Good for trails but API-generated.
 *
 * Usage:
 *   npx tsx scripts/generate-routes.ts                        # walkingmaps (default)
 *   npx tsx scripts/generate-routes.ts --provider ors         # OpenRouteService
 *   npx tsx scripts/generate-routes.ts --dry-run              # preview only
 *
 * The script is idempotent — it skips locations that already have a `route` field.
 */
import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";

// ── Types ────────────────────────────────────────────────────

interface LocationData {
  slug: string;
  type: string;
  details: {
    route?: [number, number][];
    waypoints?: [number, number][];
    walkingMapsId?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

const ROUTE_TYPES = new Set(["walk", "bushwalk", "cycling"]);

// ── walkingmaps.com.au scraper ───────────────────────────────

/**
 * Scrape route data from a walkingmaps.com.au walk page.
 * The route is embedded as a JSON array in a hidden #PathDetail input.
 */
async function fetchRouteWalkingMaps(
  walkId: number,
): Promise<[number, number][]> {
  const url = `https://walkingmaps.com.au/walk/${walkId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`walkingmaps.com.au error: ${response.status} for walk/${walkId}`);
  }

  const html = await response.text();

  // Extract the PathDetail hidden input value
  const pathMatch = html.match(/id="PathDetail"[^>]*value="([^"]*)"/);
  if (!pathMatch) {
    throw new Error(`No PathDetail found in walkingmaps.com.au/walk/${walkId}`);
  }

  // Value is HTML-encoded JSON — decode &quot; entities
  const jsonStr = pathMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, "&");
  const points = JSON.parse(jsonStr) as { lat: number; lng: number }[];

  if (!points.length) {
    throw new Error(`Empty PathDetail in walkingmaps.com.au/walk/${walkId}`);
  }

  // Convert to [lat, lng] tuples, rounded to 4 decimal places (~11m precision)
  const route = points.map(
    (p) =>
      [
        Math.round(p.lat * 10000) / 10000,
        Math.round(p.lng * 10000) / 10000,
      ] as [number, number],
  );

  return simplifyRoute(route);
}

// ── OpenRouteService API ─────────────────────────────────────

const ORS_BASE = "https://api.openrouteservice.org/v2/directions";

function getOrsProfile(type: string): string {
  if (type === "cycling") return "cycling-regular";
  if (type === "bushwalk") return "foot-hiking";
  return "foot-hiking";
}

/**
 * Query OpenRouteService for a route through the given waypoints.
 * Uses the foot-hiking profile which handles trails and park paths.
 * Requires ORS_API_KEY environment variable.
 */
async function fetchRouteOrs(
  waypoints: [number, number][],
  profile: string,
  apiKey: string,
): Promise<[number, number][]> {
  // ORS POST body expects [lng, lat] coordinate order
  const coordinates = waypoints.map(([lat, lng]) => [lng, lat]);
  const url = `${ORS_BASE}/${profile}/geojson`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ coordinates }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`ORS API error: ${response.status} — ${body}`);
  }

  const data = (await response.json()) as {
    features: { geometry: { coordinates: [number, number][] } }[];
  };

  if (!data.features?.length) {
    throw new Error("ORS returned no features");
  }

  // GeoJSON coordinates are [lng, lat] — convert to [lat, lng]
  const geojsonCoords = data.features[0].geometry.coordinates;
  return toLatLngPoints(geojsonCoords);
}

// ── Shared helpers ───────────────────────────────────────────

function toLatLngPoints(geojsonCoords: [number, number][]): [number, number][] {
  const points = geojsonCoords.map(([lng, lat]) => [
    Math.round(lat * 10000) / 10000,
    Math.round(lng * 10000) / 10000,
  ] as [number, number]);
  return simplifyRoute(points);
}

// ── Route simplification (Ramer-Douglas-Peucker) ─────────────

/**
 * Perpendicular distance from point P to the line segment A→B,
 * using approximate Cartesian projection (good enough for short distances).
 */
function perpendicularDist(
  p: [number, number],
  a: [number, number],
  b: [number, number],
): number {
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ex = p[1] - a[1];
    const ey = p[0] - a[0];
    return Math.sqrt(ex * ex + ey * ey);
  }
  const num = Math.abs(dy * (p[1] - a[1]) - dx * (p[0] - a[0]));
  return num / Math.sqrt(lenSq);
}

function rdpSimplify(
  points: [number, number][],
  epsilon: number,
): [number, number][] {
  if (points.length <= 2) return points;

  let maxDist = 0;
  let maxIdx = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const d = perpendicularDist(points[i], points[0], points[end]);
    if (d > maxDist) {
      maxDist = d;
      maxIdx = i;
    }
  }

  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
    const right = rdpSimplify(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }
  return [points[0], points[end]];
}

/**
 * Simplify a route to roughly 30–80 points using adaptive epsilon.
 * Starts with a small epsilon and increases until the point count is
 * within the target range.
 */
function simplifyRoute(
  points: [number, number][],
  targetMax = 80,
): [number, number][] {
  if (points.length <= targetMax) return points;

  let epsilon = 0.00005; // ~5m
  let simplified = rdpSimplify(points, epsilon);

  while (simplified.length > targetMax && epsilon < 0.01) {
    epsilon *= 1.5;
    simplified = rdpSimplify(points, epsilon);
  }

  return simplified;
}

// ── YAML helpers ─────────────────────────────────────────────

function getYamlFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
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

/**
 * Write the route array into a YAML file, inserting it after the last
 * existing details field (terrain/difficulty/waypoints) so the structure
 * stays clean. Uses string manipulation to preserve comments and formatting.
 */
function writeRouteToYaml(
  filePath: string,
  route: [number, number][],
): void {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  // Find the line range for `details:` block
  const detailsIdx = lines.findIndex((l) => /^details:/.test(l));
  if (detailsIdx === -1) {
    throw new Error(`No 'details:' block found in ${filePath}`);
  }

  // Find the insertion point: after waypoints or the last details sub-field
  // before the next top-level key
  let insertIdx = detailsIdx + 1;
  for (let i = detailsIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    // Stop at next top-level key (no leading whitespace, not blank, not a comment)
    if (line.length > 0 && !line.startsWith(" ") && !line.startsWith("#")) {
      insertIdx = i;
      break;
    }
    insertIdx = i + 1;
  }

  // Build route YAML lines
  const routeLines = ["  route:"];
  for (const [lat, lng] of route) {
    routeLines.push(`    - [${lat}, ${lng}]`);
  }

  // Insert route lines
  lines.splice(insertIdx, 0, ...routeLines);
  fs.writeFileSync(filePath, lines.join("\n"));
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const providerIdx = process.argv.indexOf("--provider");
  const provider = providerIdx !== -1 ? process.argv[providerIdx + 1] : "walkingmaps";

  if (provider !== "walkingmaps" && provider !== "ors") {
    console.error(`Unknown provider "${provider}". Use "walkingmaps" or "ors".`);
    process.exit(1);
  }

  const orsApiKey = process.env.ORS_API_KEY;
  if (provider === "ors" && !orsApiKey) {
    console.error("ORS_API_KEY environment variable is required for OpenRouteService.");
    process.exit(1);
  }

  console.log(`Using provider: ${provider}${provider === "walkingmaps" ? " (walkingmaps.com.au — human-traced trails)" : " (OpenRouteService foot-hiking)"}`);

  const locationsDir = path.resolve(process.cwd(), "data/locations");

  if (!fs.existsSync(locationsDir)) {
    console.error(`Error: ${locationsDir} does not exist`);
    process.exit(1);
  }

  const files = getYamlFiles(locationsDir);
  let generated = 0;
  let skipped = 0;
  let errors = 0;

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath);
    const content = fs.readFileSync(filePath, "utf-8");
    let data: LocationData;

    try {
      data = yaml.load(content) as LocationData;
    } catch (e) {
      console.error(`  ❌ Parse error in ${relPath}: ${(e as Error).message}`);
      errors++;
      continue;
    }

    // Only process route-eligible types
    if (!ROUTE_TYPES.has(data.type)) continue;

    // Skip if route already exists
    if (data.details?.route && data.details.route.length > 0) {
      console.log(`  ⏭  ${relPath} — already has route (${data.details.route.length} points)`);
      skipped++;
      continue;
    }

    if (dryRun) {
      if (provider === "walkingmaps") {
        if (data.details?.walkingMapsId) {
          console.log(`  🔄 ${relPath} — would fetch from walkingmaps.com.au/walk/${data.details.walkingMapsId}`);
        } else {
          console.log(`  ⚠  ${relPath} — no walkingMapsId, skipping`);
        }
      } else {
        if (data.details?.waypoints && data.details.waypoints.length >= 2) {
          console.log(`  🔄 ${relPath} — would fetch ORS route (${data.details.waypoints.length} waypoints)`);
        } else {
          console.log(`  ⚠  ${relPath} — no waypoints defined, skipping`);
        }
      }
      continue;
    }

    try {
      let route: [number, number][];

      if (provider === "walkingmaps") {
        if (!data.details?.walkingMapsId) {
          console.log(`  ⚠  ${relPath} — no walkingMapsId, skipping`);
          skipped++;
          continue;
        }
        console.log(`  🔄 ${relPath} — fetching from walkingmaps.com.au/walk/${data.details.walkingMapsId}...`);
        route = await fetchRouteWalkingMaps(data.details.walkingMapsId);
      } else {
        if (!data.details?.waypoints || data.details.waypoints.length < 2) {
          console.log(`  ⚠  ${relPath} — no waypoints defined, skipping`);
          skipped++;
          continue;
        }
        const profile = getOrsProfile(data.type);
        console.log(`  🔄 ${relPath} — fetching ORS ${profile} route (${data.details.waypoints.length} waypoints)...`);
        route = await fetchRouteOrs(data.details.waypoints, profile, orsApiKey!);
      }

      writeRouteToYaml(filePath, route);
      console.log(`  ✅ ${relPath} — wrote ${route.length} route points`);
      generated++;

      // Rate-limit requests
      await new Promise((r) => setTimeout(r, 1500));
    } catch (e) {
      console.error(`  ❌ ${relPath} — ${(e as Error).message}`);
      errors++;
    }
  }

  console.log(
    `\nDone: ${generated} generated, ${skipped} skipped, ${errors} errors`,
  );
  if (errors > 0) process.exit(1);
}

main();
