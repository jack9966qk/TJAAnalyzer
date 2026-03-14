import { createChartView, type NoteInteractionEvent } from "../src/internal.js";
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
function createMockCanvas(
  width = 800,
): HTMLCanvasElement & { listeners: Map<string, Set<(...args: never) => unknown>> } {
  let canvasWidth = width;
  let canvasHeight = 0;
  const style: Record<string, string> = { width: "", height: "" };
  const listeners = new Map<string, Set<(...args: never) => unknown>>();

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
    getBoundingClientRect() {
      return {
        left: 0,
        top: 0,
        right: canvasWidth,
        bottom: canvasHeight,
        width: canvasWidth,
        height: canvasHeight,
        x: 0,
        y: 0,
        toJSON() {},
      };
    },
    addEventListener(type: string, fn: (...args: never) => unknown) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type)?.add(fn);
    },
    removeEventListener(type: string, fn: (...args: never) => unknown) {
      listeners.get(type)?.delete(fn);
    },
    listeners,
  } as unknown as HTMLCanvasElement & { listeners: Map<string, Set<(...args: never) => unknown>> };
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

  runTest("onNoteHovered registers and cleans up mousemove listener", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const canvas = createMockCanvas(800);
    const chartView = createChartView(chart, canvas);

    assert((canvas.listeners.get("mousemove")?.size ?? 0) === 0, "No mousemove listeners initially");

    const cleanup = chartView.onNoteHovered(() => {});
    assert(canvas.listeners.get("mousemove")?.size === 1, "Should have one mousemove listener after registration");

    cleanup();
    assert(canvas.listeners.get("mousemove")?.size === 0, "Mousemove listener should be removed after cleanup");
  });

  runTest("onNoteClicked registers and cleans up click listener", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const canvas = createMockCanvas(800);
    const chartView = createChartView(chart, canvas);

    assert((canvas.listeners.get("click")?.size ?? 0) === 0, "No click listeners initially");

    const cleanup = chartView.onNoteClicked(() => {});
    assert(canvas.listeners.get("click")?.size === 1, "Should have one click listener after registration");

    cleanup();
    assert(canvas.listeners.get("click")?.size === 0, "Click listener should be removed after cleanup");
  });

  runTest("onNoteHovered callback receives NoteInteractionEvent with hit info", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const canvas = createMockCanvas(800);
    const chartView = createChartView(chart, canvas);

    // Render to create layout (needed for hit testing)
    chartView.render({ renderOptions: { ...DEFAULT_RENDER_OPTIONS }, dpr: 1 });
    const layout = chartView.layout;
    if (!layout) throw new Error("Layout should exist after render");

    let receivedEvent: NoteInteractionEvent | null = null;
    chartView.onNoteHovered((e) => {
      receivedEvent = e;
    });

    // Simulate a mousemove by invoking the registered listener
    const listeners = canvas.listeners.get("mousemove");
    if (!listeners || listeners.size === 0) throw new Error("Expected mousemove listener");

    const fakeEvent = { clientX: 0, clientY: 0 } as MouseEvent;
    for (const listener of listeners) {
      (listener as (e: MouseEvent) => void)(fakeEvent);
    }

    const hoverEvent = receivedEvent as NoteInteractionEvent | null;
    if (!hoverEvent) throw new Error("Handler should have been called");
    assert(typeof hoverEvent.x === "number", "Event should have x coordinate");
    assert(typeof hoverEvent.y === "number", "Event should have y coordinate");
    assert(hoverEvent.originalEvent === fakeEvent, "Event should include originalEvent");
  });

  runTest("onNoteClicked callback receives NoteInteractionEvent", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const canvas = createMockCanvas(800);
    const chartView = createChartView(chart, canvas);

    chartView.render({ renderOptions: { ...DEFAULT_RENDER_OPTIONS }, dpr: 1 });

    let receivedEvent: NoteInteractionEvent | null = null;
    chartView.onNoteClicked((e) => {
      receivedEvent = e;
    });

    const listeners = canvas.listeners.get("click");
    if (!listeners || listeners.size === 0) throw new Error("Expected click listener");

    const fakeEvent = { clientX: 0, clientY: 0 } as MouseEvent;
    for (const listener of listeners) {
      (listener as (e: MouseEvent) => void)(fakeEvent);
    }

    const clickEvent = receivedEvent as NoteInteractionEvent | null;
    if (!clickEvent) throw new Error("Handler should have been called");
    assert(typeof clickEvent.x === "number", "Event should have x coordinate");
    assert(typeof clickEvent.y === "number", "Event should have y coordinate");
    assert(clickEvent.originalEvent === fakeEvent, "Event should include originalEvent");
  });

  runTest("interaction handlers are no-op before first render", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const canvas = createMockCanvas(800);
    const chartView = createChartView(chart, canvas);

    // No render() called — lastRenderOptions is null
    let called = false;
    chartView.onNoteHovered(() => {
      called = true;
    });

    const listeners = canvas.listeners.get("mousemove");
    if (!listeners || listeners.size === 0) throw new Error("Expected mousemove listener");

    const fakeEvent = { clientX: 50, clientY: 50 } as MouseEvent;
    for (const listener of listeners) {
      (listener as (e: MouseEvent) => void)(fakeEvent);
    }

    assert(!called, "Handler should not be called before render (no render options available)");
  });

  runTest("multiple interaction handlers can be registered independently", () => {
    const chart = parseTJA(SIMPLE_TJA).oni;
    const canvas = createMockCanvas(800);
    const chartView = createChartView(chart, canvas);

    chartView.render({ renderOptions: { ...DEFAULT_RENDER_OPTIONS }, dpr: 1 });

    let hoverCount = 0;
    let clickCount = 0;
    const cleanupHover = chartView.onNoteHovered(() => {
      hoverCount++;
    });
    const cleanupClick = chartView.onNoteClicked(() => {
      clickCount++;
    });

    assert(canvas.listeners.get("mousemove")?.size === 1, "Should have one mousemove listener");
    assert(canvas.listeners.get("click")?.size === 1, "Should have one click listener");

    // Dispatch hover
    const hoverListeners = canvas.listeners.get("mousemove");
    if (!hoverListeners) throw new Error("Expected mousemove listeners");
    for (const l of hoverListeners) (l as (e: MouseEvent) => void)({ clientX: 0, clientY: 0 } as MouseEvent);
    assert(hoverCount === 1, "Hover handler should be called once");
    assert(clickCount === 0, "Click handler should not be called on hover");

    // Dispatch click
    const clickListeners = canvas.listeners.get("click");
    if (!clickListeners) throw new Error("Expected click listeners");
    for (const l of clickListeners) (l as (e: MouseEvent) => void)({ clientX: 0, clientY: 0 } as MouseEvent);
    assert(clickCount === 1, "Click handler should be called once");

    // Cleanup hover only
    cleanupHover();
    assert(canvas.listeners.get("mousemove")?.size === 1, "Mousemove listener still active for click hover style");
    assert(canvas.listeners.get("click")?.size === 1, "Click listener still active");

    cleanupClick();
    assert(canvas.listeners.get("mousemove")?.size === 0, "Mousemove listener removed");
    assert(canvas.listeners.get("click")?.size === 0, "Click listener removed");
  });

  console.log("\nAll renderer tests passed.\n");
} catch (e) {
  if (e instanceof Error) {
    console.error(`\nFATAL: ${e.message}\n`);
  }
  process.exit(1);
}
