import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import "./export-button.js";

export class SelectOptions extends HTMLElement {
  private exportChartName = "Exported Selection";
  private exportLoopCount = 10;
  private exportGapCount = 1;

  connectedCallback() {
    this.style.display = "block";
    this.style.width = "100%";
    this.style.boxSizing = "border-box";
    this.render();
    // Listen for language changes
    i18n.onLanguageChange(() => this.render());
    // Listen for Neutralino ready
    window.addEventListener("neutralino-ready", () => this.render());
  }

  public refreshStatus() {
    this.render();
  }

  private handleClearSelection() {
    appState.viewOptions.selection = null;
    appState.selectedNoteHitInfo = null;
    refreshChart();
    this.render();
  }

  private handleNameChange(e: Event) {
    this.exportChartName = (e.target as HTMLInputElement).value;
    this.render(); // Re-render to update attributes on export-button
  }

  private handleLoopChange(e: Event) {
    this.exportLoopCount = parseInt((e.target as HTMLInputElement).value, 10);
    this.render();
  }

  private handleGapChange(e: Event) {
    this.exportGapCount = parseInt((e.target as HTMLInputElement).value, 10);
    this.render();
  }

  private handleDisplayOnlySelectedChange(e: Event) {
    const target = e.target as HTMLInputElement;
    appState.displayOnlySelected = target.checked;
    refreshChart();
    this.render();
  }

  render() {
    const hasSelection = !!appState.viewOptions.selection;
    const hasNeutralino = appState.isNeutralinoConnected;
    const hasWebFS = !!window.showDirectoryPicker;
    const canSelectDir = hasNeutralino || hasWebFS;
    const vdom = (
      <div className="control-group" style="display: flex; flex-direction: column; gap: 10px; align-items: flex-start;">
        <div style="display: flex; width: 100%;">
          <button
            type="button"
            id="clear-selection-btn"
            className="control-btn"
            onclick={this.handleClearSelection.bind(this)}
            disabled={!hasSelection}
          >
            {i18n.t("ui.clearSelection")}
          </button>
        </div>

        {!appState.viewOptions.showAllBranches ? (
          <label className="checkbox-label" style="width: 100%;">
            <input
              type="checkbox"
              checked={appState.displayOnlySelected}
              disabled={!hasSelection}
              onchange={this.handleDisplayOnlySelectedChange.bind(this)}
            />
            <span>{i18n.t("ui.displayOnlySelected")}</span>
          </label>
        ) : null}

        <div style="width: 100%; border-top: 1px solid var(--border-lighter); padding-top: 10px;">
          <h4 style="margin: 0;">{i18n.t("ui.export")}</h4>
        </div>

        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 15px;">
          <label className="sub-group" style="white-space: nowrap;">
            <span className="sub-label" style="min-width: auto;">
              {i18n.t("ui.export.loops")}
            </span>
            <input
              type="number"
              id="export-loop-count"
              value={this.exportLoopCount.toString()}
              min="1"
              style="width: 70px;"
              oninput={this.handleLoopChange.bind(this)}
            />
          </label>
          <label className="sub-group" style="white-space: nowrap;">
            <span className="sub-label" style="min-width: auto;">
              {i18n.t("ui.export.gap")}
            </span>
            <input
              type="number"
              id="export-gap-count"
              value={this.exportGapCount.toString()}
              min="0"
              style="width: 70px;"
              oninput={this.handleGapChange.bind(this)}
            />
          </label>
        </div>

        <label style="display: flex; flex-direction: column; width: 100%; gap: 5px;">
          <span className="sub-label">{i18n.t("ui.export.chartName")}</span>
          <input
            type="text"
            id="export-chart-name"
            value={this.exportChartName}
            placeholder={i18n.t("ui.export.chartName")}
            style="width: 100%; padding: 4px; box-sizing: border-box;"
            oninput={this.handleNameChange.bind(this)}
          />
        </label>

        <export-button
          export-type="download"
          chart-name={this.exportChartName}
          loop-count={this.exportLoopCount.toString()}
          gap-count={this.exportGapCount.toString()}
          disabled={!hasSelection}
          style="width: 100%; display: block;"
        ></export-button>

        {canSelectDir ? (
          <export-button
            export-type="directory"
            chart-name={this.exportChartName}
            loop-count={this.exportLoopCount.toString()}
            gap-count={this.exportGapCount.toString()}
            disabled={!hasSelection}
            style="width: 100%; display: block;"
          ></export-button>
        ) : null}
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("select-options", SelectOptions);
