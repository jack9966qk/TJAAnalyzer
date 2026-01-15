import { appState } from "../state/app-state.js";
import { shareFile } from "../utils/file-share.js";
import { i18n } from "../utils/i18n.js";
import { statusDisplay, tjaChart } from "../view/ui-elements.js";

export class SaveImageButton extends HTMLElement {
  private button: HTMLButtonElement;

  constructor() {
    super();
    this.button = document.createElement("button");
    this.button.className = "control-btn";
  }

  connectedCallback() {
    // Move children (text content) to the button if any
    while (this.firstChild) {
      this.button.appendChild(this.firstChild);
    }

    // If empty, set default text
    if (!this.button.textContent?.trim()) {
      this.button.textContent = i18n.t("ui.exportImage");
    }

    // Handle data-i18n attribute
    if (this.hasAttribute("data-i18n")) {
      const i18nKey = this.getAttribute("data-i18n");
      if (i18nKey) {
        this.button.setAttribute("data-i18n", i18nKey);
        this.button.textContent = i18n.t(i18nKey);
        this.removeAttribute("data-i18n");
      }
    } else {
        // If no attribute, default to ui.exportImage
        this.button.setAttribute("data-i18n", "ui.exportImage");
        this.button.textContent = i18n.t("ui.exportImage");
    }

    this.appendChild(this.button);

    this.button.addEventListener("click", this.handleClick.bind(this));
    this.style.display = "contents";
  }

  private async handleClick() {
    if (!appState.currentChart) return;

    try {
      // Determine annotation mode state for rendering
      // We should respect the current state
      const activeTab = document.querySelector("#chart-options-panel .panel-tab.active");
      const mode = activeTab ? activeTab.getAttribute("data-do-tab") : "view";
      const optionsForExport = { ...appState.viewOptions, isAnnotationMode: mode === "annotation" };

      const dataURL = tjaChart.exportImage(optionsForExport);

      // Convert DataURL to Uint8Array
      const base64Data = dataURL.split(",")[1];
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      await shareFile("chart.png", bytes, "image/png", "Save Chart Image");
      this.updateStatus("status.exportImageSuccess");
    } catch (e) {
      console.error("Export image failed:", e);
      this.updateStatus("status.exportImageFailed");
    }
  }

  private updateStatus(key: string, params?: Record<string, string | number>) {
    appState.currentStatusKey = key;
    appState.currentStatusParams = params;
    if (statusDisplay) {
      statusDisplay.innerText = i18n.t(key, params);
    }
  }
}

customElements.define("save-image-button", SaveImageButton);