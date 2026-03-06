import * as webjsx from "webjsx";
import styleUrl from "../style.css?url";

export interface StepperControlProps {
  value?: number;
  baseline?: number;
  min?: number;
  max?: number;
  step?: number;
  format?: (v: number) => string;
  changeCallback?: (value: number) => void;
}

export class StepperControl extends HTMLElement {
  private _value: number = 0;
  private _baseline: number = 0;
  private _min: number = Number.NEGATIVE_INFINITY;
  private _max: number = Number.POSITIVE_INFINITY;
  private _step: number = 1;
  private _format: (v: number) => string = (v) => String(v);
  private _renderSuspended = false;
  private _connected = false;

  changeCallback?: (value: number) => void;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  // Implement webjsx render suspension so all prop updates batch into one render.
  __webjsx_suspendRendering() {
    this._renderSuspended = true;
  }

  __webjsx_resumeRendering() {
    this._renderSuspended = false;
    if (this._connected) this.render();
  }

  private renderIfReady() {
    if (!this._renderSuspended && this._connected) this.render();
  }

  get value() {
    return this._value;
  }
  set value(v: number) {
    this._value = v;
    this.renderIfReady();
  }

  get baseline() {
    return this._baseline;
  }
  set baseline(v: number) {
    this._baseline = v;
    this.renderIfReady();
  }

  get min() {
    return this._min;
  }
  set min(v: number) {
    this._min = v;
    this.renderIfReady();
  }

  get max() {
    return this._max;
  }
  set max(v: number) {
    this._max = v;
    this.renderIfReady();
  }

  get step() {
    return this._step;
  }
  set step(v: number) {
    this._step = v;
    this.renderIfReady();
  }

  get format() {
    return this._format;
  }
  set format(v: (n: number) => string) {
    this._format = v;
    this.renderIfReady();
  }

  connectedCallback() {
    this._connected = true;
    this.render();
  }

  disconnectedCallback() {
    this._connected = false;
  }

  private emit(value: number) {
    if (this.changeCallback) {
      this.changeCallback(value);
    }
  }

  render() {
    // A negative step means "+" visually decreases the raw value (e.g. zoom: fewer beats = higher %).
    const decremented = this._value - this._step;
    const incremented = this._value + this._step;
    const canDecrement = decremented >= this._min && decremented <= this._max;
    const canIncrement = incremented >= this._min && incremented <= this._max;

    const vdom = (
      <div>
        <link rel="stylesheet" href={styleUrl} />
        <div className="zoom-btn-group">
          <button type="button" className="tiny-btn" disabled={!canDecrement} onclick={() => this.emit(decremented)}>
            -
          </button>
          <button
            type="button"
            className="tiny-btn"
            style="font-family: 'Consolas', monospace;"
            onclick={() => this.emit(this._baseline)}
          >
            {this._format(this._value)}
          </button>
          <button type="button" className="tiny-btn" disabled={!canIncrement} onclick={() => this.emit(incremented)}>
            +
          </button>
        </div>
      </div>
    );

    if (this.shadowRoot) {
      webjsx.applyDiff(this.shadowRoot, vdom);
    }
  }
}

customElements.define("stepper-control", StepperControl);
