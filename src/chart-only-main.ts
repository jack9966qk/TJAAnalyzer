import * as Renderer from "tja-renderer";
import { TJAChart } from "./components/tja-chart.js";
import { exampleTJA } from "./core/example-data.js";

const {
  createJudgementKey,
  createLayout,
  DEFAULT_TEXTS,
  DEFAULT_RENDER_OPTIONS,
  JudgementMap,
  NoteLocationMap,
  parseTJA,
  renderLayout,
  resolveCanvasWidth,
} = Renderer.Private;

type Insets = Renderer.Private.Insets;
type JudgementValue = Renderer.Private.JudgementValue;
type RenderOptions = Renderer.Private.RenderOptions;
type JudgementMap<T> = Renderer.Private.JudgementMap<T>;

// Ensure side-effects
console.log("TJAChart module loaded", TJAChart);

console.log("Chart Only Main Loaded");

const tjaChart = document.getElementById("chart-component") as TJAChart;

// Expose API for Playwright
window.createJudgementKey = createJudgementKey;
window.NoteLocationMap = NoteLocationMap;
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

window.setOptions = (options: Partial<RenderOptions>) => {
  if (tjaChart.renderOptions) {
    tjaChart.renderOptions = { ...tjaChart.renderOptions, ...options } as RenderOptions;
  } else {
    // Assuming options is full if renderOptions is not set, or we need default.
    // But we set default below.
    tjaChart.renderOptions = { ...DEFAULT_RENDER_OPTIONS, ...options };
  }
};

// Listen for annotation changes from the component
tjaChart.addEventListener("annotations-change", (e: Event) => {
  const newAnnotations = (e as CustomEvent).detail;
  // Update options with new annotations
  if (tjaChart.renderOptions) {
    tjaChart.renderOptions = {
      ...tjaChart.renderOptions,
      annotations: newAnnotations,
    };
  }
});

window.getLayoutInfo = () => {
  const layout = tjaChart.layout;
  if (!layout) return null;
  return {
    offsetY: layout.offsetY,
    headerHeight: layout.headerHeight,
    insets: { ...layout.insets },
    constants: {
      statusFontSize: layout.constants.statusFontSize,
      barNumberOffsetY: layout.constants.barNumberOffsetY,
    },
  };
};

window.autoAnnotate = () => {
  tjaChart.autoAnnotate();
};

window.setJudgements = (newJudgements: JudgementMap<JudgementValue>) => {
  tjaChart.judgements = newJudgements;
};

window.renderChartCustom = (
  tjaContent: string,
  difficulty: string,
  renderOptions: Partial<RenderOptions>,
  insets: Insets,
) => {
  try {
    const parsed = parseTJA(tjaContent);
    const key = difficulty.toLowerCase();
    const chart = parsed[key] || Object.values(parsed)[0];
    if (!chart) {
      console.error("No chart found for difficulty:", difficulty);
      return;
    }

    let canvas = document.getElementById("test-render-canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "test-render-canvas";
      canvas.style.display = "block";
      canvas.style.width = "100%";
      document.body.appendChild(canvas);
    }

    const opts: RenderOptions = { ...DEFAULT_RENDER_OPTIONS, showAllBranches: false, ...renderOptions };
    const judgements = new JudgementMap<JudgementValue>();
    const logicalWidth = resolveCanvasWidth(canvas);
    const dpr = window.devicePixelRatio || 1;
    const layout = createLayout(chart, logicalWidth, opts, judgements, dpr, DEFAULT_TEXTS, insets);
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderLayout(ctx, layout, chart, judgements, opts, DEFAULT_TEXTS);
  } catch (e) {
    console.error("renderChartCustom failed:", e);
  }
};

// Default Options
tjaChart.renderOptions = {
  ...DEFAULT_RENDER_OPTIONS,
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
