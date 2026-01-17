import * as webjsx from "webjsx";
import { refreshChart, updateStatsComponent } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import "./save-image-button.js";

export class JudgementOptions extends HTMLElement {
  // Local state for rendering
  private _loopCollapseEnabled = false;
  private _loopCollapseChecked = false;
  
  constructor() {
    super();
    this.style.display = "flex";
    this.style.gap = "20px";
    this.style.alignItems = "flex-start";
    this.style.flexWrap = "wrap";
  }

  connectedCallback() {
    this.render();
    // Listen for language changes
    i18n.onLanguageChange(() => this.render());
  }

  // --- Public Methods (API) ---

  public refreshStatus(updateMode = true) {
    if (updateMode) this.syncViewModeFromState();
    this.render();
  }

  public setLoopCollapseState(enabled: boolean, checked: boolean) {
    this._loopCollapseEnabled = enabled;
    this._loopCollapseChecked = checked;
    this.render();
  }

  // --- Event Handlers ---

  private handleStyleChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.checked) {
      if (target.value === "underline") {
        appState.viewOptions.viewMode = "judgements-underline";
      } else if (target.value === "text") {
        appState.viewOptions.viewMode = "judgements-text";
      } else {
        appState.viewOptions.viewMode = "judgements";
      }
      refreshChart();
      this.render();
    }
  }

  private handleColoringChange(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.checked) {
      appState.viewOptions.coloringMode = target.value === "gradient" ? "gradient" : "categorical";
      refreshChart();
      this.render();
    }
  }

  private handleVisibilityChange(type: "perfect" | "good" | "poor", e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    appState.viewOptions.visibility = {
      ...appState.viewOptions.visibility,
      [type]: checked,
    };
    refreshChart();
  }

  private handleCollapseLoopChange(e: Event) {
    appState.viewOptions.collapsedLoop = (e.target as HTMLInputElement).checked;
    refreshChart();
    updateStatsComponent(null);
    this.render();
  }

  private handleLoopAutoChange(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    if (checked) {
      appState.viewOptions.selectedLoopIteration = undefined;
    } else {
      appState.viewOptions.selectedLoopIteration = 0;
    }
    refreshChart();
    this.render();
  }

  private handlePrevLoop() {
    if (appState.viewOptions.selectedLoopIteration !== undefined && appState.viewOptions.selectedLoopIteration > 0) {
      appState.viewOptions.selectedLoopIteration--;
      refreshChart();
      this.render();
    }
  }

  private handleNextLoop() {
    if (
      appState.currentChart?.loop &&
      appState.viewOptions.selectedLoopIteration !== undefined &&
      appState.viewOptions.selectedLoopIteration < appState.currentChart.loop.iterations - 1
    ) {
      appState.viewOptions.selectedLoopIteration++;
      refreshChart();
      this.render();
    }
  }

  // --- Helper Methods ---

  private syncViewModeFromState() {
    // This is kind of reverse: we want to ensure appState matches what we might have rendered or default?
    // Actually, in the original code, this was called to ensure appState.viewOptions.viewMode
    // matches the radio buttons. Here, we should probably do the opposite or just trust appState.
    // The original `refreshStatus` had `if (updateMode) this.updateViewMode();` which read FROM DOM.
    // Since we now render FROM state, we should probably just rely on appState being the source of truth.
    // However, if we want to force a default or something, we can do it here.
    // For now, we'll assume appState is correct.
  }

  private getLoopStatus() {
    const hasLoop = !!appState.currentChart?.loop;
    let text = "1 / 1";
    let isAuto = appState.viewOptions.selectedLoopIteration === undefined;
    let current = appState.viewOptions.selectedLoopIteration || 0;
    let total = appState.currentChart?.loop?.iterations || 1;
    let prevDisabled = true;
    let nextDisabled = true;

    if (isAuto) {
      prevDisabled = true;
      nextDisabled = true;

      if (hasLoop) {
        let displayedIter = 0;
        // biome-ignore lint/style/noNonNullAssertion: Guaranteed by context
        const loop = appState.currentChart!.loop!; 

        if (
          (appState.viewOptions.viewMode === "judgements" ||
            appState.viewOptions.viewMode === "judgements-underline" ||
            appState.viewOptions.viewMode === "judgements-text") &&
          appState.judgements.length > 0
        ) {
          let notesPerLoop = 0;
          let preLoopNotes = 0;
          
          for (let i = 0; i < loop.startBarIndex; i++) {
            const bar = appState.currentChart?.bars[i];
            if (bar) for (const c of bar) if (["1", "2", "3", "4"].includes(c)) preLoopNotes++;
          }
          for (let k = 0; k < loop.period; k++) {
            const bar = appState.currentChart?.bars[loop.startBarIndex + k];
            if (bar) for (const c of bar) if (["1", "2", "3", "4"].includes(c)) notesPerLoop++;
          }

          const lastJudgedIndex = appState.judgements.length - 1;
          if (lastJudgedIndex >= preLoopNotes && notesPerLoop > 0) {
            const relativeIndex = lastJudgedIndex - preLoopNotes;
            displayedIter = Math.floor(relativeIndex / notesPerLoop);
          }

          if (displayedIter < 0) displayedIter = 0;
          if (displayedIter >= loop.iterations) displayedIter = loop.iterations - 1;
        }
        text = `${displayedIter + 1} / ${loop.iterations}`;
      }
    } else {
      prevDisabled = current <= 0;
      nextDisabled = current >= total - 1;
      text = `${current + 1} / ${total}`;
    }

    return { text, isAuto, prevDisabled, nextDisabled };
  }

  render() {
    const isStreamActive = appState.isStreamConnected || appState.isSimulating;
    const loopStatus = this.getLoopStatus();
    const isLoopCollapsed = appState.viewOptions.collapsedLoop;
    
    // Determine selected style
    const viewMode = appState.viewOptions.viewMode;
    const styleValue = viewMode === "judgements-text" ? "text" : (viewMode === "judgements-underline" ? "underline" : "color");

    const vdom = (
      <div style="display: contents;">
        <div className="option-section">
          {/* Warning Message */}
          <div
            className="description-text"
            style={`color: #666; font-style: italic; margin-bottom: 10px; display: ${isStreamActive ? "none" : "block"};`}
          >
            {i18n.t("ui.judgement.notActive")}
          </div>

          {/* Collapse Loops Checkbox */}
          <div 
             className={`section-main ${!this._loopCollapseEnabled ? "disabled-text" : ""}`} 
             style={`margin-bottom: 10px; display: ${this._loopCollapseEnabled ? "block" : "none"}`}
          >
            <label>
              <input
                type="checkbox"
                id="collapse-loop-checkbox"
                checked={this._loopCollapseChecked}
                disabled={!this._loopCollapseEnabled}
                onchange={this.handleCollapseLoopChange.bind(this)}
              />
              <span>{i18n.t("ui.collapseLoops")}</span>
            </label>
          </div>

          {/* Loop Controls */}
          <div
            className="sub-group"
            id="loop-control-group"
            style={`margin-bottom: 10px; display: ${isLoopCollapsed ? "flex" : "none"};`}
          >
            <label className="auto-check" style="display: flex; align-items: center; gap: 5px; margin-right: 10px;">
              <input
                type="checkbox"
                id="loop-auto"
                checked={loopStatus.isAuto}
                onchange={this.handleLoopAutoChange.bind(this)}
              />
              <span>{i18n.t("ui.auto")}</span>
            </label>
            <div className="loop-stepper" style="display: flex; align-items: center; gap: 5px;">
              <button
                id="prev-loop-btn"
                className="tiny-btn"
                disabled={loopStatus.prevDisabled}
                onclick={this.handlePrevLoop.bind(this)}
              >
                &lt;
              </button>
              <span
                id="loop-counter-display"
                style="font-family: 'Consolas', monospace; min-width: 50px; text-align: center;"
              >
                {loopStatus.text}
              </span>
              <button
                id="next-loop-btn"
                className="tiny-btn"
                disabled={loopStatus.nextDisabled}
                onclick={this.handleNextLoop.bind(this)}
              >
                &gt;
              </button>
            </div>
          </div>

          {/* Main Controls */}
          <div
            id="judgement-subcontrols"
            className={`section-subs ${!isStreamActive ? "disabled" : ""}`}
            style={`margin-left: 0; opacity: ${isStreamActive ? "1" : "0.5"}; pointer-events: ${isStreamActive ? "auto" : "none"};`}
          >
            <div className="sub-group">
              <span className="sub-label">{i18n.t("ui.style")}:</span>
              <label>
                <input
                  type="radio"
                  name="judgementStyle"
                  value="color"
                  checked={styleValue === "color"}
                  onchange={this.handleStyleChange.bind(this)}
                />
                <span>{i18n.t("ui.style.color")}</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="judgementStyle"
                  value="underline"
                  checked={styleValue === "underline"}
                  onchange={this.handleStyleChange.bind(this)}
                />
                <span>{i18n.t("ui.style.underline")}</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="judgementStyle"
                  value="text"
                  checked={styleValue === "text"}
                  onchange={this.handleStyleChange.bind(this)}
                />
                <span>{i18n.t("ui.style.text")}</span>
              </label>
            </div>

            <div className="sub-group">
              <span className="sub-label">{i18n.t("ui.coloring")}:</span>
              <label>
                <input
                  type="radio"
                  name="judgementColoring"
                  value="class"
                  checked={appState.viewOptions.coloringMode === "categorical"}
                  onchange={this.handleColoringChange.bind(this)}
                />
                <span>{i18n.t("ui.coloring.class")}</span>
              </label>
              <label>
                <input
                  type="radio"
                  name="judgementColoring"
                  value="gradient"
                  checked={appState.viewOptions.coloringMode === "gradient"}
                  onchange={this.handleColoringChange.bind(this)}
                />
                <span>{i18n.t("ui.coloring.gradient")}</span>
              </label>
            </div>

            <div className="sub-group">
              <span className="sub-label">{i18n.t("ui.filter")}:</span>
              <label>
                <input
                  type="checkbox"
                  id="show-perfect"
                  checked={appState.viewOptions.visibility.perfect}
                  onchange={(e) => this.handleVisibilityChange("perfect", e)}
                />
                <span>{i18n.t("judgement.perfect")}</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  id="show-good"
                  checked={appState.viewOptions.visibility.good}
                  onchange={(e) => this.handleVisibilityChange("good", e)}
                />
                <span>{i18n.t("judgement.good")}</span>
              </label>
              <label>
                <input
                  type="checkbox"
                  id="show-poor"
                  checked={appState.viewOptions.visibility.poor}
                  onchange={(e) => this.handleVisibilityChange("poor", e)}
                />
                <span>{i18n.t("judgement.poor")}</span>
              </label>
            </div>
          </div>
        </div>

        <div
          className="option-section border-left"
          id="save-image-container"
          style={`opacity: ${isStreamActive ? "1" : "0.5"}; pointer-events: ${isStreamActive ? "auto" : "none"};`}
        >
          <div className="section-main">
            <save-image-button id="save-image-judgements"></save-image-button>
          </div>
        </div>
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("judgement-options", JudgementOptions);