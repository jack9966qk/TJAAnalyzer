import * as webjsx from "webjsx";
import type { DropdownItem } from "./action-button.js";
import "./action-button.js";
import type { AdvancedSearchCriteria, Difficulty } from "./advanced-search-modal.js";
import {
  type AdvancedSearchModal,
  difficultyToNumber,
  getAdvancedSearchSummary,
  getMatchedDifficulties,
  hasAnyCriteria,
  matchesAdvancedCriteria,
  type PlaydataContext,
} from "./advanced-search-modal.js";
import "./advanced-search-modal.js";
import type { EseIndexEntry } from "../clients/ese-client.js";
import {
  saveUrlState,
  updateChartSelection,
  updatePageUrl,
  updateParsedCharts,
} from "../controllers/chart-controller.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import {
  buildSongIdToEntriesCache,
  getCrownCssClass,
  getDnStyleCssClass,
  getPlayEntrySync,
  getScoreRankChar,
  getScoreRankCssClass,
  PlaydataLeadingMode,
  PlaydataStripMode,
  PlaydataTrailingMode,
  preloadSongMapping,
} from "../utils/playdata-status.js";
import type { Playdata, PlaydataEntry } from "../utils/playdata-types.js";
import { Crown } from "../utils/playdata-types.js";
import { startupLog } from "../utils/startup-log.js";
import { ChartLanguage, loadUserProfile } from "../utils/user-profile.js";
import { courseBranchSelect } from "../view/ui-elements.js";

type DisplayResult =
  | (EseIndexEntry & { matchedDifficulty?: Difficulty })
  | { __truncated: true; path?: never; title?: never; titleJp?: never; matchedDifficulty?: never };

import {
  getLocalizedTitle as getSongMappingTitle,
  type SongMapping,
  type SongMappingEntry,
} from "../models/song-mapping.js";

const SEARCH_PARAMS = [
  "q",
  "adv_diff",
  "adv_title",
  "adv_artist",
  "adv_subtitle",
  "adv_stars",
  "adv_ncmin",
  "adv_ncmax",
  "adv_bpmmin",
  "adv_bpmmax",
  "adv_bpmrangemin",
  "adv_bpmrangemax",
  "adv_platform",
  "adv_region",
  "adv_playdata",
  "adv_dfc",
];

function clearSearchParams(url: URL) {
  for (const p of SEARCH_PARAMS) url.searchParams.delete(p);
}

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
  private _stripMode: PlaydataStripMode = PlaydataStripMode.Crown;
  private _leadingMode: PlaydataLeadingMode = PlaydataLeadingMode.None;
  private _trailingMode: PlaydataTrailingMode = PlaydataTrailingMode.None;
  private _preferredChartLanguage: ChartLanguage = ChartLanguage.Auto;
  private _settingsChangeHandler: (() => void) | null = null;
  // Advanced search state
  private _isAdvancedSearchActive = false;
  private _advancedCriteria: AdvancedSearchCriteria = {};
  private _advancedSearchModal: AdvancedSearchModal | null = null;

  connectedCallback() {
    this.loadSettings();
    this.render();
    i18n.onLanguageChange(() => {
      this.rebuildTitleCache();
      this.render();
    });
    // Listen to settings changes
    this._settingsChangeHandler = async () => {
      this.loadSettings();
      await this.refreshPlaydataCaches();
      this.rebuildTitleCache();
      this.filterResults();
      this.render();
    };
    window.addEventListener("settings-change", this._settingsChangeHandler);

    // Listen for advanced search events
    this.addEventListener("advanced-search-apply", ((e: CustomEvent) => {
      this._advancedCriteria = e.detail.criteria;
      this._isAdvancedSearchActive = hasAnyCriteria(this._advancedCriteria);
      this.filterResults();
      this.updateSearchUrl();
      this.render();
    }) as EventListener);
    this.addEventListener("advanced-search-clear", (() => {
      this._advancedCriteria = {};
      this._isAdvancedSearchActive = false;
      this.filterResults();
      this.updateSearchUrl();
      this.render();
    }) as EventListener);
  }

  disconnectedCallback() {
    if (this._settingsChangeHandler) {
      window.removeEventListener("settings-change", this._settingsChangeHandler);
    }
  }

  private loadSettings() {
    const profile = loadUserProfile();
    this._showFullPath = profile.showFullPathInChartList ?? false;
    this._stripMode = profile.chartListStripMode ?? PlaydataStripMode.Crown;
    this._leadingMode = profile.chartListLeadingMode ?? PlaydataLeadingMode.None;
    this._trailingMode = profile.chartListTrailingMode ?? PlaydataTrailingMode.None;
    this._preferredChartLanguage = profile.preferredChartLanguage ?? ChartLanguage.Auto;
  }

  get searchQuery() {
    return this._searchQuery;
  }

  set searchQuery(val: string) {
    this._searchQuery = val;
    this.filterResults();
    this.updateSearchUrl();
    this.render();
  }

  activate() {
    startupLog.record("chart-list-panel activate");
    // Load playdata caches if playdata exists
    this.refreshPlaydataCaches();
    this.loadSettings();

    if (!appState.eseTree) {
      startupLog.record("ESE tree: not cached, starting fetch");
      this.dispatchStatus("status.loadingEse");
      this.renderLoading();

      appState.eseClient
        .getTjaFiles()
        .then((tree) => {
          appState.eseTree = tree;
          startupLog.record("ESE tree: ready", `${tree.length} entries`);
          this.dispatchStatus("status.eseReady");
          this.rebuildTitleCache();
          this.loadSearchFromUrl();
          this.filterResults();
          this.render();

          if (this._pendingEseLoad) {
            this.loadEseFromUrl(this._pendingEseLoad.path, this._pendingEseLoad.diff);
            this._pendingEseLoad = null;
          }
        })
        .catch((e) => {
          const errMsg = e instanceof Error ? e.message : String(e);
          startupLog.record("ESE tree: load error", errMsg);
          this.dispatchStatus("status.eseError", { error: errMsg });
          // Render error state
          const resultsContainer = this.querySelector("#ese-results");
          if (resultsContainer) {
            resultsContainer.innerHTML = `<div style="padding:10px; color:red">Error loading tree: ${errMsg}</div>`;
          }
        });
    } else {
      startupLog.record("ESE tree: already cached, skipping fetch");
      this.rebuildTitleCache();
      this.loadSearchFromUrl();
      this.filterResults();
      if (this._pendingEseLoad) {
        this.loadEseFromUrl(this._pendingEseLoad.path, this._pendingEseLoad.diff);
        this._pendingEseLoad = null;
      }
      this.render();
    }
  }

  private async refreshPlaydataCaches() {
    let mappingLoaded = false;
    // Load song mapping if not cached (needed for title localization regardless of playdata)
    if (!this._songMapping) {
      this._songMapping = await preloadSongMapping();
      mappingLoaded = true;
    }

    const profile = loadUserProfile();
    const playdata = profile.playdata;

    // Only refresh if playdata or mapping changed
    if (playdata === this._cachedPlaydata && !mappingLoaded) {
      return;
    }

    this._cachedPlaydata = playdata;

    if (!playdata?.entries?.length) {
      this._songIdToEntriesCache = null;
    } else {
      // Build title lookup cache
      this._songIdToEntriesCache = buildSongIdToEntriesCache(playdata);
    }

    if (mappingLoaded) {
      this.rebuildTitleCache();
    }

    // Re-render with status strips and translations
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
  private getLocalizedTitle(node: EseIndexEntry): string | undefined {
    const lang = this._preferredChartLanguage === ChartLanguage.Auto ? i18n.language : this._preferredChartLanguage;

    // Check if we have song mapping data for this node
    // To do that efficiently, we need a reverse lookup from path -> SongMappingEntry
    // But since this is a quick sync lookup, we can try to find an entry in _songMapping
    if (this._songMapping) {
      let mappingEntry: SongMappingEntry | undefined;
      for (const entry of Object.values(this._songMapping)) {
        if (entry.esePath === node.path) {
          mappingEntry = entry;
          break;
        }
      }
      if (mappingEntry) {
        return getSongMappingTitle(mappingEntry, lang);
      }
    }

    // Fallback to EseIndexEntry metadata if mapping not available
    if (lang === "zh") {
      return node.titleCn || node.title;
    }
    if (lang === "ja") {
      return node.titleJp || node.title;
    }
    return node.title;
  }

  /**
   * Get the display text for a chart list item.
   * Returns the title if it's unique, otherwise returns the path.
   * If showFullPath is enabled, always returns the path.
   * @returns object with text and isTitle flag
   */
  private getDisplayText(node: EseIndexEntry, matchedDifficulty?: Difficulty): { text: string; isTitle: boolean } {
    // If user prefers full path, always show path
    if (this._showFullPath) {
      const text = matchedDifficulty ? `${node.path} (${this.getDifficultyLabel(matchedDifficulty)})` : node.path;
      return { text, isTitle: false };
    }

    const title = this.getLocalizedTitle(node);

    // No title available, show path
    if (!title) {
      const text = matchedDifficulty ? `${node.path} (${this.getDifficultyLabel(matchedDifficulty)})` : node.path;
      return { text, isTitle: false };
    }

    // Check if this title is shared by multiple paths (only when no matchedDifficulty,
    // since difficulty-specific items are already distinct)
    if (!matchedDifficulty) {
      const pathsWithTitle = this._titleToPathsCache.get(title);
      if (pathsWithTitle && pathsWithTitle.length > 1) {
        return { text: node.path, isTitle: false };
      }
    }

    const text = matchedDifficulty ? `${title} (${this.getDifficultyLabel(matchedDifficulty)})` : title;
    return { text, isTitle: true };
  }

  private getDifficultyLabel(diff: Difficulty): string {
    const key = diff === "ura" ? "ui.difficulty.ura" : `ui.difficulty.${diff}`;
    return i18n.t(key);
  }

  setPendingLoad(path: string, diff: string) {
    this._pendingEseLoad = { path, diff };
  }

  private updateSearchUrl() {
    const url = new URL(window.location.href);
    clearSearchParams(url);

    if (this._isAdvancedSearchActive) {
      const c = this._advancedCriteria;
      if (c.difficulty && c.difficulty.length > 0) url.searchParams.set("adv_diff", c.difficulty.join(","));
      if (c.title) url.searchParams.set("adv_title", c.title);
      if (c.artist) url.searchParams.set("adv_artist", c.artist);
      if (c.subtitle) url.searchParams.set("adv_subtitle", c.subtitle);
      if (c.starsMin != null) url.searchParams.set("adv_starsmin", String(c.starsMin));
      if (c.starsMax != null) url.searchParams.set("adv_starsmax", String(c.starsMax));
      if (c.noteCountMin != null) url.searchParams.set("adv_ncmin", String(c.noteCountMin));
      if (c.noteCountMax != null) url.searchParams.set("adv_ncmax", String(c.noteCountMax));
      if (c.bpmMin != null) url.searchParams.set("adv_bpmmin", String(c.bpmMin));
      if (c.bpmMax != null) url.searchParams.set("adv_bpmmax", String(c.bpmMax));
      if (c.bpmRangeMin != null) url.searchParams.set("adv_bpmrangemin", String(c.bpmRangeMin));
      if (c.bpmRangeMax != null) url.searchParams.set("adv_bpmrangemax", String(c.bpmRangeMax));
      if (c.platform) url.searchParams.set("adv_platform", c.platform);
      if (c.region) url.searchParams.set("adv_region", c.region);
      if (c.playdata) url.searchParams.set("adv_playdata", c.playdata);
      if (c.dfcDifficulty) url.searchParams.set("adv_dfc", c.dfcDifficulty);
    } else if (this._searchQuery) {
      url.searchParams.set("q", this._searchQuery);
    }

    if (url.toString() !== window.location.href) {
      window.history.replaceState(null, "", url.toString());
    }
    saveUrlState();
  }

  private loadSearchFromUrl() {
    const params = new URLSearchParams(window.location.search);

    const hasAdvanced = [...params.keys()].some((k) => k.startsWith("adv_"));
    if (hasAdvanced) {
      const criteria: AdvancedSearchCriteria = {};
      const diff = params.get("adv_diff");
      if (diff) criteria.difficulty = diff.split(",") as AdvancedSearchCriteria["difficulty"];
      const title = params.get("adv_title");
      if (title) criteria.title = title;
      const artist = params.get("adv_artist");
      if (artist) criteria.artist = artist;
      const subtitle = params.get("adv_subtitle");
      if (subtitle) criteria.subtitle = subtitle;
      // Support legacy single-value adv_stars as starsMin=starsMax
      const starsLegacy = params.get("adv_stars");
      if (starsLegacy) {
        const n = Number(starsLegacy);
        criteria.starsMin = n;
        criteria.starsMax = n;
      }
      const starsmin = params.get("adv_starsmin");
      if (starsmin) criteria.starsMin = Number(starsmin);
      const starsmax = params.get("adv_starsmax");
      if (starsmax) criteria.starsMax = Number(starsmax);
      const ncmin = params.get("adv_ncmin");
      if (ncmin) criteria.noteCountMin = Number(ncmin);
      const ncmax = params.get("adv_ncmax");
      if (ncmax) criteria.noteCountMax = Number(ncmax);
      const bpmmin = params.get("adv_bpmmin");
      if (bpmmin) criteria.bpmMin = Number(bpmmin);
      const bpmmax = params.get("adv_bpmmax");
      if (bpmmax) criteria.bpmMax = Number(bpmmax);
      const bpmrangemin = params.get("adv_bpmrangemin");
      if (bpmrangemin) criteria.bpmRangeMin = Number(bpmrangemin);
      const bpmrangemax = params.get("adv_bpmrangemax");
      if (bpmrangemax) criteria.bpmRangeMax = Number(bpmrangemax);

      const platform = params.get("adv_platform");
      if (platform) criteria.platform = platform;
      const region = params.get("adv_region");
      if (region) criteria.region = region;
      const playdata = params.get("adv_playdata");
      if (playdata) criteria.playdata = playdata;
      const dfc = params.get("adv_dfc");
      if (dfc) criteria.dfcDifficulty = dfc;

      this._advancedCriteria = criteria;
      this._isAdvancedSearchActive = hasAnyCriteria(criteria);
    } else {
      const q = params.get("q");
      if (q) this._searchQuery = q;
    }
  }

  async loadEseFromUrl(path: string, diff: string) {
    try {
      this.dispatchStatus("status.loadingChart");

      const content = await appState.eseClient.getFileContent(path);
      appState.loadedTJAContent = content;
      appState.currentEsePath = path;

      // Only set search query to path if no search state is active
      if (!this._isAdvancedSearchActive && !this._searchQuery) {
        this._searchQuery = path;
      }
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
          updateChartSelection(true);
        }
      }

      this.render();
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

    let allDisplayResults: DisplayResult[];

    if (this._isAdvancedSearchActive) {
      let playdataContext: PlaydataContext | undefined;
      if (this._songIdToEntriesCache && this._cachedPlaydata) {
        playdataContext = {
          getEntry: (path: string, difficultyNum?: number) =>
            getPlayEntrySync(path, this._cachedPlaydata, this._songIdToEntriesCache, difficultyNum),
        };
      }

      allDisplayResults = [];
      for (const node of eseTree) {
        if (!matchesAdvancedCriteria(node, this._advancedCriteria, playdataContext)) continue;

        const matchedDiffs = getMatchedDifficulties(node, this._advancedCriteria, playdataContext);
        if (matchedDiffs) {
          for (const diff of matchedDiffs) {
            allDisplayResults.push({ ...node, matchedDifficulty: diff });
          }
        } else {
          allDisplayResults.push(node);
        }
      }
    } else {
      const query = this._searchQuery.toLowerCase();
      allDisplayResults = query
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
    }

    this._displayResults = allDisplayResults.slice(0, 100);
    if (allDisplayResults.length > 100) {
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
    // Exclude search state from shared URL
    clearSearchParams(url);

    try {
      await navigator.clipboard.writeText(url.toString());
    } catch (e) {
      console.error("Failed to copy link:", e);
      throw e;
    }
  }

  private getShareDropdownItems(): DropdownItem[] {
    const hasSearch = this._searchQuery || this._isAdvancedSearchActive;
    if (!hasSearch) return [];
    return [
      {
        label: i18n.t("ui.ese.shareWithSearch"),
        action: () => this.handleShareWithSearch(),
      },
    ];
  }

  private async handleShareWithSearch() {
    if (!appState.currentEsePath) return;

    const diff = courseBranchSelect?.difficulty || "oni";
    const url = new URL(window.location.href);
    url.searchParams.set("ese", appState.currentEsePath);
    url.searchParams.set("diff", diff);
    // Keep search state in URL

    try {
      await navigator.clipboard.writeText(url.toString());
    } catch (e) {
      console.error("Failed to copy link:", e);
      throw e;
    }
  }

  private async handleResultClick(node: EseIndexEntry, matchedDifficulty?: Difficulty) {
    try {
      this.dispatchStatus("status.loadingChart");

      const content = await appState.eseClient.getFileContent(node.path);
      appState.loadedTJAContent = content;
      appState.currentEsePath = node.path;
      updateParsedCharts(content);

      // If a specific difficulty was matched, select it
      if (matchedDifficulty && appState.parsedTJACharts) {
        const diffKey = matchedDifficulty === "ura" ? "edit" : matchedDifficulty;
        if (appState.parsedTJACharts[diffKey] && courseBranchSelect) {
          courseBranchSelect.difficulty = diffKey;
          updateChartSelection(true);
        }
      }

      this.render();
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

    const profile = loadUserProfile();
    const playdata = profile.playdata;
    const hasPlaydata = !!playdata?.entries?.length;

    const vdom = (
      <div style="display: contents;">
        <div className="control-group">
          {this._isAdvancedSearchActive ? (
            <div style="display: flex; gap: 6px; align-items: stretch; width: 100%; height: 32px; box-sizing: border-box;">
              <button
                type="button"
                className="adv-search-active-bar"
                style="flex: 1; min-width: 0;"
                onclick={() => {
                  if (!this._advancedSearchModal) {
                    this._advancedSearchModal = this.querySelector("advanced-search-modal") as AdvancedSearchModal;
                  }
                  this._advancedSearchModal?.open(this._advancedCriteria, hasPlaydata);
                }}
              >
                <div className="adv-search-active-text" title={getAdvancedSearchSummary(this._advancedCriteria)}>
                  <span
                    className="icon-filter"
                    style="background-color: var(--text-primary); width: 14px; height: 14px; display: inline-block; vertical-align: middle; margin-right: 6px; margin-top: -2px;"
                  />
                  {getAdvancedSearchSummary(this._advancedCriteria)}
                </div>
              </button>
              <button
                type="button"
                className="adv-search-clear-btn"
                onclick={() => {
                  this._advancedCriteria = {};
                  this._isAdvancedSearchActive = false;
                  this.filterResults();
                  this.updateSearchUrl();
                  this.render();
                }}
                title={i18n.t("ui.advSearch.clearAll")}
                aria-label={i18n.t("ui.advSearch.clearAll")}
              >
                <div className="icon-x-mark" />
              </button>
            </div>
          ) : (
            <div style="display: flex; gap: 4px; align-items: stretch; width: 100%; height: 32px; box-sizing: border-box;">
              <button
                type="button"
                className="adv-search-open-btn"
                title={i18n.t("ui.advSearch.open")}
                onclick={() => {
                  if (!this._advancedSearchModal) {
                    this._advancedSearchModal = this.querySelector("advanced-search-modal") as AdvancedSearchModal;
                  }
                  this._advancedSearchModal?.open(this._advancedCriteria, hasPlaydata);
                }}
              >
                <div className="icon-filter" />
              </button>
              <input
                type="text"
                id="ese-search-input"
                value={this._searchQuery}
                placeholder={i18n.t("ui.ese.searchPlaceholder")}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                oninput={this.handleSearchInput.bind(this)}
              />
            </div>
          )}
        </div>

        <div id="ese-results">
          {!isEseReady ? (
            <div className="ese-result-placeholder" style="padding:10px;">
              Loading song list...
            </div>
          ) : this._displayResults.length === 0 ? (
            <div className="ese-result-placeholder">{i18n.t("ui.ese.noResults")}</div>
          ) : (
            (() => {
              // Pre-calculate statuses and check if any item has status
              let anyItemHasStatus = false;
              const itemsWithStatus = this._displayResults.map((node: DisplayResult) => {
                if ("__truncated" in node) return { node, entry: null };

                let entry: PlaydataEntry | null = null;
                if (hasPlaydata && this._songMapping && this._songIdToEntriesCache) {
                  const diffNum = node.matchedDifficulty ? difficultyToNumber[node.matchedDifficulty] : undefined;
                  entry = getPlayEntrySync(node.path, playdata, this._songIdToEntriesCache, diffNum);
                  if (entry && entry.crown !== Crown.None) {
                    anyItemHasStatus = true;
                  }
                }
                return { node, entry };
              });

              // Decide layout based on mode and if any item has status
              const stripMode = this._stripMode;
              const leadingMode = this._leadingMode;
              const trailingMode = this._trailingMode;
              const showStrip = stripMode !== PlaydataStripMode.None && hasPlaydata && anyItemHasStatus;
              const showRank = leadingMode === PlaydataLeadingMode.ScoreRank && hasPlaydata && anyItemHasStatus;
              const showCounts = trailingMode === PlaydataTrailingMode.Counts && hasPlaydata && anyItemHasStatus;

              return itemsWithStatus.map(({ node, entry }) => {
                if ("__truncated" in node) {
                  return <div className="ese-result-placeholder">{i18n.t("ui.ese.truncated")}</div>;
                }
                const isSelected =
                  appState.currentEsePath === node.path &&
                  (!node.matchedDifficulty ||
                    courseBranchSelect?.difficulty ===
                      (node.matchedDifficulty === "ura" ? "edit" : node.matchedDifficulty));
                const { text: displayText, isTitle } = this.getDisplayText(node, node.matchedDifficulty);
                const textClass = `ese-result-item-text${isTitle ? " display-title" : ""}`;

                // Determine Strip Class
                let stripClass = "";
                if (entry) {
                  if (stripMode === PlaydataStripMode.DnCategory) {
                    stripClass = getDnStyleCssClass(entry);
                  } else if (stripMode === PlaydataStripMode.Crown) {
                    stripClass = getCrownCssClass(entry.crown);
                  }
                }

                // Determine Rank Element
                let rankEl = null;
                if (showRank) {
                  let rankClass = "scorerank-placeholder";
                  let rankChar = "";

                  if (entry) {
                    if (entry.crown !== Crown.None) {
                      rankClass = getScoreRankCssClass(entry.scoreRank);
                      rankChar = getScoreRankChar(entry.scoreRank);
                    } else {
                      // Entry exists but Crown is None (e.g. failed play or just imported data without clear)
                      rankClass = getScoreRankCssClass(entry.scoreRank);
                      rankChar = getScoreRankChar(entry.scoreRank);
                    }
                  }

                  rankEl = <div className={`score-rank-box ${rankClass}`}>{rankChar}</div>;
                }

                // Determine Counts Element
                let countsEl = null;
                if (showCounts && entry) {
                  countsEl = <div className="judgement-counts-chip">{`${entry.good}(${entry.bad})`}</div>;
                }

                return (
                  <div
                    className={`ese-result-item ${isSelected ? "selected" : ""}`}
                    onclick={() => this.handleResultClick(node, node.matchedDifficulty)}
                  >
                    {showStrip && <div className={`play-status-strip ${stripClass || ""}`}></div>}
                    <div className={textClass}>
                      {showRank && rankEl}
                      {displayText}
                      {countsEl}
                    </div>
                  </div>
                );
              });
            })()
          )}
        </div>

        <div className="control-group" style="margin-top: 5px;">
          <action-button
            id="ese-share-btn"
            style="width: 100%;"
            success-label={i18n.t("ui.ese.shareSuccess")}
            error-label={i18n.t("status.exportFailed")}
            disabled={!showShare}
            action={() => this.handleShare()}
            dropdownItems={this.getShareDropdownItems()}
          >
            {i18n.t("ui.ese.share")}
          </action-button>
        </div>

        <advanced-search-modal />
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("chart-list-panel", ChartListPanel);
