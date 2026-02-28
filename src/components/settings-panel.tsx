import * as webjsx from "webjsx";
import "./action-button.js";
import { appState } from "../state/app-state.js";
import { shareFile } from "../utils/file-share.js";
import { i18n } from "../utils/i18n.js";
import {
  convertToTaikoRatingAnalyzerFormat,
  type FumenDatabasePlaydata,
  getPlaydataStats,
  type Playdata,
  type PlaydataEntry,
  parseFumenDatabaseHtml,
  type UnmatchedEntry,
  verifyPlaydata,
} from "../utils/playdata-parser.js";
import { PlaydataLeadingMode, PlaydataStripMode, PlaydataTrailingMode } from "../utils/playdata-status.js";
import {
  ChartLanguage,
  clearPlaydata,
  type DefaultViewOptions,
  loadUserProfile,
  saveUserProfile,
} from "../utils/user-profile.js";

export class SettingsPanel extends HTMLElement {
  private isModalOpen = false;
  private modalContainer: HTMLDivElement;

  private showBookmarklet = false;
  private importStatus: { type: "success" | "error" | "none"; message: string } = { type: "none", message: "" };
  private playdata: Playdata | null = null;
  private isImportMode = false;
  private isFromBookmarklet = false;
  private isExporting = false;
  private isImporting = false;
  private manualPasteContent = "";

  // View defaults and auto-annotate settings
  private defaultViewOptions: DefaultViewOptions | null = null;
  private autoAnnotateOnLoad = false;
  private showFullPathInChartList = false;
  private preferredChartLanguage: ChartLanguage = ChartLanguage.Auto;
  private stripMode: PlaydataStripMode = PlaydataStripMode.Crown;
  private leadingMode: PlaydataLeadingMode = PlaydataLeadingMode.None;
  private trailingMode: PlaydataTrailingMode = PlaydataTrailingMode.None;

  private resolutionState: {
    result: {
      matched: PlaydataEntry[];
      unmatched: UnmatchedEntry[];
    };
    playdata: FumenDatabasePlaydata;
  } | null = null;

  constructor() {
    super();
    this.modalContainer = document.createElement("div");
  }

  connectedCallback() {
    this.loadSettings();
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

      // Open modal in import mode (from bookmarklet)
      this.isImportMode = true;
      this.isFromBookmarklet = true;
      this.isModalOpen = true;
      this.renderModal();
    }
  }

  disconnectedCallback() {
    if (this.modalContainer && this.modalContainer.parentNode === document.body) {
      document.body.removeChild(this.modalContainer);
    }
  }

  private loadSettings() {
    const profile = loadUserProfile();
    this.playdata = profile.playdata ?? null;
    this.defaultViewOptions = profile.defaultViewOptions ?? null;
    this.autoAnnotateOnLoad = profile.autoAnnotateOnLoad ?? false;
    this.showFullPathInChartList = profile.showFullPathInChartList ?? false;
    this.preferredChartLanguage = profile.preferredChartLanguage ?? ChartLanguage.Auto;
    this.stripMode = profile.chartListStripMode ?? PlaydataStripMode.Crown;
    this.leadingMode = profile.chartListLeadingMode ?? PlaydataLeadingMode.None;
    this.trailingMode = profile.chartListTrailingMode ?? PlaydataTrailingMode.None;
  }

  private handleOpen() {
    this.loadSettings();
    this.isModalOpen = true;
    this.importStatus = { type: "none", message: "" };
    this.renderModal();
  }

  private handleClose() {
    this.isModalOpen = false;
    this.isImportMode = false;
    this.isFromBookmarklet = false;
    this.resolutionState = null;
    this.renderModal();
  }

  private handleDevModeToggle(e: Event) {
    appState.isTesterMode = (e.target as HTMLInputElement).checked;
    saveUserProfile({ isTesterMode: appState.isTesterMode });
    window.dispatchEvent(new Event("dev-mode-change"));
    this.renderModal();
  }

  private handleFinalizeImport() {
    if (!this.resolutionState) return;

    const { playdata, result } = this.resolutionState;
    const finalEntries: PlaydataEntry[] = [...result.matched];

    const finalPlaydata: Playdata = {
      version: 2,
      entries: finalEntries,
      updatedAt: playdata.updatedAt,
      source: playdata.source,
    };

    saveUserProfile({ playdata: finalPlaydata });
    this.playdata = finalPlaydata;
    this.resolutionState = null;
    this.manualPasteContent = "";

    this.importStatus = {
      type: "success",
      message: i18n.t("ui.playdata.importSuccess", { count: finalPlaydata.entries.length }),
    };
    window.dispatchEvent(new Event("settings-change"));
    this.renderModal();
  }

  private async handleSaveViewDefaults() {
    // Get current view options from appState
    const viewOptions = appState.viewOptions;
    const viewOptionsEl = document.querySelector("view-options") as { statsVisible: boolean } | null;

    const defaults: DefaultViewOptions = {
      zoom: viewOptions.autoZoom ? "auto" : viewOptions.beatsPerLine,
      showNoteStats: viewOptionsEl?.statsVisible ?? true,
    };

    this.defaultViewOptions = defaults;
    saveUserProfile({ defaultViewOptions: defaults });
    // Status handled by button
    this.renderModal();
  }

  private async handleClearViewDefaults() {
    this.defaultViewOptions = null;
    saveUserProfile({ defaultViewOptions: null });
    // Status handled by button
    this.renderModal();
  }

  private handleAutoAnnotateToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.autoAnnotateOnLoad = checked;
    saveUserProfile({ autoAnnotateOnLoad: checked });
    window.dispatchEvent(new CustomEvent("settings-change", { detail: { autoAnnotateOnLoad: checked } }));
    this.renderModal();
  }

  private handleShowFullPathToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.showFullPathInChartList = checked;
    saveUserProfile({ showFullPathInChartList: checked });
    window.dispatchEvent(new CustomEvent("settings-change", { detail: { showFullPathInChartList: checked } }));
    this.renderModal();
  }

  private handleChartLanguageChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as ChartLanguage;
    this.preferredChartLanguage = val;
    saveUserProfile({ preferredChartLanguage: val });
    window.dispatchEvent(new Event("settings-change"));
    this.renderModal();
  }

  private handleStripModeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as PlaydataStripMode;
    this.stripMode = val;
    saveUserProfile({ chartListStripMode: val });
    window.dispatchEvent(new Event("settings-change"));
    this.renderModal();
  }

  private handleLeadingModeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as PlaydataLeadingMode;
    this.leadingMode = val;
    saveUserProfile({ chartListLeadingMode: val });
    window.dispatchEvent(new Event("settings-change"));
    this.renderModal();
  }

  private handleTrailingModeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as PlaydataTrailingMode;
    this.trailingMode = val;
    saveUserProfile({ chartListTrailingMode: val });
    window.dispatchEvent(new Event("settings-change"));
    this.renderModal();
  }

  private async handleCopyBookmarklet() {
    try {
      await navigator.clipboard.writeText(this.getBookmarkletCode());
    } catch (e) {
      console.error(e);
      throw e;
    }
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

  private handleShowBookmarklet() {
    this.showBookmarklet = !this.showBookmarklet;
    this.renderModal();
  }

  private handleGoToImport() {
    this.isImportMode = true;
    this.renderModal();
  }

  private handleSelectBookmarklet(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
  }

  private handleManualPasteInput(e: Event) {
    this.manualPasteContent = (e.target as HTMLTextAreaElement).value;
    const vdom = this.isImportMode ? this.renderImportModeContent() : this.renderSettingsContent();
    const settingsContent = this.modalContainer.querySelector(".settings-content");
    if (settingsContent) {
      webjsx.applyDiff(settingsContent, vdom);
    }
  }

  private async handlePasteEvent(e: ClipboardEvent) {
    // Automatically import when user pastes into textarea
    const text = e.clipboardData?.getData("text");
    if (text && text.length > 100) {
      e.preventDefault();
      this.manualPasteContent = text;
      await this.handleManualImport();
    }
  }

  private isIOS(): boolean {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }

  private async handleManualImport() {
    if (!this.manualPasteContent || this.isImporting) return;
    this.isImporting = true;
    this.renderModal();
    await this.processImport(this.manualPasteContent);
    this.isImporting = false;
  }

  private async processImport(text: string) {
    try {
      if (!text || text.length < 100) {
        this.importStatus = {
          type: "error",
          message: i18n.t("ui.playdata.importFailed"),
        };
        this.renderModal();
        return;
      }

      // Check if it looks like HTML
      if (!text.includes("<html") && !text.includes("<div")) {
        this.importStatus = {
          type: "error",
          message: i18n.t("ui.playdata.importFailed"),
        };
        this.renderModal();
        return;
      }

      // Parse the HTML
      const playdata = parseFumenDatabaseHtml(text);

      if (playdata.entries.length === 0) {
        this.importStatus = {
          type: "error",
          message: i18n.t("ui.playdata.importFailed"),
        };
        this.renderModal();
        return;
      }

      // Fetch song mapping for verification
      try {
        const response = await fetch("./data/song_mapping.json");
        if (response.ok) {
          const songMapping = await response.json();
          const verification = verifyPlaydata(playdata, songMapping);

          if (verification.unmatched.length > 0) {
            this.resolutionState = {
              result: verification,
              playdata,
            };
            this.importStatus = { type: "none", message: "" };
            this.renderModal();
            return;
          }

          const finalPlaydata: Playdata = {
            version: 2,
            entries: verification.matched,
            updatedAt: playdata.updatedAt,
            source: playdata.source,
          };

          // Save to profile
          saveUserProfile({ playdata: finalPlaydata });
          this.playdata = finalPlaydata;
          window.dispatchEvent(new Event("settings-change"));
        } else {
          // If song mapping fails, save the parsed data without songId
          const finalPlaydata: Playdata = {
            version: 2,
            entries: [], // No matched entries
            updatedAt: playdata.updatedAt,
            source: playdata.source,
          };
          saveUserProfile({ playdata: finalPlaydata });
          this.playdata = finalPlaydata;
          window.dispatchEvent(new Event("settings-change"));
        }
      } catch (e) {
        console.warn("Failed to load song mapping for verification, skipping.", e);
        // Save the parsed data without songId
        const finalPlaydata: Playdata = {
          version: 2,
          entries: [], // No matched entries
          updatedAt: playdata.updatedAt,
          source: playdata.source,
        };
        saveUserProfile({ playdata: finalPlaydata });
        this.playdata = finalPlaydata;
        window.dispatchEvent(new Event("settings-change"));
      }

      this.manualPasteContent = ""; // Clear after success

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

  private async handlePasteImport() {
    try {
      const clipboardText = await navigator.clipboard.readText();
      await this.processImport(clipboardText);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      this.importStatus = {
        type: "error",
        message: `${i18n.t("ui.playdata.importFailed")} ${i18n.t("ui.playdata.pasteManualInstruction")}`,
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
    window.dispatchEvent(new Event("settings-change"));
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

  private async handleExportPlaydataJson() {
    if (!this.playdata || this.isExporting) {
      return;
    }

    this.isExporting = true;
    this.importStatus = { type: "none", message: "" };
    this.renderModal();

    try {
      const jsonContent = JSON.stringify(this.playdata, null, 2);
      await shareFile("playdata.json", jsonContent, "application/json", i18n.t("ui.playdata.exportJson"));
      this.importStatus = {
        type: "success",
        message: i18n.t("ui.playdata.exportSuccess", {
          exported: this.playdata.entries.length,
          skipped: 0,
        }),
      };
    } catch (err) {
      console.error("Failed to export playdata JSON:", err);
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
          <div className="settings-content" style="padding: 20px; overflow-y: auto; flex: 1; min-height: 0;">
            {this.isImportMode ? this.renderImportModeContent() : this.renderSettingsContent()}
          </div>
        </div>
      </div>
    );

    webjsx.applyDiff(this.modalContainer, modalVdom);
  }

  private async handleCopyUnmatchedCSV() {
    if (!this.resolutionState) return;
    const { result } = this.resolutionState;

    const csvLines = ["Original Title"];

    // Include all unmatched items, sorted by title
    const allUnmatched = [...result.unmatched].sort((a, b) => a.entry.title.localeCompare(b.entry.title));

    for (const item of allUnmatched) {
      const original = `"${item.entry.title.replace(/"/g, '""')}"`;
      csvLines.push(`${original}`);
    }

    // Simple deduplication
    const uniqueLines = Array.from(new Set(csvLines));

    try {
      await navigator.clipboard.writeText(uniqueLines.join("\n"));
    } catch (e) {
      console.error(e);
      throw e;
    }
  }

  renderResolutionUI() {
    if (!this.resolutionState) return <div />;

    const { result } = this.resolutionState;

    // Group unmatched entries by title
    const groups = new Map<string, UnmatchedEntry[]>();
    for (const item of result.unmatched) {
      const existing = groups.get(item.entry.title) || [];
      existing.push(item);
      groups.set(item.entry.title, existing);
    }

    const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return (
      <div style="padding: 20px;">
        <h3 style="margin-top: 0;">{i18n.t("ui.playdata.unresolvable")}</h3>
        <div style="margin-bottom: 15px; font-size: 14px; color: var(--text-secondary);">
          The following entries could not be imported because their Song ID was not found in the database.
        </div>

        {sortedGroups.length > 0 ? (
          <div style="margin-bottom: 20px;">
            <div style="max-height: 300px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: 4px; background: var(--bg-input);">
              <ul style="margin: 0; padding: 0; list-style: none; font-size: 13px;">
                {sortedGroups.map(([title, groupItems]) => (
                  <li style="padding: 8px 12px; border-bottom: 1px solid var(--border-lighter); color: var(--text-secondary);">
                    {title}
                    {groupItems.length > 1 && (
                      <span style="margin-left: 6px; font-size: 11px; color: var(--text-secondary); background: var(--bg-panel-header); padding: 1px 4px; border-radius: 4px;">
                        x{groupItems.length}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          <div style="margin-bottom: 20px; color: var(--text-secondary);">{i18n.t("ui.playdata.noData")}</div>
        )}

        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
          <div>
            {appState.isTesterMode && (
              <action-button
                button-class="btn-secondary"
                success-label={i18n.t("ui.playdata.copied")}
                error-label={i18n.t("status.exportFailed")}
                action={() => this.handleCopyUnmatchedCSV()}
              >
                {i18n.t("ui.playdata.copyCsv")}
              </action-button>
            )}
          </div>
          <div style="display: flex; gap: 10px;">
            <button type="button" className="btn-secondary" onclick={this.handleClose.bind(this)}>
              {i18n.t("ui.cancel")}
            </button>
            <button type="button" onclick={this.handleFinalizeImport.bind(this)}>
              {i18n.t("ui.playdata.finalizeImport")}
            </button>
          </div>
        </div>
      </div>
    );
  }

  renderImportModeContent() {
    if (this.resolutionState) {
      return this.renderResolutionUI();
    }

    return (
      <div style="text-align: center; padding: 20px;">
        <div style="font-size: 16px; margin-bottom: 20px; color: var(--text-primary);">
          {i18n.t(this.isFromBookmarklet ? "ui.playdata.importReady" : "ui.playdata.pasteHereInstruction")}
        </div>

        <div style="margin-bottom: 15px;">
          <textarea
            placeholder={i18n.t("ui.playdata.pasteInstructions")}
            style="width: 100%; height: 120px; font-size: 14px; padding: 12px; border: 2px dashed var(--border-light); border-radius: 8px; background: var(--bg-panel); color: var(--text-primary); resize: vertical; box-sizing: border-box;"
            oninput={this.handleManualPasteInput.bind(this)}
            onpaste={this.handlePasteEvent.bind(this)}
            value={this.manualPasteContent}
            disabled={this.isImporting}
          />
        </div>

        <div style="display: flex; gap: 10px; justify-content: center; flex-wrap: wrap;">
          {!this.isIOS() && (
            <button
              type="button"
              className="btn-secondary"
              onclick={this.handlePasteImport.bind(this)}
              disabled={this.isImporting}
            >
              {i18n.t("ui.playdata.pasteImport")}
            </button>
          )}
          <button
            type="button"
            onclick={this.handleManualImport.bind(this)}
            disabled={!this.manualPasteContent || this.isImporting}
          >
            {this.isImporting ? i18n.t("ui.playdata.importing") : i18n.t("ui.playdata.import")}
          </button>
        </div>

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
  }

  renderSettingsContent() {
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
          <button type="button" onclick={this.handleExportPlaydata.bind(this)} disabled={this.isExporting}>
            {this.isExporting ? i18n.t("ui.playdata.exporting") : i18n.t("ui.playdata.export")}
          </button>
          <button type="button" onclick={this.handleExportPlaydataJson.bind(this)} disabled={this.isExporting}>
            {this.isExporting ? i18n.t("ui.playdata.exporting") : i18n.t("ui.playdata.exportJson")}
          </button>
          <button type="button" className="btn-secondary" onclick={this.handleClearPlaydata.bind(this)}>
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
          <button type="button" onclick={this.handleShowBookmarklet.bind(this)}>
            {this.showBookmarklet ? i18n.t("ui.playdata.hideBookmarklet") : i18n.t("ui.playdata.showBookmarklet")}
          </button>
          <button type="button" onclick={this.handleGoToImport.bind(this)}>
            {i18n.t("ui.playdata.goToImport")}
          </button>
        </div>

        {this.showBookmarklet && (
          <div style="margin-top: 12px;">
            <div style="font-size: 13px; color: var(--text-secondary); margin-bottom: 6px;">
              {i18n.t("ui.playdata.bookmarkletInstructions")}
            </div>
            <textarea
              readOnly
              value={this.getBookmarkletCode()}
              onclick={this.handleSelectBookmarklet.bind(this)}
              onfocus={this.handleSelectBookmarklet.bind(this)}
              style="width: 100%; height: 80px; font-size: 12px; font-family: monospace; padding: 8px; border: 1px solid var(--border-light); border-radius: 4px; background: var(--bg-panel); color: var(--text-primary); resize: vertical; box-sizing: border-box;"
            />
            <div style="margin-top: 8px;">
              <action-button
                success-label={i18n.t("ui.playdata.copied")}
                error-label={i18n.t("status.exportFailed")}
                action={() => this.handleCopyBookmarklet()}
              >
                {i18n.t("ui.playdata.copyBookmarklet")}
              </action-button>
            </div>
          </div>
        )}

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

    // View Defaults Section
    const zoomText =
      this.defaultViewOptions?.zoom === "auto"
        ? i18n.t("ui.auto")
        : this.defaultViewOptions?.zoom
          ? `${Math.round((16 / this.defaultViewOptions.zoom) * 100)}%`
          : null;

    const viewDefaultsSection = (
      <div>
        <h3 style="margin: 0 0 12px 0; font-size: 16px;">{i18n.t("ui.viewDefaults.title")}</h3>
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">
          {i18n.t("ui.viewDefaults.desc")}
        </div>

        {this.defaultViewOptions ? (
          <div style="margin-bottom: 12px; padding: 12px; background: var(--bg-panel); border-radius: 6px; border: 1px solid var(--border-light); font-size: 14px;">
            <div style="font-weight: 600; margin-bottom: 8px;">{i18n.t("ui.viewDefaults.current")}</div>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <div>
                {i18n.t("ui.viewDefaults.zoom")}: <strong>{zoomText}</strong>
              </div>
              <div>
                {i18n.t("ui.viewDefaults.noteStats")}:{" "}
                <strong>
                  {this.defaultViewOptions.showNoteStats ? i18n.t("ui.viewDefaults.on") : i18n.t("ui.viewDefaults.off")}
                </strong>
              </div>
            </div>
          </div>
        ) : (
          <div style="margin-bottom: 12px; padding: 12px; background: var(--bg-panel); border-radius: 6px; border: 1px solid var(--border-light); color: var(--text-secondary); font-size: 14px;">
            {i18n.t("ui.viewDefaults.none")}
          </div>
        )}

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <action-button
            style="flex: 1;"
            success-label={i18n.t("ui.viewDefaults.saved")}
            error-label={i18n.t("status.exportFailed")}
            action={() => this.handleSaveViewDefaults()}
          >
            {i18n.t("ui.viewDefaults.save")}
          </action-button>
          {this.defaultViewOptions && (
            <action-button
              style="flex: 1;"
              success-label={i18n.t("ui.viewDefaults.cleared")}
              error-label={i18n.t("status.exportFailed")}
              button-class="btn-secondary"
              action={() => this.handleClearViewDefaults()}
            >
              {i18n.t("ui.viewDefaults.clear")}
            </action-button>
          )}
        </div>
      </div>
    );

    // Auto-Annotate Section
    const autoAnnotateSection = (
      <div style="margin-top: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px;">{i18n.t("ui.autoAnnotate.title")}</h3>
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">
          {i18n.t("ui.autoAnnotate.desc")}
        </div>
        <div
          className="about-item"
          style="padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;"
        >
          <label style="display: flex; align-items: center; width: 100%; cursor: pointer;">
            <input
              type="checkbox"
              checked={this.autoAnnotateOnLoad}
              onchange={this.handleAutoAnnotateToggle.bind(this)}
              style="margin-right: 10px;"
            />
            {i18n.t("ui.autoAnnotate.title")}
          </label>
        </div>
      </div>
    );

    // Chart List Display Section
    const chartListSection = (
      <div style="margin-top: 20px;">
        <h3 style="margin: 0 0 12px 0; font-size: 16px;">{i18n.t("ui.chartList.title")}</h3>
        <div style="font-size: 14px; color: var(--text-secondary); margin-bottom: 12px;">
          {i18n.t("ui.chartList.showFullPathDesc")}
        </div>
        <div
          className="about-item"
          style="padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;"
        >
          <label style="display: flex; align-items: center; width: 100%; cursor: pointer;">
            <input
              type="checkbox"
              checked={this.showFullPathInChartList}
              onchange={this.handleShowFullPathToggle.bind(this)}
              style="margin-right: 10px;"
            />
            {i18n.t("ui.chartList.showFullPath")}
          </label>
        </div>
        <div style="margin-top: 12px; padding: 12px; background: var(--bg-panel); border-radius: 6px; border: 1px solid var(--border-light);">
          <label style="display: flex; align-items: center; width: 100%; cursor: pointer;">
            <div style="flex: 1;">{i18n.t("ui.settings.chartLanguage")}</div>
            <select style="padding: 5px; min-width: 120px;" onchange={this.handleChartLanguageChange.bind(this)}>
              <option value={ChartLanguage.Auto} selected={this.preferredChartLanguage === ChartLanguage.Auto}>
                {i18n.t("ui.settings.langAuto")}
              </option>
              <option value={ChartLanguage.En} selected={this.preferredChartLanguage === ChartLanguage.En}>
                {i18n.t("ui.settings.langEn")}
              </option>
              <option value={ChartLanguage.Ja} selected={this.preferredChartLanguage === ChartLanguage.Ja}>
                {i18n.t("ui.settings.langJa")}
              </option>
              <option value={ChartLanguage.Zh} selected={this.preferredChartLanguage === ChartLanguage.Zh}>
                {i18n.t("ui.settings.langZh")}
              </option>
              <option value={ChartLanguage.Ko} selected={this.preferredChartLanguage === ChartLanguage.Ko}>
                {i18n.t("ui.settings.langKo")}
              </option>
            </select>
          </label>
        </div>
        <div style="margin-top: 12px; padding: 12px; background: var(--bg-panel); border-radius: 6px; border: 1px solid var(--border-light);">
          <div style="font-size: 14px; margin-bottom: 8px;">{i18n.t("ui.chartList.playdataDisplay")}</div>
          <div style="display: flex; gap: 8px;">
            <label style="display: flex; flex-direction: column; flex: 1; gap: 4px; font-size: 13px; color: var(--text-secondary);">
              {i18n.t("ui.chartList.stripMode")}
              <select style="padding: 5px; width: 100%;" onchange={this.handleStripModeChange.bind(this)}>
                <option value={PlaydataStripMode.None} selected={this.stripMode === PlaydataStripMode.None}>
                  {i18n.t("ui.chartList.none")}
                </option>
                <option value={PlaydataStripMode.Crown} selected={this.stripMode === PlaydataStripMode.Crown}>
                  {i18n.t("ui.chartList.crown")}
                </option>
                <option value={PlaydataStripMode.DnCategory} selected={this.stripMode === PlaydataStripMode.DnCategory}>
                  {i18n.t("ui.chartList.dnCategory")}
                </option>
              </select>
            </label>
            <label style="display: flex; flex-direction: column; flex: 1; gap: 4px; font-size: 13px; color: var(--text-secondary);">
              {i18n.t("ui.chartList.leadingMode")}
              <select style="padding: 5px; width: 100%;" onchange={this.handleLeadingModeChange.bind(this)}>
                <option value={PlaydataLeadingMode.None} selected={this.leadingMode === PlaydataLeadingMode.None}>
                  {i18n.t("ui.chartList.none")}
                </option>
                <option
                  value={PlaydataLeadingMode.ScoreRank}
                  selected={this.leadingMode === PlaydataLeadingMode.ScoreRank}
                >
                  {i18n.t("ui.chartList.scoreRank")}
                </option>
              </select>
            </label>
            <label style="display: flex; flex-direction: column; flex: 1; gap: 4px; font-size: 13px; color: var(--text-secondary);">
              {i18n.t("ui.chartList.trailingMode")}
              <select style="padding: 5px; width: 100%;" onchange={this.handleTrailingModeChange.bind(this)}>
                <option value={PlaydataTrailingMode.None} selected={this.trailingMode === PlaydataTrailingMode.None}>
                  {i18n.t("ui.chartList.none")}
                </option>
                <option
                  value={PlaydataTrailingMode.Counts}
                  selected={this.trailingMode === PlaydataTrailingMode.Counts}
                >
                  {i18n.t("ui.chartList.counts")}
                </option>
              </select>
            </label>
          </div>
        </div>
      </div>
    );

    return (
      <div style="display: flex; flex-direction: column; gap: 10px;">
        {viewDefaultsSection}
        {autoAnnotateSection}
        {chartListSection}
        {playdataSection}
        {devModeToggle}
      </div>
    );
  }
}

customElements.define("settings-panel", SettingsPanel);
