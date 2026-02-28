import * as webjsx from "webjsx";
import "./action-button.js";
import { appState } from "../state/app-state.js";
import { shareFile } from "../utils/file-share.js";
import { i18n } from "../utils/i18n.js";
import { tjaChart } from "../view/ui-elements.js";

// biome-ignore lint/complexity/noBannedTypes: Placeholder for future props
export type SaveImageButtonProps = {};

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
    if (!appState.currentChart) throw new Error("No chart loaded");

    const activeTab = document.querySelector("#chart-options-panel .panel-tab.active");
    const mode = activeTab ? activeTab.getAttribute("data-do-tab") : "view";
    const optionsForExport = { ...appState.viewOptions, isAnnotationMode: mode === "annotation" };
    if (appState.displayOnlySelected) {
      optionsForExport.selection = null;
    }

    const dataURL = tjaChart.exportImage(optionsForExport);

    const base64Data = dataURL.split(",")[1];
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    await shareFile("chart.png", bytes, "image/png", "Save Chart Image");
  }

  render() {
    const vdom = (
      <action-button
        button-class="control-btn"
        success-label={i18n.t("status.exportImageSuccess")}
        error-label={i18n.t("status.exportImageFailed")}
        action={() => this.handleClick()}
      >
        <slot>{i18n.t("ui.exportImage")}</slot>
      </action-button>
    );

    // Set host display style
    this.style.display = "contents";

    if (this.shadowRoot) {
      webjsx.applyDiff(this.shadowRoot, vdom);
    }
  }
}

customElements.define("save-image-button", SaveImageButton);
