import * as webjsx from "webjsx";
import {
  type ChartLayout,
  calculateAutoZoomBeats,
  createLayout,
  generateAutoAnnotations,
  getNoteAt,
  getNotePosition,
  type HitInfo,
  INSETS,
  type Insets,
  JUDGEABLE_NOTES,
  type JudgementKey,
  JudgementMap,
  type JudgementValue,
  LocationMap,
  PALETTE,
  type ParsedChart,
  type RenderTexts,
  renderChart,
  renderLayout,
  type ViewOptions,
} from "../../renderer-package/src/index.js";
import { appState } from "../state/app-state.js";

interface VendorDocument extends Document {
  fullscreenElement: Element | null;
  webkitFullscreenElement?: Element;
  mozFullScreenElement?: Element;
  msFullscreenElement?: Element;
  exitFullscreen(): Promise<void>;
  webkitExitFullscreen?(): Promise<void>;
  mozCancelFullScreen?(): Promise<void>;
  msExitFullscreen?(): Promise<void>;
}

type AppViewOptions = ViewOptions & { autoZoom?: boolean };

export interface ChartClickEventDetail {
  x: number;
  y: number;
  hit: HitInfo | null;
  originalEvent: MouseEvent;
}

export class TJAChart extends HTMLElement {
  private canvas!: HTMLCanvasElement;
  private messageContainer!: HTMLDivElement;
  private _chart: ParsedChart | null = null;
  private _viewOptions: ViewOptions | null = null;
  private _judgements: JudgementMap<JudgementValue> = new JudgementMap();
  private _texts: RenderTexts | undefined;
  private _message: { text: string; type: "warning" | "info" } | null = null;
  private resizeObserver: ResizeObserver;
  private mutationObserver: MutationObserver;

  // Rendering Optimization State
  private _renderTask: number | null = null;
  private _pendingFullRender: boolean = true;
  private _chartChanged: boolean = false;
  private _layout: ChartLayout | null = null;
  private _renderedJudgements: JudgementMap<JudgementValue> = new JudgementMap();

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    this.resizeObserver = new ResizeObserver(() => {
      this._pendingFullRender = true;
      this.scheduleRender();
    });

    this.mutationObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes" && mutation.attributeName === "class") {
          this._pendingFullRender = true;
          this.scheduleRender();
        }
      }
    });
  }

  connectedCallback() {
    this.renderDOM();

    this.upgradeProperty("chart");
    this.upgradeProperty("viewOptions");
    this.upgradeProperty("judgements");
    this.upgradeProperty("texts");

    this.resizeObserver.observe(this);
    this.mutationObserver.observe(this, { attributes: true });
    document.addEventListener("fullscreenchange", this.handleFullscreenChange);
    document.addEventListener("webkitfullscreenchange", this.handleFullscreenChange);
    this.scheduleRender();
  }

  private handleFullscreenChange = () => {
    this._pendingFullRender = true;
    this.scheduleRender();
  };

  private renderDOM() {
    const vdom = (
      <>
        <style>{`
            :host {
                display: block;
                width: 100%;
                overflow: hidden;
                box-sizing: border-box;
            }
            :host(:fullscreen), :host(.pseudo-fullscreen) {
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
                overscroll-behavior: contain;
                background-color: var(--canvas-container-bg, #fafafa);
                padding-top: env(safe-area-inset-top);
                padding-left: env(safe-area-inset-left);
                padding-right: env(safe-area-inset-right);
                padding-bottom: max(20px, env(safe-area-inset-bottom));
                transition: padding var(--anim-duration-normal) ease, background-color var(--anim-duration-normal) ease;
            }
            :host(.pseudo-fullscreen) {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                height: 100dvh;
                z-index: 9999;
                animation: fullscreenEnter var(--anim-duration-normal) ease;
            }
            @keyframes fullscreenEnter {
                from { opacity: 0; transform: scale(0.98); }
                to { opacity: 1; transform: scale(1); }
            }
            #exit-fullscreen-btn {
                position: fixed;
                top: max(20px, env(safe-area-inset-top) + 10px);
                right: max(20px, env(safe-area-inset-right) + 10px);
                z-index: 10000;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                background: rgba(0,0,0,0.5);
                color: white;
                border: none;
                cursor: pointer;
                display: none;
                justify-content: center;
                align-items: center;
                padding: 8px;
                transition: opacity var(--anim-duration-normal) ease;
                animation: fadeIn var(--anim-duration-normal) ease;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            :host(:fullscreen) #exit-fullscreen-btn,
            :host(.pseudo-fullscreen) #exit-fullscreen-btn {
                display: flex;
            }
            #exit-fullscreen-btn img {
                width: 100%;
                height: 100%;
                filter: brightness(0) invert(1);
            }
            canvas {
                display: block;
                width: 100%;
            }
            .canvas-fade-in {
                animation: canvasFadeIn var(--anim-duration-normal) ease-out;
            }
            @keyframes canvasFadeIn {
                from { transform: scale(0.995); }
                to { transform: scale(1); }
            }
            #message-container {
                width: 100%;
                height: 400px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-weight: bold;
                font-size: 24px;
                font-family: sans-serif;
                box-sizing: border-box;
            }
            .hidden {
                display: none !important;
            }
        `}</style>
        <button type="button" id="exit-fullscreen-btn" onclick={this.exitFullscreen.bind(this)}>
          <img src="assets/heroicons/optimized/24/outline/arrows-pointing-in.svg" alt="Exit Fullscreen" />
        </button>
        <div
          id="message-container"
          className="hidden"
          ref={(el) => {
            this.messageContainer = el as HTMLDivElement;
          }}
        ></div>
        <canvas
          ref={(el) => {
            if (el) {
              this.canvas = el as HTMLCanvasElement;
              // Re-attach listeners if canvas changes (though diffing should prevent recreation)
              this.canvas.onmousemove = this.handleMouseMove.bind(this);
              this.canvas.onclick = this.handleClick.bind(this);
            }
          }}
        ></canvas>
      </>
    );

    if (this.shadowRoot) {
      webjsx.applyDiff(this.shadowRoot, vdom);
    }
  }

  exitFullscreen() {
    const doc = document as VendorDocument;
    if (doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement) {
      if (doc.exitFullscreen) doc.exitFullscreen().catch(() => {});
      else if (doc.webkitExitFullscreen) doc.webkitExitFullscreen();
      else if (doc.mozCancelFullScreen) doc.mozCancelFullScreen();
      else if (doc.msExitFullscreen) doc.msExitFullscreen();
    }
    this.classList.remove("pseudo-fullscreen");
  }

  private upgradeProperty(prop: string) {
    if (Object.hasOwn(this, prop)) {
      // biome-ignore lint/suspicious/noExplicitAny: Required for Web Component property upgrade pattern
      const value = (this as any)[prop];
      // biome-ignore lint/suspicious/noExplicitAny: Required for Web Component property upgrade pattern
      delete (this as any)[prop];
      // biome-ignore lint/suspicious/noExplicitAny: Required for Web Component property upgrade pattern
      (this as any)[prop] = value;
    }
  }

  disconnectedCallback() {
    this.resizeObserver.disconnect();
    this.mutationObserver.disconnect();
    document.removeEventListener("fullscreenchange", this.handleFullscreenChange);
    document.removeEventListener("webkitfullscreenchange", this.handleFullscreenChange);

    if (this._renderTask !== null) {
      cancelAnimationFrame(this._renderTask);
      this._renderTask = null;
    }
    if (this.canvas) {
      this.canvas.onmousemove = null;
      this.canvas.onclick = null;
    }
  }

  scheduleRender() {
    if (this._renderTask === null) {
      this._renderTask = requestAnimationFrame(() => this.render());
    }
  }

  set chart(value: ParsedChart | null) {
    if (this._chart !== value) {
      this._chartChanged = true;
    }
    this._chart = value;
    this._pendingFullRender = true;
    this.scheduleRender();
  }

  get chart(): ParsedChart | null {
    return this._chart;
  }

  set viewOptions(value: ViewOptions | null) {
    this._viewOptions = value;
    this._pendingFullRender = true;
    this.scheduleRender();
  }

  get viewOptions(): ViewOptions | null {
    return this._viewOptions;
  }

  set judgements(value: JudgementMap<JudgementValue>) {
    this._judgements = value;
    this.scheduleRender();
  }

  get judgements(): JudgementMap<JudgementValue> {
    return this._judgements;
  }

  set texts(value: RenderTexts) {
    this._texts = value;
    this._pendingFullRender = true;
    this.scheduleRender();
  }

  showMessage(text: string, type: "warning" | "info" = "info") {
    this._message = { text, type };
    this._pendingFullRender = true;
    this.scheduleRender();
  }

  clearMessage() {
    this._message = null;
    this._pendingFullRender = true;
    this.scheduleRender();
  }

  // Testing Helper
  getNoteCoordinates(originalBarIndex: number, charIndex: number): { x: number; y: number } | null {
    if (!this._chart || !this._viewOptions) return null;
    return getNotePosition(
      this._chart,
      this.canvas,
      this._viewOptions,
      originalBarIndex,
      charIndex,
      this._layout || undefined,
    );
  }

  private get isFullscreen(): boolean {
    const doc = document as VendorDocument;
    const isNativeFullscreen = !!(
      doc.fullscreenElement ||
      doc.webkitFullscreenElement ||
      doc.mozFullScreenElement ||
      doc.msFullscreenElement
    );
    return isNativeFullscreen || this.classList.contains("pseudo-fullscreen");
  }

  private applyAutoZoom(viewOptions: AppViewOptions, insets: Insets = INSETS) {
    if (!viewOptions.autoZoom) return;
    // Use logical width (CSS pixels) for calculation
    const canvasWidth = this.clientWidth;

    // Calculate longest bar to satisfy Priority 2 (fit longest bar on one line)
    const barLengths = new Map<number, number>();
    if (this._chart?.barParams) {
      for (const param of this._chart.barParams) {
        const len = param.measureRatio * 4;
        barLengths.set(len, (barLengths.get(len) || 0) + 1);
      }
    }
    if (barLengths.size === 0) barLengths.set(4, 1);

    const targetBeats = calculateAutoZoomBeats(canvasWidth, barLengths, insets);
    if (viewOptions.beatsPerLine === targetBeats) return;

    viewOptions.beatsPerLine = targetBeats;
    appState.viewOptions.beatsPerLine = targetBeats;
    this._layout = null; // Force layout recreation
    this._pendingFullRender = true;

    document.dispatchEvent(new Event("view-options-update"));
  }

  render() {
    this._renderTask = null;
    if (!this.isConnected || !this.canvas) return;

    const width = this.clientWidth || 800;

    // Handle Message State
    if (this._message) {
      this.canvas.classList.add("hidden");
      this.messageContainer.classList.remove("hidden");

      this.messageContainer.textContent = this._message.text;

      if (this._message.type === "warning") {
        this.messageContainer.style.backgroundColor = PALETTE.ui.warning.background;
        this.messageContainer.style.color = PALETTE.ui.warning.text;
      } else {
        this.messageContainer.style.backgroundColor = PALETTE.ui.streamWaiting.background;
        this.messageContainer.style.color = PALETTE.ui.streamWaiting.text;
      }
      return;
    }

    // Hide message
    this.messageContainer.classList.add("hidden");
    this.canvas.classList.remove("hidden");

    if (this._chartChanged) {
      this.canvas.classList.remove("canvas-fade-in");
      // Trigger reflow
      void this.canvas.offsetWidth;
      this.canvas.classList.add("canvas-fade-in");
      this._chartChanged = false;
    }

    const ctx = this.canvas.getContext("2d");
    if (!ctx) return;

    // If no chart, maybe clear?
    if (!this._chart || !this._viewOptions) {
      this.canvas.width = width;
      this.canvas.height = 0;
      this.canvas.style.height = "0px";
      this.canvas.style.width = `${width}px`;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    // Clone options to avoid mutating the original prop, and apply attribution logic
    const effectiveViewOptions: AppViewOptions = {
      ...this._viewOptions,
      showAttribution: this.isFullscreen,
    };

    const isHorizontal = document.body.classList.contains("horizontal-layout");
    // Standard padding we want to enforce within the canvas now
    let baseInsets: Insets = { top: 20, bottom: 20, left: 20, right: 20 };
    if (isHorizontal) {
      baseInsets.left = 35;
    }

    if (this.isFullscreen) {
      baseInsets = { ...INSETS };
    }

    this.applyAutoZoom(effectiveViewOptions, baseInsets);

    const isFullRender = this._pendingFullRender || !this._layout;

    const texts = this._texts || {
      loopPattern: "Loop x{n}",
      judgement: { perfect: "良", good: "可", poor: "不可" },
    };

    // We are doing a full render (either forced or because no incremental update needed/possible)
    // But we only need to recreate layout if pending full render or layout missing
    if (isFullRender) {
      this._layout = createLayout(
        this._chart,
        this.canvas,
        effectiveViewOptions,
        this._judgements,
        undefined,
        texts,
        baseInsets,
      );
      this._pendingFullRender = false;
    }

    let dirtyRowY: Set<number> | undefined;

    if (!isFullRender && this._layout) {
      // Differential Rendering
      const changedKeys: JudgementKey[] = [];

      // Check for added or changed items
      for (const [key, val] of this._judgements) {
        const oldVal = this._renderedJudgements.get(key);
        if (!oldVal || oldVal.judgement !== val.judgement || oldVal.delta !== val.delta) {
          changedKeys.push(key);
        }
      }

      // Check for removed items
      for (const key of this._renderedJudgements.keys()) {
        if (!this._judgements.has(key)) {
          changedKeys.push(key);
        }
      }

      if (changedKeys.length > 0) {
        dirtyRowY = new Set<number>();
        const grid = this._layout.noteOrdinalToGrid;
        const barFrames = this._layout.barFrames;

        for (const key of changedKeys) {
          const locations = grid.get(key);
          if (locations) {
            for (const loc of locations) {
              const frame = barFrames[loc.virtualBarIdx];
              if (frame) {
                dirtyRowY.add(frame.y);
              }
            }
          }
        }
      } else {
        // Nothing changed
        return;
      }
    }

    if (this._layout) {
      renderLayout(ctx, this._layout, this._chart, this._judgements, effectiveViewOptions, texts, dirtyRowY);

      // Update cache
      if (!dirtyRowY) {
        // Full render, sync completely
        this._renderedJudgements = new JudgementMap(this._judgements);
      } else {
        // Partial render, sync completely (easier than patching)
        this._renderedJudgements = new JudgementMap(this._judgements);
      }
    }
  }
  // Public method to force render (e.g. after resizing parent not caught by observer, or manual trigger)
  refresh() {
    this._pendingFullRender = true;
    this.scheduleRender();
  }

  private handleMouseMove(event: MouseEvent) {
    if (this._message) {
      this.canvas.style.cursor = "default";
      return;
    }
    if (!this._chart || !this._viewOptions) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hit = getNoteAt(
      x,
      y,
      this._chart,
      this.canvas,
      this._judgements,
      this._viewOptions,
      this._layout || undefined,
    );

    this.dispatchEvent(
      new CustomEvent("chart-hover", {
        detail: { x, y, hit, originalEvent: event },
        bubbles: true,
        composed: true,
      }),
    );

    this.canvas.style.cursor = hit ? "pointer" : "default";
  }

  handleClick(event: MouseEvent) {
    if (this._message) return;
    if (!this._chart || !this._viewOptions) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const hit = getNoteAt(
      x,
      y,
      this._chart,
      this.canvas,
      this._judgements,
      this._viewOptions,
      this._layout || undefined,
    );

    // Handle Annotation Mode Click
    if (this._viewOptions.isAnnotationMode) {
      if (hit && JUDGEABLE_NOTES.includes(hit.type)) {
        const noteId = { barIndex: hit.originalBarIndex, charIndex: hit.charIndex };
        // Clone is not strictly necessary for mutation if we just update the map instance in place,
        // but for safety/reactivity we might want to clone.
        // However, LocationMap copy constructor handles it.
        const annotations = new LocationMap(this._viewOptions.annotations);
        const current = annotations.get(noteId);

        if (!current) annotations.set(noteId, "L");
        else if (current === "L") annotations.set(noteId, "R");
        else annotations.delete(noteId);

        this.dispatchEvent(
          new CustomEvent("annotations-change", {
            detail: annotations,
            bubbles: true,
            composed: true,
          }),
        );
      }
      // Don't return, still emit chart-click for generic listeners
    }

    this.dispatchEvent(
      new CustomEvent("chart-click", {
        detail: { x, y, hit, originalEvent: event },
        bubbles: true,
        composed: true,
      }),
    );
  }

  autoAnnotate() {
    if (!this._chart) return;
    const currentAnnotations = this._viewOptions?.annotations || new LocationMap();
    const newAnnotations = generateAutoAnnotations(this._chart, currentAnnotations);

    this.dispatchEvent(
      new CustomEvent("annotations-change", {
        detail: newAnnotations,
        bubbles: true,
        composed: true,
      }),
    );
  }

  exportImage(overrideOptions?: Partial<ViewOptions>): string {
    if (!this._chart || !this._viewOptions) {
      throw new Error("Chart not loaded");
    }

    const options: ViewOptions = {
      ...this._viewOptions,
      showAttribution: true,
      ...overrideOptions,
    };

    const canvas = document.createElement("canvas");
    const TARGET_WIDTH = 1024;

    // We want the final image to be exactly 1024px wide.
    // We force DPR to 1 so that logical width == physical width.
    canvas.width = TARGET_WIDTH;

    renderChart(this._chart, canvas, this._judgements, options, this._texts, 1);

    return canvas.toDataURL("image/png");
  }
}

customElements.define("tja-chart", TJAChart);
