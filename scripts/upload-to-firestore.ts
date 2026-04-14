import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { initializeApp, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { validatePlace } from "./validate-locations";
import { buildIndex, buildDetail } from "./build-locations";
import type { Place, PlaceIndexEntry } from "../src/lib/types";

// ── Helpers ──────────────────────────────────────────────────

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

function parseArgs(): { serviceAccountPath: string | null; help: boolean } {
  const args = process.argv.slice(2);
  let serviceAccountPath: string | null = null;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--help" || args[i] === "-h") {
      help = true;
    } else if (args[i] === "--service-account" && i + 1 < args.length) {
      serviceAccountPath = args[++i];
    }
  }

  return { serviceAccountPath, help };
}

function printUsage(): void {
  console.log(`
Usage: npx tsx scripts/upload-to-firestore.ts [options]

Upload validated YAML location data to Firestore.

Options:
  --service-account <path>  Path to Firebase service account JSON key file
  -h, --help                Show this help message

Environment Variables:
  GOOGLE_APPLICATION_CREDENTIALS  Path to service account JSON (used if
                                  --service-account is not provided)

The script reads all YAML files from data/locations/, validates them,
then uploads each location to a "locations" collection (keyed by slug)
and writes a "locations-meta" document in the "meta" collection with
the full index array.
`);
}

// ── Main ─────────────────────────────────────────────────────

async function main(): Promise<void> {
  const { serviceAccountPath, help } = parseArgs();

  if (help) {
    printUsage();
    process.exit(0);
  }

  // Initialize Firebase Admin
  const credentialPath =
    serviceAccountPath ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialPath) {
    console.error(
      "Error: No credentials provided.\n" +
        "Use --service-account <path> or set GOOGLE_APPLICATION_CREDENTIALS."
    );
    process.exit(1);
  }

  if (!fs.existsSync(credentialPath)) {
    console.error(`Error: Service account file not found: ${credentialPath}`);
    process.exit(1);
  }

  const serviceAccount = JSON.parse(
    fs.readFileSync(credentialPath, "utf-8")
  ) as ServiceAccount;

  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();

  // Read and validate YAML files
  const locationsDir = path.resolve(process.cwd(), "data/locations");

  if (!fs.existsSync(locationsDir)) {
    console.error(`Error: ${locationsDir} does not exist`);
    process.exit(1);
  }

  const files = getYamlFiles(locationsDir);

  if (files.length === 0) {
    console.warn("Warning: No YAML files found in data/locations/.");
    process.exit(0);
  }

  console.log(`Found ${files.length} YAML file(s). Validating...`);

  const places: Place[] = [];
  let hasErrors = false;

  for (const filePath of files) {
    const relPath = path.relative(locationsDir, filePath);
    const content = fs.readFileSync(filePath, "utf-8");

    let data: Record<string, unknown>;
    try {
      data = yaml.load(content) as Record<string, unknown>;
    } catch (e) {
      console.error(`❌ ${relPath}: YAML parse error — ${(e as Error).message}`);
      hasErrors = true;
      continue;
    }

    const errors = validatePlace(data);
    if (errors.length > 0) {
      console.error(`❌ ${relPath}:`);
      for (const error of errors) {
        console.error(`   - ${error}`);
      }
      hasErrors = true;
      continue;
    }

    places.push(data as unknown as Place);
    console.log(`  ✓ ${relPath}`);
  }

  if (hasErrors) {
    console.error("\nValidation failed. Fix errors before uploading.");
    process.exit(1);
  }

  console.log(`\nAll ${places.length} locations validated. Uploading to Firestore...\n`);

  // Build index and detail data
  const index: PlaceIndexEntry[] = buildIndex(places);
  const details: Place[] = places.map(buildDetail);

  // Prepare all write operations
  const MAX_BATCH_SIZE = 500;
  let opsCount = 0;
  let batchCount = 0;
  let batch = db.batch();

  const flushBatch = async (): Promise<void> => {
    if (opsCount === 0) return;
    await batch.commit();
    batchCount++;
    console.log(`  Batch ${batchCount} committed (${opsCount} ops)`);
    opsCount = 0;
    batch = db.batch();
  };

  // Upload each location document
  for (const detail of details) {
    if (opsCount >= MAX_BATCH_SIZE) {
      await flushBatch();
    }
    const docRef = db.collection("locations").doc(detail.slug);
    batch.set(docRef, JSON.parse(JSON.stringify(detail)));
    opsCount++;
    console.log(`  → locations/${detail.slug}`);
  }

  // Upload locations-meta document
  if (opsCount >= MAX_BATCH_SIZE) {
    await flushBatch();
  }
  const metaRef = db.collection("meta").doc("locations-meta");
  batch.set(metaRef, {
    entries: JSON.parse(JSON.stringify(index)),
    updatedAt: FieldValue.serverTimestamp(),
  });
  opsCount++;
  console.log(`  → meta/locations-meta (${index.length} entries)`);

  // Commit remaining operations
  await flushBatch();

  console.log(
    `\n✅ Upload complete: ${details.length} locations + 1 meta document ` +
      `(${batchCount} batch${batchCount !== 1 ? "es" : ""})`
  );
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
