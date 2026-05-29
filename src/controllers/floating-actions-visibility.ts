import { appState } from "../state/app-state.js";

/**
 * Vertical-layout floating action buttons sit above the bottom sheet, overlaid
 * on the chart preview. Hide them (with a fade) whenever they would extend
 * outside the chart's visible region — i.e. while scrolling the chart out of
 * view, when the chart is shorter than the pill's anchor position, or when the
 * bottom sheet grows/shrinks (the pill is anchored above the sheet, so its
 * height directly moves the pill).
 */

const wrapper = document.getElementById("floating-actions-wrapper");
const pill = document.getElementById("floating-chart-actions");
const chart = document.getElementById("chart-component");

function rectContains(outer: DOMRect, inner: DOMRect): boolean {
  return (
    inner.left >= outer.left && inner.right <= outer.right && inner.top >= outer.top && inner.bottom <= outer.bottom
  );
}

function update() {
  if (!wrapper || !pill || !chart) return;
  if (appState.isHorizontalLayout) {
    wrapper.classList.remove("floating-hidden");
    return;
  }
  const pillRect = pill.getBoundingClientRect();
  const chartRect = chart.getBoundingClientRect();
  const fullyInside = rectContains(chartRect, pillRect);
  wrapper.classList.toggle("floating-hidden", !fullyInside);
}

/**
 * A sheet height change moves the pill. Coalesce updates to one per frame
 * (rAF) so a drag — which fires this every pointer move — triggers a single
 * layout read per frame instead of a per-frame polling loop. The snap is a CSS
 * transition that emits no further events, so we also re-check once it ends.
 */
let scheduledRaf = 0;
function scheduleUpdate() {
  if (scheduledRaf) return;
  scheduledRaf = requestAnimationFrame(() => {
    scheduledRaf = 0;
    update();
  });
}

export function initFloatingActionsVisibility() {
  if (!wrapper || !pill || !chart) return;
  update();
  window.addEventListener("scroll", update, { passive: true, capture: true });
  window.addEventListener("resize", update);
  window.addEventListener("layout-change", update);
  window.addEventListener("sheet-height-change", scheduleUpdate);
  // The sheet's translateY transition (snap) settles silently — re-evaluate
  // once it finishes to catch the final pill position.
  const sheet = document.getElementById("chart-options-panel");
  sheet?.addEventListener("transitionend", (e) => {
    if ((e as TransitionEvent).propertyName === "transform") update();
  });
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(update);
    ro.observe(chart);
    ro.observe(pill);
  }
}
