import * as Renderer from "tja-renderer";
import type { JudgementOptions } from "../components/judgement-options.js";
import type { SelectOptions } from "../components/select-options.js";
import { getLocalizedSubtitle, getLocalizedTitle } from "../models/song-mapping.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { getCachedSongMapping, preloadSongMapping } from "../utils/playdata-status.js";
import { ChartLanguage, loadUserProfile } from "../utils/user-profile.js";
import { courseBranchSelect, noteStatsDisplay, tjaChart } from "../view/ui-elements.js";

const { NoteLocationMap, parseTJA } = Renderer.Private;
type HitInfo = Renderer.Private.HitInfo;
type RenderTexts = Renderer.Private.RenderTexts;

const URL_STATE_KEY = "tja_analyzer_url_state";

/**
 * Persist the current URL query string to localStorage so it can be
 * restored when the PWA is relaunched (iOS resets the URL on relaunch).
 */
export function saveUrlState() {
  try {
    const search = window.location.search;
    if (search) {
      localStorage.setItem(URL_STATE_KEY, search);
    } else {
      localStorage.removeItem(URL_STATE_KEY);
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * On startup, restore the saved URL query string if the current URL has none.
 * This handles PWA relaunches where the URL is reset to the base path.
 */
export function restoreUrlState() {
  if (window.location.search) return;
  try {
    const saved = localStorage.getItem(URL_STATE_KEY);
    if (saved) {
      const url = new URL(window.location.href);
      url.search = saved;
      window.history.replaceState(null, "", url.toString());
    }
  } catch {
    // Ignore storage errors
  }
}

/**
 * Updates the page URL to reflect the currently loaded ESE chart and difficulty.
 * Uses replaceState to avoid polluting the browser history.
 * If no ESE chart is loaded, clears the query parameters.
 */
export function updatePageUrl() {
  const url = new URL(window.location.href);

  if (appState.currentEsePath) {
    const diff = courseBranchSelect?.difficulty || "oni";
    url.searchParams.set("ese", appState.currentEsePath);
    url.searchParams.set("diff", diff);
  } else {
    // Clear URL parameters if not loading from ESE
    url.searchParams.delete("ese");
    url.searchParams.delete("diff");
    // Also clear search state params
    for (const p of [
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
    ]) {
      url.searchParams.delete(p);
    }
  }

  // Only update if the URL has actually changed
  if (url.toString() !== window.location.href) {
    window.history.replaceState(null, "", url.toString());
  }
  saveUrlState();
}

export function updateStatsComponent(hit: HitInfo | null) {
  // Logic: note stats shows selected note, or hovered note if it's a note.
  // branch stats shows hovered branch line.
  const noteHit = appState.selectedNoteHitInfo || (hit && hit.charIndex !== -1 ? hit : null);
  const branchHit = appState.selectedBranchHitInfo || (hit && hit.charIndex === -1 ? hit : null);

  if (noteStatsDisplay) {
    noteStatsDisplay.chart = appState.currentChart;
    noteStatsDisplay.renderOptions = appState.renderOptions;
    noteStatsDisplay.judgements = appState.judgements;
    noteStatsDisplay.hit = noteHit;
    noteStatsDisplay.branchHit = branchHit;
  }
}

export function updateSelectionUI() {
  // Notify component
  const selectOptions = document.querySelector("select-options") as SelectOptions;
  if (selectOptions && typeof selectOptions.refreshStatus === "function") {
    selectOptions.refreshStatus();
  }
}

export function clearJudgements() {
  appState.judgements.clear();
  updateStatsComponent(appState.selectedNoteHitInfo);
}

export function updatePlayerSideOptions() {
  if (!appState.parsedTJACharts) return;

  const selectedDiff = courseBranchSelect.difficulty;
  const rootChart = appState.parsedTJACharts[selectedDiff];

  if (rootChart?.playerSides) {
    courseBranchSelect.setPlayerSideOptions(Object.keys(rootChart.playerSides));
  } else {
    courseBranchSelect.clearPlayerSideOptions();
  }
}

export function updateChartSelection(resetBranch: boolean = false) {
  clearJudgements();
  if (resetBranch) {
    appState.annotations = new NoteLocationMap();
  }
  if (!appState.parsedTJACharts) return;

  const selectedDiff = courseBranchSelect.difficulty;
  let rootChart = appState.parsedTJACharts[selectedDiff];

  if (!rootChart) return;

  // Resolve player side
  if (rootChart.playerSides) {
    const side = courseBranchSelect.playerSide;
    rootChart = rootChart.playerSides[side] || rootChart;
  }

  if (rootChart.branches) {
    courseBranchSelect.setBranchVisibility(true);
    if (resetBranch) {
      courseBranchSelect.branch = "all";
    }

    const branchType = courseBranchSelect.branch;

    if (branchType === "all") {
      appState.renderOptions.showAllBranches = true;
      appState.currentChart = rootChart;
    } else {
      appState.renderOptions.showAllBranches = false;
      // Note: rootChart.branches.normal is the rootChart itself usually
      const target = rootChart.branches[branchType as "normal" | "expert" | "master"];
      if (target) {
        appState.currentChart = target;
      } else {
        // Fallback
        appState.currentChart = rootChart;
      }
    }
  } else {
    courseBranchSelect.setBranchVisibility(false);
    appState.renderOptions.showAllBranches = false;
    appState.currentChart = rootChart;
  }

  updateCollapseLoopState();
  refreshChart();
}

export function updateCollapseLoopState() {
  const judgementOptions = document.querySelector("judgement-options") as JudgementOptions;
  if (!judgementOptions || typeof judgementOptions.setLoopCollapseState !== "function") return;

  const hasLoop = appState.currentChart?.loop;

  if (hasLoop) {
    // Ensure checked state reflects appState
    judgementOptions.setLoopCollapseState(true, appState.renderOptions.collapsedLoop);
  } else {
    // Disabled and unchecked
    appState.renderOptions.collapsedLoop = false;
    judgementOptions.setLoopCollapseState(false, false);
  }
}

// Helper to read file as text (compatibility wrapper)
export function updateParsedCharts(content: string, fromStream = false) {
  appState.parsedTJACharts = parseTJA(content);

  // Clear selection
  appState.renderOptions.selection = null;
  appState.selectedNoteHitInfo = null;
  updateSelectionUI();

  // Clear Annotations
  appState.annotations = new NoteLocationMap();

  courseBranchSelect.clearDifficultyOptions();
  courseBranchSelect.clearPlayerSideOptions();

  const difficulties = Object.keys(appState.parsedTJACharts);

  if (difficulties.length === 0) {
    courseBranchSelect.hide();
    throw new Error(i18n.t("status.noCourses"));
  }

  courseBranchSelect.setDifficultyOptions(difficulties);

  let defaultDifficulty = "edit";
  if (!appState.parsedTJACharts[defaultDifficulty]) defaultDifficulty = "oni";
  if (!appState.parsedTJACharts[defaultDifficulty]) defaultDifficulty = difficulties[0];

  courseBranchSelect.difficulty = defaultDifficulty;
  updatePlayerSideOptions();
  updateChartSelection(true);

  if (appState.activeDataSourceMode === "stream") {
    courseBranchSelect.hide();
  } else {
    courseBranchSelect.show();
  }

  updateStatsComponent(null);

  // Apply saved default view options (only if not from stream)
  if (!fromStream) {
    const profile = loadUserProfile();
    if (profile.defaultViewOptions) {
      const defaults = profile.defaultViewOptions;
      // Apply zoom
      if (defaults.zoom === "auto") {
        appState.renderOptions.autoZoom = true;
      } else {
        appState.renderOptions.autoZoom = false;
        appState.renderOptions.beatsPerLine = defaults.zoom;
      }
      // Apply note stats visibility
      const viewOptionsEl = document.querySelector("view-options") as { statsVisible: boolean } | null;
      if (viewOptionsEl) {
        viewOptionsEl.statsVisible = defaults.showNoteStats;
      }
      // Notify view-options component to re-render
      document.dispatchEvent(new Event("view-options-update"));
    }

    // Auto-annotate on load (only if enabled and not from stream)
    if (profile.autoAnnotateOnLoad) {
      // Use setTimeout to ensure chart is fully loaded first
      setTimeout(() => {
        // Switch to annotation tab
        const annotateTab = document.querySelector('.panel-tab[data-do-tab="annotation"]') as HTMLElement;
        if (annotateTab) {
          annotateTab.click();
        }
        // Trigger auto-annotate
        if (tjaChart && typeof tjaChart.autoAnnotate === "function") {
          tjaChart.autoAnnotate();
        }
      }, 100);
    }
  }
}

export function updateLoopControls() {
  const judgementOptions = document.querySelector("judgement-options") as JudgementOptions;
  if (judgementOptions && typeof judgementOptions.refreshStatus === "function") {
    judgementOptions.refreshStatus(false);
  }
}

export function refreshChart() {
  if (!tjaChart) return;

  // 1. Check for Stream Waiting State
  if ((appState.isStreamConnected || appState.isSimulating) && !appState.hasReceivedGameStart) {
    tjaChart.showMessage(i18n.t("ui.stream.waitingStart"), "info");
    updateLoopControls();
    return;
  }

  if (appState.currentChart) {
    // Determine mode for checks
    const activeTab = document.querySelector("#chart-options-panel .panel-tab.active");
    const mode = activeTab ? activeTab.getAttribute("data-do-tab") : "view";

    // 1. Check for All Branches + Selection/Annotation Mode
    if (appState.renderOptions.showAllBranches && (mode === "selection" || mode === "annotation")) {
      tjaChart.showMessage(i18n.t("ui.error.branchAllMode"), "warning");
      updateLoopControls();
      return;
    }

    // 2. Check for Branching + Judgement Mode
    const isJudgementMode = appState.renderOptions.viewMode.startsWith("judgements");
    // Check if branching UI is active/visible as a proxy for "chart has branching"
    const selectedDiff = courseBranchSelect.difficulty;
    let rootChart = appState.parsedTJACharts?.[selectedDiff];
    if (rootChart?.playerSides) {
      const side = courseBranchSelect.playerSide;
      rootChart = rootChart.playerSides[side] || rootChart;
    }
    const hasBranching = rootChart?.branches;

    if (isJudgementMode && hasBranching) {
      tjaChart.showMessage(i18n.t("ui.judgement.branchingNotSupported"), "warning");
      updateLoopControls();
      return;
    }

    tjaChart.clearMessage();

    const texts: RenderTexts = {
      loopPattern: i18n.t("renderer.loop"),
      judgement: {
        perfect: i18n.t("renderer.judge.perfect"),
        good: i18n.t("renderer.judge.good"),
        poor: i18n.t("renderer.judge.poor"),
      },
      course: {
        easy: i18n.t("ui.difficulty.easy"),
        normal: i18n.t("ui.difficulty.normal"),
        hard: i18n.t("ui.difficulty.hard"),
        oni: i18n.t("ui.difficulty.oni"),
        edit: i18n.t("ui.difficulty.edit"),
        ura: i18n.t("ui.difficulty.edit"),
      },
    };

    // Update annotations
    appState.renderOptions.annotations = appState.annotations;
    appState.renderOptions.isAnnotationMode = mode === "annotation";

    let finalRenderOptions = appState.renderOptions;
    if (appState.displayOnlySelected && appState.renderOptions.selection && !appState.renderOptions.showAllBranches) {
      finalRenderOptions = {
        ...appState.renderOptions,
        range: {
          start: appState.renderOptions.selection.start,
          end: appState.renderOptions.selection.end || appState.renderOptions.selection.start,
        },
        selection: null,
      };
    }

    // Apply language overrides synchronously if possible
    if (appState.currentEsePath) {
      finalRenderOptions = {
        ...finalRenderOptions,
        tjaSourceName: "TJADB",
      };

      const mapping = getCachedSongMapping();
      if (mapping) {
        const mappingEntry = Object.values(mapping).find((entry) => entry.esePath === appState.currentEsePath);
        if (mappingEntry) {
          const profile = loadUserProfile();
          const preferredTarget = profile.preferredChartLanguage ?? ChartLanguage.Auto;
          const lang = preferredTarget === ChartLanguage.Auto ? i18n.language : preferredTarget;

          const locTitle = getLocalizedTitle(mappingEntry, lang);
          const locSubtitle = getLocalizedSubtitle(mappingEntry, lang) ?? appState.currentChart?.subtitle ?? "";

          finalRenderOptions = {
            ...finalRenderOptions,
            titleOverride: locTitle,
            subtitleOverride: locSubtitle,
          };
        }
      } else {
        preloadSongMapping().then((loadedMapping) => {
          const mappingEntry = Object.values(loadedMapping).find((entry) => entry.esePath === appState.currentEsePath);
          if (mappingEntry) {
            const profile = loadUserProfile();
            const preferredTarget = profile.preferredChartLanguage ?? ChartLanguage.Auto;
            const lang = preferredTarget === ChartLanguage.Auto ? i18n.language : preferredTarget;

            const locTitle = getLocalizedTitle(mappingEntry, lang);
            const locSubtitle = getLocalizedSubtitle(mappingEntry, lang) ?? appState.currentChart?.subtitle ?? "";

            if (tjaChart.renderOptions) {
              if (
                tjaChart.renderOptions.titleOverride !== locTitle ||
                tjaChart.renderOptions.subtitleOverride !== locSubtitle
              ) {
                tjaChart.renderOptions = {
                  ...tjaChart.renderOptions,
                  titleOverride: locTitle,
                  subtitleOverride: locSubtitle,
                };
              }
            }
          }
        });
      }
    }

    tjaChart.chart = appState.currentChart;
    tjaChart.renderOptions = finalRenderOptions;
    tjaChart.judgements = appState.judgements;
    tjaChart.texts = texts;

    updateLoopControls();
  }
}
