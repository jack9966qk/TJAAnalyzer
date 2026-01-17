import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { generateAutoAnnotations } from "../core/auto-annotation.js";
import { createLayout, getNoteAt, getNotePosition, PALETTE, renderChart, renderIncremental, renderLayout, } from "../core/renderer.js";
export class TJAChart extends HTMLElement {
    canvas;
    messageContainer;
    _chart = null;
    _viewOptions = null;
    _judgements = [];
    _judgementDeltas = [];
    _texts;
    _message = null;
    resizeObserver;
    // Rendering Optimization State
    _renderTask = null;
    _pendingFullRender = true;
    _lastRenderedJudgementsLength = 0;
    _layout = null;
    constructor() {
        super();
        this.attachShadow({ mode: "open" });
        this.resizeObserver = new ResizeObserver(() => {
            this._pendingFullRender = true;
            this.scheduleRender();
        });
    }
    connectedCallback() {
        this.renderDOM();
        this.upgradeProperty("chart");
        this.upgradeProperty("viewOptions");
        this.upgradeProperty("judgements");
        this.upgradeProperty("judgementDeltas");
        this.upgradeProperty("texts");
        this.resizeObserver.observe(this);
        this.scheduleRender();
    }
    renderDOM() {
        const vdom = (_jsxs(_Fragment, { children: [_jsx("style", { children: `
            :host {
                display: block;
                width: 100%;
                overflow: hidden;
            }
            canvas {
                display: block;
                width: 100%;
            }
            #message-container {
                width: 100%;
                height: 400px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-weight: bold;
                font-size: 24px;
                font-family: sans-serif;
                box-sizing: border-box;
            }
            .hidden {
                display: none !important;
            }
        ` }), _jsx("div", { id: "message-container", className: "hidden", ref: (el) => {
                        this.messageContainer = el;
                    } }), _jsx("canvas", { ref: (el) => {
                        if (el) {
                            this.canvas = el;
                            // Re-attach listeners if canvas changes (though diffing should prevent recreation)
                            this.canvas.onmousemove = this.handleMouseMove.bind(this);
                            this.canvas.onclick = this.handleClick.bind(this);
                        }
                    } })] }));
        webjsx.applyDiff(this.shadowRoot, vdom);
    }
    upgradeProperty(prop) {
        if (Object.hasOwn(this, prop)) {
            // biome-ignore lint/suspicious/noExplicitAny: Required for Web Component property upgrade pattern
            const value = this[prop];
            // biome-ignore lint/suspicious/noExplicitAny: Required for Web Component property upgrade pattern
            delete this[prop];
            // biome-ignore lint/suspicious/noExplicitAny: Required for Web Component property upgrade pattern
            this[prop] = value;
        }
    }
    disconnectedCallback() {
        this.resizeObserver.disconnect();
        if (this._renderTask !== null) {
            cancelAnimationFrame(this._renderTask);
            this._renderTask = null;
        }
        if (this.canvas) {
            this.canvas.onmousemove = null;
            this.canvas.onclick = null;
        }
    }
    scheduleRender() {
        if (this._renderTask === null) {
            this._renderTask = requestAnimationFrame(() => this.render());
        }
    }
    set chart(value) {
        this._chart = value;
        this._pendingFullRender = true;
        this.scheduleRender();
    }
    get chart() {
        return this._chart;
    }
    set viewOptions(value) {
        this._viewOptions = value;
        this._pendingFullRender = true;
        this.scheduleRender();
    }
    get viewOptions() {
        return this._viewOptions;
    }
    set judgements(value) {
        this._judgements = value;
        this.scheduleRender();
    }
    get judgements() {
        return this._judgements;
    }
    set judgementDeltas(value) {
        this._judgementDeltas = value;
        this.scheduleRender();
    }
    set texts(value) {
        this._texts = value;
        this._pendingFullRender = true;
        this.scheduleRender();
    }
    showMessage(text, type = "info") {
        this._message = { text, type };
        this._pendingFullRender = true;
        this.scheduleRender();
    }
    clearMessage() {
        this._message = null;
        this._pendingFullRender = true;
        this.scheduleRender();
    }
    // Testing Helper
    getNoteCoordinates(originalBarIndex, charIndex) {
        if (!this._chart || !this._viewOptions)
            return null;
        return getNotePosition(this._chart, this.canvas, this._viewOptions, originalBarIndex, charIndex, this._layout || undefined);
    }
    render() {
        this._renderTask = null;
        if (!this.isConnected || !this.canvas)
            return;
        const width = this.clientWidth || 800;
        // Handle Message State
        if (this._message) {
            this.canvas.classList.add("hidden");
            this.messageContainer.classList.remove("hidden");
            this.messageContainer.textContent = this._message.text;
            if (this._message.type === "warning") {
                this.messageContainer.style.backgroundColor = PALETTE.ui.warning.background;
                this.messageContainer.style.color = PALETTE.ui.warning.text;
            }
            else {
                this.messageContainer.style.backgroundColor = PALETTE.ui.streamWaiting.background;
                this.messageContainer.style.color = PALETTE.ui.streamWaiting.text;
            }
            return;
        }
        // Hide message
        this.messageContainer.classList.add("hidden");
        this.canvas.classList.remove("hidden");
        const ctx = this.canvas.getContext("2d");
        if (!ctx)
            return;
        // If no chart, maybe clear?
        if (!this._chart || !this._viewOptions) {
            this.canvas.width = width;
            this.canvas.height = 0;
            this.canvas.style.height = "0px";
            this.canvas.style.width = `${width}px`;
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }
        let incrementalStart = 0;
        // Determine if we can use incremental rendering
        const hasNewJudgements = this._judgements.length > this._lastRenderedJudgementsLength;
        const canIncremental = !this._pendingFullRender && hasNewJudgements && !!this._layout;
        if (canIncremental) {
            incrementalStart = this._lastRenderedJudgementsLength;
        }
        else {
            // We are doing a full render (either forced or because no incremental update needed/possible)
            // But we only need to recreate layout if pending full render or layout missing
            if (this._pendingFullRender || !this._layout) {
                this._layout = createLayout(this._chart, this.canvas, this._viewOptions, this._judgements);
                this._pendingFullRender = false;
            }
            incrementalStart = 0;
        }
        const texts = this._texts || {
            loopPattern: "Loop x{n}",
            judgement: { perfect: "良", good: "可", poor: "不可" },
        };
        if (incrementalStart > 0 && this._layout) {
            renderIncremental(ctx, this._layout, this._chart, this._judgements, this._judgementDeltas, this._viewOptions, texts, incrementalStart);
        }
        else if (this._layout) {
            renderLayout(ctx, this._layout, this._chart, this._judgements, this._judgementDeltas, this._viewOptions, texts);
        }
        this._lastRenderedJudgementsLength = this._judgements.length;
    }
    // Public method to force render (e.g. after resizing parent not caught by observer, or manual trigger)
    refresh() {
        this._pendingFullRender = true;
        this.scheduleRender();
    }
    handleMouseMove(event) {
        if (this._message) {
            this.canvas.style.cursor = "default";
            return;
        }
        if (!this._chart || !this._viewOptions)
            return;
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const hit = getNoteAt(x, y, this._chart, this.canvas, this._judgements, this._viewOptions, this._layout || undefined);
        this.dispatchEvent(new CustomEvent("chart-hover", {
            detail: { x, y, hit, originalEvent: event },
            bubbles: true,
            composed: true,
        }));
        this.canvas.style.cursor = hit ? "pointer" : "default";
    }
    handleClick(event) {
        if (this._message)
            return;
        if (!this._chart || !this._viewOptions)
            return;
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const hit = getNoteAt(x, y, this._chart, this.canvas, this._judgements, this._viewOptions, this._layout || undefined);
        // Handle Annotation Mode Click
        if (this._viewOptions.isAnnotationMode) {
            if (hit && ["1", "2", "3", "4"].includes(hit.type)) {
                const noteId = `${hit.originalBarIndex}_${hit.charIndex}`;
                const annotations = { ...(this._viewOptions.annotations || {}) };
                const current = annotations[noteId];
                if (!current)
                    annotations[noteId] = "L";
                else if (current === "L")
                    annotations[noteId] = "R";
                else
                    delete annotations[noteId];
                this.dispatchEvent(new CustomEvent("annotations-change", {
                    detail: annotations,
                    bubbles: true,
                    composed: true,
                }));
            }
            // Don't return, still emit chart-click for generic listeners
        }
        this.dispatchEvent(new CustomEvent("chart-click", {
            detail: { x, y, hit, originalEvent: event },
            bubbles: true,
            composed: true,
        }));
    }
    autoAnnotate() {
        if (!this._chart)
            return;
        const currentAnnotations = this._viewOptions?.annotations || {};
        const newAnnotations = generateAutoAnnotations(this._chart, currentAnnotations);
        this.dispatchEvent(new CustomEvent("annotations-change", {
            detail: newAnnotations,
            bubbles: true,
            composed: true,
        }));
    }
    exportImage(overrideOptions) {
        if (!this._chart || !this._viewOptions) {
            throw new Error("Chart not loaded");
        }
        const options = { ...this._viewOptions, ...overrideOptions };
        const canvas = document.createElement("canvas");
        const TARGET_WIDTH = 1024;
        // We want the final image to be exactly 1024px wide.
        // We force DPR to 1 so that logical width == physical width.
        canvas.width = TARGET_WIDTH;
        renderChart(this._chart, canvas, this._judgements, this._judgementDeltas, options, this._texts || { loopPattern: "Loop x{n}", judgement: { perfect: "良", good: "可", poor: "不可" } }, // Fallback defaults if not set
        1);
        return canvas.toDataURL("image/png");
    }
}
customElements.define("tja-chart", TJAChart);
