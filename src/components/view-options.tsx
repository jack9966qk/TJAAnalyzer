import * as Renderer from "tja-renderer";
import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { noteStatsDisplay } from "../view/ui-elements.js";
import "./stepper-control.js";

const { INSETS, LAYOUT_RATIOS } = Renderer.Private;

export class ViewOptions extends HTMLElement {
  private _statsVisible = true;

  get statsVisible(): boolean {
    return this._statsVisible;
  }

  set statsVisible(val: boolean) {
    this._statsVisible = val;
    this.handleStatsChange();
    this.render();
  }

  connectedCallback() {
    this.render();
    this.upgradeProperty("statsVisible");
    // Listen for language changes
    i18n.onLanguageChange(() => this.render());
    document.addEventListener("view-options-update", this.handleViewOptionsUpdate.bind(this));
    window.addEventListener("resize", this.handleResize.bind(this));
    window.addEventListener("dev-mode-change", this.handleDevModeChange.bind(this));
  }

  disconnectedCallback() {
    document.removeEventListener("view-options-update", this.handleViewOptionsUpdate.bind(this));
    window.removeEventListener("resize", this.handleResize.bind(this));
    window.removeEventListener("dev-mode-change", this.handleDevModeChange.bind(this));
  }

  private handleViewOptionsUpdate() {
    this.render();
  }

  private handleResize() {
    if (appState.isTesterMode) {
      this.render();
    }
  }

  private handleDevModeChange() {
    this.render();
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

  initializeFromLayout() {
    // Default stats to off in vertical layout
    if (!document.body.classList.contains("horizontal-layout")) {
      this.statsVisible = false;
      this.handleStatsChange();
    } else {
      // Ensure UI matches state if re-connected (e.g. if kept in DOM or re-appended)
      if (noteStatsDisplay) {
        this.statsVisible = !noteStatsDisplay.classList.contains("collapsed");
      } else {
        this.render();
      }
    }
  }

  private handleZoomChange(beatsPerLine: number) {
    appState.viewOptions.autoZoom = false;
    if (appState.viewOptions.beatsPerLine !== beatsPerLine) {
      appState.viewOptions.beatsPerLine = beatsPerLine;
      refreshChart();
      this.render();
    }
  }

  private handleAutoZoom(e: Event) {
    const target = e.target as HTMLInputElement;
    appState.viewOptions.autoZoom = target.checked;
    if (appState.viewOptions.autoZoom) {
      refreshChart();
    }
    this.render();
  }

  private handleStatsToggle(e: Event) {
    this.statsVisible = (e.target as HTMLInputElement).checked;
    this.handleStatsChange();
  }

  private handleStatsChange() {
    const ns = document.getElementById("note-stats-display");
    const bs = document.getElementById("branch-stats-display");

    if (ns) {
      if (this.statsVisible) {
        ns.classList.remove("collapsed");
      } else {
        ns.classList.add("collapsed");
      }
    }

    if (bs) {
      if (this.statsVisible) {
        bs.classList.remove("collapsed");
      } else {
        bs.classList.add("collapsed");
      }
    }

    // Clear hover effect if hidden
    if (!this.statsVisible) {
      if (appState.viewOptions.hoveredNote) {
        appState.viewOptions.hoveredNote = null;
        refreshChart();
      }
    }
  }

  render() {
    // Apply styles to host
    this.style.display = "flex";
    this.style.gap = "20px";
    this.style.alignItems = "flex-start";
    this.style.flexWrap = "wrap";
    this.style.width = "100%";
    this.classList.add("panel-pane");

    let testerStats = null;
    if (appState.isTesterMode) {
      const chartEl = document.getElementById("chart-component");
      const width = chartEl ? chartEl.clientWidth : 800;
      const availableWidth = width - (INSETS.left + INSETS.right);
      const beatsPerLine = appState.viewOptions.beatsPerLine;
      const barsPerRow = beatsPerLine / 4;
      const baseBarWidth = availableWidth / barsPerRow;
      const noteDiameter = baseBarWidth * LAYOUT_RATIOS.noteRadiusSmall * 2;
      const baseHeaderHeight = baseBarWidth * LAYOUT_RATIOS.headerHeight;
      const titleFontSize = baseHeaderHeight * 0.4;
      const subtitleFontSize = baseHeaderHeight * 0.25;
      const metaFontSize = baseHeaderHeight * 0.25;

      testerStats = (
        <div className="option-section border-left">
          <div className="section-main" style="flex-direction: column; align-items: flex-start; gap: 2px;">
            <div style="font-weight: bold; font-size: 0.8em; color: var(--text-secondary);">
              {i18n.t("ui.tab.tester")}
            </div>
            <div style="font-size: 0.8em; font-family: monospace;">W: {width}px</div>
            <div style="font-size: 0.8em; font-family: monospace;">Bars: {barsPerRow.toFixed(2)}</div>
            <div style="font-size: 0.8em; font-family: monospace;">Note Ø: {noteDiameter.toFixed(1)}px</div>
            <div style="font-size: 0.8em; font-family: monospace;">Title: {titleFontSize.toFixed(1)}px</div>
            <div style="font-size: 0.8em; font-family: monospace;">Sub: {subtitleFontSize.toFixed(1)}px</div>
            <div style="font-size: 0.8em; font-family: monospace;">Meta: {metaFontSize.toFixed(1)}px</div>
          </div>
        </div>
      );
    }

    const vdom = (
      <div style="display: contents;">
        {/* Zoom Section */}
        <div className="option-section">
          <div className="section-main">
            <span className="sub-label" style="min-width: auto;">
              {i18n.t("ui.zoom")}
            </span>
            <div className="zoom-controls" style="display: flex; align-items: center; gap: 5px;">
              <stepper-control
                id="zoom-stepper"
                value={appState.viewOptions.beatsPerLine}
                baseline={16}
                min={4}
                max={32}
                step={-2}
                format={(v: number) => `${Math.round((16 / v) * 100)}%`}
                changeCallback={this.handleZoomChange.bind(this)}
              />
              <label className="checkbox-label" style="margin-left: 5px;">
                <input
                  type="checkbox"
                  id="zoom-auto-checkbox"
                  checked={!!appState.viewOptions.autoZoom}
                  onchange={this.handleAutoZoom.bind(this)}
                />
                <span>{i18n.t("ui.auto")}</span>
              </label>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="option-section border-left">
          <div className="section-main">
            <label className="checkbox-label">
              <input
                type="checkbox"
                id="show-stats-checkbox"
                checked={this.statsVisible}
                onchange={this.handleStatsToggle.bind(this)}
              />
              <span>{i18n.t("ui.showStats")}</span>
            </label>
          </div>
        </div>

        {testerStats}
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("view-options", ViewOptions);
