import { NoteStatsDisplay } from "./components/note-stats.js";
import {
  createJudgementKey,
  type HitInfo,
  JUDGEABLE_NOTES,
  JudgementMap,
  type JudgementValue,
  type ViewOptions,
} from "./core/renderer.js";
import type { ParsedChart } from "./core/tja-parser.js";

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
  judgementsArr: string[] = [],
  judgementDeltasArr: (number | undefined)[] = [],
) => {
  if (noteStats) {
    noteStats.chart = chart;
    noteStats.viewOptions = viewOptions;
    noteStats.hit = hit;

    const map = new JudgementMap<JudgementValue>();
    if (chart && judgementsArr.length > 0) {
      let noteCount = 0;
      const counters: Record<string, number> = {};
      for (const bar of chart.bars) {
        for (const char of bar) {
          if (JUDGEABLE_NOTES.includes(char)) {
            if (noteCount < judgementsArr.length) {
              if (counters[char] === undefined) counters[char] = 0;
              const ord = counters[char];
              counters[char]++;

              map.set(createJudgementKey(char, ord), {
                judgement: judgementsArr[noteCount],
                delta: judgementDeltasArr[noteCount] || 0,
              });
            }
            noteCount++;
          }
        }
      }
    }
    noteStats.judgements = map;
  }
};
