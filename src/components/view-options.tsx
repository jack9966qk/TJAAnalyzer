import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { noteStatsDisplay } from "../view/ui-elements.js";
import "./save-image-button.js";

export class ViewOptions extends HTMLElement {
  private _statsVisible = true;

  get statsVisible(): boolean {
    return this._statsVisible;
  }

  set statsVisible(val: boolean) {
    this._statsVisible = val;
    this.render();
  }

  connectedCallback() {
    this.render();
    // Listen for language changes
    i18n.onLanguageChange(() => this.render());
  }

  initializeFromLayout() {
    // Default stats to off in vertical layout
    if (!document.body.classList.contains("horizontal-layout")) {
      this.statsVisible = false;
      this.handleStatsChange();
    } else {
      // Ensure UI matches state if re-connected (e.g. if kept in DOM or re-appended)
      if (noteStatsDisplay) {
        this.statsVisible = noteStatsDisplay.style.display !== "none";
      } else {
        this.render();
      }
    }
  }

  private handleZoomOut() {
    if (appState.viewOptions.beatsPerLine < 32) {
      appState.viewOptions.beatsPerLine += 2;
      refreshChart();
      this.render();
    }
  }

  private handleZoomIn() {
    if (appState.viewOptions.beatsPerLine > 4) {
      appState.viewOptions.beatsPerLine -= 2;
      refreshChart();
      this.render();
    }
  }

  private handleZoomReset() {
    if (appState.viewOptions.beatsPerLine !== 16) {
      appState.viewOptions.beatsPerLine = 16;
      refreshChart();
      this.render();
    }
  }

  private handleStatsToggle(e: Event) {
    this.statsVisible = (e.target as HTMLInputElement).checked;
    this.handleStatsChange();
  }

  private handleStatsChange() {
    if (noteStatsDisplay) {
      noteStatsDisplay.style.display = this.statsVisible ? "" : "none";
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
    const percent = Math.round((16 / appState.viewOptions.beatsPerLine) * 100);

    // Apply styles to host
    this.style.display = "flex";
    this.style.gap = "20px";
    this.style.alignItems = "flex-start";
    this.style.flexWrap = "wrap";
    this.style.width = "100%";
    this.classList.add("panel-pane");

    const vdom = (
      <div style="display: contents;">
        {/* Zoom Section */}
        <div className="option-section">
          <div className="section-main">
            <span className="sub-label" style="min-width: auto; margin-right: 10px;">
              {i18n.t("ui.zoom")}:
            </span>
            <div className="zoom-controls" style="display: flex; align-items: center; gap: 5px;">
              <button type="button" id="zoom-out-btn" className="tiny-btn" onclick={this.handleZoomOut.bind(this)}>
                -
              </button>
              <button
                type="button"
                id="zoom-reset-btn"
                className="tiny-btn"
                style="font-family: 'Consolas', monospace; min-width: 50px;"
                onclick={this.handleZoomReset.bind(this)}
              >
                {percent}%
              </button>
              <button type="button" id="zoom-in-btn" className="tiny-btn" onclick={this.handleZoomIn.bind(this)}>
                +
              </button>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="option-section border-left">
          <div className="section-main">
            <label>
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

        {/* Export Image Section */}
        <div className="option-section border-left">
          <div className="section-main">
            <save-image-button id="export-image-btn">{i18n.t("ui.exportImage")}</save-image-button>
          </div>
        </div>
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("view-options", ViewOptions);
