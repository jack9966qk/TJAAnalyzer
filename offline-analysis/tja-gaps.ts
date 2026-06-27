import * as Renderer from "tja-renderer";
import { getGapMeasures, getGapMs, LongNoteHandling } from "../src/utils/note-gap.js";

export { LongNoteHandling } from "../src/utils/note-gap.js";

const { parseTJA, RENDERABLE_NOTES, NoteType } = Renderer.Private;
type ParsedChart = Renderer.Private.ParsedChart;

export type GapUnit = "measures" | "ms";

// Gap values for renderable notes, grouped by bar.
// Each subarray corresponds to one bar's renderable notes.
// null means there is no measurable previous note — the first note, or (depending on
// longNoteHandling) a note preceded only by long notes such as drumrolls/balloons.
export type NoteGaps = (number | null)[][];

// Maps branch key → gaps. Key is "unbranched" for non-branching charts,
// or "normal" / "expert" / "master" for branching charts.
export type ChartGaps = Record<string, NoteGaps>;

// For non-player-side courses: a ChartGaps directly.
// For STYLE:Double courses: maps player side (e.g. "p1", "p2") → ChartGaps.
export type CourseGaps = ChartGaps | Record<string, ChartGaps>;

/**
 * Simplified note types for calculator input.
 * 1 = Don/DonBig (right hand), 2 = Ka/KaBig (left hand).
 * This is a flat array, one entry per judgeable note (Don/Ka/DonBig/KaBig),
 * matching the order notes appear in the chart.
 */
export type SimplifiedNoteTypes = number[];

/** Maps branch key → simplified note types. */
export type ChartNoteTypes = Record<string, SimplifiedNoteTypes>;

/** Course-level note types: ChartNoteTypes or player-side → ChartNoteTypes for STYLE:Double. */
export type CourseNoteTypes = ChartNoteTypes | Record<string, ChartNoteTypes>;

export interface TJAAnalysis {
  courses: Record<string, CourseGaps>;
  noteTypes: Record<string, CourseNoteTypes>;
}

const JUDGEABLE_NOTE_TYPES = [NoteType.Don, NoteType.Ka, NoteType.DonBig, NoteType.KaBig];

function simplifyNoteType(note: string): number | null {
  if (note === NoteType.Don || note === NoteType.DonBig) return 1;
  if (note === NoteType.Ka || note === NoteType.KaBig) return 2;
  return null;
}

/** Extract simplified note types (1/2) for all judgeable notes in a chart. */
function computeNoteTypes(chart: ParsedChart): SimplifiedNoteTypes {
  const noteTypes: number[] = [];
  for (let barIdx = 0; barIdx < chart.bars.length; barIdx++) {
    const bar = chart.bars[barIdx];
    for (let charIdx = 0; charIdx < bar.length; charIdx++) {
      const simplified = simplifyNoteType(bar[charIdx]);
      if (simplified !== null) {
        noteTypes.push(simplified);
      }
    }
  }
  return noteTypes;
}

function computeNoteGaps(chart: ParsedChart, unit: GapUnit, longNoteHandling: LongNoteHandling): NoteGaps {
  const gaps: NoteGaps = [];
  const getGapFn = unit === "ms" ? getGapMs : getGapMeasures;
  const options = { longNoteHandling };

  for (let barIdx = 0; barIdx < chart.bars.length; barIdx++) {
    const bar = chart.bars[barIdx];
    const barGaps: (number | null)[] = [];
    for (let charIdx = 0; charIdx < bar.length; charIdx++) {
      if (!JUDGEABLE_NOTE_TYPES.includes(bar[charIdx])) continue;
      const gap = getGapFn(chart, barIdx, charIdx, options);
      barGaps.push(gap !== null ? Math.round(gap * 1000) / 1000 : null);
    }
    gaps.push(barGaps);
  }

  return gaps;
}

function analyzeLeafChart(chart: ParsedChart, unit: GapUnit, longNoteHandling: LongNoteHandling): { gaps: ChartGaps; noteTypes: ChartNoteTypes } {
  if (!chart.branches) {
    return {
      gaps: { unbranched: computeNoteGaps(chart, unit, longNoteHandling) },
      noteTypes: { unbranched: computeNoteTypes(chart) },
    };
  }

  const gaps: ChartGaps = {};
  const noteTypes: ChartNoteTypes = {};
  for (const [branchName, branchChart] of Object.entries(chart.branches)) {
    if (branchChart) {
      gaps[branchName] = computeNoteGaps(branchChart, unit, longNoteHandling);
      noteTypes[branchName] = computeNoteTypes(branchChart);
    }
  }
  return { gaps, noteTypes };
}

function analyzeChart(chart: ParsedChart, unit: GapUnit, longNoteHandling: LongNoteHandling): { gaps: CourseGaps; noteTypes: CourseNoteTypes } {
  if (chart.playerSides) {
    const gaps: Record<string, ChartGaps> = {};
    const noteTypes: Record<string, ChartNoteTypes> = {};
    for (const [side, sideChart] of Object.entries(chart.playerSides)) {
      const analyzed = analyzeLeafChart(sideChart, unit, longNoteHandling);
      gaps[side] = analyzed.gaps;
      noteTypes[side] = analyzed.noteTypes;
    }
    return { gaps, noteTypes };
  }

  return analyzeLeafChart(chart, unit, longNoteHandling);
}

/**
 * Parse a TJA string and return the note gaps and note types for every course.
 * `longNoteHandling` controls how drumrolls/balloons are treated when walking back to the
 * previous note (see LongNoteHandling); defaults to Strict (long notes reset the gap to null).
 */
export function analyzeTJA(
  content: string,
  unit: GapUnit = "measures",
  longNoteHandling: LongNoteHandling = LongNoteHandling.Strict,
): TJAAnalysis {
  const parsed = parseTJA(content);
  const courses: Record<string, CourseGaps> = {};
  const noteTypes: Record<string, CourseNoteTypes> = {};

  for (const [courseName, chart] of Object.entries(parsed)) {
    const analyzed = analyzeChart(chart, unit, longNoteHandling);
    courses[courseName] = analyzed.gaps;
    noteTypes[courseName] = analyzed.noteTypes;
  }

  return { courses, noteTypes };
}
