import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { LocationMap } from "../core/renderer.js";
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
        appState.annotations = new LocationMap();
        refreshChart();
    }
    handleToggleShowText(e) {
        const target = e.target;
        appState.viewOptions.showTextInAnnotationMode = target.checked;
        refreshChart();
    }
    handleToggleAlwaysShow(e) {
        const target = e.target;
        appState.viewOptions.alwaysShowAnnotations = target.checked;
        refreshChart();
    }
    render() {
        const vdom = (_jsxs("div", { style: "display: contents;", children: [_jsxs("div", { style: "display: flex; flex-direction: column; gap: 10px; margin-bottom: 5px;", children: [_jsxs("div", { className: "control-group", style: "display: flex; align-items: center; gap: 10px;", children: [_jsx("button", { type: "button", id: "auto-annotate-btn", className: "control-btn", onclick: this.handleAutoAnnotate.bind(this), children: i18n.t("ui.autoAnnotate") }), _jsx("button", { type: "button", id: "clear-annotations-btn", className: "control-btn", style: "background-color: var(--bg-panel-tabs); color: var(--text-primary); border: 1px solid var(--border-color);", onclick: this.handleClearAnnotations.bind(this), children: i18n.t("ui.clearAnnotations") })] }), _jsxs("div", { className: "control-group", style: "display: flex; align-items: center; justify-content: space-between; gap: 10px;", children: [_jsxs("div", { style: "display: flex; flex-direction: column; gap: 5px;", children: [_jsxs("label", { style: "display: flex; align-items: center; cursor: pointer;", children: [_jsx("input", { type: "checkbox", checked: !!appState.viewOptions.showTextInAnnotationMode, onchange: this.handleToggleShowText.bind(this) }), _jsx("span", { style: "margin-left: 5px;", children: i18n.t("ui.showTextInAnnotationMode") })] }), _jsxs("label", { style: "display: flex; align-items: center; cursor: pointer;", children: [_jsx("input", { type: "checkbox", checked: !!appState.viewOptions.alwaysShowAnnotations, onchange: this.handleToggleAlwaysShow.bind(this) }), _jsx("span", { style: "margin-left: 5px;", children: i18n.t("ui.alwaysShowAnnotations") })] })] }), _jsx("save-image-button", {})] })] }), _jsx("p", { style: "font-size: 0.9em; color: #666; margin-top: 5px; margin-bottom: 0;", children: i18n.t("ui.annotation.desc") })] }));
        webjsx.applyDiff(this, vdom);
    }
}
customElements.define("annotate-options", AnnotateOptions);
