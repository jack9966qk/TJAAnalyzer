import * as webjsx from "webjsx";
import { appState } from "../state/app-state.js";
import styleUrl from "../style.css?url";
import { i18n } from "../utils/i18n.js";
import { startupLog } from "../utils/startup-log.js";

// Body scroll-lock state, shared across all modal-page instances. While a modal
// is open the body is pinned (`position: fixed` via the `.modal-active` rule)
// and offset by the saved scroll position so the page behind cannot scroll —
// `overflow: hidden` alone is not enough on iOS Safari / PWA. On unlock the
// scroll position is restored.
let bodyScrollLocked = false;
let lockedScrollY = 0;

function setBodyScrollLock(lock: boolean) {
  if (lock === bodyScrollLocked) return;
  bodyScrollLocked = lock;
  if (lock) {
    lockedScrollY = window.scrollY;
    document.body.style.top = `-${lockedScrollY}px`;
    document.body.classList.add("modal-active");
  } else {
    document.body.classList.remove("modal-active");
    document.body.style.top = "";
    window.scrollTo(0, lockedScrollY);
  }
}

export class ModalPage extends HTMLElement {
  private _isOpen = false;
  private _heading = "";
  private _maxWidth = "800px";
  private _isHorizontal = appState.isHorizontalLayout;
  private _anchorElement: Element | null = null;
  private _layoutHandler = (e: Event) => {
    this._isHorizontal = (e as CustomEvent).detail.isHorizontal;
    this.render();
  };

  static get observedAttributes() {
    // Use "heading" rather than the native "title" attribute: a `title` on the
    // host element triggers an OS-native tooltip/popover showing the modal's
    // title, which is redundant with the rendered <h2> header.
    return ["open", "heading", "max-width"];
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
      this.classList.toggle("open", this._isOpen);
      this.updateBodyScroll();
      if (this._isOpen) this.scheduleGeometryDebugLog();
    } else if (name === "heading") {
      this._heading = newValue || "";
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
      this.classList.add("open");
    } else {
      this.removeAttribute("open");
      this.classList.remove("open");
    }
    this.updateBodyScroll();
  }

  private updateBodyScroll() {
    const anyOpen = document.querySelectorAll("modal-page[open]").length > 0;
    setBodyScrollLock(anyOpen);
  }

  // Debug instrumentation: records modal + bottom-sheet geometry to the Settings
  // Debug Log once the open transition has settled, so an on-device tester can
  // copy it. Diagnoses why the off-screen bottom sheet appears below a vertical
  // modal on iOS (where layout/visual-viewport and safe-area behaviour differs
  // from the desktop emulator).
  private scheduleGeometryDebugLog() {
    // Wait past the slide-up transition so rects reflect the at-rest state.
    window.setTimeout(() => this.logGeometryDebug(), 450);
  }

  private logGeometryDebug() {
    if (!this._isOpen) return;
    const rect = (el: Element | null | undefined) => {
      if (!el) return "null";
      const r = el.getBoundingClientRect();
      return `top=${r.top.toFixed(1)} bottom=${r.bottom.toFixed(1)} h=${r.height.toFixed(1)}`;
    };
    const root = this.shadowRoot;
    const overlay = root?.querySelector(".modal") ?? null;
    const content = root?.querySelector(".modal-content") ?? null;
    const sheet = document.getElementById("chart-options-panel");

    // Read the live safe-area-inset-bottom via a throwaway probe element.
    const probe = document.createElement("div");
    probe.style.cssText = "position:fixed;padding-bottom:env(safe-area-inset-bottom);visibility:hidden;";
    document.body.appendChild(probe);
    const safeAreaBottom = getComputedStyle(probe).paddingBottom;
    probe.remove();

    const docStyle = getComputedStyle(document.documentElement);
    const vv = window.visualViewport;

    startupLog.record(
      `[modal-debug] open: ${this._heading || "(no heading)"}`,
      this._isHorizontal ? "horizontal" : "vertical",
    );
    startupLog.record(
      "[modal-debug] viewport",
      `innerH=${window.innerHeight} innerW=${window.innerWidth} dpr=${window.devicePixelRatio} vv=${vv ? `${vv.width.toFixed(0)}x${vv.height.toFixed(0)} offTop=${vv.offsetTop.toFixed(1)} pageTop=${vv.pageTop.toFixed(1)}` : "n/a"}`,
    );
    startupLog.record("[modal-debug] safe-area-inset-bottom", safeAreaBottom);
    startupLog.record("[modal-debug] body.class", document.body.className || "(none)");
    startupLog.record("[modal-debug] overlay .modal", rect(overlay));
    startupLog.record("[modal-debug] .modal-content", rect(content));
    startupLog.record("[modal-debug] #chart-options-panel", rect(sheet));
    if (sheet) {
      const cs = getComputedStyle(sheet);
      startupLog.record("[modal-debug] sheet transform", cs.transform);
      startupLog.record(
        "[modal-debug] sheet height/visibility/display",
        `${cs.height} / ${cs.visibility} / ${cs.display}`,
      );
    }
    startupLog.record(
      "[modal-debug] sheet vars",
      `--sheet-height=${docStyle.getPropertyValue("--sheet-height").trim() || "(unset)"} --sheet-max-height=${docStyle.getPropertyValue("--sheet-max-height").trim() || "(unset)"} --sheet-collapsed-height=${docStyle.getPropertyValue("--sheet-collapsed-height").trim() || "(unset)"}`,
    );
  }

  get heading() {
    return this._heading;
  }

  set heading(val: string) {
    this.setAttribute("heading", val);
  }

  get maxWidth() {
    return this._maxWidth;
  }

  set maxWidth(val: string) {
    this.setAttribute("max-width", val);
  }

  setAnchor(el: Element | null) {
    this._anchorElement = el;
    if (this._isOpen) this.render();
  }

  private computeAnchoredContentStyle(): string {
    if (!this._isHorizontal || !this._anchorElement) return "";

    const anchor = this._anchorElement.getBoundingClientRect();
    const gap = 8;
    const margin = 16;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    // Parse max-width (e.g. "400px") for horizontal clamping
    const maxWidthPx = Number.parseInt(this._maxWidth, 10) || 400;
    const approxWidth = Math.min(maxWidthPx, viewportW - 2 * margin);

    const spaceBelow = viewportH - anchor.bottom - gap - margin;
    const spaceAbove = anchor.top - gap - margin;

    // Align left edge with anchor, clamped so content stays in viewport
    let left = anchor.left;
    if (left + approxWidth > viewportW - margin) {
      left = viewportW - margin - approxWidth;
    }
    left = Math.max(margin, left);

    if (spaceBelow >= spaceAbove) {
      // Place below anchor
      const top = anchor.bottom + gap;
      const maxHeight = Math.max(50, spaceBelow);
      return `position: fixed; top: ${top}px; bottom: auto; left: ${left}px; margin: 0; max-height: ${maxHeight}px;`;
    }
    // Place above anchor — bottom of modal sits just above anchor
    const bottom = viewportH - anchor.top + gap;
    const maxHeight = Math.max(50, spaceAbove);
    return `position: fixed; top: auto; bottom: ${bottom}px; left: ${left}px; margin: 0; max-height: ${maxHeight}px;`;
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
    const isAnchored = this._isHorizontal && this._anchorElement != null;
    const layoutClass = this._isHorizontal ? "layout-horizontal" : "layout-vertical";
    const anchoredClass = isAnchored ? " anchored" : "";
    const anchoredContentStyle = this.computeAnchoredContentStyle();

    const vdom = (
      <div
        id="modal-root"
        className={`modal ${this._isOpen ? "open" : ""} ${layoutClass}${anchoredClass}`}
        style={this._isOpen ? undefined : "visibility: hidden; opacity: 0;"}
        onclick={this.handleOverlayClick.bind(this)}
      >
        <link rel="stylesheet" href={styleUrl} />
        <div
          className="modal-content"
          style={`max-width: ${this._maxWidth}${anchoredContentStyle ? `; ${anchoredContentStyle}` : ""}`}
        >
          <div className="modal-header">
            <h2>{this._heading}</h2>
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
