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
 * A sheet height change moves the pill: instantly while dragging (its CSS
 * transition is disabled) or animated over the snap transition. Re-evaluate on
 * every frame until the pill settles so visibility tracks the moving pill.
 */
let trackingRaf = 0;
function trackSheetMotion() {
  if (!wrapper || !pill || !chart) return;
  let lastBottom = pill.getBoundingClientRect().bottom;
  let stableFrames = 0;
  cancelAnimationFrame(trackingRaf);
  const tick = () => {
    update();
    const bottom = pill.getBoundingClientRect().bottom;
    // Stop once the pill has held still for a couple of frames (transition done).
    stableFrames = Math.abs(bottom - lastBottom) < 0.5 ? stableFrames + 1 : 0;
    lastBottom = bottom;
    if (stableFrames >= 2) return;
    trackingRaf = requestAnimationFrame(tick);
  };
  trackingRaf = requestAnimationFrame(tick);
}

export function initFloatingActionsVisibility() {
  if (!wrapper || !pill || !chart) return;
  update();
  window.addEventListener("scroll", update, { passive: true, capture: true });
  window.addEventListener("resize", update);
  window.addEventListener("layout-change", update);
  window.addEventListener("sheet-height-change", trackSheetMotion);
  if (typeof ResizeObserver !== "undefined") {
    const ro = new ResizeObserver(update);
    ro.observe(chart);
    ro.observe(pill);
  }
}
