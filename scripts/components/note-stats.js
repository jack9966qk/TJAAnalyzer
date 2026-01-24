import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { getGradientColor, JUDGEABLE_NOTES, JudgementMap, JudgementType, NoteType, PALETTE, RENDERABLE_NOTES, } from "../core/renderer.js";
import { i18n } from "../utils/i18n.js";
export class NoteStatsDisplay extends HTMLElement {
    _hit = null;
    _chart = null;
    _viewOptions = null;
    _judgements = new JudgementMap();
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
    }
    connectedCallback() {
        this.render();
    }
    set hit(value) {
        this._hit = value;
        this.render();
    }
    set chart(value) {
        this._chart = value;
        this.render();
    }
    set viewOptions(value) {
        this._viewOptions = value;
        this.render();
    }
    set judgements(value) {
        this._judgements = value;
        this.render();
    }
    formatBPM(val) {
        return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
    }
    formatHS(val) {
        return val % 1 === 0 ? val.toFixed(1) : val.toFixed(2);
    }
    getNoteName(char) {
        const map = {
            [NoteType.Don]: "don",
            [NoteType.Ka]: "ka",
            [NoteType.DonBig]: "DON",
            [NoteType.KaBig]: "KA",
            [NoteType.Drumroll]: "roll",
            [NoteType.DrumrollBig]: "ROLL",
            [NoteType.Balloon]: "balloon",
            [NoteType.Kusudama]: "Kusudama",
        };
        return map[char] || "unknown";
    }
    formatGap(gap) {
        const commonDenominators = [4, 8, 12, 16, 24, 32, 48, 64];
        for (const d of commonDenominators) {
            const val = gap * d;
            if (Math.abs(val - Math.round(val)) < 0.001) {
                const num = Math.round(val);
                const gcd = (a, b) => (b ? gcd(b, a % b) : a);
                const divisor = gcd(num, d);
                return `${num / divisor}/${d / divisor}`;
            }
        }
        return gap.toFixed(3);
    }
    getGapInfo(chart, currentBarIdx, currentCharIdx) {
        const currentBar = chart.bars[currentBarIdx];
        const currentTotal = currentBar.length;
        // Get measure ratio, default to 1.0 if not present
        const currentRatio = chart.barParams?.[currentBarIdx]?.measureRatio ?? 1.0;
        for (let i = currentCharIdx - 1; i >= 0; i--) {
            if (RENDERABLE_NOTES.includes(currentBar[i])) {
                const prevPos = i / currentTotal;
                const curPos = currentCharIdx / currentTotal;
                const diff = curPos - prevPos;
                return this.formatGap(diff * currentRatio);
            }
        }
        // Accumulate gap from start of current bar
        let accumulatedGap = (currentCharIdx / currentTotal) * currentRatio;
        for (let b = currentBarIdx - 1; b >= 0; b--) {
            const prevBar = chart.bars[b];
            const prevRatio = chart.barParams?.[b]?.measureRatio ?? 1.0;
            if (!prevBar || prevBar.length === 0) {
                accumulatedGap += prevRatio;
                if (accumulatedGap > 1.0 + 0.001)
                    return null;
                continue;
            }
            const prevTotal = prevBar.length;
            for (let i = prevTotal - 1; i >= 0; i--) {
                if (RENDERABLE_NOTES.includes(prevBar[i])) {
                    const distInPrev = (prevTotal - i) / prevTotal;
                    const totalGap = accumulatedGap + distInPrev * prevRatio;
                    if (totalGap <= 1.0 + 0.0001) {
                        return this.formatGap(totalGap);
                    }
                    else {
                        return null;
                    }
                }
            }
            accumulatedGap += prevRatio;
            if (accumulatedGap > 1.0)
                return null;
        }
        return null;
    }
    render() {
        const def = "-";
        const hit = this._hit;
        const chart = this._chart;
        const options = this._viewOptions;
        const judgements = this._judgements;
        const { collapsedLoop: collapsed, viewMode, coloringMode, visibility: judgementVisibility, } = options || {
            collapsedLoop: false,
            viewMode: "original",
            coloringMode: "categorical",
            visibility: { perfect: true, good: true, poor: true },
        };
        // Resolve target chart based on branch
        let targetChart = chart;
        if (hit?.branch && chart && chart.branches) {
            if (hit.branch === "normal")
                targetChart = chart.branches.normal || chart;
            else if (hit.branch === "expert")
                targetChart = chart.branches.expert || chart;
            else if (hit.branch === "master")
                targetChart = chart.branches.master || chart;
        }
        // Calculation Logic
        let deltaVal = def;
        let avgDeltaVal = def;
        let allDeltasElements = [];
        if (hit &&
            options &&
            (viewMode === "judgements" || viewMode === "judgements-underline" || viewMode === "judgements-text") &&
            hit.ordinal !== undefined && // Use ordinal instead of judgeableNoteIndex
            targetChart) {
            const deltas = [];
            if (collapsed && targetChart.loop) {
                const loop = targetChart.loop;
                if (hit.originalBarIndex >= loop.startBarIndex && hit.originalBarIndex < loop.startBarIndex + loop.period) {
                    const counters = {};
                    const map = new Map();
                    // Build map for relevant bars? Or full chart.
                    for (let i = 0; i < targetChart.bars.length; i++) {
                        const bar = targetChart.bars[i];
                        if (bar)
                            for (let j = 0; j < bar.length; j++) {
                                const c = bar[j];
                                if (JUDGEABLE_NOTES.includes(c)) {
                                    if (!counters[c])
                                        counters[c] = 0;
                                    map.set(`${i}_${j}`, counters[c]);
                                    counters[c]++;
                                }
                            }
                    }
                    // Determine relative position
                    // `hit.originalBarIndex` is inside the first loop iteration (template).
                    const relBarIdx = hit.originalBarIndex - loop.startBarIndex; // 0 to period-1
                    let currentIterationIdx = -1;
                    const iterationOrdinals = [];
                    for (let iter = 0; iter < loop.iterations; iter++) {
                        const actualBarIdx = loop.startBarIndex + iter * loop.period + relBarIdx;
                        const ord = map.get(`${actualBarIdx}_${hit.charIndex}`);
                        if (ord !== undefined) {
                            iterationOrdinals.push(ord);
                            if (ord === hit.ordinal) {
                                currentIterationIdx = iter;
                            }
                        }
                        else {
                            iterationOrdinals.push(-1); // Should not happen if loop logic is correct
                        }
                    }
                    // Render Deltas for all iterations
                    for (let iter = 0; iter < iterationOrdinals.length; iter++) {
                        const ord = iterationOrdinals[iter];
                        if (ord === -1)
                            continue;
                        const key = { char: hit.type, ordinal: ord };
                        const judgeData = judgements.get(key);
                        if (judgeData) {
                            const delta = judgeData.delta;
                            const judge = judgeData.judgement;
                            // Check visibility
                            let isVisible = true;
                            if (judge === JudgementType.Perfect && !judgementVisibility.perfect)
                                isVisible = false;
                            else if (judge === JudgementType.Good && !judgementVisibility.good)
                                isVisible = false;
                            else if (judge === JudgementType.Poor && !judgementVisibility.poor)
                                isVisible = false;
                            if (!isVisible)
                                continue;
                            deltas.push(delta);
                            const text = delta.toString();
                            let color = "";
                            if (coloringMode === "gradient") {
                                if (judge === JudgementType.Perfect || judge === JudgementType.Good || judge === JudgementType.Poor) {
                                    color = getGradientColor(delta);
                                }
                                else {
                                    color = PALETTE.judgements.miss; // Dark Grey for non-standard
                                }
                            }
                            else {
                                if (judge === JudgementType.Perfect)
                                    color = PALETTE.judgements.perfect;
                                else if (judge === JudgementType.Good)
                                    color = PALETTE.judgements.good;
                                else if (judge === JudgementType.Poor)
                                    color = PALETTE.judgements.poor;
                            }
                            let el = _jsx("span", { style: color ? `color: ${color}` : "", children: text });
                            if (iter === currentIterationIdx) {
                                el = _jsx("b", { children: el });
                            }
                            allDeltasElements.push(el);
                        }
                    }
                    // Add commas
                    if (allDeltasElements.length > 0) {
                        const joined = [];
                        allDeltasElements.forEach((el, i) => {
                            joined.push(el);
                            if (i < allDeltasElements.length - 1)
                                joined.push(_jsx("span", { children: ", " }));
                        });
                        allDeltasElements = joined;
                    }
                    if (deltas.length > 0) {
                        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
                        const avgStr = `${avg.toFixed(1)}ms`;
                        if (coloringMode === "gradient") {
                            const avgColor = getGradientColor(avg);
                            avgDeltaVal = _jsx("span", { style: `color: ${avgColor}`, children: avgStr });
                        }
                        else {
                            avgDeltaVal = avgStr;
                        }
                    }
                }
                else {
                    const key = { char: hit.type, ordinal: hit.ordinal };
                    const judgeData = judgements.get(key);
                    if (judgeData) {
                        const delta = judgeData.delta;
                        const judge = judgeData.judgement;
                        let isVisible = true;
                        if (judge === JudgementType.Perfect && !judgementVisibility.perfect)
                            isVisible = false;
                        else if (judge === JudgementType.Good && !judgementVisibility.good)
                            isVisible = false;
                        else if (judge === JudgementType.Poor && !judgementVisibility.poor)
                            isVisible = false;
                        if (isVisible) {
                            avgDeltaVal = `${delta}ms`;
                            let color = "";
                            if (coloringMode === "gradient") {
                                if (judge === JudgementType.Perfect || judge === JudgementType.Good || judge === JudgementType.Poor) {
                                    color = getGradientColor(delta);
                                }
                                else {
                                    color = PALETTE.judgements.miss;
                                }
                            }
                            else {
                                if (judge === JudgementType.Perfect)
                                    color = PALETTE.judgements.perfect;
                                else if (judge === JudgementType.Good)
                                    color = PALETTE.judgements.good;
                                else if (judge === JudgementType.Poor)
                                    color = PALETTE.judgements.poor;
                            }
                            let el = _jsx("span", { children: delta });
                            if (color)
                                el = _jsx("span", { style: `color: ${color}`, children: delta });
                            allDeltasElements = [el];
                            if (coloringMode === "gradient" && color) {
                                avgDeltaVal = _jsx("span", { style: `color: ${color}`, children: avgDeltaVal });
                            }
                        }
                    }
                }
            }
            else {
                // Standard Mode
                const key = { char: hit.type, ordinal: hit.ordinal };
                const judgeData = judgements.get(key);
                if (judgeData) {
                    const delta = judgeData.delta;
                    const judge = judgeData.judgement;
                    let isVisible = true;
                    if (judge === JudgementType.Perfect && !judgementVisibility.perfect)
                        isVisible = false;
                    else if (judge === JudgementType.Good && !judgementVisibility.good)
                        isVisible = false;
                    else if (judge === JudgementType.Poor && !judgementVisibility.poor)
                        isVisible = false;
                    if (isVisible) {
                        deltaVal = `${delta}ms`;
                        let color = "";
                        if (coloringMode === "gradient") {
                            if (judge === JudgementType.Perfect || judge === JudgementType.Good || judge === JudgementType.Poor) {
                                color = getGradientColor(delta);
                            }
                            else {
                                color = PALETTE.judgements.miss;
                            }
                        }
                        else {
                            if (judge === JudgementType.Perfect)
                                color = PALETTE.judgements.perfect;
                            else if (judge === JudgementType.Good)
                                color = PALETTE.judgements.good;
                            else if (judge === JudgementType.Poor)
                                color = PALETTE.judgements.poor;
                        }
                        if (color)
                            deltaVal = _jsx("span", { style: `color: ${color}`, children: deltaVal });
                    }
                }
            }
        }
        // JSX Building
        const StatBox = (label, value) => (_jsxs("div", { className: "stat-box", children: [_jsx("div", { className: "stat-label", children: label }), _jsx("div", { className: "stat-value", children: value })] }));
        let gap = def;
        if (hit && targetChart) {
            const g = this.getGapInfo(targetChart, hit.originalBarIndex, hit.charIndex);
            if (g)
                gap = g;
        }
        const vdom = (_jsxs("div", { style: "display: contents;", children: [_jsx("style", { children: `
            :host {
                display: block;
            }
            #container {
                min-height: 80px;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                padding: 10px;
                background-color: var(--bg-panel-header, #f5f5f5);
                align-items: center;
                justify-content: center;
                border: 1px solid var(--border-lighter, #e0e0e0);
                margin-top: 10px;
                border-radius: 6px;
                box-sizing: border-box;
            }
            .stat-box {
                background-color: var(--stat-box-bg, #37474f);
                color: var(--stat-box-text, #eceff1);
                padding: 6px 12px;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 90px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .stat-label {
                font-size: 0.7em;
                color: var(--stat-label, #b0bec5);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
            }
            .stat-value {
                font-size: 1.2em;
                font-weight: bold;
                font-family: 'Consolas', monospace;
            }
            .stat-value-highlight {
                color: #ffeb3b;
            }
            .stat-full-line {
                flex-basis: 100%;
                background-color: var(--stat-box-bg, #37474f);
                color: var(--stat-box-text, #eceff1);
                padding: 10px 15px;
                border-radius: 6px;
                margin-top: 5px;
                font-family: 'Consolas', monospace;
                font-size: 0.9em;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                word-wrap: break-word;
                height: 4.5em;
                overflow-y: auto;
            }
            .hidden {
                display: none !important;
            }
            ` }), _jsxs("div", { id: "container", children: [StatBox(i18n.t("stats.type"), hit ? this.getNoteName(hit.type) : def), StatBox(i18n.t("stats.gap"), gap), StatBox(i18n.t("stats.bpm"), hit ? this.formatBPM(hit.bpm) : def), StatBox(i18n.t("stats.hs"), hit ? this.formatHS(hit.scroll) : def), StatBox(i18n.t("stats.seenBpm"), hit ? this.formatBPM(hit.bpm * hit.scroll) : def), collapsed ? (_jsxs("div", { style: "display: contents;", children: [StatBox(i18n.t("stats.avgDelta"), avgDeltaVal), _jsxs("div", { className: "stat-full-line", children: ["Deltas: ", allDeltasElements] })] })) : (StatBox(i18n.t("stats.delta"), deltaVal))] })] }));
        if (this.shadowRoot) {
            webjsx.applyDiff(this.shadowRoot, vdom);
        }
    }
}
customElements.define("note-stats", NoteStatsDisplay);
