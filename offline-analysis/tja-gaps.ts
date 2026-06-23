import * as Renderer from "tja-renderer";
import { getGapMeasures, getGapMs, LongNoteHandling } from "../src/utils/note-gap.js";

const { parseTJA, RENDERABLE_NOTES } = Renderer.Private;
type ParsedChart = Renderer.Private.ParsedChart;

export type GapUnit = "measures" | "ms";

// Gap values for renderable notes, grouped by bar.
// Each subarray corresponds to one bar's renderable notes.
// null means the note is the first, or the previous renderable note is not a small/large don or ka.
export type NoteGaps = (number | null)[][];

// Maps branch key → gaps. Key is "unbranched" for non-branching charts,
// or "normal" / "expert" / "master" for branching charts.
export type ChartGaps = Record<string, NoteGaps>;

// For non-player-side courses: a ChartGaps directly.
// For STYLE:Double courses: maps player side (e.g. "p1", "p2") → ChartGaps.
export type CourseGaps = ChartGaps | Record<string, ChartGaps>;

export interface TJAAnalysis {
  courses: Record<string, CourseGaps>;
}

const GAP_OPTIONS = { longNoteHandling: LongNoteHandling.Strict } as const;

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

/** Parse a TJA string and return the note gaps for every course. */
export function analyzeTJA(content: string, unit: GapUnit = "measures"): TJAAnalysis {
  const parsed = parseTJA(content);
  const courses: Record<string, CourseGaps> = {};

  for (const [courseName, chart] of Object.entries(parsed)) {
    courses[courseName] = analyzeChart(chart, unit);
  }

  return { courses };
}
