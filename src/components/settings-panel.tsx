import * as webjsx from "webjsx";
import { appState } from "../state/app-state.js";
import { shareFile } from "../utils/file-share.js";
import { i18n } from "../utils/i18n.js";
import {
  convertToTaikoRatingAnalyzerFormat,
  getPlaydataStats,
  type Playdata,
  parseFumenDatabaseHtml,
} from "../utils/playdata-parser.js";
import { clearPlaydata, loadUserProfile, saveUserProfile } from "../utils/user-profile.js";

export class SettingsPanel extends HTMLElement {
  private isModalOpen = false;
  private modalContainer: HTMLDivElement;
  private copyButtonState: "idle" | "copied" = "idle";
  private importStatus: { type: "success" | "error" | "none"; message: string } = { type: "none", message: "" };
  private playdata: Playdata | null = null;
  private isImportMode = false;
  private isExporting = false;

  constructor() {
    super();
    this.modalContainer = document.createElement("div");
  }

  connectedCallback() {
    this.loadPlaydata();
    this.render();
    document.body.appendChild(this.modalContainer);
    this.renderModal();

    i18n.onLanguageChange(() => {
      this.render();
      this.renderModal();
    });

    // Check for import parameter in URL
    this.checkImportParameter();
  }

  private checkImportParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("import") === "playdata") {
      // Clear the URL parameter without reload
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);

      // Open modal in import mode
      this.isImportMode = true;
      this.isModalOpen = true;
      this.renderModal();
    }
  }

  disconnectedCallback() {
    if (this.modalContainer && this.modalContainer.parentNode === document.body) {
      document.body.removeChild(this.modalContainer);
    }
  }

  private loadPlaydata() {
    const profile = loadUserProfile();
    this.playdata = profile.playdata ?? null;
  }

  private handleOpen() {
    this.loadPlaydata();
    this.isModalOpen = true;
    this.importStatus = { type: "none", message: "" };
    this.renderModal();
  }

  private handleClose() {
    this.isModalOpen = false;
    this.isImportMode = false;
    this.renderModal();
  }

  private handleDevModeToggle(e: Event) {
    appState.isTesterMode = (e.target as HTMLInputElement).checked;
    saveUserProfile({ isTesterMode: appState.isTesterMode });
    window.dispatchEvent(new Event("dev-mode-change"));
    this.renderModal();
  }

  private getBookmarkletCode(): string {
    // Get the app URL (production or current origin for dev)
    const appUrl = window.location.origin + window.location.pathname;

    // Create a bookmarklet that copies the current page HTML to clipboard
    // and opens the app with import parameter
    const bookmarkletScript = `
(function(){
  var html = document.documentElement.outerHTML;
  navigator.clipboard.writeText(html).then(function() {
    window.open('${appUrl}?import=playdata', '_blank');
  }).catch(function(err) {
    alert('Could not copy to clipboard. Please check browser permissions.');
  });
})();
`
      .trim()
      .replace(/\s+/g, " ");

    return `javascript:${encodeURIComponent(bookmarkletScript)}`;
  }

  private async handleCopyBookmarklet() {
    try {
      await navigator.clipboard.writeText(this.getBookmarkletCode());
      this.copyButtonState = "copied";
      this.renderModal();

      setTimeout(() => {
        this.copyButtonState = "idle";
        this.renderModal();
      }, 2000);
    } catch (err) {
      console.error("Failed to copy bookmarklet:", err);
    }
  }

  private async handlePasteImport() {
    try {
      const clipboardText = await navigator.clipboard.readText();

      if (!clipboardText || clipboardText.length < 100) {
        this.importStatus = {
          type: "error",
          message: i18n.t("ui.playdata.importFailed"),
        };
        this.renderModal();
        return;
      }

      // Check if it looks like HTML
      if (!clipboardText.includes("<html") && !clipboardText.includes("<div")) {
        this.importStatus = {
          type: "error",
          message: i18n.t("ui.playdata.importFailed"),
        };
        this.renderModal();
        return;
      }

      // Parse the HTML
      const playdata = parseFumenDatabaseHtml(clipboardText);

      if (playdata.entries.length === 0) {
        this.importStatus = {
          type: "error",
          message: i18n.t("ui.playdata.importFailed"),
        };
        this.renderModal();
        return;
      }

      // Save to profile
      saveUserProfile({ playdata });
      this.playdata = playdata;

      this.importStatus = {
        type: "success",
        message: i18n.t("ui.playdata.importSuccess", { count: playdata.entries.length }),
      };
      this.renderModal();
    } catch (err) {
      console.error("Failed to import playdata:", err);
      this.importStatus = {
        type: "error",
        message: i18n.t("ui.playdata.importFailed"),
      };
      this.renderModal();
    }
  }

  private handleClearPlaydata() {
    clearPlaydata();
    this.playdata = null;
    this.importStatus = {
      type: "success",
      message: i18n.t("ui.playdata.cleared"),
    };
    this.renderModal();
  }

  private async handleExportPlaydata() {
    if (!this.playdata || this.isExporting) {
      return;
    }

    this.isExporting = true;
    this.importStatus = { type: "none", message: "" };
    this.renderModal();

    try {
      const result = await convertToTaikoRatingAnalyzerFormat(this.playdata);
      if (result.exportedCount === 0) {
        this.importStatus = {
          type: "error",
          message: i18n.t("ui.playdata.exportFailed"),
        };
        this.isExporting = false;
        this.renderModal();
        return;
      }

      const jsonContent = JSON.stringify(result.data);
      await shareFile("playdata.json", jsonContent, "application/json", i18n.t("ui.playdata.export"));
      this.importStatus = {
        type: "success",
        message: i18n.t("ui.playdata.exportSuccess", {
          exported: result.exportedCount,
          skipped: result.skippedCount,
        }),
      };
    } catch (err) {
      console.error("Failed to export playdata:", err);
      this.importStatus = {
        type: "error",
        message: i18n.t("ui.playdata.exportFailed"),
      };
    } finally {
      this.isExporting = false;
      this.renderModal();
    }
  }

  render() {
    const vdom = (
      <button
        type="button"
        className="settings-btn"
        onclick={this.handleOpen.bind(this)}
        aria-label={i18n.t("ui.settings")}
        title={i18n.t("ui.settings")}
      >
        <div className="icon-settings" />
      </button>
    );
    webjsx.applyDiff(this, vdom);
  }

  renderModal() {
    const devModeToggle = (
      <div
        className="about-item"
        style="padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;"
      >
        <label style="display: flex; align-items: center; width: 100%; cursor: pointer;">
          <input
            type="checkbox"
            checked={appState.isTesterMode}
            onchange={this.handleDevModeToggle.bind(this)}
            style="margin-right: 10px;"
          />
          {i18n.t("ui.devMode")}
        </label>
      </div>
    );

    const stats = getPlaydataStats(this.playdata);

    const playdataStatsSection = this.playdata ? (
      <div style="margin-top: 12px; padding: 12px; background: var(--bg-panel); border-radius: 6px; border: 1px solid var(--border-light);">
        <div style="font-weight: 600; margin-bottom: 8px;">{i18n.t("ui.playdata.stats")}</div>
        <div style="display: flex; flex-direction: column; gap: 4px; font-size: 14px;">
          <div>
            {i18n.t("ui.playdata.totalSongs")}: <strong>{stats.totalSongs}</strong>
          </div>
          {this.playdata.updatedAt && (
            <div style="color: var(--text-secondary);">
              {i18n.t("ui.playdata.updatedAt")}: {this.playdata.updatedAt}
            </div>
          )}
          <div style="margin-top: 8px;">
            {Object.entries(stats.byDifficulty).map(([diffKey, count]) => (
              <span style="margin-right: 12px; color: var(--text-secondary);">
                {i18n.t(diffKey)}: {count}
              </span>
            ))}
          </div>
        </div>
        <div style="display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap;">
          <button
            type="button"
            onclick={this.handleExportPlaydata.bind(this)}
            disabled={this.isExporting}
            style="font-size: 13px;"
          >
            {this.isExporting ? i18n.t("ui.playdata.exporting") : i18n.t("ui.playdata.export")}
          </button>
          <button
            type="button"
            className="btn-secondary"
            style="font-size: 13px;"
            onclick={this.handleClearPlaydata.bind(this)}
          >
            {i18n.t("ui.playdata.clearData")}
          </button>
        </div>
      </div>
    ) : (
      <div style="margin-top: 12px; padding: 12px; background: var(--bg-panel); border-radius: 6px; border: 1px solid var(--border-light); color: var(--text-secondary);">
        {i18n.t("ui.playdata.noData")}
      </div>
    );

    const playdataSection = (
      <div style="margin-top: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px;">{i18n.t("ui.playdata.title")}</h3>
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">
          {i18n.t("ui.playdata.instructions")}
        </div>
        <ol style="font-size: 14px; margin: 0 0 12px 0; padding-left: 20px; line-height: 1.8;">
          <li>{i18n.t("ui.playdata.step1")}</li>
          <li>{i18n.t("ui.playdata.step2")}</li>
          <li>{i18n.t("ui.playdata.step3")}</li>
          <li>{i18n.t("ui.playdata.step4")}</li>
        </ol>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <button type="button" onclick={this.handleCopyBookmarklet.bind(this)}>
            {this.copyButtonState === "copied" ? i18n.t("ui.playdata.copied") : i18n.t("ui.playdata.copyBookmarklet")}
          </button>
          <button type="button" className="btn-secondary" onclick={this.handlePasteImport.bind(this)}>
            {i18n.t("ui.playdata.pasteImport")}
          </button>
        </div>

        {this.importStatus.type !== "none" && (
          <div
            style={`margin-top: 12px; padding: 10px; border-radius: 4px; font-size: 14px; ${
              this.importStatus.type === "success"
                ? "background: var(--success-bg, #d4edda); color: var(--success-text, #155724);"
                : "background: var(--error-bg, #f8d7da); color: var(--error-text, #721c24);"
            }`}
          >
            {this.importStatus.message}
          </div>
        )}

        {playdataStatsSection}
      </div>
    );

    // Import mode shows a focused dialog for pasting
    const importModeContent = (
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 16px; margin-bottom: 20px; color: var(--text-primary);">
          {i18n.t("ui.playdata.importReady")}
        </div>
        <button type="button" style="font-size: 16px; padding: 12px 24px;" onclick={this.handlePasteImport.bind(this)}>
          {i18n.t("ui.playdata.pasteImport")}
        </button>
        {this.importStatus.type !== "none" && (
          <div
            style={`margin-top: 16px; padding: 10px; border-radius: 4px; font-size: 14px; ${
              this.importStatus.type === "success"
                ? "background: var(--success-bg, #d4edda); color: var(--success-text, #155724);"
                : "background: var(--error-bg, #f8d7da); color: var(--error-text, #721c24);"
            }`}
          >
            {this.importStatus.message}
          </div>
        )}
      </div>
    );

    const modalVdom = (
      <div
        id="settings-modal"
        className={`modal ${this.isModalOpen ? "open" : ""}`}
        onclick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.handleClose();
        }}
      >
        <div className="modal-content" style="max-width: 600px;">
          <div className="modal-header">
            <h2>{this.isImportMode ? i18n.t("ui.playdata.title") : i18n.t("ui.settings")}</h2>
            <button
              type="button"
              className="close-btn"
              onclick={this.handleClose.bind(this)}
              aria-label={i18n.t("ui.close")}
            >
              <div className="modal-close-icon" />
            </button>
          </div>
          <div className="settings-content" style="padding: 20px; max-height: 70vh; overflow-y: auto;">
            {this.isImportMode ? (
              importModeContent
            ) : (
              <div style="display: flex; flex-direction: column; gap: 10px;">
                {devModeToggle}
                {playdataSection}
              </div>
            )}
          </div>
        </div>
      </div>
    );

    webjsx.applyDiff(this.modalContainer, modalVdom);
  }
}

customElements.define("settings-panel", SettingsPanel);
