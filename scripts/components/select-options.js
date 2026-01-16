import { refreshChart } from "../controllers/chart-controller.js";
import { generateTJAFromSelection } from "../core/tja-exporter.js";
import { appState } from "../state/app-state.js";
import { shareFile } from "../utils/file-share.js";
import { i18n } from "../utils/i18n.js";
import { difficultySelector } from "../view/ui-elements.js";
export class SelectOptions extends HTMLElement {
    clearSelectionBtn;
    exportSelectionBtn;
    exportChartNameInput;
    exportLoopCountInput;
    exportGapCountInput;
    connectedCallback() {
        this.loadTemplate().then(() => {
            this.setupEventListeners();
            this.updateTexts();
            this.refreshStatus();
            // Listen for language changes
            i18n.onLanguageChange(() => this.updateTexts());
        });
    }
    async loadTemplate() {
        if (this.innerHTML.trim())
            return;
        // We can embed the HTML or fetch it. Given I created the file, let's fetch it or embed it if the file system allows.
        // JudgementOptions fetches it.
        const path = "scripts/components/select-options.html";
        try {
            const response = await fetch(path);
            if (response.ok) {
                this.innerHTML = await response.text();
            }
            else {
                console.error(`Error loading template from ${path}: ${response.status} ${response.statusText}`);
                this.innerText = "Error loading template.";
                return;
            }
        }
        catch (e) {
            console.error(`Error fetching ${path}:`, e);
            this.innerText = "Error loading template.";
            return;
        }
        this.clearSelectionBtn = this.querySelector("#clear-selection-btn");
        this.exportSelectionBtn = this.querySelector("#export-selection-btn");
        this.exportChartNameInput = this.querySelector("#export-chart-name");
        this.exportLoopCountInput = this.querySelector("#export-loop-count");
        this.exportGapCountInput = this.querySelector("#export-gap-count");
    }
    setupEventListeners() {
        this.clearSelectionBtn.addEventListener("click", () => {
            appState.viewOptions.selection = null;
            appState.selectedNoteHitInfo = null;
            refreshChart();
            this.refreshStatus();
        });
        this.exportSelectionBtn.addEventListener("click", async () => {
            if (!appState.currentChart || !appState.viewOptions.selection) {
                return;
            }
            const loopCount = this.exportLoopCountInput ? parseInt(this.exportLoopCountInput.value, 10) : 10;
            const gapCount = this.exportGapCountInput ? parseInt(this.exportGapCountInput.value, 10) : 1;
            const chartName = this.exportChartNameInput?.value ? this.exportChartNameInput.value : "Exported Selection";
            try {
                const tjaContent = generateTJAFromSelection(appState.currentChart, appState.viewOptions.selection, difficultySelector.value, loopCount, chartName, gapCount);
                await shareFile(`${chartName}.tja`, tjaContent, "text/plain", "Export TJA");
                // We need to update status, but statusDisplay is in ui-elements and main controller.
                // We can dispatch an event or use a global status function if available.
                // appState doesn't have status function.
                // For now, let's dispatch a custom event that main.ts can listen to, or just alert?
                // main.ts has updateStatus.
                // I will dispatch an event 'status-update'
                this.dispatchEvent(new CustomEvent("status-update", { detail: { key: "status.exportSuccess" }, bubbles: true }));
            }
            catch (e) {
                console.error("Export failed:", e);
                this.dispatchEvent(new CustomEvent("status-update", { detail: { key: "status.exportFailed" }, bubbles: true }));
            }
        });
    }
    refreshStatus() {
        const hasSelection = !!appState.viewOptions.selection;
        if (this.clearSelectionBtn)
            this.clearSelectionBtn.disabled = !hasSelection;
        if (this.exportSelectionBtn)
            this.exportSelectionBtn.disabled = !hasSelection;
    }
    updateTexts() {
        this.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            if (key) {
                if (el.tagName === "INPUT")
                    return;
                el.textContent = i18n.t(key);
            }
        });
        this.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
            const key = el.getAttribute("data-i18n-placeholder");
            if (key) {
                el.placeholder = i18n.t(key);
            }
        });
    }
}
customElements.define("select-options", SelectOptions);
