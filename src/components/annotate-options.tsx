import * as Renderer from "tja-renderer";
import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { tjaChart } from "../view/ui-elements.js";
import "./stepper-control.js";

const { LocationMap } = Renderer.Private;

export class AnnotateOptions extends HTMLElement {
  private readonly ALT_THRESHOLDS = [1 / 32, 1 / 16, 1 / 12, 1 / 8, 1 / 4, 1, 2, 4, Infinity];
  private readonly RESET_THRESHOLDS = [0, 1 / 32, 1 / 16, 1 / 12, 1 / 8, 1 / 4, 1, 2, 4, Infinity];

  private formatThreshold(val: number): string {
    if (val === Infinity) return "∞";
    if (val === 0) return "0";
    if (val === 1 / 32) return "1/32";
    if (val === 1 / 16) return "1/16";
    if (val === 1 / 12) return "1/12";
    if (val === 1 / 8) return "1/8";
    if (val === 1 / 4) return "1/4";
    return val.toString();
  }

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

  private handleAltChange(index: number) {
    appState.viewOptions.handAlternationThreshold = this.ALT_THRESHOLDS[Math.floor(index)];
    refreshChart();
    this.render();
  }

  private handleResetChange(index: number) {
    appState.viewOptions.handResetThreshold = this.RESET_THRESHOLDS[Math.floor(index)];
    refreshChart();
    this.render();
  }

  private handleToolTypeChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    appState.viewOptions.annotationToolType = target.value as "hand" | "separator";
    refreshChart();
    this.render();
  }

  private handleModeChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    appState.viewOptions.autoAnnotateMode = target.value as "full" | "partial";
    refreshChart();
    this.render();
  }

  render() {
    const altVal = appState.viewOptions.handAlternationThreshold ?? Infinity;
    let altIdx = this.ALT_THRESHOLDS.indexOf(altVal);
    if (altIdx === -1) altIdx = this.ALT_THRESHOLDS.length - 1;

    const resetVal = appState.viewOptions.handResetThreshold ?? 0;
    let resetIdx = this.RESET_THRESHOLDS.indexOf(resetVal);
    if (resetIdx === -1) resetIdx = 0;

    const mode = appState.viewOptions.autoAnnotateMode || "partial";
    const isPartialSelected = (mode === "partial") as boolean | undefined;
    const isFullSelected = (mode === "full") as boolean | undefined;
    const toolType = appState.viewOptions.annotationToolType || "hand";
    const isHandTool = toolType === "hand";
    const isSeparatorTool = toolType === "separator";
    const descKey = isHandTool ? "ui.annotation.desc" : "ui.annotation.desc.separator";

    const vdom = (
      <div className="control-group" style="display: flex; flex-direction: column; gap: 10px; align-items: flex-start;">
        <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
          <span style="font-size: 0.9em; color: var(--text-secondary);">{i18n.t("ui.annotationToolType")}</span>
          <select
            className="control-select"
            style="width: 140px;"
            value={toolType}
            onchange={this.handleToolTypeChange.bind(this)}
          >
            <option value="hand" selected={isHandTool as boolean | undefined}>
              {i18n.t("ui.annotationToolType.hand")}
            </option>
            <option value="separator" selected={isSeparatorTool as boolean | undefined}>
              {i18n.t("ui.annotationToolType.separator")}
            </option>
          </select>
        </div>

        <p className="tab-description">{i18n.t(descKey)}</p>
        <div style="display: flex; width: 100%;">
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

        <div style="display: flex; flex-direction: column; gap: 5px;">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!appState.viewOptions.showTextInAnnotationMode}
              onchange={this.handleToggleShowText.bind(this)}
            />
            <span>{i18n.t("ui.showTextInAnnotationMode")}</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!appState.viewOptions.alwaysShowAnnotations}
              onchange={this.handleToggleAlwaysShow.bind(this)}
            />
            <span>{i18n.t("ui.alwaysShowAnnotations")}</span>
          </label>
        </div>

        {isHandTool ? (
          <>
            <div style="width: 100%; border-top: 1px solid var(--border-lighter); padding-top: 5px;"></div>

            <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; width: 100%;">
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-size: 0.9em; color: var(--text-secondary);">
                  {i18n.t("ui.handAlternationThreshold") || "Alternation gap:"}
                </span>
                <stepper-control
                  value={altIdx}
                  min={0}
                  max={this.ALT_THRESHOLDS.length - 1}
                  step={1}
                  baseline={this.ALT_THRESHOLDS.length - 1}
                  format={(v: number) => this.formatThreshold(this.ALT_THRESHOLDS[v])}
                  changeCallback={(v: number) => this.handleAltChange(v)}
                ></stepper-control>
              </div>
              <div style="display: flex; flex-direction: column; gap: 5px;">
                <span style="font-size: 0.9em; color: var(--text-secondary);">
                  {i18n.t("ui.handResetThreshold") || "Reset gap:"}
                </span>
                <stepper-control
                  value={resetIdx}
                  min={0}
                  max={this.RESET_THRESHOLDS.length - 1}
                  step={1}
                  baseline={0}
                  format={(v: number) => this.formatThreshold(this.RESET_THRESHOLDS[v])}
                  changeCallback={(v: number) => this.handleResetChange(v)}
                ></stepper-control>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 10px; width: 100%;">
              <span style="font-size: 0.9em; color: var(--text-secondary);">
                {i18n.t("ui.autoAnnotateMode") || "Apply to:"}
              </span>
              <select
                className="control-select"
                style="width: 120px;"
                value={mode}
                onchange={this.handleModeChange.bind(this)}
              >
                <option value="partial" selected={isPartialSelected}>
                  {i18n.t("ui.autoAnnotateMode.partial") || "Some notes"}
                </option>
                <option value="full" selected={isFullSelected}>
                  {i18n.t("ui.autoAnnotateMode.full") || "All notes"}
                </option>
              </select>
            </div>

            <div style="display: flex; width: 100%;">
              <button
                type="button"
                id="auto-annotate-btn"
                className="control-btn"
                onclick={this.handleAutoAnnotate.bind(this)}
              >
                {i18n.t("ui.autoAnnotate")}
              </button>
            </div>
          </>
        ) : null}
      </div>
    );
    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("annotate-options", AnnotateOptions);
