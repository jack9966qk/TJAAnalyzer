import { jsxs as _jsxs, jsx as _jsx } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { noteStatsDisplay } from "../view/ui-elements.js";
import "./save-image-button.js";
export class ViewOptions extends HTMLElement {
    _statsVisible = true;
    get statsVisible() {
        return this._statsVisible;
    }
    set statsVisible(val) {
        this._statsVisible = val;
        this.render();
    }
    connectedCallback() {
        this.render();
        // Listen for language changes
        i18n.onLanguageChange(() => this.render());
    }
    initializeFromLayout() {
        // Default stats to off in vertical layout
        if (!document.body.classList.contains("horizontal-layout")) {
            this.statsVisible = false;
            this.handleStatsChange();
        }
        else {
            // Ensure UI matches state if re-connected (e.g. if kept in DOM or re-appended)
            if (noteStatsDisplay) {
                this.statsVisible = noteStatsDisplay.style.display !== "none";
            }
            else {
                this.render();
            }
        }
    }
    handleZoomOut() {
        if (appState.viewOptions.beatsPerLine < 32) {
            appState.viewOptions.beatsPerLine += 2;
            refreshChart();
            this.render();
        }
    }
    handleZoomIn() {
        if (appState.viewOptions.beatsPerLine > 4) {
            appState.viewOptions.beatsPerLine -= 2;
            refreshChart();
            this.render();
        }
    }
    handleZoomReset() {
        if (appState.viewOptions.beatsPerLine !== 16) {
            appState.viewOptions.beatsPerLine = 16;
            refreshChart();
            this.render();
        }
    }
    handleStatsToggle(e) {
        this.statsVisible = e.target.checked;
        this.handleStatsChange();
    }
    handleStatsChange() {
        if (noteStatsDisplay) {
            noteStatsDisplay.style.display = this.statsVisible ? "" : "none";
        }
        // Clear hover effect if hidden
        if (!this.statsVisible) {
            if (appState.viewOptions.hoveredNote) {
                appState.viewOptions.hoveredNote = null;
                refreshChart();
            }
        }
    }
    render() {
        const percent = Math.round((16 / appState.viewOptions.beatsPerLine) * 100);
        // Apply styles to host
        this.style.display = "flex";
        this.style.gap = "20px";
        this.style.alignItems = "flex-start";
        this.style.flexWrap = "wrap";
        this.style.width = "100%";
        this.classList.add("panel-pane");
        const vdom = (_jsxs("div", { style: "display: contents;", children: [_jsx("div", { className: "option-section", children: _jsxs("div", { className: "section-main", children: [_jsxs("span", { className: "sub-label", style: "min-width: auto; margin-right: 10px;", children: [i18n.t("ui.zoom"), ":"] }), _jsxs("div", { className: "zoom-controls", style: "display: flex; align-items: center; gap: 5px;", children: [_jsx("button", { type: "button", id: "zoom-out-btn", className: "tiny-btn", onclick: this.handleZoomOut.bind(this), children: "-" }), _jsxs("button", { type: "button", id: "zoom-reset-btn", className: "tiny-btn", style: "font-family: 'Consolas', monospace; min-width: 50px;", onclick: this.handleZoomReset.bind(this), children: [percent, "%"] }), _jsx("button", { type: "button", id: "zoom-in-btn", className: "tiny-btn", onclick: this.handleZoomIn.bind(this), children: "+" })] })] }) }), _jsx("div", { className: "option-section border-left", children: _jsx("div", { className: "section-main", children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", id: "show-stats-checkbox", checked: this.statsVisible, onchange: this.handleStatsToggle.bind(this) }), _jsx("span", { children: i18n.t("ui.showStats") })] }) }) }), _jsx("div", { className: "option-section border-left", children: _jsx("div", { className: "section-main", children: _jsx("save-image-button", { id: "export-image-btn", children: i18n.t("ui.exportImage") }) }) })] }));
        webjsx.applyDiff(this, vdom);
    }
}
customElements.define("view-options", ViewOptions);
