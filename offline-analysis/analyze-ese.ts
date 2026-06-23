import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeTJA, type GapUnit } from "./tja-gaps.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, "..");
const ESE_DIR = path.join(ROOT_DIR, "public", "ese");
const MAPPING_FILE = path.join(ROOT_DIR, "data", "song_mapping.json");
const OUTPUT_DIR = path.join(__dirname, "output");

function parseGapUnit(): GapUnit {
  const idx = process.argv.indexOf("--unit");
  if (idx === -1) return "measures";
  const value = process.argv[idx + 1];
  if (value === "ms") return "ms";
  if (value === "measures") return "measures";
  console.error(`error: unknown unit "${value}". Expected "measures" or "ms".`);
  process.exit(1);
}

interface SongMappingEntry {
  esePath: string;
  defaultTitle: string;
  candidates?: string[];
  matchType?: string;
}

async function main() {
  const unit = parseGapUnit();

  if (!fs.existsSync(MAPPING_FILE)) {
    console.error("error: missing data/song_mapping.json. Run `npm run prepare-data` first.");
    process.exit(1);
  }

  const mapping: Record<string, SongMappingEntry> = JSON.parse(fs.readFileSync(MAPPING_FILE, "utf8"));
  const entries = Object.values(mapping);

  console.log(`Processing ${entries.length} songs (unit: ${unit})...`);

  let processed = 0;
  let skipped = 0;

  for (const entry of entries) {
    const tjaPath = path.join(ESE_DIR, entry.esePath);

    if (!fs.existsSync(tjaPath)) {
      console.warn(`  skip (not found): ${entry.esePath}`);
      skipped++;
      continue;
    }

    const content = fs.readFileSync(tjaPath, "utf8");
    const analysis = analyzeTJA(content, unit);

    const outputPath = path.join(OUTPUT_DIR, entry.esePath.replace(/\.tja$/i, ".json"));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(analysis), "utf8");

    processed++;
  }

  console.log(`Done. ${processed} processed, ${skipped} skipped.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
