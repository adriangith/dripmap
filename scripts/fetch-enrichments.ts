/**
 * Build-time script to fetch enrichment data from configured providers
 * and write it to public/generated/enrichments.json.
 *
 * Usage: npx tsx scripts/fetch-enrichments.ts
 *
 * Set ENRICHMENT_PROVIDERS=overpass,bom (comma-separated).
 * Defaults to all providers if not set.
 */
import * as fs from "fs";
import * as path from "path";
import type { EnrichmentProvider } from "../src/lib/integrations/enrichment-types";
import { mergeEnrichments } from "../src/lib/integrations/enrichment-types";
import type { PlaceIndexEntry } from "../src/lib/types";
import { overpassProvider } from "../src/lib/integrations/providers/overpass";
import { bomProvider } from "../src/lib/integrations/providers/bom";

// ── Provider registry ────────────────────────────────────────

const REGISTRY: Record<string, EnrichmentProvider> = {
  overpass: overpassProvider,
  bom: bomProvider,
};

const DEFAULT_PROVIDERS = ["overpass", "bom"];

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const providerNames = (process.env.ENRICHMENT_PROVIDERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const activeProviders =
    providerNames.length > 0 ? providerNames : DEFAULT_PROVIDERS;

  const outputDir = path.resolve(process.cwd(), "public/generated");
  const indexPath = path.join(outputDir, "locations-index.json");
  const enrichmentPath = path.join(outputDir, "enrichments.json");

  // Load location index
  if (!fs.existsSync(indexPath)) {
    console.log(
      "ℹ  No locations-index.json found — run build:data first. Skipping enrichments."
    );
    return;
  }

  const locations: PlaceIndexEntry[] = JSON.parse(
    fs.readFileSync(indexPath, "utf-8")
  );
  console.log(`📍 Loaded ${locations.length} locations for enrichment.\n`);

  const allBatches = [];

  for (const name of activeProviders) {
    const provider = REGISTRY[name];
    if (!provider) {
      console.warn(`⚠  Unknown enrichment provider "${name}" — skipping.`);
      continue;
    }

    console.log(`→ Enriching with ${provider.name}...`);
    try {
      const enrichments = await provider.enrich(locations);
      console.log(
        `  ✓ ${enrichments.length} locations enriched by ${provider.name}\n`
      );
      allBatches.push(enrichments);
    } catch (err) {
      console.warn(`  ⚠  ${provider.name} failed:`, err);
    }
  }

  // Merge all enrichments
  const merged = mergeEnrichments(...allBatches);
  const count = Object.keys(merged).length;

  // Write output
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(enrichmentPath, JSON.stringify(merged, null, 2));

  console.log(
    `\n✅ Wrote enrichments for ${count} locations to ${path.relative(process.cwd(), enrichmentPath)}`
  );
}

main().catch((err) => {
  console.error("Error fetching enrichments:", err);
  process.exit(1);
});
