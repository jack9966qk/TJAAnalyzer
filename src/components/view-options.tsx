import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { noteStatsDisplay } from "../view/ui-elements.js";
import "./save-image-button.js";

interface VendorFullScreenElement extends HTMLElement {
  mozRequestFullScreen?(): Promise<void>;
  webkitRequestFullscreen?(): Promise<void>;
  msRequestFullscreen?(): Promise<void>;
}

interface VendorDocument extends Document {
  mozFullScreenElement?: Element;
  webkitFullscreenElement?: Element;
  msFullscreenElement?: Element;
  mozCancelFullScreen?(): Promise<void>;
  webkitExitFullscreen?(): Promise<void>;
  msExitFullscreen?(): Promise<void>;
}

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
    document.addEventListener("view-options-update", this.handleViewOptionsUpdate.bind(this));
  }

  disconnectedCallback() {
    document.removeEventListener("view-options-update", this.handleViewOptionsUpdate.bind(this));
  }

  private handleViewOptionsUpdate() {
    this.render();
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
    appState.viewOptions.autoZoom = false;
    if (appState.viewOptions.beatsPerLine < 32) {
      appState.viewOptions.beatsPerLine += 2;
      refreshChart();
      this.render();
    }
  }

  private handleZoomIn() {
    appState.viewOptions.autoZoom = false;
    if (appState.viewOptions.beatsPerLine > 4) {
      appState.viewOptions.beatsPerLine -= 2;
      refreshChart();
      this.render();
    }
  }

  private handleZoomReset() {
    appState.viewOptions.autoZoom = false;
    if (appState.viewOptions.beatsPerLine !== 16) {
      appState.viewOptions.beatsPerLine = 16;
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
              {i18n.t("ui.zoom")}
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
              <label style="margin-left: 5px; display: flex; align-items: center; cursor: pointer; user-select: none;">
                <input
                  type="checkbox"
                  id="zoom-auto-checkbox"
                  checked={!!appState.viewOptions.autoZoom}
                  onchange={this.handleAutoZoom.bind(this)}
                />
                <span style="margin-left: 4px;">{i18n.t("ui.auto")}</span>
              </label>
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

        {/* Fullscreen Section */}
        <div className="option-section border-left">
          <div className="section-main">
            <button
              type="button"
              className="control-btn"
              onclick={this.handleFullscreen.bind(this)}
              title={i18n.t("ui.fullscreen")}
              style="display: flex; align-items: center; justify-content: center; padding: 8px;"
            >
              <img
                src="assets/heroicons/optimized/24/outline/arrows-pointing-out.svg"
                alt="Fullscreen"
                style="width: 20px; height: 20px; filter: brightness(0) invert(1);"
              />
            </button>
          </div>
        </div>
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }

  private handleFullscreen() {
    const chart = document.getElementById("chart-component");
    if (chart) {
      const doc = document as VendorDocument;
      const el = chart as VendorFullScreenElement;

      const isFullscreen =
        doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
      const isPseudoFullscreen = chart.classList.contains("pseudo-fullscreen");

      if (!isFullscreen && !isPseudoFullscreen) {
        let requestPromise: Promise<void> | undefined;
        if (el.requestFullscreen) {
          requestPromise = el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          requestPromise = el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          requestPromise = el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          requestPromise = el.msRequestFullscreen();
        }

        if (requestPromise) {
          requestPromise.catch((_err: Error) => {
            // Fallback to pseudo fullscreen if native fails (common on mobile)
            chart.classList.add("pseudo-fullscreen");
          });
        } else {
          // Fallback immediately if API not present
          chart.classList.add("pseudo-fullscreen");
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
        chart.classList.remove("pseudo-fullscreen");
      }
    }
  }
}

customElements.define("view-options", ViewOptions);
