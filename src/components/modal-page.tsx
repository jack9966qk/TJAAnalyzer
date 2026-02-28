import * as webjsx from "webjsx";
import { appState } from "../state/app-state.js";
import styleUrl from "../style.css?url";
import { i18n } from "../utils/i18n.js";

export class ModalPage extends HTMLElement {
  private _isOpen = false;
  private _title = "";
  private _maxWidth = "800px";
  private _isHorizontal = appState.isHorizontalLayout;
  private _layoutHandler = (e: Event) => {
    this._isHorizontal = (e as CustomEvent).detail.isHorizontal;
    this.render();
  };

  static get observedAttributes() {
    return ["open", "title", "max-width"];
  }

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    window.addEventListener("layout-change", this._layoutHandler as EventListener);
    this.updateBodyScroll();
  }

  disconnectedCallback() {
    window.removeEventListener("layout-change", this._layoutHandler as EventListener);
    // Use a small delay to allow other modals to update state if they are being swapped
    setTimeout(() => this.updateBodyScroll(), 0);
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;

    if (name === "open") {
      this._isOpen = newValue !== null;
      this.updateBodyScroll();
    } else if (name === "title") {
      this._title = newValue || "";
    } else if (name === "max-width") {
      this._maxWidth = newValue || "800px";
    }

    this.render();
  }

  get open() {
    return this._isOpen;
  }

  set open(val: boolean) {
    if (val) {
      this.setAttribute("open", "");
    } else {
      this.removeAttribute("open");
    }
    this.updateBodyScroll();
  }

  private updateBodyScroll() {
    const anyOpen = document.querySelectorAll("modal-page[open]").length > 0;
    if (anyOpen) {
      document.body.classList.add("modal-active");
    } else {
      document.body.classList.remove("modal-active");
    }
  }

  get title() {
    return this._title;
  }

  set title(val: string) {
    this.setAttribute("title", val);
  }

  get maxWidth() {
    return this._maxWidth;
  }

  set maxWidth(val: string) {
    this.setAttribute("max-width", val);
  }

  private handleClose() {
    this.dispatchEvent(
      new CustomEvent("close", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      this.handleClose();
    }
  }

  render() {
    const layoutClass = this._isHorizontal ? "layout-horizontal" : "layout-vertical";
    const vdom = (
      <div
        id="modal-root"
        className={`modal ${this._isOpen ? "open" : ""} ${layoutClass}`}
        onclick={this.handleOverlayClick.bind(this)}
      >
        <link rel="stylesheet" href={styleUrl} />
        <div className="modal-content" style={`max-width: ${this._maxWidth}`}>
          <div className="modal-header">
            <h2>{this._title}</h2>
            <button
              type="button"
              className="close-btn"
              onclick={this.handleClose.bind(this)}
              aria-label={i18n.t("ui.close")}
            >
              <div className="modal-close-icon" />
            </button>
          </div>
          <div className="modal-scroll-area">
            <slot />
          </div>
        </div>
      </div>
    );

    if (this.shadowRoot) {
      webjsx.applyDiff(this.shadowRoot, vdom);
    }
  }
}

if (!customElements.get("modal-page")) {
  customElements.define("modal-page", ModalPage);
}
