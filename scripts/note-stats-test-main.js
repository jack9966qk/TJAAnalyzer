import { NoteStatsDisplay } from "./components/note-stats.js";
import { createJudgementKey, } from "./core/renderer.js";
// Ensure NoteStatsDisplay is registered
console.log("NoteStatsDisplay module loaded", NoteStatsDisplay);
const noteStats = document.getElementById("note-stats");
const w = window;
w.setStats = (hit, chart, viewOptions, judgementsArr = [], judgementDeltasArr = []) => {
    if (noteStats) {
        noteStats.chart = chart;
        noteStats.viewOptions = viewOptions;
        noteStats.hit = hit;
        const map = new Map();
        if (chart && judgementsArr.length > 0) {
            let noteCount = 0;
            const counters = {};
            for (const bar of chart.bars) {
                for (const char of bar) {
                    if (["1", "2", "3", "4"].includes(char)) {
                        if (noteCount < judgementsArr.length) {
                            if (counters[char] === undefined)
                                counters[char] = 0;
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
