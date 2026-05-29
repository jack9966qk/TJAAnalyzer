import { appState } from "../state/app-state.js";

const docRoot = document.documentElement;
const sheet = document.getElementById("chart-options-panel");
const handle = document.getElementById("options-panel-header");
const optionsBody = document.getElementById("options-body");

/**
 * Bottom sheet for the chart options panel (similar to mobile apps,
 * (vertical layout only). The panel-header acts as the drag handle; the
 * sheet has two snap states (collapsed = handle + tabs, expanded = min(70% of
 * the viewport, content height)). The options-body scrolls natively when
 * its content is taller than the expanded sheet.
 *
 * Tap on the handle toggles expand/collapse via a native click handler.
 * Drag/swipe anywhere on the sheet resizes it; setPointerCapture is deferred
 * until significant movement is detected.
 *
 * Layout switch to horizontal: all sheet state is cleared so the original
 * sidebar-style panel behavior applies.
 */

const EXPANDED_FRACTION = 0.7;
const DRAG_THRESHOLD_PX = 5;
let handleHeight = 50;
let tabBarHeight = 0;
let expanded = false;
let dragStartY: number | null = null;
let dragStartHeight = 0;
type DragMode = "drag" | null;
let dragMode: DragMode = null;
let trackingPointerId: number | null = null;
let suppressClicksUntil = 0;

function isActive() {
  return !appState.isHorizontalLayout && !!sheet && !!handle;
}

function getContentHeight(): number {
  if (!optionsBody) return 0;
  const prev = optionsBody.style.height;
  optionsBody.style.height = "auto";
  void optionsBody.offsetHeight;
  const h = optionsBody.scrollHeight;
  optionsBody.style.height = prev;
  return h;
}

function safeAreaBottom(): number {
  if (!sheet) return 0;
  return parseFloat(getComputedStyle(sheet).paddingBottom) || 0;
}

function collapsedHeight(): number {
  return handleHeight + tabBarHeight + safeAreaBottom();
}

function expandedHeight() {
  const viewportMax = window.innerHeight * EXPANDED_FRACTION;
  const contentH = getContentHeight();
  const sa = safeAreaBottom();
  const contentMax = contentH > 0 ? handleHeight + contentH + sa : viewportMax;
  return Math.max(collapsedHeight(), Math.min(viewportMax, contentMax));
}

function setSheetHeightPx(px: number) {
  docRoot.style.setProperty("--sheet-height", `${px}px`);
  // The floating action pill is anchored above the sheet, so a height change
  // moves it; let the visibility controller re-evaluate.
  window.dispatchEvent(new CustomEvent("sheet-height-change"));
}

function setMaxHeightPx(px: number) {
  docRoot.style.setProperty("--sheet-max-height", `${px}px`);
}

function recalcMaxHeight() {
  const max = expandedHeight();
  setMaxHeightPx(max);
}

function syncExpandedHeight() {
  recalcMaxHeight();
  if (expanded) setSheetHeightPx(expandedHeight());
}

function snapTo(toExpanded: boolean) {
  expanded = toExpanded;
  if (toExpanded) {
    recalcMaxHeight();
  }
  setSheetHeightPx(toExpanded ? expandedHeight() : collapsedHeight());
  sheet?.classList.toggle("sheet-expanded", toExpanded);
  // When expanding the sheet, collapse the DS panel to make room.
  if (toExpanded) collapseDSPanel();
}

function collapseDSPanel() {
  const dsBody = document.getElementById("ds-body");
  if (!dsBody || dsBody.classList.contains("collapsed")) return;
  dsBody.classList.add("collapsed");
  const dsIcon = document.getElementById("ds-collapse-icon") as HTMLImageElement | null;
  if (dsIcon) {
    dsIcon.src = "assets/heroicons/optimized/24/outline/chevron-down.svg";
    dsIcon.alt = "Expand";
  }
}

export function collapseSheet() {
  if (!expanded || !sheet) return;
  snapTo(false);
}

export function expandSheet() {
  if (expanded || !sheet) return;
  snapTo(true);
}

function measureTabBar() {
  if (!optionsBody) return;
  const tabs = optionsBody.querySelector(".panel-tabs") as HTMLElement | null;
  if (!tabs) return;
  const prev = optionsBody.style.height;
  optionsBody.style.height = "auto";
  void tabs.offsetHeight;
  const h = tabs.offsetHeight;
  optionsBody.style.height = prev;
  if (h > 0) tabBarHeight = h;
}

function measureHandle() {
  if (!handle) return;
  const h = handle.offsetHeight;
  if (h > 0) {
    handleHeight = h;
    docRoot.style.setProperty("--sheet-handle-height", `${h}px`);
  }
  if (!expanded && dragMode !== "drag") setSheetHeightPx(collapsedHeight());
}

function cancelTracking() {
  dragStartY = null;
  dragStartInteractive = false;
  dragMode = null;
  trackingPointerId = null;
}

const INTERACTIVE_SELECTOR =
  'button, input, select, textarea, a, label, summary, [role="button"], [contenteditable=""], [contenteditable="true"]';

function isInteractiveTarget(e: PointerEvent): boolean {
  for (const node of e.composedPath()) {
    if (!(node instanceof Element)) continue;
    if (node.matches(INTERACTIVE_SELECTOR)) return true;
  }
  return false;
}

function isInteractiveElement(el: Element): boolean {
  return el.closest(INTERACTIVE_SELECTOR) !== null;
}

// ---- Drag handling ----

let dragStartInteractive = false;

function onPointerDown(e: PointerEvent) {
  if (!isActive() || !sheet) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  if (trackingPointerId !== null) return;

  dragStartInteractive = isInteractiveTarget(e);

  dragStartY = e.clientY;
  dragStartHeight = parseFloat(docRoot.style.getPropertyValue("--sheet-height")) || collapsedHeight();
  trackingPointerId = e.pointerId;

  // Don't preventDefault on interactive targets so clicks (e.g. tabs) fire.
  // CSS touch-action: none on the sheet already blocks browser scrolling.
  if (!dragStartInteractive) {
    e.preventDefault();
  }
}

function onPointerMove(e: PointerEvent) {
  if (dragStartY === null || !sheet) return;
  if (e.pointerId !== trackingPointerId) return;

  const delta = Math.abs(e.clientY - dragStartY);
  if (delta < DRAG_THRESHOLD_PX) return;

  if (dragMode !== "drag") {
    dragMode = "drag";
    sheet.classList.add("dragging");
    sheet.setPointerCapture(e.pointerId);
    // Suppress clicks after a drag to avoid accidental tab switches.
    suppressClicksUntil = performance.now() + 400;
  }

  const dy = dragStartY - e.clientY;
  const min = collapsedHeight();
  const max = expandedHeight();
  const newHeight = Math.max(min, Math.min(max, dragStartHeight + dy));
  setSheetHeightPx(newHeight);
  e.preventDefault();
}

function onPointerUp(e: PointerEvent) {
  if (dragStartY === null || !sheet) return;
  if (e.pointerId !== trackingPointerId) return;

  if (dragMode === "drag") {
    sheet.classList.remove("dragging");
    const currentH = parseFloat(docRoot.style.getPropertyValue("--sheet-height")) || collapsedHeight();
    const mid = (collapsedHeight() + expandedHeight()) / 2;
    snapTo(currentH > mid);
  }
  cancelTracking();
}
// ---- Tap handling ----

function onHandleClick(e: MouseEvent) {
  if (!isActive()) return;
  if (performance.now() < suppressClicksUntil) return;
  if (e.target instanceof Element && isInteractiveElement(e.target)) return;

  snapTo(!expanded);
  suppressClicksUntil = performance.now() + 400;

  if (!appState.isHorizontalLayout) e.stopPropagation();
}

export function initBottomSheet() {
  if (!sheet || !handle) return;

  measureTabBar();
  measureHandle();
  recalcMaxHeight();
  snapTo(false);

  sheet.addEventListener("pointerdown", onPointerDown);
  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);

  handle.addEventListener("click", onHandleClick);

  sheet.addEventListener(
    "click",
    (e) => {
      if (performance.now() < suppressClicksUntil) {
        e.stopPropagation();
        e.preventDefault();
      }
    },
    true,
  );

  window.addEventListener("resize", () => {
    measureHandle();
    syncExpandedHeight();
  });

  window.addEventListener("options-tab-changed", () => {
    if (!isActive()) return;
    requestAnimationFrame(() => {
      syncExpandedHeight();
    });
  });

  window.addEventListener("layout-change", () => {
    if (appState.isHorizontalLayout) {
      docRoot.style.removeProperty("--sheet-height");
      docRoot.style.removeProperty("--sheet-max-height");
      docRoot.style.removeProperty("--sheet-handle-height");
      sheet.classList.remove("dragging", "sheet-expanded");
      expanded = false;
      cancelTracking();
    } else {
      measureHandle();
      snapTo(false);
    }
  });

  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(() => {
      if (dragMode === "drag") return;
      measureHandle();
      syncExpandedHeight();
    });
    ro.observe(handle);
    if (optionsBody) ro.observe(optionsBody);
  }
}
