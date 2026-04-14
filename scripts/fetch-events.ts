/**
 * Build-time script to fetch external events from configured providers,
 * convert them to Place objects, and write them into public/generated/
 * alongside the YAML-sourced data.
 *
 * Usage: npx tsx scripts/fetch-events.ts
 *
 * Set EXTERNAL_PROVIDERS=stub to enable the stub provider (for dev).
 * In production, set it to a comma-separated list of provider names.
 */
import * as fs from "fs";
import * as path from "path";
import type { EventProvider } from "../src/lib/integrations/types";
import { toPlace, toIndexEntry } from "../src/lib/integrations/types";
import { stubProvider } from "../src/lib/integrations/providers/stub";

// ── Provider registry ────────────────────────────────────────

const REGISTRY: Record<string, EventProvider> = {
  stub: stubProvider,
};

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const providerNames = (process.env.EXTERNAL_PROVIDERS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (providerNames.length === 0) {
    console.log("ℹ  No EXTERNAL_PROVIDERS configured — skipping external event fetch.");
    return;
  }

  const outputDir = path.resolve(process.cwd(), "public/generated");
  const detailDir = path.join(outputDir, "locations");
  const indexPath = path.join(outputDir, "locations-index.json");

  // Load existing index to deduplicate
  let existingSlugs = new Set<string>();
  if (fs.existsSync(indexPath)) {
    const index = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    existingSlugs = new Set(index.map((e: { slug: string }) => e.slug));
  }

  const newIndexEntries: ReturnType<typeof toIndexEntry>[] = [];
  let totalFetched = 0;
  let totalNew = 0;

  for (const name of providerNames) {
    const provider = REGISTRY[name];
    if (!provider) {
      console.warn(`⚠  Unknown provider "${name}" — skipping.`);
      continue;
    }

    console.log(`→ Fetching from ${provider.name}...`);
    const events = await provider.fetchEvents();
    totalFetched += events.length;

    for (const event of events) {
      const place = toPlace(event);

      if (existingSlugs.has(place.slug)) {
        console.log(`  ⏭  ${place.slug} (already exists)`);
        continue;
      }

      existingSlugs.add(place.slug);
      totalNew++;

      // Write detail JSON
      fs.writeFileSync(
        path.join(detailDir, `${place.slug}.json`),
        JSON.stringify(place, null, 2)
      );
      console.log(`  ✓  ${place.slug}`);

      newIndexEntries.push(toIndexEntry(place));
    }
  }

  // Append to existing index
  if (newIndexEntries.length > 0 && fs.existsSync(indexPath)) {
    const existingIndex = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    const merged = [...existingIndex, ...newIndexEntries];
    fs.writeFileSync(indexPath, JSON.stringify(merged, null, 2));
  }

  console.log(`\nFetched ${totalFetched} events, added ${totalNew} new.`);
}

main().catch((err) => {
  console.error("Error fetching external events:", err);
  process.exit(1);
});
