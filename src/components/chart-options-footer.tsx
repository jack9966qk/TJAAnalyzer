import * as webjsx from "webjsx";
import { i18n } from "../utils/i18n.js";
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

export class ChartOptionsFooter extends HTMLElement {
  connectedCallback() {
    this.render();
    // Listen for language changes
    i18n.onLanguageChange(() => this.render());
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

  render() {
    // Apply styles to host
    this.classList.add("chart-options-footer");

    const vdom = (
      <div style="display: contents;">
        <div style="display: flex; align-items: center;">
          <save-image-button id="export-image-footer-btn">{i18n.t("ui.exportImage")}</save-image-button>
        </div>

        <div style="display: flex; align-items: center;">
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
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("chart-options-footer", ChartOptionsFooter);
