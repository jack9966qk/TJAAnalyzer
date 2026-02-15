import * as Renderer from "tja-renderer";
import { TJAChart } from "./components/tja-chart.js";
import { exampleTJA } from "./core/example-data.js";

const { createJudgementKey, DEFAULT_VIEW_OPTIONS, JudgementMap, LocationMap, parseTJA } = Renderer.Private;

type JudgementValue = Renderer.Private.JudgementValue;
type ViewOptions = Renderer.Private.ViewOptions;
type JudgementMap<T> = Renderer.Private.JudgementMap<T>;

// Ensure side-effects
console.log("TJAChart module loaded", TJAChart);

console.log("Chart Only Main Loaded");

const tjaChart = document.getElementById("chart-component") as TJAChart;

// Expose API for Playwright
window.createJudgementKey = createJudgementKey;
window.LocationMap = LocationMap;
window.JudgementMap = JudgementMap;

window.loadChart = (tjaContent: string, difficulty: string = "oni") => {
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

window.setOptions = (options: Partial<ViewOptions>) => {
  if (tjaChart.viewOptions) {
    tjaChart.viewOptions = { ...tjaChart.viewOptions, ...options } as ViewOptions;
  } else {
    // Assuming options is full if viewOptions is not set, or we need default.
    // But we set default below.
    tjaChart.viewOptions = { ...DEFAULT_VIEW_OPTIONS, ...options };
  }
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

window.autoAnnotate = () => {
  tjaChart.autoAnnotate();
};

window.setJudgements = (newJudgements: JudgementMap<JudgementValue>) => {
  tjaChart.judgements = newJudgements;
};

// Default Options
tjaChart.viewOptions = {
  ...DEFAULT_VIEW_OPTIONS,
  showAllBranches: false,
};

// Load Example by Default
try {
  console.log("Loading example chart...");
  window.loadChart(exampleTJA, "oni");
  console.log("Example chart loaded.");
} catch (e) {
  console.error("Error loading example chart:", e);
}
