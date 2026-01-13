import { NoteStatsDisplay } from "./note-stats.js";
import type { HitInfo, ViewOptions } from "./renderer.js";
import type { ParsedChart } from "./tja-parser.js";

// Ensure NoteStatsDisplay is registered
console.log("NoteStatsDisplay module loaded", NoteStatsDisplay);

const noteStats = document.getElementById("note-stats") as NoteStatsDisplay;

interface CustomWindow extends Window {
  setStats: (
    hit: HitInfo | null,
    chart: ParsedChart | null,
    viewOptions: ViewOptions | null,
    judgements?: string[],
    judgementDeltas?: (number | undefined)[],
  ) => void;
}

const w = window as unknown as CustomWindow;

w.setStats = (
  hit: HitInfo | null,
  chart: ParsedChart | null,
  viewOptions: ViewOptions | null,
  judgements: string[] = [],
  judgementDeltas: (number | undefined)[] = [],
) => {
  if (noteStats) {
    if (chart) noteStats.chart = chart;
    if (viewOptions) noteStats.viewOptions = viewOptions;
    noteStats.judgements = judgements;
    noteStats.judgementDeltas = judgementDeltas;
    noteStats.hit = hit;
  }
};
