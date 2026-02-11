import * as webjsx from "webjsx";
import "./action-button.js";
import type { GitNode } from "../clients/ese-client.js";
import { refreshChart, updatePageUrl, updateParsedCharts } from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import type { Playdata, PlaydataEntry } from "../utils/playdata-parser.js";
import { Crown } from "../utils/playdata-parser.js";
import {
  buildSongIdToEntriesCache,
  getCrownCssClass,
  getPlayStatusSync,
  preloadSongMapping,
} from "../utils/playdata-status.js";
import { loadUserProfile } from "../utils/user-profile.js";
import { courseBranchSelect } from "../view/ui-elements.js";

type DisplayResult = GitNode | { __truncated: true; path?: never; title?: never; titleJp?: never };

interface SongMappingEntry {
  esePath: string;
  title: string;
  candidates: string[];
  matchType: string;
  titlecn?: string;
  titleko?: string;
  artist?: string;
}

type SongMapping = Record<string, SongMappingEntry>;

export class ChartListPanel extends HTMLElement {
  private _searchQuery = "";
  private _displayResults: DisplayResult[] = [];
  private _pendingEseLoad: { path: string; diff: string } | null = null;

  // Playdata status caches
  private _songMapping: SongMapping | null = null;
  private _songIdToEntriesCache: Map<string, PlaydataEntry[]> | null = null;
  private _cachedPlaydata: Playdata | null | undefined = undefined;

  // Title display cache: maps title to paths that have that title
  private _titleToPathsCache: Map<string, string[]> = new Map();
  // Settings
  private _showFullPath = false;
  private _settingsChangeHandler: (() => void) | null = null;

  connectedCallback() {
    this.loadSettings();
    this.render();
    i18n.onLanguageChange(() => {
      this.rebuildTitleCache();
      this.render();
    });
    // Listen to settings changes
    this._settingsChangeHandler = () => {
      this.loadSettings();
      this.refreshPlaydataCaches();
      this.render();
    };
    window.addEventListener("settings-change", this._settingsChangeHandler);
  }

  disconnectedCallback() {
    if (this._settingsChangeHandler) {
      window.removeEventListener("settings-change", this._settingsChangeHandler);
    }
  }

  private loadSettings() {
    const profile = loadUserProfile();
    this._showFullPath = profile.showFullPathInChartList ?? false;
  }

  get searchQuery() {
    return this._searchQuery;
  }

  set searchQuery(val: string) {
    this._searchQuery = val;
    this.filterResults();
    this.render();
  }

  activate() {
    // Load playdata caches if playdata exists
    this.refreshPlaydataCaches();
    this.loadSettings();

    if (!appState.eseTree) {
      this.dispatchStatus("status.loadingEse");
      this.renderLoading();

      appState.eseClient
        .getTjaFiles()
        .then((tree) => {
          appState.eseTree = tree;
          this.dispatchStatus("status.eseReady");
          this.rebuildTitleCache();
          this.filterResults();
          this.render();

          if (this._pendingEseLoad) {
            this.loadEseFromUrl(this._pendingEseLoad.path, this._pendingEseLoad.diff);
            this._pendingEseLoad = null;
          }
        })
        .catch((e) => {
          const errMsg = e instanceof Error ? e.message : String(e);
          this.dispatchStatus("status.eseError", { error: errMsg });
          // Render error state
          const resultsContainer = this.querySelector("#ese-results");
          if (resultsContainer) {
            resultsContainer.innerHTML = `<div style="padding:10px; color:red">Error loading tree: ${errMsg}</div>`;
          }
        });
    } else {
      this.rebuildTitleCache();
      if (this._pendingEseLoad) {
        this.loadEseFromUrl(this._pendingEseLoad.path, this._pendingEseLoad.diff);
        this._pendingEseLoad = null;
      }
      this.render();
    }
  }

  private async refreshPlaydataCaches() {
    const profile = loadUserProfile();
    const playdata = profile.playdata;

    // Only refresh if playdata changed
    if (playdata === this._cachedPlaydata) {
      return;
    }

    this._cachedPlaydata = playdata;

    if (!playdata?.entries?.length) {
      this._songMapping = null;
      this._songIdToEntriesCache = null;
      return;
    }

    // Load song mapping if not cached
    if (!this._songMapping) {
      this._songMapping = await preloadSongMapping();
    }

    // Build title lookup cache
    this._songIdToEntriesCache = buildSongIdToEntriesCache(playdata);

    // Re-render with status strips
    this.render();
  }

  /**
   * Build a cache that maps each display title to all paths that share that title.
   * This is used to detect duplicates and fall back to path display.
   */
  private rebuildTitleCache() {
    this._titleToPathsCache.clear();
    const { eseTree } = appState;
    if (!eseTree) return;

    for (const node of eseTree) {
      const title = this.getLocalizedTitle(node);
      if (title) {
        const paths = this._titleToPathsCache.get(title) || [];
        paths.push(node.path);
        this._titleToPathsCache.set(title, paths);
      }
    }
  }

  /**
   * Get the localized title for a node based on the current language.
   * Returns the appropriate title variant or falls back to the base title.
   */
  private getLocalizedTitle(node: GitNode): string | undefined {
    const lang = i18n.language;

    // For Chinese, try titleCn first
    if (lang === "zh") {
      return node.titleCn || node.title;
    }

    // For Japanese, try titleJp first (which comes from TITLEJA in TJA)
    if (lang === "ja") {
      return node.titleJp || node.title;
    }

    // For English and other languages, use the base title
    return node.title;
  }

  /**
   * Get the display text for a chart list item.
   * Returns the title if it's unique, otherwise returns the path.
   * If showFullPath is enabled, always returns the path.
   * @returns object with text and isTitle flag
   */
  private getDisplayText(node: GitNode): { text: string; isTitle: boolean } {
    // If user prefers full path, always show path
    if (this._showFullPath) {
      return { text: node.path, isTitle: false };
    }

    const title = this.getLocalizedTitle(node);

    // No title available, show path
    if (!title) {
      return { text: node.path, isTitle: false };
    }

    // Check if this title is shared by multiple paths
    const pathsWithTitle = this._titleToPathsCache.get(title);
    if (pathsWithTitle && pathsWithTitle.length > 1) {
      // Multiple charts have the same title, fall back to path
      return { text: node.path, isTitle: false };
    }

    return { text: title, isTitle: true };
  }

  setPendingLoad(path: string, diff: string) {
    this._pendingEseLoad = { path, diff };
  }

  async loadEseFromUrl(path: string, diff: string) {
    try {
      this.dispatchStatus("status.loadingChart");

      const content = await appState.eseClient.getFileContent(path);
      appState.loadedTJAContent = content;
      appState.currentEsePath = path;

      this.searchQuery = path;
      this.render();

      updateParsedCharts(content);

      if (appState.parsedTJACharts) {
        const targetDiff = appState.parsedTJACharts[diff] ? diff : Object.keys(appState.parsedTJACharts)[0];

        if (appState.parsedTJACharts[targetDiff]) {
          // This assumes courseBranchSelect is globally available or we need to manage it.
          // Ideally ChartListPanel shouldn't touch courseBranchSelect directly but updateParsedCharts does.
          // We need to set the difficulty on the selector.
          if (courseBranchSelect) {
            courseBranchSelect.difficulty = targetDiff;
          }
          appState.currentChart = appState.parsedTJACharts[targetDiff];
          refreshChart();
        }
      }

      this.dispatchStatus("status.chartLoaded");
      updatePageUrl();
    } catch (e) {
      console.error("Error in loadEseFromUrl", e);
      const errMsg = e instanceof Error ? e.message : String(e);
      alert(`Failed to load chart from URL: ${errMsg}`);
      this.dispatchStatus("status.eseError", { error: errMsg });
    }
  }

  private filterResults() {
    const { eseTree } = appState;
    if (!eseTree) {
      this._displayResults = [];
      return;
    }

    const query = this._searchQuery.toLowerCase();
    const allResults = query
      ? eseTree.filter((node) => {
          return (
            node.path.toLowerCase().includes(query) ||
            node.title?.toLowerCase().includes(query) ||
            node.titleJp?.toLowerCase().includes(query) ||
            node.titleOfficial?.toLowerCase().includes(query) ||
            node.titleCn?.toLowerCase().includes(query) ||
            node.titleKo?.toLowerCase().includes(query) ||
            node.subtitle?.toLowerCase().includes(query) ||
            node.subtitleJp?.toLowerCase().includes(query) ||
            node.artist?.toLowerCase().includes(query)
          );
        })
      : eseTree;

    this._displayResults = allResults.slice(0, 100);
    if (allResults.length > 100) {
      this._displayResults.push({ __truncated: true });
    }
  }

  private handleSearchInput(e: Event) {
    this.searchQuery = (e.target as HTMLInputElement).value;
  }

  private async handleShare() {
    if (!appState.currentEsePath) return;

    // courseBranchSelect is imported from ui-elements
    const diff = courseBranchSelect?.difficulty || "oni";
    const url = new URL(window.location.href);
    url.searchParams.set("ese", appState.currentEsePath);
    url.searchParams.set("diff", diff);

    try {
      await navigator.clipboard.writeText(url.toString());
    } catch (e) {
      console.error("Failed to copy link:", e);
      throw e;
    }
  }

  private async handleResultClick(node: GitNode) {
    try {
      this.dispatchStatus("status.loadingChart");

      const content = await appState.eseClient.getFileContent(node.path);
      appState.loadedTJAContent = content;
      appState.currentEsePath = node.path;

      this.render();

      updateParsedCharts(content);
      this.dispatchStatus("status.chartLoaded");
      updatePageUrl();
    } catch (e) {
      console.error(e);
      const errMsg = e instanceof Error ? e.message : String(e);
      alert(`Failed to load chart: ${errMsg}`);
      this.dispatchStatus("status.eseError", { error: errMsg });
    }
  }

  private dispatchStatus(key: string, params?: Record<string, string | number>) {
    this.dispatchEvent(
      new CustomEvent("status-change", {
        detail: { key, params },
        bubbles: true,
        composed: true,
      }),
    );
  }

  renderLoading() {
    const vdom = (
      <div className="panel-pane" style="display: block;">
        <div style="padding:10px;">Loading song list...</div>
      </div>
    );
    webjsx.applyDiff(this, vdom);
  }

  render() {
    this.style.display = "block";
    this.classList.add("panel-pane");

    const { eseTree } = appState;
    const isEseReady = !!eseTree;
    const showShare = !!appState.currentEsePath;

    const vdom = (
      <div style="display: contents;">
        <div className="control-group">
          <input
            type="text"
            id="ese-search-input"
            value={this._searchQuery}
            placeholder={i18n.t("ui.ese.searchPlaceholder")}
            style="width: 100%; box-sizing: border-box; padding: 5px; font-size: 16px;"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
            oninput={this.handleSearchInput.bind(this)}
          />
        </div>
        <div className="control-group" style="margin-top: 5px;">
          <action-button
            id="ese-share-btn"
            style="width: 100%;"
            success-label={i18n.t("ui.ese.shareSuccess")}
            error-label={i18n.t("status.exportFailed")}
            disabled={!showShare}
            action={() => this.handleShare()}
          >
            {i18n.t("ui.ese.share")}
          </action-button>
        </div>

        <div id="ese-results">
          {!isEseReady ? (
            <div className="ese-result-placeholder" style="padding:10px;">
              Loading song list...
            </div>
          ) : this._displayResults.length === 0 ? (
            <div className="ese-result-placeholder">{i18n.t("ui.ese.noResults")}</div>
          ) : (
            this._displayResults.map((node: DisplayResult) => {
              if ("__truncated" in node) {
                return <div className="ese-result-placeholder">{i18n.t("ui.ese.truncated")}</div>;
              }
              const isSelected = appState.currentEsePath === node.path;

              // Get play status if playdata is available
              const profile = loadUserProfile();
              const playdata = profile.playdata;
              const hasPlaydata = !!playdata?.entries?.length;

                            let statusClass = "";
              if (hasPlaydata && this._songMapping && this._songIdToEntriesCache) {
                const status = getPlayStatusSync(node.path, playdata, this._songIdToEntriesCache);
                if (status !== Crown.None) {
                  statusClass = getCrownCssClass(status);
                }
              }

              const { text: displayText, isTitle } = this.getDisplayText(node);
              const textClass = `ese-result-item-text${isTitle ? " display-title" : ""}`;

              return (
                <div
                  className={`ese-result-item ${isSelected ? "selected" : ""}`}
                  onclick={() => this.handleResultClick(node)}
                >
                  {hasPlaydata && statusClass && <div className={`play-status-strip ${statusClass}`}></div>}
                  <div className={textClass}>{displayText}</div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("chart-list-panel", ChartListPanel);
