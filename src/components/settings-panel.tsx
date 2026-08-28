import * as webjsx from "webjsx";
import "./action-button.js";
import { appState } from "../state/app-state.js";
import { shareFile } from "../utils/file-share.js";
import { i18n } from "../utils/i18n.js";
import { type ImportResult, processImport, type UnmatchedInfo } from "../utils/playdata-import.js";
import { PlaydataLeadingMode, PlaydataStripMode, PlaydataTrailingMode } from "../utils/playdata-status.js";
import { convertToTaikoRatingAnalyzerFormat, getPlaydataStats, type Playdata } from "../utils/playdata-types.js";
import { startupLog } from "../utils/startup-log.js";
import {
  ChartLanguage,
  clearPlaydata,
  type DefaultViewOptions,
  loadUserProfile,
  saveUserProfile,
} from "../utils/user-profile.js";
import "./modal-page.js";

export class SettingsPanel extends HTMLElement {
  private isModalOpen = false;
  private modalContainer: HTMLDivElement;

  private showBookmarklet = false;
  private importStatus: { type: "success" | "error" | "none"; message: string } = { type: "none", message: "" };
  private playdata: Playdata | null = null;
  private isImportMode = false;
  private isFromBookmarklet = false;
  private isListeningForMessage = false;
  private messageHandler: ((e: MessageEvent) => void) | null = null;
  private messageTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private isExporting = false;
  private isImporting = false;
  private manualPasteContent = "";
  private importedHtml = "";
  private importCopyStatus: "idle" | "success" | "error" = "idle";

  private showDebugLog = false;

  // View defaults and auto-annotate settings
  private defaultViewOptions: DefaultViewOptions | null = null;
  private autoAnnotateOnLoad = false;
  private showFullPathInChartList = false;
  private preferredChartLanguage: ChartLanguage = ChartLanguage.Auto;
  private stripMode: PlaydataStripMode = PlaydataStripMode.Crown;
  private leadingMode: PlaydataLeadingMode = PlaydataLeadingMode.None;
  private trailingMode: PlaydataTrailingMode = PlaydataTrailingMode.None;

  private resolutionState: { unmatched: UnmatchedInfo[]; totalCount: number } | null = null;

  constructor() {
    super();
    this.modalContainer = document.createElement("div");
  }

  connectedCallback() {
    this.loadSettings();
    this.render();
    document.body.appendChild(this.modalContainer);

    i18n.onLanguageChange(() => {
      this.render();
    });

    // Check for import parameter in URL
    this.checkImportParameter();
  }

  private checkImportParameter() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("import") !== "playdata") return;

    // Clear the URL parameter without reload
    const newUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, newUrl);

    this.isImportMode = true;
    this.isModalOpen = true;

    if (window.opener) {
      // Opened by the bookmarklet — set up postMessage channel so the app
      // can receive the raw HTML and parse it with existing parser code.
      this.isListeningForMessage = true;
      this.render();
      this.setupOpenerMessageListener();
    } else {
      // No opener (e.g. PWA or desktop): fall back to manual clipboard paste.
      this.isFromBookmarklet = true;
      this.render();
    }
  }

  private setupOpenerMessageListener() {
    // Signal to the bookmarklet page that we are ready to receive the HTML.
    // Use '*' as target origin because we don't know which site the bookmarklet ran on.
    window.opener.postMessage({ type: "tja-importer-ready" }, "*");

    const handler = async (e: MessageEvent) => {
      // Only accept the response from the window that opened us.
      if (e.source !== window.opener || e.data?.type !== "tja-playdata-html" || typeof e.data.html !== "string") return;
      this.cleanupMessageListener();
      this.isListeningForMessage = false;
      this.isImporting = true;
      this.render();
      const html = e.data.html;
      this.handleImportResult(await processImport(html), html);
      this.isImporting = false;
    };

    // Timeout: if no message arrives within 30 s, fall back to manual paste UI.
    this.messageTimeoutId = setTimeout(() => {
      this.cleanupMessageListener();
      this.isListeningForMessage = false;
      this.isFromBookmarklet = true;
      this.render();
    }, 30000);

    this.messageHandler = handler;
    window.addEventListener("message", handler);
  }

  private cleanupMessageListener() {
    if (this.messageHandler) {
      window.removeEventListener("message", this.messageHandler);
      this.messageHandler = null;
    }
    if (this.messageTimeoutId !== null) {
      clearTimeout(this.messageTimeoutId);
      this.messageTimeoutId = null;
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
    this.importedHtml = "";
    this.importCopyStatus = "idle";
    this.render();
  }

  private handleClose() {
    this.cleanupMessageListener();
    this.isModalOpen = false;
    this.isImportMode = false;
    this.isFromBookmarklet = false;
    this.isListeningForMessage = false;
    this.resolutionState = null;
    this.importedHtml = "";
    this.importCopyStatus = "idle";
    this.render();
  }

  private handleDevModeToggle(e: Event) {
    appState.isTesterMode = (e.target as HTMLInputElement).checked;
    saveUserProfile({ isTesterMode: appState.isTesterMode });
    window.dispatchEvent(new Event("dev-mode-change"));
    this.render();
  }

  private async handleSaveViewDefaults() {
    // Get current view options from appState
    const renderOptions = appState.renderOptions;
    const viewOptionsEl = document.querySelector("view-options") as { statsVisible: boolean } | null;

    const defaults: DefaultViewOptions = {
      zoom: renderOptions.autoZoom ? "auto" : renderOptions.beatsPerLine,
      showNoteStats: viewOptionsEl?.statsVisible ?? true,
    };

    this.defaultViewOptions = defaults;
    saveUserProfile({ defaultViewOptions: defaults });
    // Status handled by button
    this.render();
  }

  private async handleClearViewDefaults() {
    this.defaultViewOptions = null;
    saveUserProfile({ defaultViewOptions: null });
    // Status handled by button
    this.render();
  }

  private handleAutoAnnotateToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.autoAnnotateOnLoad = checked;
    saveUserProfile({ autoAnnotateOnLoad: checked });
    window.dispatchEvent(new CustomEvent("settings-change", { detail: { autoAnnotateOnLoad: checked } }));
    this.render();
  }

  private handleShowFullPathToggle(e: Event) {
    const checked = (e.target as HTMLInputElement).checked;
    this.showFullPathInChartList = checked;
    saveUserProfile({ showFullPathInChartList: checked });
    window.dispatchEvent(new CustomEvent("settings-change", { detail: { showFullPathInChartList: checked } }));
    this.render();
  }

  private handleChartLanguageChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as ChartLanguage;
    this.preferredChartLanguage = val;
    saveUserProfile({ preferredChartLanguage: val });
    window.dispatchEvent(new Event("settings-change"));
    this.render();
  }

  private handleStripModeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as PlaydataStripMode;
    this.stripMode = val;
    saveUserProfile({ chartListStripMode: val });
    window.dispatchEvent(new Event("settings-change"));
    this.render();
  }

  private handleLeadingModeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as PlaydataLeadingMode;
    this.leadingMode = val;
    saveUserProfile({ chartListLeadingMode: val });
    window.dispatchEvent(new Event("settings-change"));
    this.render();
  }

  private handleTrailingModeChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value as PlaydataTrailingMode;
    this.trailingMode = val;
    saveUserProfile({ chartListTrailingMode: val });
    window.dispatchEvent(new Event("settings-change"));
    this.render();
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

    // The bookmarklet:
    // 1. Opens the app window as the very first statement, synchronously inside the user
    //    gesture. Popup blockers reject window.open once it is deferred to a timer, and
    //    opening before the copy lets the browser start switching tabs while the copy runs.
    // 2. Copies the raw HTML in the same task, while the user gesture is still active,
    //    as the fallback for PWA and desktop users who never receive the postMessage.
    // 3. Listens for a 'tja-importer-ready' signal from the app, then sends the HTML
    //    via postMessage so the app can parse it with its own parser code.
    const bookmarkletScript = `
(function(){
  var appWin = window.open('${appUrl}?import=playdata', '_blank');
  var html = document.documentElement.outerHTML;
  var textarea = document.createElement('textarea');
  textarea.value = html;
  textarea.setAttribute('readonly', '');
  textarea.style.cssText = 'position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;font-size:16px';
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, html.length);
  try { document.execCommand('copy'); } catch (e) {}
  textarea.remove();
  if (!appWin) return;
  var done = false;
  window.addEventListener('message', function handler(e) {
    if (done || e.source !== appWin || !e.data || e.data.type !== 'tja-importer-ready') return;
    done = true;
    window.removeEventListener('message', handler);
    appWin.postMessage({type:'tja-playdata-html',html:html}, e.origin);
  });
})();
`
      .trim()
      .replace(/\s+/g, " ");

    return `javascript:${encodeURIComponent(bookmarkletScript)}`;
  }

  private handleShowBookmarklet() {
    this.showBookmarklet = !this.showBookmarklet;
    this.render();
  }

  private handleGoToImport() {
    this.isImportMode = true;
    this.render();
  }

  private handleSelectBookmarklet(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
  }

  private handleManualPasteInput(e: Event) {
    this.manualPasteContent = (e.target as HTMLTextAreaElement).value;
    this.render();
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

  private handleImportResult(result: ImportResult, html: string) {
    if (result.type === "invalid") {
      this.importedHtml = "";
      this.importCopyStatus = "idle";
      this.importStatus = { type: "error", message: i18n.t("ui.playdata.importFailed") };
      this.render();
      return;
    }

    // Always save immediately
    saveUserProfile({ playdata: result.playdata });
    this.playdata = result.playdata;
    this.manualPasteContent = "";
    this.importedHtml = html;
    this.importCopyStatus = "idle";
    window.dispatchEvent(new Event("settings-change"));

    if (result.unmatched.length > 0) {
      this.resolutionState = { unmatched: result.unmatched, totalCount: result.playdata.entries.length };
      this.render();
      return;
    }

    this.importStatus = {
      type: "success",
      message: i18n.t("ui.playdata.importSuccess", { count: result.playdata.entries.length }),
    };
    this.render();
  }

  private copyTextWithExecCommand(text: string): boolean {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.readOnly = true;
    textarea.style.position = "fixed";
    textarea.style.left = "0";
    textarea.style.top = "0";
    textarea.style.width = "1px";
    textarea.style.height = "1px";
    textarea.style.opacity = "0";
    textarea.style.fontSize = "16px";
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);

    try {
      return document.execCommand("copy");
    } catch (err) {
      console.error("Failed to copy imported HTML with execCommand:", err);
      return false;
    } finally {
      textarea.remove();
    }
  }

  private async handleCopyImportedHtml() {
    if (!this.importedHtml) return;

    try {
      const copiedSynchronously = this.isIOS() && this.copyTextWithExecCommand(this.importedHtml);
      if (!copiedSynchronously) {
        await navigator.clipboard.writeText(this.importedHtml);
      }
      this.importCopyStatus = "success";
    } catch (err) {
      console.error("Failed to copy imported HTML:", err);
      this.importCopyStatus = "error";
    }
    this.render();
  }

  private renderCopyImportedHtmlButton() {
    if (!this.importedHtml || this.isStandaloneOrDesktop()) return null;

    const label =
      this.importCopyStatus === "success"
        ? i18n.t("ui.playdata.copied")
        : this.importCopyStatus === "error"
          ? i18n.t("ui.playdata.copyResultFailed")
          : i18n.t("ui.playdata.copyResult");

    return (
      <action-button
        id="copy-imported-playdata-btn"
        button-variant="secondary"
        action={() => this.handleCopyImportedHtml()}
      >
        {label}
      </action-button>
    );
  }

  private async handleManualImport() {
    if (!this.manualPasteContent || this.isImporting) return;
    const html = this.manualPasteContent;
    this.isImporting = true;
    this.render();
    this.handleImportResult(await processImport(html), html);
    this.isImporting = false;
  }

  private async handlePasteImport() {
    try {
      const clipboardText = await navigator.clipboard.readText();
      this.handleImportResult(await processImport(clipboardText), clipboardText);
    } catch (err) {
      console.error("Failed to read clipboard:", err);
      this.importStatus = {
        type: "error",
        message: `${i18n.t("ui.playdata.importFailed")} ${i18n.t("ui.playdata.pasteManualInstruction")}`,
      };
      this.render();
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
    this.render();
  }

  private async handleExportPlaydata() {
    if (!this.playdata || this.isExporting) {
      return;
    }

    this.isExporting = true;
    this.importStatus = { type: "none", message: "" };
    this.render();

    try {
      const result = await convertToTaikoRatingAnalyzerFormat(this.playdata);
      if (result.exportedCount === 0) {
        this.importStatus = {
          type: "error",
          message: i18n.t("ui.playdata.exportFailed"),
        };
        this.isExporting = false;
        this.render();
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
      this.render();
    }
  }

  private async handleExportPlaydataJson() {
    if (!this.playdata || this.isExporting) {
      return;
    }

    this.isExporting = true;
    this.importStatus = { type: "none", message: "" };
    this.render();

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
      this.render();
    }
  }

  private async handleCopyUnmatchedCSV() {
    if (!this.resolutionState) return;
    const { unmatched } = this.resolutionState;

    const csvLines = ["Original Title"];

    const sorted = [...unmatched].sort((a, b) => a.title.localeCompare(b.title));
    for (const item of sorted) {
      csvLines.push(`"${item.title.replace(/"/g, '""')}"`);
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

  private renderResolutionUI() {
    if (!this.resolutionState) return <div />;

    const { unmatched, totalCount } = this.resolutionState;

    // Group unmatched entries by title
    const groups = new Map<string, number>();
    for (const item of unmatched) {
      groups.set(item.title, (groups.get(item.title) ?? 0) + 1);
    }

    const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return (
      <div style="padding: 0;">
        <div style="margin-bottom: 16px; padding: 8px 16px; border-radius: 4px; font-weight: 500; text-align: center; background: var(--status-success-bg); color: var(--status-success-text);">
          {i18n.t("ui.playdata.importSuccess", { count: totalCount })}
        </div>

        <h3>{i18n.t("ui.playdata.unresolvable")}</h3>
        <p className="section-description">{i18n.t("ui.playdata.unmatchedDescription")}</p>

        {sortedGroups.length > 0 ? (
          <div style="margin-bottom: 20px;">
            <div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border-light); border-radius: 4px; background: var(--bg-input);">
              <ul style="margin: 0; padding: 0; list-style: none; font-size: 13px;">
                {sortedGroups.map(([title, count]) => (
                  <li style="padding: 8px 12px; border-bottom: 1px solid var(--border-lighter); color: var(--text-secondary);">
                    {title}
                    {count > 1 && (
                      <span style="margin-left: 6px; font-size: 11px; color: var(--text-secondary); background: var(--bg-panel-header); padding: 1px 4px; border-radius: 4px;">
                        x{count}
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
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            {this.renderCopyImportedHtmlButton()}
            {appState.isTesterMode && (
              <action-button
                button-variant="secondary"
                success-label={i18n.t("ui.playdata.copied")}
                error-label={i18n.t("status.exportFailed")}
                action={() => this.handleCopyUnmatchedCSV()}
              >
                {i18n.t("ui.playdata.copyCsv")}
              </action-button>
            )}
          </div>
          <action-button button-variant="primary" action={async () => this.handleClose()}>
            {i18n.t("ui.ok")}
          </action-button>
        </div>
      </div>
    );
  }

  private renderImportModeContent() {
    if (this.resolutionState) {
      return this.renderResolutionUI();
    }

    const inProgress = this.isListeningForMessage || this.isImporting;
    const instructionKey = this.isFromBookmarklet ? "ui.playdata.importReady" : "ui.playdata.pasteHereInstruction";

    return (
      <div style="text-align: center; padding: 0;">
        {inProgress ? (
          <div className="import-progress" id="import-progress">
            <span className="import-progress-spinner" />
            <span>
              {this.isImporting ? i18n.t("ui.playdata.importing") : i18n.t("ui.playdata.bookmarkletConnecting")}
            </span>
          </div>
        ) : (
          <div style="font-size: 16px; margin-bottom: 20px; color: var(--text-primary);">{i18n.t(instructionKey)}</div>
        )}

        {this.importStatus.type !== "success" && (
          <>
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
                <action-button
                  button-variant="secondary"
                  disabled={this.isImporting}
                  action={async () => this.handlePasteImport()}
                >
                  {i18n.t("ui.playdata.pasteImport")}
                </action-button>
              )}
              <action-button
                id="import-playdata-btn"
                button-variant="primary"
                disabled={!this.manualPasteContent || this.isImporting}
                action={async () => this.handleManualImport()}
              >
                {this.isImporting ? i18n.t("ui.playdata.importing") : i18n.t("ui.playdata.import")}
              </action-button>
            </div>

            <div style="margin-top: 15px; font-size: 13px; color: var(--text-secondary);">
              {i18n.t("ui.playdata.pwaDesktopNotice")}
            </div>
          </>
        )}

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

        {this.importStatus.type === "success" && !this.isStandaloneOrDesktop() && (
          <div style="margin-top: 10px; display: flex; flex-direction: column; align-items: center; gap: 10px;">
            <div style="font-size: 13px; color: var(--text-secondary);">
              {i18n.t("ui.playdata.importSuccessPwaReminder")}
            </div>
            {this.renderCopyImportedHtmlButton()}
          </div>
        )}
      </div>
    );
  }

  private isStandaloneOrDesktop(): boolean {
    // biome-ignore lint/suspicious/noExplicitAny: NL_OS is a Neutralino global
    if (typeof (window as any).NL_OS !== "undefined") return true;
    return window.matchMedia("(display-mode: standalone)").matches;
  }

  private renderSettingsContent() {
    const devModeToggle = (
      <div
        className="about-item"
        style="padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;"
      >
        <label className="checkbox-label" style="width: 100%;">
          <input type="checkbox" checked={appState.isTesterMode} onchange={this.handleDevModeToggle.bind(this)} />
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
          <action-button
            button-variant="primary"
            disabled={this.isExporting}
            action={async () => this.handleExportPlaydata()}
          >
            {this.isExporting ? i18n.t("ui.playdata.exporting") : i18n.t("ui.playdata.export")}
          </action-button>
          <action-button
            button-variant="primary"
            disabled={this.isExporting}
            action={async () => this.handleExportPlaydataJson()}
          >
            {this.isExporting ? i18n.t("ui.playdata.exporting") : i18n.t("ui.playdata.exportJson")}
          </action-button>
          <action-button button-variant="secondary" action={async () => this.handleClearPlaydata()}>
            {i18n.t("ui.playdata.clearData")}
          </action-button>
        </div>
      </div>
    ) : (
      <div style="margin-top: 12px; padding: 12px; background: var(--bg-panel); border-radius: 6px; border: 1px solid var(--border-light); color: var(--text-secondary);">
        {i18n.t("ui.playdata.noData")}
      </div>
    );

    const playdataSection = (
      <div style="margin-top: 20px;">
        <h3>{i18n.t("ui.playdata.title")}</h3>
        <p className="section-description">{i18n.t("ui.playdata.instructions")}</p>
        <ol style="font-size: 14px; margin: 0 0 12px 0; padding-left: 20px; line-height: 1.8;">
          <li>{i18n.t("ui.playdata.step1")}</li>
          <li>{i18n.t("ui.playdata.step2")}</li>
          <li>{i18n.t("ui.playdata.step3")}</li>
          <li>{i18n.t("ui.playdata.step4")}</li>
        </ol>

        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
          <action-button button-variant="primary" action={async () => this.handleShowBookmarklet()}>
            {this.showBookmarklet ? i18n.t("ui.playdata.hideBookmarklet") : i18n.t("ui.playdata.showBookmarklet")}
          </action-button>
          <action-button button-variant="primary" action={async () => this.handleGoToImport()}>
            {i18n.t("ui.playdata.goToImport")}
          </action-button>
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
        <h3>{i18n.t("ui.viewDefaults.title")}</h3>
        <p className="section-description">{i18n.t("ui.viewDefaults.desc")}</p>

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
              button-variant="secondary"
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
        <h3>{i18n.t("ui.autoAnnotate.title")}</h3>
        <p className="section-description">{i18n.t("ui.autoAnnotate.desc")}</p>
        <div
          className="about-item"
          style="padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;"
        >
          <label className="checkbox-label" style="width: 100%;">
            <input
              type="checkbox"
              checked={this.autoAnnotateOnLoad}
              onchange={this.handleAutoAnnotateToggle.bind(this)}
            />
            {i18n.t("ui.autoAnnotate.title")}
          </label>
        </div>
      </div>
    );

    // Chart List Display Section
    const chartListSection = (
      <div style="margin-top: 20px;">
        <h3>{i18n.t("ui.chartList.title")}</h3>
        <p className="section-description">{i18n.t("ui.chartList.showFullPathDesc")}</p>
        <div
          className="about-item"
          style="padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;"
        >
          <label className="checkbox-label" style="width: 100%;">
            <input
              type="checkbox"
              checked={this.showFullPathInChartList}
              onchange={this.handleShowFullPathToggle.bind(this)}
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

    const debugLogSection = (() => {
      if (!appState.isTesterMode) return null;
      const logEvents = startupLog.getEvents();
      const first = logEvents[0]?.ts ?? 0;
      let prev = first;
      return (
        <div style="display: flex; flex-direction: column; gap: 8px;">
          <div style="display: flex; gap: 8px;">
            <action-button
              button-variant="secondary"
              action={async () => {
                this.showDebugLog = !this.showDebugLog;
                this.render();
              }}
            >
              {this.showDebugLog ? "Hide Debug Log" : "Show Debug Log"}
            </action-button>
            <action-button
              button-variant="secondary"
              action={async () => {
                const events = startupLog.getEvents();
                if (events.length === 0) {
                  await navigator.clipboard.writeText("No events recorded.");
                  return;
                }
                const first = events[0].ts;
                let prev = first;
                const header = `${"#".padEnd(3)} ${"Event".padEnd(50)} ${"Start".padStart(10)} ${"Δprev".padStart(10)}  Detail`;
                const lines = events.map((ev, i) => {
                  const sinceStart = `${(ev.ts - first).toFixed(1)}ms`.padStart(10);
                  const sincePrev = `${(ev.ts - prev).toFixed(1)}ms`.padStart(10);
                  prev = ev.ts;
                  const detail = ev.detail ? `  ${ev.detail}` : "";
                  return `${String(i + 1).padEnd(3)} ${ev.label.padEnd(50)} ${sinceStart} ${sincePrev}${detail}`;
                });
                await navigator.clipboard.writeText([header, ...lines].join("\n"));
              }}
            >
              Copy Log
            </action-button>
          </div>
          {this.showDebugLog && (
            <div style="background: var(--bg-input, #f8f8f8); border: 1px solid var(--border-light); border-radius: 6px; padding: 10px; overflow-x: auto;">
              <table style="border-collapse: collapse; font-family: monospace; font-size: 12px; width: 100%; min-width: 480px;">
                <thead>
                  <tr style="border-bottom: 1px solid var(--border-light);">
                    <th style="text-align: right; padding: 2px 8px 4px 2px; color: var(--text-secondary);">#</th>
                    <th style="text-align: left; padding: 2px 8px 4px 2px; color: var(--text-secondary);">Event</th>
                    <th style="text-align: right; padding: 2px 8px 4px 2px; color: var(--text-secondary);">Start</th>
                    <th style="text-align: right; padding: 2px 8px 4px 2px; color: var(--text-secondary);">Δ prev</th>
                    <th style="text-align: left; padding: 2px 2px 4px 2px; color: var(--text-secondary);">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {logEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} style="padding: 4px 2px; color: var(--text-secondary);">
                        No events recorded.
                      </td>
                    </tr>
                  ) : (
                    logEvents.map((ev, i) => {
                      const sinceStart = (ev.ts - first).toFixed(1);
                      const sincePrev = (ev.ts - prev).toFixed(1);
                      prev = ev.ts;
                      return (
                        <tr
                          style={
                            i % 2 === 0
                              ? "background: transparent;"
                              : "background: var(--bg-panel-header, rgba(0,0,0,0.04));"
                          }
                        >
                          <td style="text-align: right; padding: 2px 8px; color: var(--text-secondary);">{i + 1}</td>
                          <td style="padding: 2px 8px;">{ev.label}</td>
                          <td style="text-align: right; padding: 2px 8px; color: var(--text-secondary); white-space: nowrap;">
                            {sinceStart}ms
                          </td>
                          <td style="text-align: right; padding: 2px 8px; color: var(--text-secondary); white-space: nowrap;">
                            {sincePrev}ms
                          </td>
                          <td style="padding: 2px 2px; color: var(--text-secondary); font-size: 11px;">
                            {ev.detail ?? ""}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    })();

    const devSection = (
      <div style="display: flex; flex-direction: column; gap: 8px;">
        {devModeToggle}
        {debugLogSection}
      </div>
    );

    return (
      <div style="display: flex; flex-direction: column; gap: 10px;">
        {viewDefaultsSection}
        {autoAnnotateSection}
        {chartListSection}
        {playdataSection}
        {devSection}
      </div>
    );
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

    const modalVdom = (
      <modal-page
        id="settings-modal"
        open={this.isModalOpen || null}
        heading={this.isImportMode ? i18n.t("ui.playdata.title") : i18n.t("ui.settings")}
        max-width="600px"
        onclose={this.handleClose.bind(this)}
      >
        {this.isImportMode ? this.renderImportModeContent() : this.renderSettingsContent()}
      </modal-page>
    );

    webjsx.applyDiff(this, vdom);
    webjsx.applyDiff(this.modalContainer, modalVdom);
  }
}

customElements.define("settings-panel", SettingsPanel);
