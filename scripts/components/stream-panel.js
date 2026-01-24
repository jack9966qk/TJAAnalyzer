import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { clearJudgements } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { courseBranchSelect } from "../view/ui-elements.js";
export class StreamPanel extends HTMLElement {
    _host = "localhost";
    _port = "2354";
    connectedCallback() {
        this.render();
        i18n.onLanguageChange(() => this.render());
        // Listen to global status changes
        window.addEventListener("stream-status-change", this.handleStatusChange.bind(this));
    }
    disconnectedCallback() {
        window.removeEventListener("stream-status-change", this.handleStatusChange.bind(this));
    }
    handleStatusChange() {
        this.render();
    }
    handleHostInput(e) {
        this._host = e.target.value;
    }
    handlePortInput(e) {
        this._port = e.target.value;
    }
    handleConnectClick() {
        if (appState.isStreamConnected) {
            appState.judgementClient.disconnect();
        }
        else {
            const port = parseInt(this._port, 10);
            if (this._host && port) {
                appState.judgementClient.connect(this._host, port);
            }
            else {
                alert("Please enter valid Host and Port.");
            }
        }
    }
    handleTestStreamClick() {
        if (appState.isSimulating) {
            appState.judgementClient.disconnect();
            appState.isSimulating = false;
        }
        else {
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
        const vdom = (_jsxs("div", { children: [_jsxs("div", { className: "option-section", children: [_jsx("h4", { "data-i18n": "ui.stream.remote", style: "margin: 0 0 10px 0; font-size: 1em;", children: "Remote Connection" }), _jsxs("p", { "data-i18n": "ui.stream.desc", style: "margin-bottom: 10px;", children: ["Connect to an external program that broadcasts currently played chart and judgement events. For", " ", _jsx("a", { href: "https://github.com/0auBSQ/OpenTaiko/releases/tag/0.6.0.95", target: "_blank", rel: "noopener", children: "OpenTaiko v0.6.0.95" }), " ", "or above, turn on \"Game Event Broadcasting\" in settings."] }), _jsxs("div", { className: "control-group", children: [_jsxs("label", { children: [_jsx("span", { "data-i18n": "ui.stream.host", children: i18n.t("ui.stream.host") }), _jsx("input", { type: "text", id: "host-input", value: this._host, oninput: this.handleHostInput.bind(this), style: "margin-left: 5px;" })] }), _jsxs("label", { children: [_jsx("span", { "data-i18n": "ui.stream.port", children: i18n.t("ui.stream.port") }), _jsx("input", { type: "number", id: "port-input", value: this._port, oninput: this.handlePortInput.bind(this), style: "margin-left: 5px;" })] }), _jsx("button", { type: "button", id: "connect-btn", onclick: this.handleConnectClick.bind(this), disabled: disableConnect, children: connectBtnText })] })] }), _jsxs("div", { className: "option-section", style: "margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;", children: [_jsx("h4", { "data-i18n": "ui.stream.test", style: "margin: 0 0 10px 0; font-size: 1em;", children: "Test Simulation" }), _jsx("p", { "data-i18n": "ui.test.desc", children: i18n.t("ui.test.desc") }), _jsx("button", { type: "button", id: "test-stream-btn", onclick: this.handleTestStreamClick.bind(this), disabled: disableTest, children: testBtnText })] })] }));
        webjsx.applyDiff(this, vdom);
    }
}
customElements.define("stream-panel", StreamPanel);
