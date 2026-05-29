import * as Renderer from "tja-renderer";
import { NoteStatsDisplay } from "./components/note-stats.js";
import "./style.css";

const { createJudgementKey, JUDGEABLE_NOTES, JudgementMap } = Renderer.Private;

type HitInfo = Renderer.Private.HitInfo;
type JudgementValue = Renderer.Private.JudgementValue;
type ParsedChart = Renderer.Private.ParsedChart;
type RenderOptions = Renderer.Private.RenderOptions;

// Ensure NoteStatsDisplay is registered
console.log("NoteStatsDisplay module loaded", NoteStatsDisplay);

const noteStats = document.getElementById("note-stats") as NoteStatsDisplay;

window.setStats = (
  hit: HitInfo | null,
  chart: ParsedChart | null,
  renderOptions: RenderOptions | null,
  judgementsArr: string[] = [],
  judgementDeltasArr: (number | undefined)[] = [],
) => {
  if (noteStats) {
    noteStats.chart = chart;
    noteStats.renderOptions = renderOptions;
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
