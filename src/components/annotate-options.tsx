import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { tjaChart } from "../view/ui-elements.js";
import "./save-image-button.js";

export class AnnotateOptions extends HTMLElement {
  connectedCallback() {
    this.style.display = "block";
    this.render();
    // Listen for language changes
    i18n.onLanguageChange(() => this.render());
  }

  private handleAutoAnnotate() {
    if (tjaChart) {
      tjaChart.autoAnnotate();
    }
  }

  private handleClearAnnotations() {
    appState.annotations = {};
    refreshChart();
  }

  render() {
    const vdom = (
      <div style="display: contents;">
        <div className="control-group" style="display: flex; align-items: center; gap: 10px;">
          <button
            type="button"
            id="auto-annotate-btn"
            className="control-btn"
            onclick={this.handleAutoAnnotate.bind(this)}
          >
            {i18n.t("ui.autoAnnotate")}
          </button>
          <button
            type="button"
            id="clear-annotations-btn"
            className="control-btn"
            onclick={this.handleClearAnnotations.bind(this)}
          >
            {i18n.t("ui.clearAnnotations")}
          </button>
          <save-image-button>{i18n.t("ui.exportImage")}</save-image-button>
        </div>
        <p style="font-size: 0.9em; color: #666; margin-top: 5px;">{i18n.t("ui.annotation.desc")}</p>
      </div>
    );
    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("annotate-options", AnnotateOptions);
