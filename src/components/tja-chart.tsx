import * as Renderer from "tja-renderer";
import * as webjsx from "webjsx";
import { appState } from "../state/app-state.js";

const {
  calculateAutoZoomBeats,
  createChartView,
  createCycleHandHandler,
  createToggleSeparatorHandler,
  generateAutoAnnotations,
  getNotePosition,
  INSETS,
  JudgementMap,
  NoteLocationMap,
  PALETTE,
} = Renderer.Private;

type ChartLayout = Renderer.Private.ChartLayout;
type ChartView = Renderer.Private.ChartView;
type ChartViewOptions = Renderer.Private.ChartViewOptions;
type HitInfo = Renderer.Private.HitInfo;
type NoteInteractionEvent = Renderer.Private.NoteInteractionEvent;
type NoteInteractionHandler = Renderer.Private.NoteInteractionHandler;
type Insets = Renderer.Private.Insets;
type JudgementKey = Renderer.Private.JudgementKey;
type JudgementValue = Renderer.Private.JudgementValue;
type ParsedChart = Renderer.Private.ParsedChart;
type RenderTexts = Renderer.Private.RenderTexts;
type RenderOptions = Renderer.Private.RenderOptions;
type JudgementMap<T> = Renderer.Private.JudgementMap<T>;

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

type AppRenderOptions = RenderOptions & { autoZoom?: boolean };

function getSafeAreaInsets(): Insets {
  const div = document.createElement("div");
  div.style.padding =
    "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)";
  div.style.position = "absolute";
  div.style.visibility = "hidden";
  document.body.appendChild(div);
  const computed = getComputedStyle(div);
  const insets = {
    top: parseFloat(computed.paddingTop) || 0,
    right: parseFloat(computed.paddingRight) || 0,
    bottom: parseFloat(computed.paddingBottom) || 0,
    left: parseFloat(computed.paddingLeft) || 0,
  };
  document.body.removeChild(div);
  return insets;
}

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
  private _renderOptions: RenderOptions | null = null;
  private _judgements: JudgementMap<JudgementValue> = new JudgementMap();
  private _texts: RenderTexts | undefined;
  private _insetsOverride: Insets | null = null;
  private _message: { text: string; type: "warning" | "info" } | null = null;
  private resizeObserver: ResizeObserver;
  private mutationObserver: MutationObserver;

  // Rendering Optimization State
  private _renderTask: number | null = null;
  private _pendingFullRender: boolean = true;
  private _chartChanged: boolean = false;
  private _chartView: ChartView | null = null;
  private _clickCleanup: (() => void) | null = null;
  private _hoverCleanup: (() => void) | null = null;
  private _hoverStyleEnabled: boolean = false;
  private _cycleHandHandler: NoteInteractionHandler;
  private _toggleSeparatorHandler: NoteInteractionHandler;

  get layout(): ChartLayout | null {
    return this._chartView?.layout ?? null;
  }

  get hoveredNote() {
    return this._chartView?.hoveredNote ?? null;
  }

  private _renderedJudgements: JudgementMap<JudgementValue> = new JudgementMap();

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const getAnnotations = () => this._renderOptions?.annotations || new NoteLocationMap();
    const onAnnotationsChange = (annotations: Renderer.Private.NoteLocationMap<Renderer.Private.Annotation>) => {
      this.dispatchEvent(
        new CustomEvent("annotations-change", {
          detail: annotations,
          bubbles: true,
          composed: true,
        }),
      );
    };
    this._cycleHandHandler = createCycleHandHandler(getAnnotations, onAnnotationsChange);
    this._toggleSeparatorHandler = createToggleSeparatorHandler(getAnnotations, onAnnotationsChange);

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
    this.upgradeProperty("renderOptions");
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
                transition: background-color var(--anim-duration-normal) ease;
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
            #safe-area-overlay {
                display: none;
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                height: calc(env(safe-area-inset-top) + 30px);
                background: linear-gradient(to bottom,
                    rgba(0,0,0,0.8),
                    rgba(0,0,0,0.75) 10%,
                    rgba(0,0,0,0.65) 20%,
                    rgba(0,0,0,0.5) 35%,
                    rgba(0,0,0,0.3) 50%,
                    rgba(0,0,0,0.15) 65%,
                    rgba(0,0,0,0.05) 80%,
                    transparent
                );
                pointer-events: none;
                z-index: 9999;
            }
            :host(:fullscreen) #safe-area-overlay,
            :host(.pseudo-fullscreen) #safe-area-overlay {
                display: block;
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
            }
          }}
        ></canvas>
        <div id="safe-area-overlay"></div>
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
    this.cleanupInteractions();
  }

  scheduleRender() {
    if (this._renderTask === null) {
      this._renderTask = requestAnimationFrame(() => this.render());
    }
  }

  private cleanupInteractions() {
    this._hoverCleanup?.();
    this._hoverCleanup = null;
    this._clickCleanup?.();
    this._clickCleanup = null;
  }

  set chart(value: ParsedChart | null) {
    if (this._chart !== value) {
      this._chartChanged = true;
      this.cleanupInteractions();
      this._chartView = null;
    }
    this._chart = value;
    this._pendingFullRender = true;
    this.scheduleRender();
  }

  get chart(): ParsedChart | null {
    return this._chart;
  }

  set renderOptions(value: RenderOptions | null) {
    this._renderOptions = value;
    this._pendingFullRender = true;
    this.scheduleRender();
  }

  get renderOptions(): RenderOptions | null {
    return this._renderOptions;
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

  set hoverStyleEnabled(value: boolean) {
    if (this._hoverStyleEnabled === value) return;
    this._hoverStyleEnabled = value;
    if (value && this._chartView && !this._hoverCleanup) {
      this._hoverCleanup = this._chartView.onNoteHovered((e) => this.handleNoteHovered(e));
    } else if (!value && this._hoverCleanup) {
      this._hoverCleanup();
      this._hoverCleanup = null;
    }
  }

  get hoverStyleEnabled(): boolean {
    return this._hoverStyleEnabled;
  }

  set insetsOverride(value: Insets | null) {
    this._insetsOverride = value;
    this._pendingFullRender = true;
    this.scheduleRender();
  }

  get insetsOverride(): Insets | null {
    return this._insetsOverride;
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
    if (!this._chart || !this._renderOptions) return null;
    return getNotePosition(
      this._chart,
      this.canvas,
      this._renderOptions,
      originalBarIndex,
      charIndex,
      this._chartView?.layout || undefined,
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

  private updateThemeColor(isFullscreen: boolean) {
    const lightMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
    const darkMeta = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
    if (lightMeta) {
      lightMeta.setAttribute("content", isFullscreen ? "#fafafa" : "#f0f0f0");
    }
    if (darkMeta) {
      darkMeta.setAttribute("content", isFullscreen ? "#1e1e1e" : "#1a1a1a");
    }
  }

  private applyAutoZoom(renderOptions: AppRenderOptions, insets: Insets = INSETS) {
    if (!renderOptions.autoZoom) return;
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
    if (renderOptions.beatsPerLine === targetBeats) return;

    renderOptions.beatsPerLine = targetBeats;
    appState.renderOptions.beatsPerLine = targetBeats;
    this._chartView?.invalidateLayout();
    this._pendingFullRender = true;

    document.dispatchEvent(new Event("view-options-update"));
  }

  /**
   * Returns dirty row Y positions for differential rendering, or an empty set if nothing changed.
   * Returns undefined when a full render is needed (should not happen as callers guard this).
   */
  private calculateDirtyRowY(layout: ChartLayout): Set<number> {
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

    const dirtyRowY = new Set<number>();
    if (changedKeys.length === 0) return dirtyRowY;

    const grid = layout.noteOrdinalToGrid;
    const barFrames = layout.barFrames;

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

    return dirtyRowY;
  }

  render() {
    this._renderTask = null;
    if (!this.isConnected || !this.canvas) return;

    this.updateThemeColor(this.isFullscreen);

    const width = this.clientWidth || 800;

    const isHorizontal = document.body.classList.contains("horizontal-layout");
    let baseInsets: Insets;
    if (this._insetsOverride) {
      baseInsets = this._insetsOverride;
    } else {
      // Standard padding we want to enforce within the canvas now
      baseInsets = { top: 20, bottom: 20, left: 20, right: 20 };
      if (isHorizontal) {
        baseInsets.left = 35;
      }

      if (this.isFullscreen) {
        const safeArea = getSafeAreaInsets();
        baseInsets = {
          top: Math.max(INSETS.top, safeArea.top + 10),
          bottom: Math.max(INSETS.bottom, safeArea.bottom + 10),
          left: Math.max(INSETS.left, safeArea.left + 10),
          right: Math.max(INSETS.right, safeArea.right + 10),
        };
      }
    }

    // Handle Message State
    if (this._message) {
      this.canvas.classList.add("hidden");
      this.messageContainer.classList.remove("hidden");

      this.messageContainer.textContent = this._message.text;
      this.messageContainer.style.paddingTop = `${baseInsets.top}px`;
      this.messageContainer.style.paddingBottom = `${baseInsets.bottom}px`;
      this.messageContainer.style.paddingLeft = `${baseInsets.left}px`;
      this.messageContainer.style.paddingRight = `${baseInsets.right}px`;

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
    if (!this._chart || !this._renderOptions) {
      this.canvas.width = width;
      this.canvas.height = 0;
      this.canvas.style.height = "0px";
      this.canvas.style.width = `${width}px`;
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      return;
    }

    // Clone options to avoid mutating the original prop, and apply attribution logic
    const effectiveRenderOptions: AppRenderOptions = {
      ...this._renderOptions,
      showAttribution: this._renderOptions.showAttribution || this.isFullscreen,
    };

    // Create chart view if needed (chart changed or first render)
    if (!this._chartView) {
      this._chartView = createChartView(this._chart, this.canvas);
      this._clickCleanup = this._chartView.onNoteClicked((e) => this.handleNoteClicked(e));
      if (this._hoverStyleEnabled) {
        this._hoverCleanup = this._chartView.onNoteHovered((e) => this.handleNoteHovered(e));
      }
    }

    this.applyAutoZoom(effectiveRenderOptions, baseInsets);

    const layout = this._chartView.layout;
    const isFullRender = this._pendingFullRender || !layout;

    const texts = this._texts || {
      loopPattern: "Loop x{n}",
      judgement: { perfect: "良", good: "可", poor: "不可" },
    };

    if (isFullRender) {
      this._chartView.invalidateLayout();
    }

    const dirtyRowY = isFullRender || !layout ? undefined : this.calculateDirtyRowY(layout);
    if (dirtyRowY !== undefined && dirtyRowY.size === 0) return;

    const viewOptions: ChartViewOptions = {
      renderOptions: effectiveRenderOptions,
      judgements: this._judgements,
      texts,
      insets: baseInsets,
    };

    this._chartView.render(viewOptions, dirtyRowY);
    this._pendingFullRender = false;
    this._renderedJudgements = new JudgementMap(this._judgements);
  }
  // Public method to force render (e.g. after resizing parent not caught by observer, or manual trigger)
  refresh() {
    this._pendingFullRender = true;
    this.scheduleRender();
  }

  private handleNoteHovered({ x, y, hit, originalEvent }: NoteInteractionEvent) {
    if (this._message) {
      this.canvas.style.cursor = "default";
      return;
    }

    this.dispatchEvent(
      new CustomEvent("chart-hover", {
        detail: { x, y, hit, originalEvent },
        bubbles: true,
        composed: true,
      }),
    );

    this.canvas.style.cursor = hit ? "pointer" : "default";
  }

  private handleNoteClicked({ x, y, hit, originalEvent }: NoteInteractionEvent) {
    if (this._message) return;
    if (!this._renderOptions) return;

    // Handle Annotation Mode Click
    if (this._renderOptions.isAnnotationMode) {
      const toolType = this._renderOptions.annotationToolType || "hand";
      const handler = toolType === "separator" ? this._toggleSeparatorHandler : this._cycleHandHandler;
      handler({ x, y, hit, originalEvent });
      // Don't return, still emit chart-click for generic listeners
    }

    this.dispatchEvent(
      new CustomEvent("chart-click", {
        detail: { x, y, hit, originalEvent },
        bubbles: true,
        composed: true,
      }),
    );
  }

  autoAnnotate() {
    if (!this._chart) return;
    const currentAnnotations = this._renderOptions?.annotations || new NoteLocationMap();
    const newAnnotations = generateAutoAnnotations(
      this._chart,
      currentAnnotations,
      this._renderOptions?.handAlternationThreshold,
      this._renderOptions?.handResetThreshold,
      this._renderOptions?.autoAnnotateMode,
    );

    this.dispatchEvent(
      new CustomEvent("annotations-change", {
        detail: newAnnotations,
        bubbles: true,
        composed: true,
      }),
    );
  }

  exportImage(overrideOptions?: Partial<RenderOptions>, width?: number): string {
    if (!this._chartView || !this._renderOptions) {
      throw new Error("Chart not loaded");
    }

    const renderOptions: RenderOptions = {
      ...this._renderOptions,
      showAttribution: true,
      ...overrideOptions,
    };

    return this._chartView.exportImage(
      {
        renderOptions,
        judgements: this._judgements,
        texts: this._texts,
      },
      width,
    );
  }
}

customElements.define("tja-chart", TJAChart);
