import { renderChart, getNoteAt, getNotePosition, PALETTE } from './renderer.js';
import { generateAutoAnnotations } from './auto-annotation.js';
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
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        const style = document.createElement('style');
        style.textContent = `
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
        `;
        this.messageContainer = document.createElement('div');
        this.messageContainer.id = 'message-container';
        this.messageContainer.classList.add('hidden');
        this.canvas = document.createElement('canvas');
        this.shadowRoot.appendChild(style);
        this.shadowRoot.appendChild(this.messageContainer);
        this.shadowRoot.appendChild(this.canvas);
        this.resizeObserver = new ResizeObserver(() => {
            this.render();
        });
    }
    connectedCallback() {
        this.upgradeProperty('chart');
        this.upgradeProperty('viewOptions');
        this.upgradeProperty('judgements');
        this.upgradeProperty('judgementDeltas');
        this.upgradeProperty('texts');
        this.resizeObserver.observe(this);
        this.render();
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
    }
    upgradeProperty(prop) {
        if (this.hasOwnProperty(prop)) {
            let value = this[prop];
            delete this[prop];
            this[prop] = value;
        }
    }
    disconnectedCallback() {
        this.resizeObserver.disconnect();
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.removeEventListener('click', this.handleClick.bind(this));
    }
    set chart(value) {
        this._chart = value;
        this.render();
    }
    get chart() {
        return this._chart;
    }
    set viewOptions(value) {
        this._viewOptions = value;
        this.render();
    }
    get viewOptions() {
        return this._viewOptions;
    }
    set judgements(value) {
        this._judgements = value;
        this.render();
    }
    set judgementDeltas(value) {
        this._judgementDeltas = value;
        this.render();
    }
    set texts(value) {
        this._texts = value;
        this.render();
    }
    showMessage(text, type = 'info') {
        this._message = { text, type };
        this.render();
    }
    clearMessage() {
        this._message = null;
        this.render();
    }
    // Testing Helper
    getNoteCoordinates(originalBarIndex, charIndex) {
        if (!this._chart || !this._viewOptions)
            return null;
        return getNotePosition(this._chart, this.canvas, this._viewOptions, originalBarIndex, charIndex);
    }
    render() {
        if (!this.isConnected)
            return;
        const width = this.clientWidth || 800;
        // Handle Message State
        if (this._message) {
            this.canvas.classList.add('hidden');
            this.messageContainer.classList.remove('hidden');
            this.messageContainer.textContent = this._message.text;
            if (this._message.type === 'warning') {
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
        this.messageContainer.classList.add('hidden');
        this.canvas.classList.remove('hidden');
        const ctx = this.canvas.getContext('2d');
        if (!ctx)
            return;
        // If no chart, maybe clear?
        if (!this._chart || !this._viewOptions) {
            this.canvas.width = width;
            this.canvas.height = 0;
            this.canvas.style.height = '0px';
            this.canvas.style.width = width + 'px';
            ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            return;
        }
        renderChart(this._chart, this.canvas, this._judgements, this._judgementDeltas, this._viewOptions, this._texts);
    }
    // Public method to force render (e.g. after resizing parent not caught by observer, or manual trigger)
    refresh() {
        this.render();
    }
    handleMouseMove(event) {
        if (this._message) {
            this.canvas.style.cursor = 'default';
            return;
        }
        if (!this._chart || !this._viewOptions)
            return;
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const hit = getNoteAt(x, y, this._chart, this.canvas, this._judgements, this._viewOptions);
        this.dispatchEvent(new CustomEvent('chart-hover', {
            detail: { x, y, hit, originalEvent: event },
            bubbles: true,
            composed: true
        }));
        this.canvas.style.cursor = hit ? 'pointer' : 'default';
    }
    handleClick(event) {
        if (this._message)
            return;
        if (!this._chart || !this._viewOptions)
            return;
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const hit = getNoteAt(x, y, this._chart, this.canvas, this._judgements, this._viewOptions);
        // Handle Annotation Mode Click
        if (this._viewOptions.isAnnotationMode) {
            if (hit && ['1', '2', '3', '4'].includes(hit.type)) {
                const noteId = `${hit.originalBarIndex}_${hit.charIndex}`;
                const annotations = { ...(this._viewOptions.annotations || {}) };
                const current = annotations[noteId];
                if (!current)
                    annotations[noteId] = 'L';
                else if (current === 'L')
                    annotations[noteId] = 'R';
                else
                    delete annotations[noteId];
                this.dispatchEvent(new CustomEvent('annotations-change', {
                    detail: annotations,
                    bubbles: true,
                    composed: true
                }));
            }
            // Don't return, still emit chart-click for generic listeners
        }
        this.dispatchEvent(new CustomEvent('chart-click', {
            detail: { x, y, hit, originalEvent: event },
            bubbles: true,
            composed: true
        }));
    }
    autoAnnotate() {
        if (!this._chart)
            return;
        const currentAnnotations = this._viewOptions?.annotations || {};
        const newAnnotations = generateAutoAnnotations(this._chart, currentAnnotations);
        this.dispatchEvent(new CustomEvent('annotations-change', {
            detail: newAnnotations,
            bubbles: true,
            composed: true
        }));
    }
    exportImage(overrideOptions) {
        if (!this._chart || !this._viewOptions) {
            throw new Error("Chart not loaded");
        }
        const options = { ...this._viewOptions, ...overrideOptions };
        const canvas = document.createElement('canvas');
        const TARGET_WIDTH = 1024;
        // We want the final image to be exactly 1024px wide.
        // We force DPR to 1 so that logical width == physical width.
        canvas.width = TARGET_WIDTH;
        renderChart(this._chart, canvas, this._judgements, this._judgementDeltas, options, this._texts || { loopPattern: "Loop x{n}", judgement: { perfect: "良", good: "可", poor: "不可" } }, // Fallback defaults if not set
        1);
        return canvas.toDataURL('image/png');
    }
}
customElements.define('tja-chart', TJAChart);
