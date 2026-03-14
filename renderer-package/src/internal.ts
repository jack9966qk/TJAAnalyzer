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
  type Annotation,
  applyCycleHand,
  applyToggleSeparator,
  DEFAULT_TEXTS,
  isJudgeable,
  JudgementMap,
  type JudgementValue,
  type NoteLocation,
  type NoteLocationMap,
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

  /** The currently hovered note, managed by onNoteHovered. */
  readonly hoveredNote: NoteLocation | null;

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

type HoveredNote = NoteLocation | null;

/**
 * Creates an internal chart view for a pre-parsed chart.
 * This is the private counterpart to the public createChartView which accepts a TJA string.
 */
export function createChartView(chart: ParsedChart, canvas: HTMLCanvasElement): ChartView {
  let layout: ChartLayout | null = null;
  let layoutInvalid = true;
  let lastOptions: ChartViewOptions | null = null;
  let hoveredNote: HoveredNote = null;
  const hoverHandlers = new Set<NoteInteractionHandler>();
  const clickHandlers = new Set<NoteInteractionHandler>();
  let interactionsAttached = false;

  function handleMouseMove(e: MouseEvent) {
    if (!lastOptions) return;
    const { x, y, hit } = hitTest(e);
    const newHovered: HoveredNote = hit ? hit.location : null;
    if (hoveredNoteChanged(hoveredNote, newHovered)) {
      hoveredNote = newHovered;
      lastOptions.renderOptions.hoveredNote = hoveredNote;
      render(lastOptions);
    }
    if (hoverHandlers.size > 0) {
      const eventParams = { x, y, hit, originalEvent: e };
      for (const handler of hoverHandlers) {
        handler(eventParams);
      }
    }
  }

  function handleMouseClick(e: MouseEvent) {
    if (!lastOptions || clickHandlers.size === 0) return;
    const { x, y, hit } = hitTest(e);
    const eventParams = { x, y, hit, originalEvent: e };
    for (const handler of clickHandlers) {
      handler(eventParams);
    }
  }

  function updateInteractionListeners() {
    const shouldAttach = hoverHandlers.size > 0 || clickHandlers.size > 0;
    if (shouldAttach && !interactionsAttached) {
      canvas.addEventListener("mousemove", handleMouseMove);
      canvas.addEventListener("click", handleMouseClick);
      interactionsAttached = true;
    } else if (!shouldAttach && interactionsAttached) {
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleMouseClick);
      interactionsAttached = false;
      if (hoveredNote && lastOptions) {
        hoveredNote = null;
        lastOptions.renderOptions.hoveredNote = null;
        render(lastOptions);
      }
    }
  }

  function hitTest(event: MouseEvent): { x: number; y: number; hit: HitInfo | null } {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (!lastOptions) return { x, y, hit: null };
    const judgements = lastOptions.judgements ?? new JudgementMap();
    const hit = getChartElementAt(x, y, chart, canvas, judgements, lastOptions.renderOptions, layout ?? undefined);
    return { x, y, hit };
  }

  function hoveredNoteChanged(a: HoveredNote, b: HoveredNote): boolean {
    if (!a && !b) return false;
    if (!a || !b) return true;
    return a.barIndex !== b.barIndex || a.charIndex !== b.charIndex || a.branch !== b.branch;
  }

  function render(options: ChartViewOptions, dirtyRowY?: Set<number>) {
    lastOptions = options;
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
  }

  return {
    get layout() {
      return layout;
    },

    get hoveredNote() {
      return hoveredNote;
    },

    invalidateLayout() {
      layoutInvalid = true;
    },

    render,

    onNoteHovered(handler: NoteInteractionHandler): () => void {
      hoverHandlers.add(handler);
      updateInteractionListeners();
      return () => {
        hoverHandlers.delete(handler);
        updateInteractionListeners();
      };
    },

    onNoteClicked(handler: NoteInteractionHandler): () => void {
      clickHandlers.add(handler);
      updateInteractionListeners();
      return () => {
        clickHandlers.delete(handler);
        updateInteractionListeners();
      };
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

/**
 * Creates a NoteInteractionHandler that cycles hand annotation (none → L → R → none)
 * on judgeable notes. Non-judgeable notes are ignored.
 */
export function createCycleHandHandler(
  getAnnotations: () => NoteLocationMap<Annotation>,
  onChange: (annotations: NoteLocationMap<Annotation>) => void,
): NoteInteractionHandler {
  return ({ hit }) => {
    if (!hit || !isJudgeable(hit.type)) return;
    onChange(applyCycleHand(getAnnotations(), hit.location));
  };
}

/**
 * Creates a NoteInteractionHandler that toggles separator annotation
 * on judgeable notes. Non-judgeable notes are ignored.
 */
export function createToggleSeparatorHandler(
  getAnnotations: () => NoteLocationMap<Annotation>,
  onChange: (annotations: NoteLocationMap<Annotation>) => void,
): NoteInteractionHandler {
  return ({ hit }) => {
    if (!hit || !isJudgeable(hit.type)) return;
    onChange(applyToggleSeparator(getAnnotations(), hit.location));
  };
}
