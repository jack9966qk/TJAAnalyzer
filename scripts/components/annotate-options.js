import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { tjaChart } from "../view/ui-elements.js";
import "./save-image-button.js";
export class AnnotateOptions extends HTMLElement {
    connectedCallback() {
        this.style.display = "block";
        this.render();
        // Listen for language changes
        i18n.onLanguageChange(() => this.render());
    }
    handleAutoAnnotate() {
        if (tjaChart) {
            tjaChart.autoAnnotate();
        }
    }
    handleClearAnnotations() {
        appState.annotations = {};
        refreshChart();
    }
    render() {
        const vdom = (_jsxs("div", { style: "display: contents;", children: [_jsxs("div", { className: "control-group", style: "display: flex; align-items: center; gap: 10px;", children: [_jsx("button", { type: "button", id: "auto-annotate-btn", className: "control-btn", onclick: this.handleAutoAnnotate.bind(this), children: i18n.t("ui.autoAnnotate") }), _jsx("button", { type: "button", id: "clear-annotations-btn", className: "control-btn", onclick: this.handleClearAnnotations.bind(this), children: i18n.t("ui.clearAnnotations") }), _jsx("save-image-button", { children: i18n.t("ui.exportImage") })] }), _jsx("p", { style: "font-size: 0.9em; color: #666; margin-top: 5px;", children: i18n.t("ui.annotation.desc") })] }));
        webjsx.applyDiff(this, vdom);
    }
}
customElements.define("annotate-options", AnnotateOptions);
