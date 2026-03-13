import { calculateAutoZoomBeats, type LayoutRatios } from "./layout.js";
import { type Annotation, BranchName, JudgementMap, NoteLocationMap } from "./primitives.js";
import { DEFAULT_VIEW_OPTIONS, renderChart, type ViewOptions } from "./renderer.js";
import { type ParsedChart, parseTJA } from "./tja-parser.js";

export type { LayoutRatios };
export { NoteLocationMap, type Annotation, BranchName };

/**
 * @deprecated Use {@link createChart} instead.
 */
export interface RenderOptions {
  /**
   * The course/difficulty to render (e.g. "Oni", "Hard", "Normal", "Easy", "Edit").
   * Case-insensitive. Defaults to the most difficult course found.
   */
  course?: string;

  /**
   * Number of beats to display per line.
   * Equivalent to zoom level. Lower value means more zoom.
   * Default: 16 (4 bars of 4/4)
   */
  beatsPerLine?: number;

  /**
   * Whether to display all branches (Normal/Expert/Master) stacked vertically.
   * If false or omitted, only the currently active branch (usually Normal) is displayed.
   * Default: false
   */
  showAllBranches?: boolean;

  /**
   * Device Pixel Ratio (DPR) for rendering.
   * Higher values result in sharper rendering on high-DPI screens.
   * Defaults to window.devicePixelRatio or 1.
   */
  dpr?: number;

  /**
   * Whether to display the TJA and renderer software attribution text at the bottom.
   * Default: true
   */
  showAttribution?: boolean;

  /**
   * Optional source of the TJA file (e.g. "TJADB", "Local").
   * Displayed in the attribution text if showAttribution is true.
   */
  tjaSourceName?: string;

  /**
   * Optional partial overrides for the layout ratios.
   * All values are ratios relative to `baseBarWidth` (the pixel width of a 4/4 bar).
   * Only the specified fields are overridden; unspecified fields use defaults.
   */
  layoutRatios?: Partial<LayoutRatios>;
}

/**
 * @deprecated Use {@link createChart} instead.
 *
 * Parses and renders a TJA chart string to the provided canvas.
 * This is a high-level API for simple usage.
 *
 * @param tjaContent The TJA file content as a string.
 * @param canvas The HTMLCanvasElement to render to.
 * @param options Configuration options.
 */
export function renderTJAString(tjaContent: string, canvas: HTMLCanvasElement, options: RenderOptions = {}): void {
  const parsed = parseTJA(tjaContent);
  const courses = Object.keys(parsed);

  if (courses.length === 0) {
    console.warn("No courses found in TJA content.");
    return;
  }

  let selectedCourseKey = "";

  if (options.course) {
    const key = options.course.toLowerCase();
    if (parsed[key]) {
      selectedCourseKey = key;
    }
  }

  if (!selectedCourseKey) {
    // Priority: Edit > Oni > Hard > Normal > Easy
    const priorities = ["edit", "oni", "hard", "normal", "easy"];
    for (const p of priorities) {
      const match = courses.find((c) => c.toLowerCase().includes(p));
      if (match) {
        selectedCourseKey = match;
        break;
      }
    }
    // Fallback to first if none matched
    if (!selectedCourseKey) {
      selectedCourseKey = courses[0];
    }
  }

  const chart = parsed[selectedCourseKey];

  const viewOptions: ViewOptions = {
    ...DEFAULT_VIEW_OPTIONS,
    beatsPerLine: options.beatsPerLine ?? DEFAULT_VIEW_OPTIONS.beatsPerLine,
    showAllBranches: options.showAllBranches ?? false,
    showAttribution: options.showAttribution ?? true,
    tjaSourceName: options.tjaSourceName,
  };

  renderChart(chart, canvas, new JudgementMap(), viewOptions, undefined, options.dpr, options.layoutRatios);
}

// --- New Public API ---

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

export interface Chart {
  canvas: HTMLCanvasElement;
  applyAnnotations(annotations: NoteLocationMap<Annotation>): void;
}

/**
 * Creates a Chart object from a TJA string, targeting a specific course and branch.
 *
 * @param tjaContent The TJA file content as a string.
 * @param course The course specifier. If omitted, uses the highest difficulty and player 1 side.
 * @param zoom Zoom level: "auto" to fit content, or { beatsPerLine: number }. Default: 16 beats per line.
 * @param branch "auto" to render all branches with unreachable sections hidden, or a specific BranchName. Default: "auto".
 */
export function createChart(
  tjaContent: string,
  course?: CourseSpecifier,
  zoom: ZoomLevel = { beatsPerLine: 16 },
  branch: BranchSelection = "auto",
): Chart {
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

  const canvas = document.createElement("canvas");
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
      annotations: currentAnnotations,
    };
    renderChart(chart, canvas, new JudgementMap(), viewOptions);
  };

  render();

  return {
    canvas,
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
