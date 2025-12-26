import { ParsedChart } from './tja-parser.js';
import { ViewOptions, renderChart, getNoteAt, getNotePosition, RenderTexts, PALETTE } from './renderer.js';
import { generateAutoAnnotations } from './auto-annotation.js';

export interface ChartClickEventDetail {
    x: number;
    y: number;
    hit: any; // HitInfo
    originalEvent: MouseEvent;
}

export class TJAChart extends HTMLElement {
    private canvas: HTMLCanvasElement;
    private _chart: ParsedChart | null = null;
    private _viewOptions: ViewOptions | null = null;
    private _judgements: string[] = [];
    private _judgementDeltas: (number | undefined)[] = [];
    private _texts: RenderTexts | undefined;
    private _message: { text: string, type: 'warning' | 'info' } | null = null;
    private resizeObserver: ResizeObserver;

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
        `;
        
        this.canvas = document.createElement('canvas');
        this.shadowRoot!.appendChild(style);
        this.shadowRoot!.appendChild(this.canvas);

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

    private upgradeProperty(prop: string) {
        if (this.hasOwnProperty(prop)) {
            let value = (this as any)[prop];
            delete (this as any)[prop];
            (this as any)[prop] = value;
        }
    }

    disconnectedCallback() {
        this.resizeObserver.disconnect();
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.removeEventListener('click', this.handleClick.bind(this));
    }

    set chart(value: ParsedChart | null) {
        this._chart = value;
        this.render();
    }

    get chart(): ParsedChart | null {
        return this._chart;
    }

    set viewOptions(value: ViewOptions | null) {
        this._viewOptions = value;
        this.render();
    }

    get viewOptions(): ViewOptions | null {
        return this._viewOptions;
    }
    
    set judgements(value: string[]) {
        this._judgements = value;
        this.render();
    }
    
    set judgementDeltas(value: (number | undefined)[]) {
        this._judgementDeltas = value;
        this.render();
    }
    
    set texts(value: RenderTexts) {
        this._texts = value;
        this.render();
    }

    showMessage(text: string, type: 'warning' | 'info' = 'info') {
        this._message = { text, type };
        this.render();
    }

    clearMessage() {
        this._message = null;
        this.render();
    }

    // Testing Helper
    getNoteCoordinates(originalBarIndex: number, charIndex: number): { x: number, y: number } | null {
        if (!this._chart || !this._viewOptions) return null;
        return getNotePosition(this._chart, this.canvas, this._viewOptions, originalBarIndex, charIndex);
    }

    render() {
        if (!this.isConnected) return;
        
        const ctx = this.canvas.getContext('2d');
        if (!ctx) return;

        const width = this.clientWidth || 800;
        
        // Handle Message State
        if (this._message) {
            const height = 400; // Arbitrary height for message
            this.canvas.width = width;
            this.canvas.height = height;
            this.canvas.style.height = height + 'px';
            this.canvas.style.width = width + 'px';

            // Background
            if (this._message.type === 'warning') {
                ctx.fillStyle = PALETTE.ui.warning.background;
            } else {
                ctx.fillStyle = PALETTE.ui.streamWaiting.background;
            }
            ctx.fillRect(0, 0, width, height);

            // Text
            if (this._message.type === 'warning') {
                ctx.fillStyle = PALETTE.ui.warning.text;
            } else {
                ctx.fillStyle = PALETTE.ui.streamWaiting.text;
            }
            
            ctx.font = 'bold 24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this._message.text, width / 2, height / 2);
            return;
        }

        // If no chart, maybe clear?
        if (!this._chart || !this._viewOptions) {
             this.canvas.width = width;
             this.canvas.height = 0;
             this.canvas.style.height = '0px';
             this.canvas.style.width = width + 'px';
             ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
             return;
        }
        
        renderChart(
            this._chart,
            this.canvas,
            this._judgements,
            this._judgementDeltas,
            this._viewOptions,
            this._texts
        );
    }

    // Public method to force render (e.g. after resizing parent not caught by observer, or manual trigger)
    refresh() {
        this.render();
    }

    private handleMouseMove(event: MouseEvent) {
        if (this._message) {
            this.canvas.style.cursor = 'default';
            return;
        }
        if (!this._chart || !this._viewOptions) return;
        
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

    handleClick(event: MouseEvent) {
        if (this._message) return;
        if (!this._chart || !this._viewOptions) return;
        
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
                   
                   if (!current) annotations[noteId] = 'L';
                   else if (current === 'L') annotations[noteId] = 'R';
                   else delete annotations[noteId];
                   
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
        if (!this._chart) return;
        const currentAnnotations = this._viewOptions?.annotations || {};
        const newAnnotations = generateAutoAnnotations(this._chart, currentAnnotations);
        
        this.dispatchEvent(new CustomEvent('annotations-change', { 
            detail: newAnnotations,
            bubbles: true,
            composed: true
        }));
    }

    exportImage(overrideOptions?: Partial<ViewOptions>): string {
        if (!this._chart || !this._viewOptions) {
            throw new Error("Chart not loaded");
        }

        const options = { ...this._viewOptions, ...overrideOptions };
        
        const canvas = document.createElement('canvas');
        const TARGET_WIDTH = 1024;
        
        // We want the final image to be exactly 1024px wide.
        // We force DPR to 1 so that logical width == physical width.
        canvas.width = TARGET_WIDTH;
        
        renderChart(
            this._chart, 
            canvas, 
            this._judgements, 
            this._judgementDeltas, 
            options, 
            this._texts || { loopPattern: "Loop x{n}", judgement: { perfect: "良", good: "可", poor: "不可" } }, // Fallback defaults if not set
            1
        );
        
        return canvas.toDataURL('image/png');
    }
}

customElements.define('tja-chart', TJAChart);
