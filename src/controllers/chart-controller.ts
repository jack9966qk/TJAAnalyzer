import type { JudgementOptions } from "../components/judgement-options.js";
import type { SelectOptions } from "../components/select-options.js";
import type { HitInfo, RenderTexts } from "../core/renderer.js";
import { parseTJA } from "../core/tja-parser.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { courseBranchSelect, noteStatsDisplay, tjaChart } from "../view/ui-elements.js";

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
  // Notify component
  const selectOptions = document.querySelector("select-options") as SelectOptions;
  if (selectOptions && typeof selectOptions.refreshStatus === "function") {
    selectOptions.refreshStatus();
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
    // Since courseBranchSelect encapsulates this, we need to check if branches are present.
    // Or check if showAllBranches is true or branches property exists.
    // Better: check if currentChart has branches? No, currentChart is a specific branch target unless showAllBranches.
    // We can rely on appState.viewOptions.showAllBranches or check if root chart has branches.
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

    tjaChart.chart = appState.currentChart;
    tjaChart.viewOptions = appState.viewOptions;
    tjaChart.judgements = appState.judgements;
    tjaChart.judgementDeltas = appState.judgementDeltas;
    tjaChart.texts = texts;

    updateLoopControls();
  }
}
