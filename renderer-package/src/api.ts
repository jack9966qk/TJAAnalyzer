import { JudgementMap } from "./primitives.js";
import { DEFAULT_VIEW_OPTIONS, renderChart, type ViewOptions } from "./renderer.js";
import { parseTJA } from "./tja-parser.js";

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
   * Default: false
   */
  showAllBranches?: boolean;
}

/**
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
  };

  renderChart(chart, canvas, new JudgementMap(), viewOptions);
}
