import * as webjsx from "webjsx";
import { clearJudgements } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { courseBranchSelect } from "../view/ui-elements.js";

export class StreamPanel extends HTMLElement {
  private _host = "127.0.0.1";
  private _port = "2354";

  connectedCallback() {
    this.render();
    i18n.onLanguageChange(() => this.render());

    // Listen to global status changes
    window.addEventListener("stream-status-change", this.handleStatusChange.bind(this));
  }

  disconnectedCallback() {
    window.removeEventListener("stream-status-change", this.handleStatusChange.bind(this));
  }

  private handleStatusChange() {
    this.render();
  }

  private handleHostInput(e: Event) {
    this._host = (e.target as HTMLInputElement).value;
  }

  private handlePortInput(e: Event) {
    this._port = (e.target as HTMLInputElement).value;
  }

  private handleConnectClick() {
    if (appState.isStreamConnected) {
      appState.judgementClient.disconnect();
    } else {
      const port = parseInt(this._port, 10);
      if (this._host && port) {
        appState.judgementClient.connect(this._host, port);
      } else {
        alert("Please enter valid Host and Port.");
      }
    }
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

  render() {
    const isConnected = appState.isStreamConnected;
    const isSimulating = appState.isSimulating;
    const isConnectingState = appState.currentStatusKey === "status.connecting";

    const connectBtnText = isConnected ? i18n.t("ui.stream.disconnect") : i18n.t("ui.stream.connect");
    const testBtnText = isSimulating ? i18n.t("ui.test.stop") : i18n.t("ui.test.start");

    const disableConnect = isConnectingState || isSimulating;
    const disableTest = isConnectingState || (isConnected && !isSimulating);

    const vdom = (
      <div>
        <div className="option-section">
          <h4 data-i18n="ui.stream.remote" style="margin: 0 0 10px 0; font-size: 1em;">
            Remote Connection
          </h4>
          <p data-i18n="ui.stream.desc" style="margin-bottom: 10px;">
            Connect to an external program that broadcasts currently played chart and judgement events. For <a href="https://github.com/0auBSQ/OpenTaiko/releases/tag/0.6.0.95" target="_blank">OpenTaiko v0.6.0.95</a> or above, turn on "Game Event Broadcasting" in settings.
          </p>
          <div className="control-group">
            <label>
              <span data-i18n="ui.stream.host">{i18n.t("ui.stream.host")}</span>
              <input
                type="text"
                id="host-input"
                value={this._host}
                oninput={this.handleHostInput.bind(this)}
                style="margin-left: 5px;"
              />
            </label>
            <label>
              <span data-i18n="ui.stream.port">{i18n.t("ui.stream.port")}</span>
              <input
                type="number"
                id="port-input"
                value={this._port}
                oninput={this.handlePortInput.bind(this)}
                style="margin-left: 5px;"
              />
            </label>
            <button
              type="button"
              id="connect-btn"
              onclick={this.handleConnectClick.bind(this)}
              disabled={disableConnect}
            >
              {connectBtnText}
            </button>
          </div>
        </div>

        <div className="option-section" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
          <h4 data-i18n="ui.stream.test" style="margin: 0 0 10px 0; font-size: 1em;">
            Test Simulation
          </h4>
          <p data-i18n="ui.test.desc">{i18n.t("ui.test.desc")}</p>
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

customElements.define("stream-panel", StreamPanel);
