import * as Renderer from "tja-renderer";
import type { JudgementOptions } from "../components/judgement-options.js";
import type { SelectOptions } from "../components/select-options.js";
import { getLocalizedSubtitle, getLocalizedTitle } from "../models/song-mapping.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { getCachedSongMapping, preloadSongMapping } from "../utils/playdata-status.js";
import { ChartLanguage, loadUserProfile } from "../utils/user-profile.js";
import { courseBranchSelect, noteStatsDisplay, tjaChart } from "../view/ui-elements.js";

const { LocationMap, parseTJA } = Renderer.Private;
type HitInfo = Renderer.Private.HitInfo;
type RenderTexts = Renderer.Private.RenderTexts;

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
  }

  // Only update if the URL has actually changed
  if (url.toString() !== window.location.href) {
    window.history.replaceState(null, "", url.toString());
  }
}

export function updateStatsComponent(hit: HitInfo | null) {
  // Logic: note stats shows selected note, or hovered note if it's a note.
  // branch stats shows hovered branch line.
  const noteHit = appState.selectedNoteHitInfo || (hit && hit.charIndex !== -1 ? hit : null);
  const branchHit = appState.selectedBranchHitInfo || (hit && hit.charIndex === -1 ? hit : null);

  if (noteStatsDisplay) {
    noteStatsDisplay.chart = appState.currentChart;
    noteStatsDisplay.viewOptions = appState.viewOptions;
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

export function updateBranchSelectorState(resetBranch: boolean = false) {
  clearJudgements();
  if (!appState.parsedTJACharts) return;

  const selectedDiff = courseBranchSelect.difficulty;
  const rootChart = appState.parsedTJACharts[selectedDiff];

  if (!rootChart) return;

  if (rootChart.branches) {
    courseBranchSelect.setBranchVisibility(true);
    if (resetBranch) {
      courseBranchSelect.branch = "all";
    }

    const branchType = courseBranchSelect.branch;

    if (branchType === "all") {
      appState.viewOptions.showAllBranches = true;
      appState.currentChart = rootChart;
    } else {
      appState.viewOptions.showAllBranches = false;
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
    appState.viewOptions.showAllBranches = false;
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
    judgementOptions.setLoopCollapseState(true, appState.viewOptions.collapsedLoop);
  } else {
    // Disabled and unchecked
    appState.viewOptions.collapsedLoop = false;
    judgementOptions.setLoopCollapseState(false, false);
  }
}

// Helper to read file as text (compatibility wrapper)
export function updateParsedCharts(content: string, fromStream = false) {
  appState.parsedTJACharts = parseTJA(content);

  // Clear selection
  appState.viewOptions.selection = null;
  appState.selectedNoteHitInfo = null;
  updateSelectionUI();

  // Clear Annotations
  appState.annotations = new LocationMap();

  courseBranchSelect.clearDifficultyOptions();

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
  updateBranchSelectorState(true);

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
        appState.viewOptions.autoZoom = true;
      } else {
        appState.viewOptions.autoZoom = false;
        appState.viewOptions.beatsPerLine = defaults.zoom;
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
    if (appState.viewOptions.showAllBranches && (mode === "selection" || mode === "annotation")) {
      tjaChart.showMessage(i18n.t("ui.error.branchAllMode"), "warning");
      updateLoopControls();
      return;
    }

    // 2. Check for Branching + Judgement Mode
    const isJudgementMode = appState.viewOptions.viewMode.startsWith("judgements");
    // Check if branching UI is active/visible as a proxy for "chart has branching"
    const selectedDiff = courseBranchSelect.difficulty;
    const rootChart = appState.parsedTJACharts?.[selectedDiff];
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

    // Update viewOptions annotations
    appState.viewOptions.annotations = appState.annotations;
    appState.viewOptions.isAnnotationMode = mode === "annotation";

    let finalViewOptions = appState.viewOptions;
    if (appState.displayOnlySelected && appState.viewOptions.selection && !hasBranching) {
      finalViewOptions = {
        ...appState.viewOptions,
        range: {
          start: appState.viewOptions.selection.start,
          end: appState.viewOptions.selection.end || appState.viewOptions.selection.start,
        },
        selection: null,
      };
    }

    // Apply language overrides synchronously if possible
    if (appState.currentEsePath) {
      finalViewOptions = {
        ...finalViewOptions,
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

          finalViewOptions = {
            ...finalViewOptions,
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

            if (tjaChart.viewOptions) {
              if (
                tjaChart.viewOptions.titleOverride !== locTitle ||
                tjaChart.viewOptions.subtitleOverride !== locSubtitle
              ) {
                tjaChart.viewOptions = {
                  ...tjaChart.viewOptions,
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
    tjaChart.viewOptions = finalViewOptions;
    tjaChart.judgements = appState.judgements;
    tjaChart.texts = texts;

    updateLoopControls();
  }
}
