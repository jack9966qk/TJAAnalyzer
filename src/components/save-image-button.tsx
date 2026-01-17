import * as webjsx from "webjsx";
import { appState } from "../state/app-state.js";
import { shareFile } from "../utils/file-share.js";
import { i18n } from "../utils/i18n.js";
import { statusDisplay, tjaChart } from "../view/ui-elements.js";

export class SaveImageButton extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    i18n.onLanguageChange(() => this.render());
  }

  private async handleClick() {
    if (!appState.currentChart) return;

    try {
      const activeTab = document.querySelector("#chart-options-panel .panel-tab.active");
      const mode = activeTab ? activeTab.getAttribute("data-do-tab") : "view";
      const optionsForExport = { ...appState.viewOptions, isAnnotationMode: mode === "annotation" };

      const dataURL = tjaChart.exportImage(optionsForExport);

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

  render() {
    // We use a link to style.css to inherit global styles for the button
    const vdom = (
      <div>
        <link rel="stylesheet" href="style.css" />
        <button className="control-btn" onclick={this.handleClick.bind(this)}>
          <slot>{i18n.t("ui.exportImage")}</slot>
        </button>
      </div>
    );
    
    // Set host display style
    this.style.display = "contents";

    webjsx.applyDiff(this.shadowRoot!, vdom);
  }
}

customElements.define("save-image-button", SaveImageButton);
