export * from "./auto-annotation.js";
export * from "./primitives.js";
export * from "./renderer.js";
export * from "./tja-parser.js";

import { getChartElementAt, type HitInfo } from "./hit-testing.js";
import {
  type ChartLayout,
  createLayout as createLayoutImpl,
  INSETS,
  type Insets,
  type LayoutRatios,
  resolveCanvasWidth,
} from "./layout.js";
import {
  DEFAULT_TEXTS,
  JudgementMap,
  type JudgementValue,
  type RenderOptions,
  type RenderTexts,
} from "./primitives.js";
import { renderLayout as renderLayoutImpl } from "./renderer.js";
import type { ParsedChart } from "./tja-parser.js";

/**
 * Internal chart view options wrapping the full RenderOptions.
 * This is the private counterpart to the public ChartViewOptions which uses simplified options.
 */
export interface ChartViewOptions {
  renderOptions: RenderOptions;
  judgements?: JudgementMap<JudgementValue>;
  texts?: RenderTexts;
  insets?: Insets;
  dpr?: number;
  layoutRatios?: Partial<LayoutRatios>;
}

/** Event payload for note interaction callbacks. */
export interface NoteInteractionEvent {
  x: number;
  y: number;
  hit: HitInfo | null;
  originalEvent: MouseEvent;
}

export type NoteInteractionHandler = (event: NoteInteractionEvent) => void;

/**
 * Internal chart view bound to a ParsedChart and canvas.
 * Manages layout lifecycle and rendering.
 */
export interface ChartView {
  /** The current computed layout, or null if not yet rendered. */
  readonly layout: ChartLayout | null;

  /** Mark the current layout as stale, forcing recreation on next render. */
  invalidateLayout(): void;

  /**
   * Render the chart with the given options.
   * Recreates the layout if invalidated or not yet created.
   * Pass dirtyRowY for differential rendering of specific rows only.
   */
  render(options: ChartViewOptions, dirtyRowY?: Set<number>): void;

  /**
   * Export the chart as a PNG data URL.
   * Renders to an offscreen canvas at the given width (default 1024) with DPR 1.
   */
  exportImage(options: ChartViewOptions, width?: number): string;

  /**
   * Register a handler called on mousemove over the canvas with hit testing results.
   * Uses render options and judgements from the most recent render() call.
   * Returns a cleanup function that removes the listener.
   */
  onNoteHovered(handler: NoteInteractionHandler): () => void;

  /**
   * Register a handler called on click on the canvas with hit testing results.
   * Uses render options and judgements from the most recent render() call.
   * Returns a cleanup function that removes the listener.
   */
  onNoteClicked(handler: NoteInteractionHandler): () => void;
}

/**
 * Creates an internal chart view for a pre-parsed chart.
 * This is the private counterpart to the public createChartView which accepts a TJA string.
 */
export function createChartView(chart: ParsedChart, canvas: HTMLCanvasElement): ChartView {
  let layout: ChartLayout | null = null;
  let layoutInvalid = true;
  let lastRenderOptions: RenderOptions | null = null;
  let lastJudgements: JudgementMap<JudgementValue> = new JudgementMap();

  function handleInteraction(event: MouseEvent, handler: NoteInteractionHandler) {
    if (!lastRenderOptions) return;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const hit = getChartElementAt(x, y, chart, canvas, lastJudgements, lastRenderOptions, layout ?? undefined);
    handler({ x, y, hit, originalEvent: event });
  }

  return {
    get layout() {
      return layout;
    },

    invalidateLayout() {
      layoutInvalid = true;
    },

    render(options: ChartViewOptions, dirtyRowY?: Set<number>) {
      const {
        renderOptions,
        judgements = new JudgementMap(),
        texts = DEFAULT_TEXTS,
        insets = INSETS,
        dpr,
        layoutRatios,
      } = options;

      lastRenderOptions = renderOptions;
      lastJudgements = judgements;

      if (layoutInvalid || !layout) {
        const logicalCanvasWidth = resolveCanvasWidth(canvas);
        const resolvedDpr = dpr !== undefined ? dpr : window.devicePixelRatio || 1;
        layout = createLayoutImpl(
          chart,
          logicalCanvasWidth,
          renderOptions,
          judgements,
          resolvedDpr,
          texts,
          insets,
          layoutRatios,
        );
        layoutInvalid = false;
        dirtyRowY = undefined; // Force full render after layout recreation
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      renderLayoutImpl(ctx, layout, chart, judgements, renderOptions, texts, dirtyRowY);
    },

    onNoteHovered(handler: NoteInteractionHandler): () => void {
      const listener = (e: MouseEvent) => handleInteraction(e, handler);
      canvas.addEventListener("mousemove", listener);
      return () => canvas.removeEventListener("mousemove", listener);
    },

    onNoteClicked(handler: NoteInteractionHandler): () => void {
      const listener = (e: MouseEvent) => handleInteraction(e, handler);
      canvas.addEventListener("click", listener);
      return () => canvas.removeEventListener("click", listener);
    },

    exportImage(options: ChartViewOptions, width = 1024): string {
      const {
        renderOptions,
        judgements = new JudgementMap(),
        texts = DEFAULT_TEXTS,
        insets = INSETS,
        layoutRatios,
      } = options;

      const exportCanvas = document.createElement("canvas");
      exportCanvas.width = width;

      const exportLayout = createLayoutImpl(chart, width, renderOptions, judgements, 1, texts, insets, layoutRatios);

      const ctx = exportCanvas.getContext("2d");
      if (!ctx) throw new Error("Failed to get 2D context for export canvas");
      renderLayoutImpl(ctx, exportLayout, chart, judgements, renderOptions, texts);

      return exportCanvas.toDataURL("image/png");
    },
  };
}
