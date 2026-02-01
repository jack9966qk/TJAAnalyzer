import * as webjsx from "webjsx";
import { clearJudgements, updateParsedCharts } from "../controllers/chart-controller.js";
import { exampleTJA } from "../core/example-data.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { courseBranchSelect } from "../view/ui-elements.js";

export class TesterPanel extends HTMLElement {
  private _isExampleLoaded = false;

  connectedCallback() {
    this._isExampleLoaded = appState.loadedTJAContent === exampleTJA;
    this.render();
    i18n.onLanguageChange(() => this.render());
    // Listen to global status changes if needed (e.g. for simulation status update)
    window.addEventListener("stream-status-change", this.handleStatusChange.bind(this));
  }

  disconnectedCallback() {
    window.removeEventListener("stream-status-change", this.handleStatusChange.bind(this));
  }

  private handleStatusChange() {
    this.render();
  }

  public resetExampleButton() {
    this._isExampleLoaded = false;
    this.render();
  }

  private handleLoadExample() {
    appState.loadedTJAContent = exampleTJA;
    this._isExampleLoaded = true;

    appState.currentEsePath = null;

    try {
      updateParsedCharts(appState.loadedTJAContent);
      this.dispatchStatus("status.exampleLoaded");
    } catch (e) {
      console.error("Error loading example:", e);
      const msg = i18n.t("status.parseError", { error: (e as Error).message });
      alert(msg);
      this.dispatchStatus("status.parseError", { error: (e as Error).message });
      this._isExampleLoaded = false;
    }
    this.render();
  }

  private handleTestStreamClick() {
    if (appState.isSimulating) {
      appState.judgementClient.disconnect();
      appState.isSimulating = false;
    } else {
      appState.isSimulating = true;
      clearJudgements();

      const diff = courseBranchSelect?.difficulty || "oni";
      appState.judgementClient.startSimulation(appState.loadedTJAContent, diff);
    }
  }

  private dispatchStatus(key: string, params?: Record<string, string | number>) {
    this.dispatchEvent(
      new CustomEvent("status-change", {
        detail: { key, params },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    const isSimulating = appState.isSimulating;
    const testBtnText = isSimulating ? i18n.t("ui.test.stop") : i18n.t("ui.test.start");

    // We disable test stream if actual stream is connected (but not simulating)
    const disableTest = appState.isStreamConnected && !isSimulating;

    const vdom = (
      <div>
        <div className="option-section">
          <h4 data-i18n="ui.tab.example" style="margin: 0 0 10px 0; font-size: 1em;">
            {i18n.t("ui.tab.example")}
          </h4>
          <p data-i18n="ui.example.desc" style="margin-bottom: 10px;">
            {i18n.t("ui.example.desc")}
          </p>
          <button
            type="button"
            id="load-example-btn"
            style="width: 100%;"
            className={this._isExampleLoaded ? "disabled" : ""}
            disabled={this._isExampleLoaded}
            onclick={this.handleLoadExample.bind(this)}
          >
            {this._isExampleLoaded ? i18n.t("ui.example.loaded") : i18n.t("ui.example.load")}
          </button>
        </div>

        <div className="option-section" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
          <h4 data-i18n="ui.stream.test" style="margin: 0 0 10px 0; font-size: 1em;">
            {i18n.t("ui.stream.test")}
          </h4>
          <p data-i18n="ui.test.desc" style="margin-bottom: 10px;">
            {i18n.t("ui.test.desc")}
          </p>
          <button
            type="button"
            id="test-stream-btn"
            onclick={this.handleTestStreamClick.bind(this)}
            disabled={disableTest}
          >
            {testBtnText}
          </button>
        </div>
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("tester-panel", TesterPanel);
