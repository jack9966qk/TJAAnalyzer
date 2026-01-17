import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { tjaChart } from "../view/ui-elements.js";
import "./save-image-button.js";

export class AnnotateOptions extends HTMLElement {
  private autoAnnotateBtn!: HTMLButtonElement;
  private clearAnnotationsBtn!: HTMLButtonElement;

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.setupEventListeners();
      this.updateTexts();

      // Listen for language changes
      i18n.onLanguageChange(() => this.updateTexts());
    });
  }

  private async loadTemplate() {
    if (this.innerHTML.trim()) return;

    const path = "scripts/components/annotate-options.html";

    try {
      const response = await fetch(path);
      if (response.ok) {
        this.innerHTML = await response.text();
      } else {
        console.error(`Error loading template from ${path}: ${response.status} ${response.statusText}`);
        this.innerText = "Error loading template.";
        return;
      }
    } catch (e) {
      console.error(`Error fetching ${path}:`, e);
      this.innerText = "Error loading template.";
      return;
    }

    this.autoAnnotateBtn = this.querySelector("#auto-annotate-btn") as HTMLButtonElement;
    this.clearAnnotationsBtn = this.querySelector("#clear-annotations-btn") as HTMLButtonElement;
  }

  private setupEventListeners() {
    this.autoAnnotateBtn.addEventListener("click", () => {
      if (tjaChart) {
        tjaChart.autoAnnotate();
      }
    });

    this.clearAnnotationsBtn.addEventListener("click", () => {
      appState.annotations = {};
      refreshChart();
    });
  }

  private updateTexts() {
    this.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) {
        // Skip save-image-button as it handles its own translation
        if (el.tagName === "SAVE-IMAGE-BUTTON") return;
        el.textContent = i18n.t(key);
      }
    });
  }
}

customElements.define("annotate-options", AnnotateOptions);
