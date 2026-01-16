import { refreshChart } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { noteStatsDisplay } from "../view/ui-elements.js";
import "./save-image-button.js";
export class ViewOptions extends HTMLElement {
    zoomOutBtn;
    zoomResetBtn;
    zoomInBtn;
    showStatsCheckbox;
    isRendered = false;
    get statsVisible() {
        return this.showStatsCheckbox ? this.showStatsCheckbox.checked : false;
    }
    setShowStats(visible) {
        if (this.showStatsCheckbox) {
            this.showStatsCheckbox.checked = visible;
            this.handleStatsChange();
        }
    }
    connectedCallback() {
        if (!this.isRendered) {
            this.render();
            this.isRendered = true;
        }
        this.updateZoomDisplay();
        this.updateTexts();
        // Listen for language changes
        i18n.onLanguageChange(() => this.updateTexts());
    }
    render() {
        this.style.display = "flex";
        this.style.gap = "20px";
        this.style.alignItems = "flex-start";
        this.style.flexWrap = "wrap";
        this.className = "panel-pane"; // Inherit panel-pane styles if any
        this.innerHTML = `
        <!-- Zoom Section -->
        <div class="option-section">
            <div class="section-main">
                <span class="sub-label" style="min-width: auto; margin-right: 10px;" data-i18n="ui.zoom">Zoom:</span>
                <div class="zoom-controls" style="display: flex; align-items: center; gap: 5px;">
                    <button id="zoom-out-btn" class="tiny-btn">-</button>
                    <button id="zoom-reset-btn" class="tiny-btn" style="font-family: 'Consolas', monospace; min-width: 50px;">100%</button>
                    <button id="zoom-in-btn" class="tiny-btn">+</button>
                </div>
            </div>
        </div>

        <!-- Stats Section -->
        <div class="option-section border-left">
            <div class="section-main">
                <label><input type="checkbox" id="show-stats-checkbox" checked> <span data-i18n="ui.showStats">Show Note Stats</span></label>
            </div>
        </div>

        <!-- Export Image Section -->
        <div class="option-section border-left">
            <div class="section-main">
                <save-image-button id="export-image-btn" data-i18n="ui.exportImage">Save Image</save-image-button>
            </div>
        </div>
    `;
        this.zoomOutBtn = this.querySelector("#zoom-out-btn");
        this.zoomResetBtn = this.querySelector("#zoom-reset-btn");
        this.zoomInBtn = this.querySelector("#zoom-in-btn");
        this.showStatsCheckbox = this.querySelector("#show-stats-checkbox");
        this.setupEventListeners();
    }
    initializeFromLayout() {
        // Default stats to off in vertical layout
        if (!document.body.classList.contains("horizontal-layout")) {
            this.showStatsCheckbox.checked = false;
            this.handleStatsChange();
        }
        else {
            // Ensure UI matches state if re-connected (e.g. if kept in DOM or re-appended)
            if (noteStatsDisplay) {
                this.showStatsCheckbox.checked = noteStatsDisplay.style.display !== "none";
            }
        }
    }
    setupEventListeners() {
        this.zoomOutBtn.addEventListener("click", () => {
            // Increase beats per line (Zoom Out)
            if (appState.viewOptions.beatsPerLine < 32) {
                appState.viewOptions.beatsPerLine += 2;
                this.updateZoomDisplay();
                refreshChart();
            }
        });
        this.zoomInBtn.addEventListener("click", () => {
            // Decrease beats per line (Zoom In)
            if (appState.viewOptions.beatsPerLine > 4) {
                appState.viewOptions.beatsPerLine -= 2;
                this.updateZoomDisplay();
                refreshChart();
            }
        });
        this.zoomResetBtn.addEventListener("click", () => {
            if (appState.viewOptions.beatsPerLine !== 16) {
                appState.viewOptions.beatsPerLine = 16;
                this.updateZoomDisplay();
                refreshChart();
            }
        });
        this.showStatsCheckbox.addEventListener("change", () => this.handleStatsChange());
    }
    handleStatsChange() {
        if (noteStatsDisplay) {
            noteStatsDisplay.style.display = this.showStatsCheckbox.checked ? "" : "none";
        }
        // Clear hover effect if hidden
        if (!this.showStatsCheckbox.checked) {
            if (appState.viewOptions.hoveredNote) {
                appState.viewOptions.hoveredNote = null;
                refreshChart();
            }
        }
    }
    updateZoomDisplay() {
        const percent = Math.round((16 / appState.viewOptions.beatsPerLine) * 100);
        this.zoomResetBtn.innerText = `${percent}%`;
    }
    updateTexts() {
        this.querySelectorAll("[data-i18n]").forEach((el) => {
            const key = el.getAttribute("data-i18n");
            if (key) {
                if (el.tagName === "INPUT" && el.placeholder) {
                    // Handle placeholder if needed
                }
                else if (el.tagName === "SAVE-IMAGE-BUTTON") {
                    // Handled by component itself
                }
                else {
                    // Avoid overwriting children if it's a wrapper, but here structure is simple
                    // Specifically for the label span
                    if (el.tagName === "SPAN") {
                        el.textContent = i18n.t(key);
                    }
                    else if (el.tagName === "DIV" && el.classList.contains("sub-label")) {
                        // Actually the label is a span in my HTML above
                    }
                }
            }
        });
        // Explicitly handle zoom label
        const zoomLabel = this.querySelector('[data-i18n="ui.zoom"]');
        if (zoomLabel)
            zoomLabel.textContent = i18n.t("ui.zoom");
        // Explicitly handle stats label
        const statsLabel = this.querySelector('[data-i18n="ui.showStats"]');
        if (statsLabel)
            statsLabel.textContent = i18n.t("ui.showStats");
    }
}
customElements.define("view-options", ViewOptions);
