import * as Renderer from "tja-renderer";
import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { tjaChart } from "../view/ui-elements.js";
import "./action-button.js";
import type { ModalPage } from "./modal-page.js";
import "./stepper-control.js";

const { NoteLocationMap, HandType } = Renderer.Private;

export class AnnotateOptions extends HTMLElement {
  private readonly ALT_THRESHOLDS = [1 / 32, 1 / 16, 1 / 12, 1 / 8, 1 / 4, 1, 2, 4, Infinity];
  private readonly RESET_THRESHOLDS = [0, 1 / 32, 1 / 16, 1 / 12, 1 / 8, 1 / 4, 1, 2, 4, Infinity];

  // Roll gap-threshold BPM stepper. The sentinel one step above the max represents "∞",
  // an infinitely high BPM makes a 16th note last no time, so no segment ever rolls.
  private readonly ROLL_GAP_MIN = 60;
  private readonly ROLL_GAP_MAX = 600;
  private readonly ROLL_GAP_STEP = 10;
  private readonly ROLL_GAP_INF = this.ROLL_GAP_MAX + this.ROLL_GAP_STEP;

  private _isConfigModalOpen = false;
  private _modalContainer: HTMLDivElement;

  constructor() {
    super();
    this._modalContainer = document.createElement("div");
  }

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

  private handleAnnotationsChange = () => setTimeout(() => this.render(), 0);

  connectedCallback() {
    this.style.display = "block";
    this.render();
    document.body.appendChild(this._modalContainer);
    // Listen for language changes
    i18n.onLanguageChange(() => this.render());
    if (tjaChart) {
      tjaChart.addEventListener("annotations-change", this.handleAnnotationsChange);
    }
  }

  disconnectedCallback() {
    if (tjaChart) {
      tjaChart.removeEventListener("annotations-change", this.handleAnnotationsChange);
    }
    if (this._modalContainer.parentNode === document.body) {
      document.body.removeChild(this._modalContainer);
    }
  }

  private handleAutoAnnotate() {
    if (tjaChart) {
      tjaChart.autoAnnotate();
    }
  }

  private handleClearAnnotations() {
    appState.annotations = new NoteLocationMap();
    refreshChart();
    this.render();
  }

  private handleToggleShowText(e: Event) {
    const target = e.target as HTMLInputElement;
    appState.renderOptions.showTextInAnnotationMode = target.checked;
    refreshChart();
  }

  private handleToggleAlwaysShow(e: Event) {
    const target = e.target as HTMLInputElement;
    appState.renderOptions.alwaysShowAnnotations = target.checked;
    refreshChart();
  }

  private handleAltChange(index: number) {
    appState.renderOptions.handAlternationThreshold = this.ALT_THRESHOLDS[Math.floor(index)];
    refreshChart();
    this.render();
  }

  private handleResetChange(index: number) {
    appState.renderOptions.handResetThreshold = this.RESET_THRESHOLDS[Math.floor(index)];
    refreshChart();
    this.render();
  }

  private handleRollGapChange(bpm: number) {
    appState.renderOptions.rollGapThresholdBpm = bpm > this.ROLL_GAP_MAX ? Infinity : Math.round(bpm);
    refreshChart();
    this.render();
  }

  private handleRollLengthChange(length: number) {
    appState.renderOptions.rollMinSegmentLength = Math.round(length);
    refreshChart();
    this.render();
  }

  private handleToolTypeSelect(value: "hand" | "separator" | "rolling") {
    appState.renderOptions.annotationToolType = value;
    refreshChart();
    this.render();
  }

  private handleModeChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    appState.renderOptions.autoAnnotateMode = target.value as "full" | "partial";
    refreshChart();
    this.render();
  }

  private handleMainHandSelect(hand: Renderer.Private.HandType) {
    appState.renderOptions.autoAnnotateMainHand = hand;
    refreshChart();
    this.render();
  }

  private openConfigModal() {
    this._isConfigModalOpen = true;
    this.render();
  }

  private closeConfigModal() {
    this._isConfigModalOpen = false;
    this.render();
  }

  render() {
    const altVal = appState.renderOptions.handAlternationThreshold ?? Infinity;
    let altIdx = this.ALT_THRESHOLDS.indexOf(altVal);
    if (altIdx === -1) altIdx = this.ALT_THRESHOLDS.length - 1;

    const resetVal = appState.renderOptions.handResetThreshold ?? 0;
    let resetIdx = this.RESET_THRESHOLDS.indexOf(resetVal);
    if (resetIdx === -1) resetIdx = 0;

    const mode = appState.renderOptions.autoAnnotateMode || "partial";
    const isPartialSelected = (mode === "partial") as boolean | undefined;
    const isFullSelected = (mode === "full") as boolean | undefined;
    const mainHand = appState.renderOptions.autoAnnotateMainHand ?? HandType.R;
    const isLeftStarter = mainHand === HandType.L;
    const isRightStarter = mainHand === HandType.R;
    const rollGapStored = appState.renderOptions.rollGapThresholdBpm ?? Infinity;
    const rollGapBpm = Number.isFinite(rollGapStored) ? rollGapStored : this.ROLL_GAP_INF;
    const rollMinLength = appState.renderOptions.rollMinSegmentLength ?? 4;
    const toolType = appState.renderOptions.annotationToolType || "hand";
    const isHandTool = toolType === "hand";
    const isSeparatorTool = toolType === "separator";
    const isRollingTool = toolType === "rolling";
    const descKey = isSeparatorTool
      ? "ui.annotation.desc.separator"
      : isRollingTool
        ? "ui.annotation.desc.rolling"
        : "ui.annotation.desc";

    const vdom = (
      <div className="control-group" style="display: flex; flex-direction: column; gap: 10px; align-items: flex-start;">
        <div className="segmented-control">
          <button
            type="button"
            className={`segmented-control-option${isHandTool ? " active" : ""}`}
            onclick={() => this.handleToolTypeSelect("hand")}
          >
            {i18n.t("ui.annotationToolType.hand")}
          </button>
          <button
            type="button"
            className={`segmented-control-option${isSeparatorTool ? " active" : ""}`}
            onclick={() => this.handleToolTypeSelect("separator")}
          >
            {i18n.t("ui.annotationToolType.separator")}
          </button>
          <button
            type="button"
            className={`segmented-control-option${isRollingTool ? " active" : ""}`}
            onclick={() => this.handleToolTypeSelect("rolling")}
          >
            {i18n.t("ui.annotationToolType.rolling")}
          </button>
        </div>

        <p className="tab-description">{i18n.t(descKey)}</p>
        <div style="display: flex; width: 100%;">
          <action-button
            id="clear-annotations-btn"
            button-variant="secondary"
            disabled={appState.annotations.size === 0}
            action={async () => this.handleClearAnnotations()}
          >
            {i18n.t("ui.clearAnnotations")}
          </action-button>
        </div>

        <div style="display: flex; flex-direction: column; gap: 5px;">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!appState.renderOptions.showTextInAnnotationMode}
              onchange={this.handleToggleShowText.bind(this)}
            />
            <span>{i18n.t("ui.showTextInAnnotationMode")}</span>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={!!appState.renderOptions.alwaysShowAnnotations}
              onchange={this.handleToggleAlwaysShow.bind(this)}
            />
            <span>{i18n.t("ui.alwaysShowAnnotations")}</span>
          </label>
        </div>

        <div style="width: 100%; border-top: 1px solid var(--border-lighter); padding-top: 5px;"></div>

        <div style="display: flex; gap: 8px; width: 100%;">
          <action-button id="auto-annotate-btn" button-variant="primary" action={async () => this.handleAutoAnnotate()}>
            {i18n.t("ui.autoAnnotate")}
          </action-button>
          <action-button
            id="auto-annotate-customize-btn"
            button-variant="secondary"
            action={async () => this.openConfigModal()}
          >
            {i18n.t("ui.autoAnnotateCustomize")}
          </action-button>
        </div>
      </div>
    );
    webjsx.applyDiff(this, vdom);

    const customizeBtn = this.querySelector("#auto-annotate-customize-btn");
    const modalVdom = (
      <modal-page
        id="auto-annotate-settings-modal"
        open={this._isConfigModalOpen || null}
        heading={i18n.t("ui.autoAnnotateSettings")}
        max-width="400px"
        onclose={this.closeConfigModal.bind(this)}
      >
        <div className="settings-content">
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div className="section-main">
              <span className="sub-label" style="min-width: auto;">
                {i18n.t("ui.handAlternationThreshold")}
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
            <div className="section-main">
              <span className="sub-label" style="min-width: auto;">
                {i18n.t("ui.handResetThreshold")}
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
            <div style="display: flex; align-items: center; gap: 10px;">
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
            <div style="display: flex; align-items: center; gap: 10px;">
              <span style="font-size: 0.9em; color: var(--text-secondary);">{i18n.t("ui.handStarter")}</span>
              <div className="segmented-control">
                <button
                  type="button"
                  className={`segmented-control-option${isLeftStarter ? " active" : ""}`}
                  onclick={() => this.handleMainHandSelect(HandType.L)}
                >
                  {i18n.t("ui.handStarter.left")}
                </button>
                <button
                  type="button"
                  className={`segmented-control-option${isRightStarter ? " active" : ""}`}
                  onclick={() => this.handleMainHandSelect(HandType.R)}
                >
                  {i18n.t("ui.handStarter.right")}
                </button>
              </div>
            </div>
            <div style="width: 100%; border-top: 1px solid var(--border-lighter); padding-top: 5px;"></div>
            <div className="section-main">
              <span className="sub-label" style="min-width: auto;">
                {i18n.t("ui.rollGapThreshold")}
              </span>
              <stepper-control
                value={rollGapBpm}
                min={this.ROLL_GAP_MIN}
                max={this.ROLL_GAP_INF}
                step={this.ROLL_GAP_STEP}
                baseline={this.ROLL_GAP_INF}
                format={(v: number) => (v > this.ROLL_GAP_MAX ? "∞" : `BPM ${Math.round(v)}`)}
                changeCallback={(v: number) => this.handleRollGapChange(v)}
              ></stepper-control>
            </div>
            <div className="section-main">
              <span className="sub-label" style="min-width: auto;">
                {i18n.t("ui.rollMinSegmentLength")}
              </span>
              <stepper-control
                value={rollMinLength}
                min={2}
                max={16}
                step={1}
                baseline={4}
                format={(v: number) => `${Math.round(v)}`}
                changeCallback={(v: number) => this.handleRollLengthChange(v)}
              ></stepper-control>
            </div>
          </div>
        </div>
      </modal-page>
    );
    webjsx.applyDiff(this._modalContainer, modalVdom);

    const modalEl = this._modalContainer.firstElementChild as ModalPage | null;
    modalEl?.setAnchor(customizeBtn ?? null);
  }
}

customElements.define("annotate-options", AnnotateOptions);
