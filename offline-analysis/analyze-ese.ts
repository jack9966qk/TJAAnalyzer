import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as Renderer from "tja-renderer";
import { getGapMeasures, getGapMs } from "../src/utils/note-gap.js";

const { parseTJA, RENDERABLE_NOTES } = Renderer.Private;
type ParsedChart = Renderer.Private.ParsedChart;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, "..");
const ESE_DIR = path.join(ROOT_DIR, "public", "ese");
const MAPPING_FILE = path.join(ROOT_DIR, "data", "song_mapping.json");
const OUTPUT_DIR = path.join(__dirname, "output");

type GapUnit = "measures" | "ms";

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

// Gap values for renderable notes, grouped by bar.
// Each subarray corresponds to one bar's renderable notes.
// null means the note is the first, or the previous renderable note is not a small/large don or ka.
type NoteGaps = (number | null)[][];

// Maps branch key → gaps. Key is "unbranched" for non-branching charts,
// or "normal" / "expert" / "master" for branching charts.
type ChartGaps = Record<string, NoteGaps>;

// For non-player-side courses: a ChartGaps directly.
// For STYLE:Double courses: maps player side (e.g. "p1", "p2") → ChartGaps.
type CourseGaps = ChartGaps | Record<string, ChartGaps>;

interface TJAAnalysis {
  courses: Record<string, CourseGaps>;
}

const GAP_OPTIONS = { requireJudgeable: true } as const;

function computeNoteGaps(chart: ParsedChart, unit: GapUnit): NoteGaps {
  const gaps: NoteGaps = [];
  const getGapFn = unit === "ms" ? getGapMs : getGapMeasures;

  for (let barIdx = 0; barIdx < chart.bars.length; barIdx++) {
    const bar = chart.bars[barIdx];
    const barGaps: (number | null)[] = [];
    for (let charIdx = 0; charIdx < bar.length; charIdx++) {
      if (!RENDERABLE_NOTES.includes(bar[charIdx])) continue;
      const gap = getGapFn(chart, barIdx, charIdx, GAP_OPTIONS);
      barGaps.push(gap !== null ? Math.round(gap * 1000) / 1000 : null);
    }
    gaps.push(barGaps);
  }

  return gaps;
}

function analyzeChart(chart: ParsedChart, unit: GapUnit): CourseGaps {
  if (chart.playerSides) {
    const result: Record<string, ChartGaps> = {};
    for (const [side, sideChart] of Object.entries(chart.playerSides)) {
      result[side] = analyzeLeafChart(sideChart, unit);
    }
    return result;
  }

  return analyzeLeafChart(chart, unit);
}

function analyzeLeafChart(chart: ParsedChart, unit: GapUnit): ChartGaps {
  if (!chart.branches) {
    return { unbranched: computeNoteGaps(chart, unit) };
  }

  const result: ChartGaps = {};
  for (const [branchName, branchChart] of Object.entries(chart.branches)) {
    if (branchChart) {
      result[branchName] = computeNoteGaps(branchChart, unit);
    }
  }
  return result;
}

function analyzeTJA(content: string, unit: GapUnit): TJAAnalysis {
  const parsed = parseTJA(content);
  const courses: Record<string, CourseGaps> = {};

  for (const [courseName, chart] of Object.entries(parsed)) {
    courses[courseName] = analyzeChart(chart, unit);
  }

  return { courses };
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
