import * as webjsx from "webjsx";
import { LocationMap } from "../../renderer-package/src/index.js";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { tjaChart } from "../view/ui-elements.js";

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
    appState.annotations = new LocationMap();
    refreshChart();
  }

  private handleToggleShowText(e: Event) {
    const target = e.target as HTMLInputElement;
    appState.viewOptions.showTextInAnnotationMode = target.checked;
    refreshChart();
  }

  private handleToggleAlwaysShow(e: Event) {
    const target = e.target as HTMLInputElement;
    appState.viewOptions.alwaysShowAnnotations = target.checked;
    refreshChart();
  }

  render() {
    const vdom = (
      <div style="display: contents;">
        <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 5px;">
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
              style="background-color: var(--bg-panel-tabs); color: var(--text-primary); border: 1px solid var(--border-color);"
              onclick={this.handleClearAnnotations.bind(this)}
            >
              {i18n.t("ui.clearAnnotations")}
            </button>
          </div>
          <div
            className="control-group"
            style="display: flex; align-items: center; justify-content: space-between; gap: 10px;"
          >
            <div style="display: flex; flex-direction: column; gap: 5px;">
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input
                  type="checkbox"
                  checked={!!appState.viewOptions.showTextInAnnotationMode}
                  onchange={this.handleToggleShowText.bind(this)}
                />
                <span style="margin-left: 5px;">{i18n.t("ui.showTextInAnnotationMode")}</span>
              </label>
              <label style="display: flex; align-items: center; cursor: pointer;">
                <input
                  type="checkbox"
                  checked={!!appState.viewOptions.alwaysShowAnnotations}
                  onchange={this.handleToggleAlwaysShow.bind(this)}
                />
                <span style="margin-left: 5px;">{i18n.t("ui.alwaysShowAnnotations")}</span>
              </label>
            </div>
          </div>
        </div>
        <p style="font-size: 0.9em; color: #666; margin-top: 5px; margin-bottom: 0;">{i18n.t("ui.annotation.desc")}</p>
      </div>
    );
    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("annotate-options", AnnotateOptions);
