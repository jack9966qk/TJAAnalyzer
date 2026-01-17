import { refreshChart, updateStatsComponent } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import "./save-image-button.js";

export class JudgementOptions extends HTMLElement {
  private judgementWarning!: HTMLDivElement;
  private judgementControls!: HTMLDivElement;
  private styleRadios!: NodeListOf<HTMLInputElement>;
  private showPerfectCheckbox!: HTMLInputElement;
  private showGoodCheckbox!: HTMLInputElement;
  private showPoorCheckbox!: HTMLInputElement;
  private coloringRadios!: NodeListOf<HTMLInputElement>;

  // Loop Controls
  private loopControlGroup!: HTMLDivElement;
  private loopAutoCheckbox!: HTMLInputElement;
  private loopPrevBtn!: HTMLButtonElement;
  private loopNextBtn!: HTMLButtonElement;
  private loopCounter!: HTMLSpanElement;
  private saveImageContainer!: HTMLDivElement;
  private collapseLoopCheckbox!: HTMLInputElement;

  // State buffer
  private _loopCollapseEnabled: boolean = false;
  private _loopCollapseChecked: boolean = false;

  constructor() {
    super();
    this.style.display = "flex";
    this.style.gap = "20px";
    this.style.alignItems = "flex-start";
    this.style.flexWrap = "wrap";
  }

  connectedCallback() {
    this.loadTemplate().then(() => {
      this.setupEventListeners();
      this.updateTexts();
      // Apply buffered state
      this.applyLoopCollapseState();
      this.refreshStatus(false); // Initial status check

      // Listen for language changes
      i18n.onLanguageChange(() => this.updateTexts());
    });
  }

  private async loadTemplate() {
    if (this.innerHTML.trim()) return;

    const path = "scripts/components/judgement-options.html";

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

    // Initialize elements
    this.judgementWarning = this.querySelector(".description-text") as HTMLDivElement;
    this.judgementControls = this.querySelector("#judgement-subcontrols") as HTMLDivElement;

    this.styleRadios = this.querySelectorAll('input[name="judgementStyle"]');
    this.coloringRadios = this.querySelectorAll('input[name="judgementColoring"]');

    this.showPerfectCheckbox = this.querySelector("#show-perfect") as HTMLInputElement;
    this.showGoodCheckbox = this.querySelector("#show-good") as HTMLInputElement;
    this.showPoorCheckbox = this.querySelector("#show-poor") as HTMLInputElement;

    this.loopControlGroup = this.querySelector("#loop-control-group") as HTMLDivElement;
    this.loopAutoCheckbox = this.querySelector("#loop-auto") as HTMLInputElement;
    this.loopPrevBtn = this.querySelector("#prev-loop-btn") as HTMLButtonElement;
    this.loopNextBtn = this.querySelector("#next-loop-btn") as HTMLButtonElement;
    this.loopCounter = this.querySelector("#loop-counter-display") as HTMLSpanElement;
    this.saveImageContainer = this.querySelector("#save-image-container") as HTMLDivElement;
    this.collapseLoopCheckbox = this.querySelector("#collapse-loop-checkbox") as HTMLInputElement;
  }

  private setupEventListeners() {
    // Style Radios
    this.styleRadios.forEach((r) => {
      r.addEventListener("change", () => {
        this.updateViewMode();
        refreshChart();
      });
    });

    // Coloring Radios
    this.coloringRadios.forEach((r) => {
      r.addEventListener("change", () => {
        const val = (Array.from(this.coloringRadios).find((r) => r.checked) as HTMLInputElement)?.value;
        appState.viewOptions.coloringMode = val === "gradient" ? "gradient" : "categorical";
        refreshChart();
      });
    });

    // Visibility Checkboxes
    const updateVisibility = () => {
      appState.viewOptions.visibility = {
        perfect: this.showPerfectCheckbox.checked,
        good: this.showGoodCheckbox.checked,
        poor: this.showPoorCheckbox.checked,
      };
      refreshChart();
    };
    this.showPerfectCheckbox.addEventListener("change", updateVisibility);
    this.showGoodCheckbox.addEventListener("change", updateVisibility);
    this.showPoorCheckbox.addEventListener("change", updateVisibility);

    // Collapse Loop Checkbox
    this.collapseLoopCheckbox.addEventListener("change", (event) => {
      appState.viewOptions.collapsedLoop = (event.target as HTMLInputElement).checked;
      this.updateLoopControlVisibility();
      refreshChart();
      updateStatsComponent(null);
    });

    // Loop Controls
    this.loopAutoCheckbox.addEventListener("change", () => {
      if (this.loopAutoCheckbox.checked) {
        appState.viewOptions.selectedLoopIteration = undefined;
      } else {
        // Default to 0 if we were auto
        appState.viewOptions.selectedLoopIteration = 0;
      }
      refreshChart();
      this.updateLoopCounter();
    });

    this.loopPrevBtn.addEventListener("click", () => {
      if (appState.viewOptions.selectedLoopIteration !== undefined && appState.viewOptions.selectedLoopIteration > 0) {
        appState.viewOptions.selectedLoopIteration--;
        refreshChart();
        this.updateLoopCounter();
      }
    });

    this.loopNextBtn.addEventListener("click", () => {
      if (
        appState.currentChart?.loop &&
        appState.viewOptions.selectedLoopIteration !== undefined &&
        appState.viewOptions.selectedLoopIteration < appState.currentChart.loop.iterations - 1
      ) {
        appState.viewOptions.selectedLoopIteration++;
        refreshChart();
        this.updateLoopCounter();
      }
    });
  }

  private updateViewMode() {
    const style = (Array.from(this.styleRadios).find((r) => r.checked) as HTMLInputElement)?.value;
    if (style === "underline") {
      appState.viewOptions.viewMode = "judgements-underline";
    } else if (style === "text") {
      appState.viewOptions.viewMode = "judgements-text";
    } else {
      appState.viewOptions.viewMode = "judgements";
    }
  }

  public refreshStatus(updateMode = true) {
    const isStreamActive = appState.isStreamConnected || appState.isSimulating;

    // Ensure view mode is synced with current radio selection
    if (updateMode) this.updateViewMode();

    // Warning / Controls State
    if (this.judgementWarning) this.judgementWarning.style.display = isStreamActive ? "none" : "block";

    if (this.judgementControls) {
      if (isStreamActive) {
        this.judgementControls.classList.remove("disabled");
        this.judgementControls.style.opacity = "1";
        this.judgementControls.style.pointerEvents = "auto";
      } else {
        this.judgementControls.classList.add("disabled");
        this.judgementControls.style.opacity = "0.5";
        this.judgementControls.style.pointerEvents = "none";
      }
    }

    if (this.saveImageContainer) {
      if (isStreamActive) {
        this.saveImageContainer.style.opacity = "1";
        this.saveImageContainer.style.pointerEvents = "auto";
      } else {
        this.saveImageContainer.style.opacity = "0.5";
        this.saveImageContainer.style.pointerEvents = "none";
      }
    }

    this.updateLoopControlVisibility();
    this.updateLoopCounter();
  }

  public updateLoopControlVisibility() {
    const isLoopCollapsed = appState.viewOptions.collapsedLoop;
    if (this.loopControlGroup) {
      this.loopControlGroup.style.display = isLoopCollapsed ? "flex" : "none";
    }
  }

  public updateLoopCounter() {
    if (!this.loopCounter) return;

    const hasLoop = !!appState.currentChart?.loop;

    // Update UI state based on model
    if (appState.viewOptions.selectedLoopIteration === undefined) {
      this.loopAutoCheckbox.checked = true;
      this.loopPrevBtn.disabled = true;
      this.loopNextBtn.disabled = true;

      if (!hasLoop) {
        this.loopCounter.innerText = "1 / 1";
      } else {
        let displayedIter = 0;
        // biome-ignore lint/style/noNonNullAssertion: Guaranteed by context
        const loop = appState.currentChart!.loop!; // We know hasLoop is true

        if (
          (appState.viewOptions.viewMode === "judgements" ||
            appState.viewOptions.viewMode === "judgements-underline" ||
            appState.viewOptions.viewMode === "judgements-text") &&
          appState.judgements.length > 0
        ) {
          let notesPerLoop = 0;
          let preLoopNotes = 0;
          // Basic calculation matching chart-controller
          for (let i = 0; i < loop.startBarIndex; i++) {
            const bar = appState.currentChart?.bars[i];
            if (bar) for (const c of bar) if (["1", "2", "3", "4"].includes(c)) preLoopNotes++;
          }
          for (let k = 0; k < loop.period; k++) {
            const bar = appState.currentChart?.bars[loop.startBarIndex + k];
            if (bar) for (const c of bar) if (["1", "2", "3", "4"].includes(c)) notesPerLoop++;
          }

          const lastJudgedIndex = appState.judgements.length - 1;
          if (lastJudgedIndex >= preLoopNotes && notesPerLoop > 0) {
            const relativeIndex = lastJudgedIndex - preLoopNotes;
            displayedIter = Math.floor(relativeIndex / notesPerLoop);
          }

          if (displayedIter < 0) displayedIter = 0;
          if (displayedIter >= loop.iterations) displayedIter = loop.iterations - 1;
        }

        this.loopCounter.innerText = `${displayedIter + 1} / ${loop.iterations}`;
      }
    } else {
      this.loopAutoCheckbox.checked = false;
      const current = appState.viewOptions.selectedLoopIteration;
      const total = appState.currentChart?.loop?.iterations || 1;

      this.loopPrevBtn.disabled = current <= 0;
      this.loopNextBtn.disabled = current >= total - 1;

      this.loopCounter.innerText = `${current + 1} / ${total}`;
    }
  }

  public setLoopCollapseState(enabled: boolean, checked: boolean) {
    this._loopCollapseEnabled = enabled;
    this._loopCollapseChecked = checked;
    this.applyLoopCollapseState();
  }

  private applyLoopCollapseState() {
    if (!this.collapseLoopCheckbox) return;

    const enabled = this._loopCollapseEnabled;
    const checked = this._loopCollapseChecked;

    this.collapseLoopCheckbox.disabled = !enabled;
    this.collapseLoopCheckbox.checked = checked;

    const parent = this.collapseLoopCheckbox.parentElement;
    const container = parent?.parentElement;

    if (parent) {
      if (!enabled) parent.classList.add("disabled-text");
      else parent.classList.remove("disabled-text");
    }

    if (container) {
      container.style.display = enabled ? "block" : "none";
    }

    this.updateLoopControlVisibility();
  }

  private updateTexts() {
    this.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) {
        if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return;
        if (el.tagName === "SAVE-IMAGE-BUTTON") return;
        el.innerHTML = i18n.t(key);
      }
    });
  }
}

customElements.define("judgement-options", JudgementOptions);
