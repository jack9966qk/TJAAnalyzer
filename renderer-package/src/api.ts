import { calculateAutoZoomBeats, type LayoutRatios } from "./layout.js";
import { type Annotation, BranchName, JudgementMap, NoteLocationMap } from "./primitives.js";
import { DEFAULT_VIEW_OPTIONS, renderChart, type ViewOptions } from "./renderer.js";
import { type ParsedChart, parseTJA } from "./tja-parser.js";

export type { LayoutRatios };
export { NoteLocationMap, type Annotation, BranchName };

export interface CourseSpecifier {
  difficulty: string;
  playerSide?: string;
}

export interface ChartInfo {
  courseSpecifiers: CourseSpecifier[];
  hasBranching(course: CourseSpecifier): boolean;
}

/**
 * Parses a TJA string and returns information about available courses.
 */
export function getChartInfo(tjaContent: string): ChartInfo {
  const parsed = parseTJA(tjaContent);
  const specifiers: CourseSpecifier[] = [];
  const branchingMap = new Map<string, boolean>();

  for (const [difficulty, chart] of Object.entries(parsed)) {
    if (chart.playerSides) {
      for (const side of Object.keys(chart.playerSides)) {
        const sideChart = chart.playerSides[side];
        const spec: CourseSpecifier = { difficulty, playerSide: side };
        specifiers.push(spec);
        branchingMap.set(courseSpecifierKey(spec), !!sideChart.branches);
      }
    } else {
      const spec: CourseSpecifier = { difficulty };
      specifiers.push(spec);
      branchingMap.set(courseSpecifierKey(spec), !!chart.branches);
    }
  }

  return {
    courseSpecifiers: specifiers,
    hasBranching(course: CourseSpecifier): boolean {
      return branchingMap.get(courseSpecifierKey(course)) ?? false;
    },
  };
}

export interface ZoomByBeatsPerLine {
  beatsPerLine: number;
}

export type ZoomLevel = "auto" | ZoomByBeatsPerLine;

export type BranchSelection = "auto" | BranchName;

export interface ChartViewOptions {
  /** Zoom level. `auto` to fit content with best effort to ensure a minimum note size. */
  zoom?: ZoomLevel;

  /** Branch to render. `auto` to render all branches with unreachable sections hidden. */
  branch?: BranchSelection;

  /** Device Pixel Ratio (DPR) for rendering. */
  dpr?: number;

  /** Whether to display the TJA and renderer software attribution text at the bottom. */
  showAttribution?: boolean;

  /**
   * Name of the source of the TJA file.
   * Displayed in the attribution text if showAttribution is true.
   */
  tjaSourceName?: string;

  /**
   * Partial overrides for the layout ratios.
   * All values are ratios relative to `baseBarWidth` (the pixel width of a 4/4 bar).
   * Only the specified fields are overridden; unspecified fields use defaults.
   */
  layoutRatios?: Partial<LayoutRatios>;
}

export const CREATE_CHART_OPTIONS_DEFAULTS: Required<Pick<ChartViewOptions, "zoom" | "branch" | "showAttribution">> = {
  zoom: { beatsPerLine: 16 },
  branch: "auto",
  showAttribution: true,
};

export interface ChartView {
  applyAnnotations(annotations: NoteLocationMap<Annotation>): void;
}

/**
 * Renders a TJA chart to the provided canvas.
 *
 * @param tjaContent The TJA file content as a string.
 * @param canvas The HTMLCanvasElement to render to. Must be in the DOM for correct sizing.
 * @param course The course specifier. If omitted, uses the highest difficulty and player 1 side.
 * @param options Chart creation and rendering options.
 */
export function createChartView(
  tjaContent: string,
  canvas: HTMLCanvasElement,
  course?: CourseSpecifier,
  options: ChartViewOptions = {},
): ChartView {
  const { zoom, branch, showAttribution, dpr, tjaSourceName, layoutRatios } = {
    ...CREATE_CHART_OPTIONS_DEFAULTS,
    ...options,
  };

  const parsed = parseTJA(tjaContent);
  const resolvedCourse = course ?? resolveDefaultCourse(parsed);
  const diffKey = resolvedCourse.difficulty.toLowerCase();
  let rootChart = parsed[diffKey];

  if (!rootChart) {
    throw new Error(`Difficulty "${resolvedCourse.difficulty}" not found in TJA content.`);
  }

  // Resolve player side: use specified side, or default to first side (p1) if chart has sides
  const playerSide = resolvedCourse.playerSide ?? resolveDefaultPlayerSide(rootChart);
  if (playerSide && rootChart.playerSides) {
    const sideChart = rootChart.playerSides[playerSide];
    if (!sideChart) {
      throw new Error(`Player side "${playerSide}" not found for difficulty "${resolvedCourse.difficulty}".`);
    }
    rootChart = sideChart;
  }

  // Resolve branch
  let chart: ParsedChart;
  let showAllBranches: boolean;

  if (branch !== "auto") {
    if (!rootChart.branches) {
      throw new Error(`Branch "${branch}" requested but chart has no branching.`);
    }
    const branchChart = rootChart.branches[branch];
    if (!branchChart) {
      throw new Error(`Branch "${branch}" not found.`);
    }
    chart = branchChart;
    showAllBranches = false;
  } else {
    chart = rootChart;
    showAllBranches = !!rootChart.branches;
  }

  if (!canvas.clientWidth) {
    throw new Error("Canvas has no clientWidth. Ensure the canvas is in the DOM before calling createChart.");
  }

  let currentAnnotations = new NoteLocationMap<Annotation>();

  const resolveBeatsPerLine = (): number => {
    if (zoom === "auto") {
      return calculateAutoZoomBeats(canvas.clientWidth || canvas.width);
    }
    return zoom.beatsPerLine;
  };

  const render = () => {
    const viewOptions: ViewOptions = {
      ...DEFAULT_VIEW_OPTIONS,
      beatsPerLine: resolveBeatsPerLine(),
      showAllBranches,
      showAttribution,
      tjaSourceName,
      annotations: currentAnnotations,
    };
    renderChart(chart, canvas, new JudgementMap(), viewOptions, undefined, dpr, layoutRatios);
  };

  render();

  return {
    applyAnnotations(annotations: NoteLocationMap<Annotation>): void {
      currentAnnotations = annotations;
      render();
    },
  };
}

function courseSpecifierKey(spec: CourseSpecifier): string {
  if (spec.playerSide) {
    return `${spec.difficulty}:${spec.playerSide}`;
  }
  return spec.difficulty;
}

const DIFFICULTY_PRIORITIES = ["edit", "oni", "hard", "normal", "easy"];

function resolveDefaultCourse(parsed: Record<string, ParsedChart>): CourseSpecifier {
  const courses = Object.keys(parsed);
  if (courses.length === 0) {
    throw new Error("No courses found in TJA content.");
  }

  let difficulty = courses[0];
  for (const p of DIFFICULTY_PRIORITIES) {
    const match = courses.find((c) => c.toLowerCase().includes(p));
    if (match) {
      difficulty = match;
      break;
    }
  }

  return { difficulty };
}

function resolveDefaultPlayerSide(chart: ParsedChart): string | undefined {
  if (!chart.playerSides) return undefined;
  const sides = Object.keys(chart.playerSides).sort();
  // Prefer p1, then first available side
  return sides.find((s) => s === "p1") ?? sides[0];
}
