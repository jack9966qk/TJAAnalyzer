import { NoteStatsDisplay } from "./components/note-stats.js";
// Ensure NoteStatsDisplay is registered
console.log("NoteStatsDisplay module loaded", NoteStatsDisplay);
const noteStats = document.getElementById("note-stats");
const w = window;
w.setStats = (hit, chart, viewOptions, judgements = [], judgementDeltas = []) => {
    if (noteStats) {
        if (chart)
            noteStats.chart = chart;
        if (viewOptions)
            noteStats.viewOptions = viewOptions;
        noteStats.judgements = judgements;
        noteStats.judgementDeltas = judgementDeltas;
        noteStats.hit = hit;
    }
};
