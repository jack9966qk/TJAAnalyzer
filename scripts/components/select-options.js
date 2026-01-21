import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import "./export-button.js";
export class SelectOptions extends HTMLElement {
    exportChartName = "Exported Selection";
    exportLoopCount = 10;
    exportGapCount = 1;
    connectedCallback() {
        this.style.display = "block";
        this.style.width = "100%";
        this.style.boxSizing = "border-box";
        this.render();
        // Listen for language changes
        i18n.onLanguageChange(() => this.render());
    }
    refreshStatus() {
        this.render();
    }
    handleClearSelection() {
        appState.viewOptions.selection = null;
        appState.selectedNoteHitInfo = null;
        refreshChart();
        this.render();
    }
    handleNameChange(e) {
        this.exportChartName = e.target.value;
        this.render(); // Re-render to update attributes on export-button
    }
    handleLoopChange(e) {
        this.exportLoopCount = parseInt(e.target.value, 10);
        this.render();
    }
    handleGapChange(e) {
        this.exportGapCount = parseInt(e.target.value, 10);
        this.render();
    }
    render() {
        const hasSelection = !!appState.viewOptions.selection;
        const hasNeutralino = !!window.Neutralino;
        // biome-ignore lint/suspicious/noExplicitAny: File System Access API
        const hasWebFS = !!window.showDirectoryPicker;
        const canSelectDir = hasNeutralino || hasWebFS;
        const vdom = (_jsxs("div", { className: "control-group", style: "display: flex; flex-direction: column; gap: 10px; align-items: flex-start;", children: [_jsx("div", { style: "display: flex; width: 100%;", children: _jsx("button", { type: "button", id: "clear-selection-btn", className: "control-btn", onclick: this.handleClearSelection.bind(this), disabled: !hasSelection, children: i18n.t("ui.clearSelection") }) }), _jsxs("div", { style: "display: flex; flex-wrap: wrap; align-items: center; gap: 15px;", children: [_jsxs("label", { style: "display: flex; align-items: center; gap: 5px; white-space: nowrap;", children: [_jsx("span", { style: "font-size: 0.9em;", children: i18n.t("ui.export.loops") }), _jsx("input", { type: "number", id: "export-loop-count", value: this.exportLoopCount.toString(), min: "1", style: "width: 50px; padding: 4px;", oninput: this.handleLoopChange.bind(this) })] }), _jsxs("label", { style: "display: flex; align-items: center; gap: 5px; white-space: nowrap;", children: [_jsx("span", { style: "font-size: 0.9em;", children: i18n.t("ui.export.gap") }), _jsx("input", { type: "number", id: "export-gap-count", value: this.exportGapCount.toString(), min: "0", style: "width: 50px; padding: 4px;", oninput: this.handleGapChange.bind(this) })] })] }), _jsxs("label", { style: "display: flex; flex-direction: column; width: 100%; gap: 5px;", children: [_jsx("span", { style: "font-size: 0.9em;", children: i18n.t("ui.export.chartName") }), _jsx("input", { type: "text", id: "export-chart-name", value: this.exportChartName, placeholder: i18n.t("ui.export.chartName"), style: "width: 100%; padding: 4px; box-sizing: border-box;", oninput: this.handleNameChange.bind(this) })] }), _jsx("export-button", { "export-type": "download", "chart-name": this.exportChartName, "loop-count": this.exportLoopCount.toString(), "gap-count": this.exportGapCount.toString(), disabled: !hasSelection, style: "width: 100%; display: block;" }), canSelectDir && (_jsx("export-button", { "export-type": "directory", "chart-name": this.exportChartName, "loop-count": this.exportLoopCount.toString(), "gap-count": this.exportGapCount.toString(), disabled: !hasSelection, style: "width: 100%; display: block;" }))] }));
        webjsx.applyDiff(this, vdom);
    }
}
customElements.define("select-options", SelectOptions);
