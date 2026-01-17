import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { generateTJAFromSelection } from "../core/tja-exporter.js";
import { appState } from "../state/app-state.js";
import { shareFile } from "../utils/file-share.js";
import { i18n } from "../utils/i18n.js";
import { courseBranchSelect } from "../view/ui-elements.js";

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

  private async handleExportSelection() {
    if (!appState.currentChart || !appState.viewOptions.selection) {
      return;
    }

    try {
      const tjaContent = generateTJAFromSelection(
        appState.currentChart,
        appState.viewOptions.selection,
        courseBranchSelect.difficulty,
        this.exportLoopCount,
        this.exportChartName,
        this.exportGapCount,
      );

      await shareFile(`${this.exportChartName}.tja`, tjaContent, "text/plain", "Export TJA");
      
      this.dispatchEvent(
        new CustomEvent("status-update", { detail: { key: "status.exportSuccess" }, bubbles: true }),
      );
    } catch (e) {
      console.error("Export failed:", e);
      this.dispatchEvent(new CustomEvent("status-update", { detail: { key: "status.exportFailed" }, bubbles: true }));
    }
  }

  private handleNameChange(e: Event) {
    this.exportChartName = (e.target as HTMLInputElement).value;
  }

  private handleLoopChange(e: Event) {
    this.exportLoopCount = parseInt((e.target as HTMLInputElement).value, 10);
  }

  private handleGapChange(e: Event) {
    this.exportGapCount = parseInt((e.target as HTMLInputElement).value, 10);
  }

  render() {
    const hasSelection = !!appState.viewOptions.selection;

    const vdom = (
      <div className="control-group" style="display: flex; flex-direction: column; gap: 10px; align-items: flex-start;">
        <div style="display: flex; width: 100%;">
          <button
            id="clear-selection-btn"
            className="control-btn"
            onclick={this.handleClearSelection.bind(this)}
            disabled={!hasSelection}
          >
            {i18n.t("ui.clearSelection")}
          </button>
        </div>

        <input
          type="text"
          id="export-chart-name"
          value={this.exportChartName}
          placeholder={i18n.t("ui.export.chartName")}
          style="width: 100%; padding: 4px; box-sizing: border-box;"
          oninput={this.handleNameChange.bind(this)}
        />

        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 15px;">
          <label style="display: flex; align-items: center; gap: 5px; white-space: nowrap;">
            <span style="font-size: 0.9em;">{i18n.t("ui.export.loops")}:</span>
            <input
              type="number"
              id="export-loop-count"
              value={this.exportLoopCount.toString()}
              min="1"
              style="width: 50px; padding: 4px;"
              oninput={this.handleLoopChange.bind(this)}
            />
          </label>
          <label style="display: flex; align-items: center; gap: 5px; white-space: nowrap;">
            <span style="font-size: 0.9em;">{i18n.t("ui.export.gap")}:</span>
            <input
              type="number"
              id="export-gap-count"
              value={this.exportGapCount.toString()}
              min="0"
              style="width: 50px; padding: 4px;"
              oninput={this.handleGapChange.bind(this)}
            />
          </label>
          <button
            id="export-selection-btn"
            className="control-btn"
            onclick={this.handleExportSelection.bind(this)}
            disabled={!hasSelection}
          >
            {i18n.t("ui.export")}
          </button>
        </div>
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("select-options", SelectOptions);