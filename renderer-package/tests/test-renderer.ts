import { createChartView } from "../src/internal.js";
import { createLayout } from "../src/layout.js";
import { DEFAULT_RENDER_OPTIONS, JudgementMap, NoteLocationMap } from "../src/primitives.js";
import { parseTJA } from "../src/tja-parser.js";

function runTest(name: string, fn: () => void) {
  try {
    console.log(`\n--- ${name} ---`);
    fn();
    console.log("PASS");
  } catch (e) {
    if (e instanceof Error) {
      console.error(`FAIL: ${e.message}`);
    } else {
      console.error(`FAIL: ${e}`);
    }
    process.exit(1);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

// Minimal HTMLCanvasElement mock for Node.js (no DOM).
// getContext returns null, so layout skips text measurement and uses defaults.
function createMockCanvas(width = 800): HTMLCanvasElement {
  let canvasWidth = width;
  let canvasHeight = 0;
  const style: Record<string, string> = { width: "", height: "" };

  return {
    get clientWidth() {
      return canvasWidth;
    },
    get width() {
      return canvasWidth;
    },
    set width(v: number) {
      canvasWidth = v;
    },
    get height() {
      return canvasHeight;
    },
    set height(v: number) {
      canvasHeight = v;
    },
    style,
    getContext() {
      return null;
    },
  } as unknown as HTMLCanvasElement;
}

const SIMPLE_TJA = `TITLE:Test Song
BPM:120
COURSE:Oni
LEVEL:8
#START
1020102010201020,
3000000000000000,
#END`;

try {
  console.log("Testing Renderer Package...");

  runTest("Parse TJA", () => {
    const charts = parseTJA(SIMPLE_TJA);
    const difficulties = Object.keys(charts);
    assert(difficulties.length === 1, `Expected 1 difficulty, got ${difficulties.length}`);
    assert(difficulties[0] === "oni", `Expected 'oni', got '${difficulties[0]}'`);

    const chart = charts.oni;
    assert(chart.bars.length === 2, `Expected 2 bars, got ${chart.bars.length}`);
    assert(chart.title === "Test Song", `Expected title 'Test Song', got '${chart.title}'`);
    assert(chart.bpm === 120, `Expected BPM 120, got ${chart.bpm}`);
    assert(chart.level === 8, `Expected level 8, got ${chart.level}`);
  });

  runTest("Parse TJA - bar content", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const bar0 = chart.bars[0];
    // 1020102010201020 -> don, rest, ka, rest, don, rest, ka, rest, ...
    assert(bar0.length === 16, `Expected 16 notes in bar 0, got ${bar0.length}`);
    assert(bar0[0] === "1", `Expected first note to be '1' (don), got '${bar0[0]}'`);
    assert(bar0[2] === "2", `Expected third note to be '2' (ka), got '${bar0[2]}'`);

    const bar1 = chart.bars[1];
    // 3000000000000000 -> balloon start, rests
    assert(bar1[0] === "3", `Expected first note of bar 1 to be '3', got '${bar1[0]}'`);
  });

  runTest("NoteLocationMap basic operations", () => {
    const map = new NoteLocationMap<string>();
    const loc1 = { barIndex: 0, charIndex: 0 };
    const loc2 = { barIndex: 1, charIndex: 3 };

    map.set(loc1, "hello");
    map.set(loc2, "world");

    assert(map.get(loc1) === "hello", "Expected 'hello' at loc1");
    assert(map.get(loc2) === "world", "Expected 'world' at loc2");
    assert(map.get({ barIndex: 0, charIndex: 0 }) === "hello", "Lookup by equivalent key should work");
    assert(map.get({ barIndex: 2, charIndex: 0 }) === undefined, "Missing key should return undefined");

    map.delete(loc1);
    assert(map.get(loc1) === undefined, "Deleted key should return undefined");
  });

  runTest("Create ChartView with mock canvas", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const canvas = createMockCanvas(800);
    const chartView = createChartView(chart, canvas);

    assert(chartView.layout === null, "Layout should be null before first render");

    chartView.render({ renderOptions: { ...DEFAULT_RENDER_OPTIONS }, dpr: 1 });

    const layout = chartView.layout;
    if (!layout) throw new Error("Layout should exist after render");
    assert(layout.barFrames.length > 0, "Layout should have bar frames");
    assert(layout.virtualBars.length > 0, "Layout should have virtual bars");
    assert(layout.totalHeight > 0, "Layout should have positive total height");
  });

  runTest("ChartView invalidateLayout forces layout recreation", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const canvas = createMockCanvas(800);
    const chartView = createChartView(chart, canvas);

    chartView.render({ renderOptions: { ...DEFAULT_RENDER_OPTIONS }, dpr: 1 });
    const firstLayout = chartView.layout;
    assert(firstLayout !== null, "Layout should exist after first render");

    // Render again without invalidation - layout should be reused
    chartView.render({ renderOptions: { ...DEFAULT_RENDER_OPTIONS }, dpr: 1 });
    assert(chartView.layout === firstLayout, "Layout should be reused without invalidation");

    // Invalidate and render - layout should be recreated
    chartView.invalidateLayout();
    chartView.render({ renderOptions: { ...DEFAULT_RENDER_OPTIONS }, dpr: 1 });
    assert(chartView.layout !== firstLayout, "Layout should be recreated after invalidation");
  });

  runTest("createLayout pure logic - basic properties", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const width = 800;
    const layout = createLayout(chart, width, { ...DEFAULT_RENDER_OPTIONS }, new JudgementMap(), 1);

    assert(
      layout.logicalCanvasWidth === width,
      `Expected logicalCanvasWidth ${width}, got ${layout.logicalCanvasWidth}`,
    );
    assert(layout.dpr === 1, `Expected dpr 1, got ${layout.dpr}`);
    assert(layout.barFrames.length > 0, "Expected at least one bar frame");
    assert(layout.virtualBars.length > 0, "Expected at least one virtual bar");
    assert(layout.totalHeight > 0, `Expected positive totalHeight, got ${layout.totalHeight}`);
  });

  runTest("createLayout pure logic - width affects layout", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const opts = { ...DEFAULT_RENDER_OPTIONS };

    const narrowLayout = createLayout(chart, 400, opts, new JudgementMap(), 1);
    const wideLayout = createLayout(chart, 1200, opts, new JudgementMap(), 1);

    assert(
      narrowLayout.baseBarWidth < wideLayout.baseBarWidth,
      `Narrow baseBarWidth (${narrowLayout.baseBarWidth}) should be less than wide (${wideLayout.baseBarWidth})`,
    );
    assert(narrowLayout.logicalCanvasWidth === 400, "Narrow layout width should be 400");
    assert(wideLayout.logicalCanvasWidth === 1200, "Wide layout width should be 1200");
  });

  runTest("createLayout pure logic - dpr is stored", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const layout2x = createLayout(chart, 800, { ...DEFAULT_RENDER_OPTIONS }, new JudgementMap(), 2);

    assert(layout2x.dpr === 2, `Expected dpr 2, got ${layout2x.dpr}`);
  });

  console.log("\nAll renderer tests passed.\n");
} catch (e) {
  if (e instanceof Error) {
    console.error(`\nFATAL: ${e.message}\n`);
  }
  process.exit(1);
}
