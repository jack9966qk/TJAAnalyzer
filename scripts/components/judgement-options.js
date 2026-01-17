import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { refreshChart, updateStatsComponent } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import "./save-image-button.js";
export class JudgementOptions extends HTMLElement {
    // Local state for rendering
    _loopCollapseEnabled = false;
    _loopCollapseChecked = false;
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
    refreshStatus(_updateMode = true) {
        this.render();
    }
    setLoopCollapseState(enabled, checked) {
        this._loopCollapseEnabled = enabled;
        this._loopCollapseChecked = checked;
        this.render();
    }
    // --- Event Handlers ---
    handleStyleChange(e) {
        const target = e.target;
        if (target.checked) {
            if (target.value === "underline") {
                appState.viewOptions.viewMode = "judgements-underline";
            }
            else if (target.value === "text") {
                appState.viewOptions.viewMode = "judgements-text";
            }
            else {
                appState.viewOptions.viewMode = "judgements";
            }
            refreshChart();
            this.render();
        }
    }
    handleColoringChange(e) {
        const target = e.target;
        if (target.checked) {
            appState.viewOptions.coloringMode = target.value === "gradient" ? "gradient" : "categorical";
            refreshChart();
            this.render();
        }
    }
    handleVisibilityChange(type, e) {
        const checked = e.target.checked;
        appState.viewOptions.visibility = {
            ...appState.viewOptions.visibility,
            [type]: checked,
        };
        refreshChart();
    }
    handleCollapseLoopChange(e) {
        appState.viewOptions.collapsedLoop = e.target.checked;
        refreshChart();
        updateStatsComponent(null);
        this.render();
    }
    handleLoopAutoChange(e) {
        const checked = e.target.checked;
        if (checked) {
            appState.viewOptions.selectedLoopIteration = undefined;
        }
        else {
            appState.viewOptions.selectedLoopIteration = 0;
        }
        refreshChart();
        this.render();
    }
    handlePrevLoop() {
        if (appState.viewOptions.selectedLoopIteration !== undefined && appState.viewOptions.selectedLoopIteration > 0) {
            appState.viewOptions.selectedLoopIteration--;
            refreshChart();
            this.render();
        }
    }
    handleNextLoop() {
        if (appState.currentChart?.loop &&
            appState.viewOptions.selectedLoopIteration !== undefined &&
            appState.viewOptions.selectedLoopIteration < appState.currentChart.loop.iterations - 1) {
            appState.viewOptions.selectedLoopIteration++;
            refreshChart();
            this.render();
        }
    }
    // --- Helper Methods ---
    getLoopStatus() {
        const hasLoop = !!appState.currentChart?.loop;
        let text = "1 / 1";
        const isAuto = appState.viewOptions.selectedLoopIteration === undefined;
        const current = appState.viewOptions.selectedLoopIteration || 0;
        const total = appState.currentChart?.loop?.iterations || 1;
        let prevDisabled = true;
        let nextDisabled = true;
        if (isAuto) {
            prevDisabled = true;
            nextDisabled = true;
            if (hasLoop) {
                let displayedIter = 0;
                // biome-ignore lint/style/noNonNullAssertion: Guaranteed by context
                const loop = appState.currentChart.loop;
                if ((appState.viewOptions.viewMode === "judgements" ||
                    appState.viewOptions.viewMode === "judgements-underline" ||
                    appState.viewOptions.viewMode === "judgements-text") &&
                    appState.judgements.length > 0) {
                    let notesPerLoop = 0;
                    let preLoopNotes = 0;
                    for (let i = 0; i < loop.startBarIndex; i++) {
                        const bar = appState.currentChart?.bars[i];
                        if (bar)
                            for (const c of bar)
                                if (["1", "2", "3", "4"].includes(c))
                                    preLoopNotes++;
                    }
                    for (let k = 0; k < loop.period; k++) {
                        const bar = appState.currentChart?.bars[loop.startBarIndex + k];
                        if (bar)
                            for (const c of bar)
                                if (["1", "2", "3", "4"].includes(c))
                                    notesPerLoop++;
                    }
                    const lastJudgedIndex = appState.judgements.length - 1;
                    if (lastJudgedIndex >= preLoopNotes && notesPerLoop > 0) {
                        const relativeIndex = lastJudgedIndex - preLoopNotes;
                        displayedIter = Math.floor(relativeIndex / notesPerLoop);
                    }
                    if (displayedIter < 0)
                        displayedIter = 0;
                    if (displayedIter >= loop.iterations)
                        displayedIter = loop.iterations - 1;
                }
                text = `${displayedIter + 1} / ${loop.iterations}`;
            }
        }
        else {
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
        const styleValue = viewMode === "judgements-text" ? "text" : viewMode === "judgements-underline" ? "underline" : "color";
        const vdom = (_jsxs("div", { style: "display: contents;", children: [_jsxs("div", { className: "option-section", children: [_jsx("div", { className: "description-text", style: `color: #666; font-style: italic; margin-bottom: 10px; display: ${isStreamActive ? "none" : "block"};`, children: i18n.t("ui.judgement.notActive") }), _jsx("div", { className: `section-main ${!this._loopCollapseEnabled ? "disabled-text" : ""}`, style: `margin-bottom: 10px; display: ${this._loopCollapseEnabled ? "block" : "none"}`, children: _jsxs("label", { children: [_jsx("input", { type: "checkbox", id: "collapse-loop-checkbox", checked: this._loopCollapseChecked, disabled: !this._loopCollapseEnabled, onchange: this.handleCollapseLoopChange.bind(this) }), _jsx("span", { children: i18n.t("ui.collapseLoops") })] }) }), _jsxs("div", { className: "sub-group", id: "loop-control-group", style: `margin-bottom: 10px; display: ${isLoopCollapsed ? "flex" : "none"};`, children: [_jsxs("label", { className: "auto-check", style: "display: flex; align-items: center; gap: 5px; margin-right: 10px;", children: [_jsx("input", { type: "checkbox", id: "loop-auto", checked: loopStatus.isAuto, onchange: this.handleLoopAutoChange.bind(this) }), _jsx("span", { children: i18n.t("ui.auto") })] }), _jsxs("div", { className: "loop-stepper", style: "display: flex; align-items: center; gap: 5px;", children: [_jsx("button", { type: "button", id: "prev-loop-btn", className: "tiny-btn", disabled: loopStatus.prevDisabled, onclick: this.handlePrevLoop.bind(this), children: "<" }), _jsx("span", { id: "loop-counter-display", style: "font-family: 'Consolas', monospace; min-width: 50px; text-align: center;", children: loopStatus.text }), _jsx("button", { type: "button", id: "next-loop-btn", className: "tiny-btn", disabled: loopStatus.nextDisabled, onclick: this.handleNextLoop.bind(this), children: ">" })] })] }), _jsxs("div", { id: "judgement-subcontrols", className: `section-subs ${!isStreamActive ? "disabled" : ""}`, style: `margin-left: 0; opacity: ${isStreamActive ? "1" : "0.5"}; pointer-events: ${isStreamActive ? "auto" : "none"};`, children: [_jsxs("div", { className: "sub-group", children: [_jsxs("span", { className: "sub-label", children: [i18n.t("ui.style"), ":"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "judgementStyle", value: "color", checked: styleValue === "color", onchange: this.handleStyleChange.bind(this) }), _jsx("span", { children: i18n.t("ui.style.color") })] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "judgementStyle", value: "underline", checked: styleValue === "underline", onchange: this.handleStyleChange.bind(this) }), _jsx("span", { children: i18n.t("ui.style.underline") })] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "judgementStyle", value: "text", checked: styleValue === "text", onchange: this.handleStyleChange.bind(this) }), _jsx("span", { children: i18n.t("ui.style.text") })] })] }), _jsxs("div", { className: "sub-group", children: [_jsxs("span", { className: "sub-label", children: [i18n.t("ui.coloring"), ":"] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "judgementColoring", value: "class", checked: appState.viewOptions.coloringMode === "categorical", onchange: this.handleColoringChange.bind(this) }), _jsx("span", { children: i18n.t("ui.coloring.class") })] }), _jsxs("label", { children: [_jsx("input", { type: "radio", name: "judgementColoring", value: "gradient", checked: appState.viewOptions.coloringMode === "gradient", onchange: this.handleColoringChange.bind(this) }), _jsx("span", { children: i18n.t("ui.coloring.gradient") })] })] }), _jsxs("div", { className: "sub-group", children: [_jsxs("span", { className: "sub-label", children: [i18n.t("ui.filter"), ":"] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", id: "show-perfect", checked: appState.viewOptions.visibility.perfect, onchange: (e) => this.handleVisibilityChange("perfect", e) }), _jsx("span", { children: i18n.t("judgement.perfect") })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", id: "show-good", checked: appState.viewOptions.visibility.good, onchange: (e) => this.handleVisibilityChange("good", e) }), _jsx("span", { children: i18n.t("judgement.good") })] }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", id: "show-poor", checked: appState.viewOptions.visibility.poor, onchange: (e) => this.handleVisibilityChange("poor", e) }), _jsx("span", { children: i18n.t("judgement.poor") })] })] })] })] }), _jsx("div", { className: "option-section border-left", id: "save-image-container", style: `opacity: ${isStreamActive ? "1" : "0.5"}; pointer-events: ${isStreamActive ? "auto" : "none"};`, children: _jsx("div", { className: "section-main", children: _jsx("save-image-button", { id: "save-image-judgements" }) }) })] }));
        webjsx.applyDiff(this, vdom);
    }
}
customElements.define("judgement-options", JudgementOptions);
