import { exampleTJA } from "./example-data.js";
import type { ViewOptions } from "./renderer.js";
import { TJAChart } from "./tja-chart.js";
import { parseTJA } from "./tja-parser.js";

// Ensure side-effects
console.log("TJAChart module loaded", TJAChart);

console.log("Chart Only Main Loaded");

const tjaChart = document.getElementById("chart-component") as TJAChart;

// Expose API for Playwright
(window as any).loadChart = (tjaContent: string, difficulty: string = "oni") => {
  try {
    const parsed = parseTJA(tjaContent);
    const chart = parsed[difficulty] || Object.values(parsed)[0];

    if (chart) {
      tjaChart.chart = chart;
      // Also update difficulty display if we had one, but here we just render
    } else {
      console.error("Difficulty not found");
    }
  } catch (e) {
    console.error("Failed to parse TJA", e);
  }
};

(window as any).setOptions = (options: ViewOptions) => {
  tjaChart.viewOptions = options;
};

// Listen for annotation changes from the component
tjaChart.addEventListener("annotations-change", (e: Event) => {
  const newAnnotations = (e as CustomEvent).detail;
  // Update options with new annotations
  if (tjaChart.viewOptions) {
    tjaChart.viewOptions = {
      ...tjaChart.viewOptions,
      annotations: newAnnotations,
    };
  }
});

(window as any).autoAnnotate = () => {
  tjaChart.autoAnnotate();
};

(window as any).setJudgements = (judgements: string[], deltas: (number | undefined)[]) => {
  tjaChart.judgements = judgements;
  tjaChart.judgementDeltas = deltas || [];
};

// Initial Setup
// Ensure tja-chart is defined (imported above)

// Default Options
tjaChart.viewOptions = {
  viewMode: "original",
  coloringMode: "categorical",
  visibility: { perfect: true, good: true, poor: true },
  collapsedLoop: false,
  selectedLoopIteration: undefined,
  beatsPerLine: 16,
  selection: null,
  annotations: {},
  isAnnotationMode: false,
  showAllBranches: false,
};

// Load Example by Default
try {
  console.log("Loading example chart...");
  (window as any).loadChart(exampleTJA, "oni");
  console.log("Example chart loaded.");
} catch (e) {
  console.error("Error loading example chart:", e);
}
