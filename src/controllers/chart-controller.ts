import type { HitInfo, RenderTexts } from "../core/renderer.js";
import { parseTJA } from "../core/tja-parser.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import {
  branchSelector,
  branchSelectorContainer,
  clearSelectionBtn,
  difficultySelector,
  difficultySelectorContainer,
  exportSelectionBtn,
  noteStatsDisplay,
  tjaChart,
} from "../view/ui-elements.js";

export function updateStatsComponent(hit: HitInfo | null) {
  if (noteStatsDisplay) {
    noteStatsDisplay.chart = appState.currentChart;
    noteStatsDisplay.viewOptions = appState.viewOptions;
    noteStatsDisplay.judgements = appState.judgements;
    noteStatsDisplay.judgementDeltas = appState.judgementDeltas;
    noteStatsDisplay.hit = hit;
  }
}

export function updateSelectionUI() {
  if (clearSelectionBtn) {
    clearSelectionBtn.disabled = !appState.viewOptions.selection;
  }
  if (exportSelectionBtn) {
    exportSelectionBtn.disabled = !appState.viewOptions.selection;
  }
}

export function clearJudgements() {
  appState.judgements = [];
  appState.judgementDeltas = [];
  updateStatsComponent(appState.selectedNoteHitInfo);
}

export function updateBranchSelectorState(resetBranch: boolean = false) {
  clearJudgements();
  if (!appState.parsedTJACharts) return;

  const selectedDiff = difficultySelector.value;
  const rootChart = appState.parsedTJACharts[selectedDiff];

  if (!rootChart) return;

  if (rootChart.branches) {
    branchSelectorContainer.hidden = false;
    branchSelectorContainer.style.display = "flex";
    if (resetBranch) {
      branchSelector.value = "all";
    }

    const branchType = branchSelector.value;

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
    branchSelectorContainer.hidden = true;
    branchSelectorContainer.style.display = "none";
    appState.viewOptions.showAllBranches = false;
    appState.currentChart = rootChart;
  }

  updateCollapseLoopState();
  refreshChart();
}

export function updateCollapseLoopState() {
  // biome-ignore lint/suspicious/noExplicitAny: Circular dependency
  const judgementOptions = document.querySelector("judgement-options") as any;
  if (!judgementOptions || typeof judgementOptions.setLoopCollapseState !== "function") return;

  const hasLoop = appState.currentChart?.loop;

  if (hasLoop) {
    // Enabled, and check if it was previously checked?
    // The component manages 'checked' state internally or via appState?
    // appState.viewOptions.collapsedLoop stores the state.
    // We should probably just enable it. The checkbox state should reflect appState.
    judgementOptions.setLoopCollapseState(true, appState.viewOptions.collapsedLoop);
  } else {
    // Disabled and unchecked
    appState.viewOptions.collapsedLoop = false;
    judgementOptions.setLoopCollapseState(false, false);
  }
}

// Helper to read file as text (compatibility wrapper)
export function updateParsedCharts(content: string) {
  appState.parsedTJACharts = parseTJA(content);

  // Clear selection
  appState.viewOptions.selection = null;
  appState.selectedNoteHitInfo = null;
  updateSelectionUI();

  // Clear Annotations
  appState.annotations = {};

  difficultySelector.innerHTML = "";

  const difficulties = Object.keys(appState.parsedTJACharts);

  if (difficulties.length === 0) {
    difficultySelectorContainer.hidden = true;
    difficultySelectorContainer.style.display = "none";
    throw new Error(i18n.t("status.noCourses"));
  }

  difficulties.forEach((diff) => {
    const option = document.createElement("option");
    option.value = diff;
    const key = `ui.difficulty.${diff.toLowerCase()}`;
    const translated = i18n.t(key);
    option.innerText = translated !== key ? translated : diff.charAt(0).toUpperCase() + diff.slice(1);
    difficultySelector.appendChild(option);
  });

  let defaultDifficulty = "edit";
  if (!appState.parsedTJACharts[defaultDifficulty]) defaultDifficulty = "oni";
  if (!appState.parsedTJACharts[defaultDifficulty]) defaultDifficulty = difficulties[0];

  difficultySelector.value = defaultDifficulty;
  updateBranchSelectorState(true);

  if (appState.activeDataSourceMode === "stream") {
    difficultySelectorContainer.hidden = true;
    difficultySelectorContainer.style.display = "none";
  } else {
    difficultySelectorContainer.hidden = false;
    difficultySelectorContainer.style.display = "flex";
  }

  updateStatsComponent(null);
}

export function updateLoopControls() {
  // biome-ignore lint/suspicious/noExplicitAny: Circular dependency
  const judgementOptions = document.querySelector("judgement-options") as any;
  if (judgementOptions) {
    if (typeof judgementOptions.updateLoopControlVisibility === "function") {
      judgementOptions.updateLoopControlVisibility();
    }
    if (typeof judgementOptions.updateLoopCounter === "function") {
      judgementOptions.updateLoopCounter();
    }
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
    const branchSelectorVisible = branchSelectorContainer && !branchSelectorContainer.hidden;

    if (isJudgementMode && branchSelectorVisible) {
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

    tjaChart.chart = appState.currentChart;
    tjaChart.viewOptions = appState.viewOptions;
    tjaChart.judgements = appState.judgements;
    tjaChart.judgementDeltas = appState.judgementDeltas;
    tjaChart.texts = texts;

    updateLoopControls();
  }
}
