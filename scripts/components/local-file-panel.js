import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { updateParsedCharts } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
// Helper to read file as text
function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        if (typeof file.text === "function") {
            file.text().then(resolve).catch(reject);
        }
        else {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        }
    });
}
export class LocalFilePanel extends HTMLElement {
    connectedCallback() {
        this.render();
        i18n.onLanguageChange(() => this.render());
    }
    async handleFileChange(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            const file = files[0];
            try {
                const content = await readFileAsText(file);
                appState.loadedTJAContent = content;
                updateParsedCharts(content);
                this.dispatchStatus("status.fileLoaded");
                this.dispatchEvent(new CustomEvent("chart-loaded", { bubbles: true, composed: true }));
            }
            catch (e) {
                console.error("Error parsing TJA file:", e);
                const msg = i18n.t("status.parseError", { error: e instanceof Error ? e.message : String(e) });
                alert(msg);
                this.dispatchStatus("status.parseError", { error: e instanceof Error ? e.message : String(e) });
            }
        }
    }
    dispatchStatus(key, params) {
        this.dispatchEvent(new CustomEvent("status-change", {
            detail: { key, params },
            bubbles: true,
            composed: true,
        }));
    }
    render() {
        const vdom = (_jsxs("div", { className: "control-group", children: [_jsx("label", { htmlFor: "tja-file-picker", "data-i18n": "ui.file.label", children: i18n.t("ui.file.label") }), _jsx("input", { type: "file", id: "tja-file-picker", accept: ".tja", onchange: this.handleFileChange.bind(this) })] }));
        webjsx.applyDiff(this, vdom);
    }
}
customElements.define("local-file-panel", LocalFilePanel);
