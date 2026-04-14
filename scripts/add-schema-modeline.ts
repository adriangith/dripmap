import * as fs from "fs";
import * as path from "path";

const SCHEMA_REL = "schemas/location.schema.json";
const MODELINE_PREFIX = "# yaml-language-server: $schema=";

function getYamlFiles(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...getYamlFiles(fullPath));
    else if (entry.name.endsWith(".yaml")) results.push(fullPath);
  }
  return results;
}

const root = process.cwd();
const locationsDir = path.resolve(root, "data/locations");
const files = getYamlFiles(locationsDir);

let updated = 0;
let skipped = 0;

for (const file of files) {
  const schemaAbs = path.resolve(root, SCHEMA_REL);
  const relFromYaml = path.relative(path.dirname(file), schemaAbs);
  const modeline = `${MODELINE_PREFIX}${relFromYaml}`;

  const content = fs.readFileSync(file, "utf-8");
  const lines = content.split("\n");

  if (lines[0]?.startsWith(MODELINE_PREFIX)) {
    if (lines[0] === modeline) {
      skipped++;
      continue;
    }
    lines[0] = modeline;
  } else {
    lines.unshift(modeline);
  }

  fs.writeFileSync(file, lines.join("\n"));
  updated++;
}

console.log(`Modeline: ${updated} updated, ${skipped} already current (${files.length} total)`);
