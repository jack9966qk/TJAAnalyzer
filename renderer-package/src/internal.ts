export * from "./auto-annotation.js";
export * from "./primitives.js";
export * from "./renderer.js";
export * from "./tja-parser.js";

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
}

/**
 * Creates an internal chart view for a pre-parsed chart.
 * This is the private counterpart to the public createChartView which accepts a TJA string.
 */
export function createChartView(chart: ParsedChart, canvas: HTMLCanvasElement): ChartView {
  let layout: ChartLayout | null = null;
  let layoutInvalid = true;

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
  };
}
