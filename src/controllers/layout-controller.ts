import { i18n } from "../utils/i18n.js";
import { appFooter, chartContainer, controlsContainer, layoutToggleBtn } from "../view/ui-elements.js";

const CONTROLS_WIDTH = 390; // Estimated width for 3 stats columns + padding

export function updateLayout() {
  if (!controlsContainer || !layoutToggleBtn) return;

  const windowWidth = window.innerWidth;
  // If controls width is less than 40% of window width, use horizontal layout
  const shouldUseHorizontal = CONTROLS_WIDTH < windowWidth * 0.4;

  if (shouldUseHorizontal) {
    document.body.classList.add("horizontal-layout");

    // Move footer to controls container
    if (appFooter && appFooter.parentElement !== controlsContainer) {
      controlsContainer.appendChild(appFooter);
    }

    // Update state based on collapse status
    if (!document.body.classList.contains("controls-collapsed")) {
      controlsContainer.style.width = `${CONTROLS_WIDTH}px`;
      layoutToggleBtn.style.left = `${CONTROLS_WIDTH}px`;
      layoutToggleBtn.innerHTML = '<span class="icon">&lt;</span>';
      layoutToggleBtn.title = i18n.t("ui.collapse");
    } else {
      controlsContainer.style.width = "0px";
      layoutToggleBtn.style.left = "0px";
      layoutToggleBtn.innerHTML = '<span class="icon">&gt;</span>';
      layoutToggleBtn.title = i18n.t("ui.expand");
    }
  } else {
    document.body.classList.remove("horizontal-layout");

    // Move footer back to chart container
    if (appFooter && appFooter.parentElement !== chartContainer) {
      chartContainer.appendChild(appFooter);
    }

    // Reset styles for vertical layout
    controlsContainer.style.width = "";
    layoutToggleBtn.style.left = "";
  }
}

export function handleLayoutToggle(refreshChartCallback: () => void) {
  if (!controlsContainer || !layoutToggleBtn) return;

  document.body.classList.toggle("controls-collapsed");
  const isCollapsed = document.body.classList.contains("controls-collapsed");

  if (isCollapsed) {
    controlsContainer.style.width = "0px";
    layoutToggleBtn.style.left = "0px";
    layoutToggleBtn.innerHTML = '<span class="icon">&gt;</span>';
    layoutToggleBtn.title = i18n.t("ui.expand");
  } else {
    controlsContainer.style.width = `${CONTROLS_WIDTH}px`;
    layoutToggleBtn.style.left = `${CONTROLS_WIDTH}px`;
    layoutToggleBtn.innerHTML = '<span class="icon">&lt;</span>';
    layoutToggleBtn.title = i18n.t("ui.collapse");
  }

  // Refresh chart after transition to ensure correct width
  setTimeout(() => {
    refreshChartCallback();
  }, 350);
}
