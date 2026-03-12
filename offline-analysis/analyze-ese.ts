import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import * as Renderer from "tja-renderer";

const { parseTJA, RENDERABLE_NOTES } = Renderer.Private;
type ParsedChart = Renderer.Private.ParsedChart;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, "..");
const ESE_DIR = path.join(ROOT_DIR, "public", "ese");
const MAPPING_FILE = path.join(ROOT_DIR, "data", "song_mapping.json");
const OUTPUT_DIR = path.join(__dirname, "output");

interface SongMappingEntry {
  esePath: string;
  defaultTitle: string;
  candidates?: string[];
  matchType?: string;
}

// Gap values for a sequential list of renderable notes.
// null means the note is the first, or the gap from the previous note exceeds 1 measure.
type NoteGaps = (number | null)[];

// Maps branch key → gaps. Key is "unbranched" for non-branching charts,
// or "normal" / "expert" / "master" for branching charts.
type ChartGaps = Record<string, NoteGaps>;

// For non-player-side courses: a ChartGaps directly.
// For STYLE:Double courses: maps player side (e.g. "p1", "p2") → ChartGaps.
type CourseGaps = ChartGaps | Record<string, ChartGaps>;

interface TJAAnalysis {
  courses: Record<string, CourseGaps>;
}

function computeNoteGaps(chart: ParsedChart): NoteGaps {
  const gaps: NoteGaps = [];

  for (let barIdx = 0; barIdx < chart.bars.length; barIdx++) {
    const bar = chart.bars[barIdx];
    for (let charIdx = 0; charIdx < bar.length; charIdx++) {
      if (!RENDERABLE_NOTES.includes(bar[charIdx])) continue;
      gaps.push(getGap(chart, barIdx, charIdx));
    }
  }

  return gaps;
}

function getGap(chart: ParsedChart, currentBarIdx: number, currentCharIdx: number): number | null {
  const currentBar = chart.bars[currentBarIdx];
  const currentTotal = currentBar.length;
  const currentRatio = chart.barParams?.[currentBarIdx]?.measureRatio ?? 1.0;

  for (let i = currentCharIdx - 1; i >= 0; i--) {
    if (RENDERABLE_NOTES.includes(currentBar[i])) {
      const raw = ((currentCharIdx - i) / currentTotal) * currentRatio;
      return raw;
    }
  }

  let accumulatedGap = (currentCharIdx / currentTotal) * currentRatio;

  for (let b = currentBarIdx - 1; b >= 0; b--) {
    const prevBar = chart.bars[b];
    const prevRatio = chart.barParams?.[b]?.measureRatio ?? 1.0;

    if (!prevBar || prevBar.length === 0) {
      accumulatedGap += prevRatio;
      if (accumulatedGap > 1.0 + 0.001) return null;
      continue;
    }

    const prevTotal = prevBar.length;

    for (let i = prevTotal - 1; i >= 0; i--) {
      if (RENDERABLE_NOTES.includes(prevBar[i])) {
        const distInPrev = ((prevTotal - i) / prevTotal) * prevRatio;
        const totalGap = accumulatedGap + distInPrev;

        if (totalGap <= 1.0 + 0.0001) {
          return totalGap;
        } else {
          return null;
        }
      }
    }

    accumulatedGap += prevRatio;
    if (accumulatedGap > 1.0) return null;
  }

  return null;
}

function analyzeChart(chart: ParsedChart): CourseGaps {
  if (chart.playerSides) {
    const result: Record<string, ChartGaps> = {};
    for (const [side, sideChart] of Object.entries(chart.playerSides)) {
      result[side] = analyzeLeafChart(sideChart);
    }
    return result;
  }

  return analyzeLeafChart(chart);
}

function analyzeLeafChart(chart: ParsedChart): ChartGaps {
  if (!chart.branches) {
    return { unbranched: computeNoteGaps(chart) };
  }

  const result: ChartGaps = {};
  for (const [branchName, branchChart] of Object.entries(chart.branches)) {
    if (branchChart) {
      result[branchName] = computeNoteGaps(branchChart);
    }
  }
  return result;
}

function analyzeTJA(content: string): TJAAnalysis {
  const parsed = parseTJA(content);
  const courses: Record<string, CourseGaps> = {};

  for (const [courseName, chart] of Object.entries(parsed)) {
    courses[courseName] = analyzeChart(chart);
  }

  return { courses };
}

async function main() {
  if (!fs.existsSync(MAPPING_FILE)) {
    console.error("error: missing data/song_mapping.json. Run `npm run prepare-data` first.");
    process.exit(1);
  }

  const mapping: Record<string, SongMappingEntry> = JSON.parse(fs.readFileSync(MAPPING_FILE, "utf8"));
  const entries = Object.values(mapping);

  console.log(`Processing ${entries.length} songs...`);

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
    const analysis = analyzeTJA(content);

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
