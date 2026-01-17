import type { ServerEvent } from "./clients/judgement-client.js";
import "./components/chart-list-panel.js"; // Ensure side-effect
import { NoteStatsDisplay } from "./components/note-stats.js";
import "./components/save-image-button.js";
import type { JudgementOptions } from "./components/judgement-options.js";
import "./components/judgement-options.js"; // Ensure side-effect
import "./components/select-options.js"; // Ensure side-effect
import "./components/annotate-options.js"; // Ensure side-effect
import "./components/course-branch-select.js"; // Ensure side-effect
import { TJAChart } from "./components/tja-chart.js";
import type { ViewOptions } from "./components/view-options.js";
import "./components/view-options.js"; // Ensure side-effect
import "./components/changelog-panel.js";
import {
  clearJudgements,
  refreshChart,
  updateBranchSelectorState,
  updateCollapseLoopState,
  updateParsedCharts,
  updateSelectionUI,
  updateStatsComponent,
} from "./controllers/chart-controller.js";
import { handleLayoutToggle, updateLayout } from "./controllers/layout-controller.js";
import type { HitInfo } from "./core/renderer.js";
import { appState } from "./state/app-state.js";
import { i18n } from "./utils/i18n.js";
import {
  chartListPanel,
  chartModeStatus,
  connectBtn,
  courseBranchSelect,
  doPanes,
  doTabs,
  dsBody,
  dsCollapseBtn,
  dsPanes,
  dsTabs,
  hostInput,
  languageSelector,
  layoutToggleBtn,
  optionsBody,
  optionsCollapseBtn,
  portInput,
  statusDisplay,
  testStreamBtn,
  tjaChart,
  tjaFilePicker,
} from "./view/ui-elements.js";

// Ensure TJAChart is imported for side-effects (custom element registration)
console.log("TJAChart module loaded", TJAChart);
// Ensure NoteStatsDisplay is imported for side-effects
console.log("NoteStatsDisplay module loaded", NoteStatsDisplay);

function updateStatus(key: string, params?: Record<string, string | number>) {
  appState.currentStatusKey = key;
  appState.currentStatusParams = params;
  if (statusDisplay) {
    statusDisplay.innerText = i18n.t(key, params);
  }
}

function updateModeStatus(mode: string) {
  if (chartModeStatus) {
    if (mode === "view") chartModeStatus.innerText = i18n.t("mode.view");
    else if (mode === "judgements") chartModeStatus.innerText = i18n.t("mode.judgements");
    else if (mode === "selection") chartModeStatus.innerText = i18n.t("mode.selection");
    else if (mode === "annotation") chartModeStatus.innerText = i18n.t("mode.annotation");
  }
}

function switchDisplayOptionTab(mode: string) {
  doTabs.forEach((t) => {
    if (t.getAttribute("data-do-tab") === mode) t.classList.add("active");
    else t.classList.remove("active");
  });

  doPanes.forEach((p) => {
    const isTarget = p.id === `do-tab-${mode}`;
    if (isTarget) {
      // Restore flex for view, block for selection/annotation/judgements
      if (mode === "view") (p as HTMLElement).style.display = "flex";
      else (p as HTMLElement).style.display = "block";
    } else {
      (p as HTMLElement).style.display = "none";
    }
  });

  updateModeStatus(mode);
  updateDisplayState();
}

function switchDataSourceMode(mode: string) {
  appState.activeDataSourceMode = mode;
  console.log(`Switching data source mode to: ${mode}`);

  // Update Tabs
  dsTabs.forEach((t) => {
    if (t.getAttribute("data-mode") === mode) t.classList.add("active");
    else t.classList.remove("active");
  });

  // Update Panes
  dsPanes.forEach((p) => {
    if (p.id === `tab-${mode}`) {
      (p as HTMLElement).style.display = "block";
    } else {
      (p as HTMLElement).style.display = "none";
    }
  });

  // Logic: Disconnect if moving away from stream and currently connected
  if (mode !== "stream") {
    // Check if connected
    if (connectBtn && (connectBtn.innerText === "Disconnect" || appState.isSimulating)) {
      appState.judgementClient.disconnect();
    }
  }

  // List (Example + ESE) Logic
  if (mode === "list") {
    if (chartListPanel) {
      chartListPanel.activate();
    }
  }

  // Difficulty Selector Visibility
  if (courseBranchSelect) {
    if (mode === "stream") {
      courseBranchSelect.hide();
    } else {
      // Show only if charts are parsed
      const visible = !!appState.parsedTJACharts;
      if (visible) courseBranchSelect.show();
      else courseBranchSelect.hide();
    }
  }

  // Clear picker if leaving file mode? Optional.
  if (mode !== "file" && tjaFilePicker) {
    // tjaFilePicker.value = ''; // Maybe keep it for convenience
  }
}

function updateUIText() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key) {
      if (el.tagName === "INPUT" && (el as HTMLInputElement).placeholder) {
        // Handle placeholder if needed, currently none
      } else {
        // For text nodes, we might have replaced content.
        (el as HTMLElement).innerHTML = i18n.t(key);
      }
    }
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    if (key) {
      (el as HTMLInputElement).placeholder = i18n.t(key);
    }
  });

  // Dynamic Elements
  updateStatus(appState.currentStatusKey, appState.currentStatusParams);

  // Difficulty selector updates itself

  // Update Mode Status
  const activeTab = document.querySelector("#chart-options-panel .panel-tab.active");
  if (activeTab) {
    updateModeStatus(activeTab.getAttribute("data-do-tab") || "view");
  }

  // Update collapsible buttons text based on state
  if (dsCollapseBtn && dsBody) {
    dsCollapseBtn.innerText = dsBody.classList.contains("collapsed") ? i18n.t("ui.expand") : i18n.t("ui.collapse");
  }
  if (optionsCollapseBtn && optionsBody) {
    optionsCollapseBtn.innerText = optionsBody.classList.contains("collapsed")
      ? i18n.t("ui.expand")
      : i18n.t("ui.collapse");
  }

  // Refresh chart (redraws text on canvas) and stats
  refreshChart();
  // Re-render stats if a note is selected
  // We can't easily re-render hover stats without a mouse event, but selected note stats persist.
  // If nothing selected, stats box is usually empty or showing last hover?
  // Actually renderStats is called on mousemove.
  if (appState.selectedNoteHitInfo) {
    updateStatsComponent(appState.selectedNoteHitInfo);
  }
}

function updateDisplayState() {
  const activeTab = document.querySelector("#chart-options-panel .panel-tab.active");
  const mode = activeTab ? activeTab.getAttribute("data-do-tab") : "view";
  const _isStreamActive = appState.isStreamConnected || appState.isSimulating;

  if (mode === "judgements") {
    if (appState.viewOptions.viewMode === "original") {
      appState.viewOptions.viewMode = "judgements-underline";
    }

    // We need to refresh the component status
    const judgementOptions = document.querySelector("judgement-options") as JudgementOptions;
    if (judgementOptions && typeof judgementOptions.refreshStatus === "function") {
      judgementOptions.refreshStatus();
    }
  } else {
    appState.viewOptions.viewMode = "original";
  }

  // Determine Coloring Mode - Handled by component

  // Determine Judgement Visibility - Handled by component

  refreshChart();
}

// Helper to read file as text (compatibility wrapper)
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof file.text === "function") {
      file.text().then(resolve).catch(reject);
    } else {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    }
  });
}

function initLayout() {
  // Layout Init
  if (layoutToggleBtn) {
    layoutToggleBtn.addEventListener("click", () => handleLayoutToggle(() => refreshChart()));
  }
  window.addEventListener("resize", () => {
    updateLayout();
    refreshChart();
  });

  // Initial call
  updateLayout();

  // Initialize ViewOptions state based on layout
  const viewOptions = document.querySelector("view-options") as ViewOptions;
  if (viewOptions && typeof viewOptions.initializeFromLayout === "function") {
    viewOptions.initializeFromLayout();
  }
}

function initEventListeners() {
  if (!tjaChart) {
    console.error("tja-chart element not found.");
    return;
  }

  // Listen for status changes from ChartListPanel
  if (chartListPanel) {
    chartListPanel.addEventListener("status-change", (e: Event) => {
      const detail = (e as CustomEvent).detail;
      updateStatus(detail.key, detail.params);
    });
  }

  // Listeners for new checkboxes - Moved to judgement-options.ts

  // judgementStyleRadios & judgementColoringRadios - Moved to judgement-options.ts

  // Setup Data Source Tabs

  dsTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.getAttribute("data-mode");

      if (mode) switchDataSourceMode(mode);
    });
  });

  // Setup Display Options Tabs
  doTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      const mode = tab.getAttribute("data-do-tab");
      if (mode) switchDisplayOptionTab(mode);
    });
  });

  // Setup Collapse Button

  if (dsCollapseBtn && dsBody) {
    dsCollapseBtn.addEventListener("click", () => {
      if (dsBody.classList.contains("collapsed")) {
        dsBody.classList.remove("collapsed");

        dsCollapseBtn.innerText = i18n.t("ui.collapse");
      } else {
        dsBody.classList.add("collapsed");

        dsCollapseBtn.innerText = i18n.t("ui.expand");
      }
    });
  }

  // Setup Display Options Collapse Button
  if (optionsCollapseBtn && optionsBody) {
    optionsCollapseBtn.addEventListener("click", () => {
      if (optionsBody.classList.contains("collapsed")) {
        optionsBody.classList.remove("collapsed");

        optionsCollapseBtn.innerText = i18n.t("ui.collapse");
      } else {
        optionsBody.classList.add("collapsed");

        optionsCollapseBtn.innerText = i18n.t("ui.expand");
      }
    });
  }

  // Setup File Picker

  if (tjaFilePicker) {
    tjaFilePicker.addEventListener("change", async (event) => {
      const files = (event.target as HTMLInputElement).files;

      if (files && files.length > 0) {
        const file = files[0];

        try {
          const content = await readFileAsText(file);

          appState.loadedTJAContent = content;

          updateParsedCharts(content);

          updateStatus("status.fileLoaded");

          if (chartListPanel) chartListPanel.resetExampleButton();
        } catch (e) {
          console.error("Error parsing TJA file:", e);
          const msg = i18n.t("status.parseError", { error: e instanceof Error ? e.message : String(e) });
          alert(msg);
          if (statusDisplay) statusDisplay.innerText = msg;
        }
      }
    });
  }

  // Setup Stream Controls
  if (connectBtn && hostInput && portInput) {
    connectBtn.addEventListener("click", () => {
      if (appState.isStreamConnected) {
        appState.judgementClient.disconnect();
      } else {
        const host = hostInput.value;
        const port = parseInt(portInput.value, 10);
        if (host && port) {
          appState.judgementClient.connect(host, port);
        } else {
          alert("Please enter valid Host and Port.");
        }
      }
    });
  }

  if (testStreamBtn) {
    testStreamBtn.addEventListener("click", () => {
      if (appState.isSimulating) {
        appState.judgementClient.disconnect();
        appState.isSimulating = false;
        testStreamBtn.setAttribute("data-i18n", "ui.test.start");
        testStreamBtn.innerText = i18n.t("ui.test.start");
      } else {
        appState.isSimulating = true;
        clearJudgements();
        updateDisplayState();

        testStreamBtn.setAttribute("data-i18n", "ui.test.stop");
        testStreamBtn.innerText = i18n.t("ui.test.stop");

        // Use currently loaded content and selected difficulty
        appState.judgementClient.startSimulation(appState.loadedTJAContent, courseBranchSelect.difficulty);
      }
    });
  }

  // Setup Collapse Button
  if (languageSelector) {
    languageSelector.value = i18n.language;
    languageSelector.addEventListener("change", () => {
      i18n.language = languageSelector.value;
    });
  }

  i18n.onLanguageChange(() => {
    updateUIText();
  });

  // Load Version
  const appVersionEl = document.getElementById("app-version");
  if (appVersionEl) {
    fetch("version.json")
      .then((res) => {
        if (!res.ok) throw new Error("Version file not found");
        return res.json();
      })
      .then((data) => {
        if (data?.version) {
          appVersionEl.innerText = `v${data.version}`;
        }
      })
      .catch((e) => {
        console.warn("Failed to load version:", e);
      });
  }

  // Canvas Interaction

  // Listen to custom events
  tjaChart.addEventListener("annotations-change", (e: Event) => {
    const newAnnotations = (e as CustomEvent).detail;
    appState.annotations = newAnnotations;
    refreshChart();
  });

  tjaChart.addEventListener("chart-hover", (e: Event) => {
    const detail = (e as CustomEvent).detail;
    const hit = detail.hit as HitInfo | null;

    // Render stats
    const statsHit = appState.selectedNoteHitInfo || hit;
    updateStatsComponent(statsHit);

    // Update Hover Style
    const viewOptionsEl = document.querySelector("view-options") as ViewOptions;
    const isStatsVisible = viewOptionsEl?.statsVisible ?? false;
    const newHoveredNote =
      isStatsVisible && hit
        ? { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex, branch: hit.branch }
        : null;

    const currentHovered = appState.viewOptions.hoveredNote;
    let changed = false;

    if (!currentHovered && !newHoveredNote) {
      changed = false;
    } else if (!currentHovered || !newHoveredNote) {
      changed = true;
    } else {
      changed =
        currentHovered.originalBarIndex !== newHoveredNote.originalBarIndex ||
        currentHovered.charIndex !== newHoveredNote.charIndex ||
        currentHovered.branch !== newHoveredNote.branch;
    }

    if (changed) {
      appState.viewOptions.hoveredNote = newHoveredNote;
      refreshChart();
    }
  });

  tjaChart.addEventListener("chart-click", (e: Event) => {
    const detail = (e as CustomEvent).detail;
    const hit = detail.hit as HitInfo | null;

    if (!appState.currentChart) return;
    const activeTab = document.querySelector("#chart-options-panel .panel-tab.active");
    const mode = activeTab ? activeTab.getAttribute("data-do-tab") : "view";

    if (appState.viewOptions.showAllBranches && (mode === "annotation" || mode === "selection")) return;

    // Annotation logic moved to component (annotations-change event)
    if (mode === "annotation") return;

    if (mode !== "selection") return;

    // Selection Logic (same as before)
    if (hit) {
      if (!appState.viewOptions.selection) {
        appState.viewOptions.selection = {
          start: { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex },
          end: null,
        };
        appState.selectedNoteHitInfo = hit;
      } else if (appState.viewOptions.selection.start && !appState.viewOptions.selection.end) {
        if (
          appState.viewOptions.selection.start.originalBarIndex === hit.originalBarIndex &&
          appState.viewOptions.selection.start.charIndex === hit.charIndex
        ) {
          appState.viewOptions.selection = null;
          appState.selectedNoteHitInfo = null;
        } else {
          appState.viewOptions.selection.end = { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex };
          appState.selectedNoteHitInfo = hit;
        }
      } else {
        appState.viewOptions.selection = {
          start: { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex },
          end: null,
        };
        appState.selectedNoteHitInfo = hit;
      }
    } else {
      appState.viewOptions.selection = null;
      appState.selectedNoteHitInfo = null;
    }
    refreshChart();
    updateSelectionUI();
    updateStatsComponent(appState.selectedNoteHitInfo);
  });

  courseBranchSelect.addEventListener("difficulty-change", () => {
    updateBranchSelectorState(true);
  });

  courseBranchSelect.addEventListener("branch-change", () => {
    updateBranchSelectorState(false);
  });

  // ESE Share Button handled by ChartListPanel
}

function initJudgementClient() {
  // Judgement Client Callbacks

  appState.judgementClient.onMessage(async (event: ServerEvent) => {
    if (event.type === "gameplay_start") {
      console.log("Gameplay Start Event Received");

      appState.judgements = [];

      appState.judgementDeltas = [];

      appState.currentChart = null;

      appState.hasReceivedGameStart = true;

      // Clear selection
      appState.viewOptions.selection = null;
      appState.selectedNoteHitInfo = null;
      updateSelectionUI();

      updateStatus("status.receiving");

      if (event.tjaSummaries && event.tjaSummaries.length > 0) {
        // Sort by player to ensure we get Player 1
        const sortedSummaries = [...event.tjaSummaries].sort((a, b) => a.player - b.player);
        const summary = sortedSummaries[0];

        updateParsedCharts(summary.tjaContent);

        const diff = summary.difficulty.toLowerCase();
        if (appState.parsedTJACharts?.[diff]) {
          courseBranchSelect.difficulty = diff;
          appState.currentChart = appState.parsedTJACharts[diff];
        }
      }

      updateCollapseLoopState();

      refreshChart();

      if (chartListPanel) chartListPanel.resetExampleButton();
    } else if (event.type === "judgement") {
      appState.judgements.push(event.judgement);

      appState.judgementDeltas.push(event.msDelta);

      refreshChart();
    }
  });

  appState.judgementClient.onStatusChange((status: string) => {
    if (connectBtn) {
      if (status === "Connected") {
        appState.isStreamConnected = true;
        connectBtn.innerText = i18n.t("ui.stream.disconnect");
      } else {
        // Only set to connect if disconnected or connecting...
        if (status !== "Connecting...") {
          connectBtn.innerText = i18n.t("ui.stream.connect");
        }
      }
    }

    if (status === "Connected") {
      appState.isStreamConnected = true;

      // Reset for new connection session
      appState.hasReceivedGameStart = false;

      if (appState.isSimulating) {
        updateStatus("status.simConnected");
      } else {
        updateStatus("status.connected");
        if (testStreamBtn) testStreamBtn.disabled = true;
      }

      // Clear chart to force waiting screen
      if (!appState.isSimulating) {
        // Simulation sends start event immediately usually, but good to be safe
        appState.currentChart = null;
        refreshChart();
      }
    } else if (status === "Connecting...") {
      updateStatus("status.connecting");
      appState.hasReceivedGameStart = false;
      if (testStreamBtn) testStreamBtn.disabled = true;
      if (connectBtn) connectBtn.disabled = true;
    } else {
      // Disconnected
      appState.isStreamConnected = false;
      appState.hasReceivedGameStart = false;

      // Re-enable controls if we were in test mode
      if (testStreamBtn) {
        testStreamBtn.disabled = false;
        if (appState.isSimulating) {
          testStreamBtn.setAttribute("data-i18n", "ui.test.start");
          testStreamBtn.innerText = i18n.t("ui.test.start");
        }
      }
      if (connectBtn) connectBtn.disabled = false;

      updateStatus(appState.isSimulating ? "status.simStopped" : "status.disconnected");
      appState.isSimulating = false;
    }
    updateDisplayState();
  });
}

function initLoad() {
  // Initial Load
  updateStatus("status.ready");
  updateUIText(); // Initialize text

  // Check URL Params
  const urlParams = new URLSearchParams(window.location.search);
  const eseParam = urlParams.get("ese");
  const diffParam = urlParams.get("diff");

  if (eseParam) {
    if (chartListPanel) {
      chartListPanel.setPendingLoad(eseParam, diffParam || "oni");
    }
    switchDataSourceMode("list");
  } else {
    switchDataSourceMode("list");
    if (chartListPanel) chartListPanel.loadExample();
  }

  initializePanelVisibility();
}

function init(): void {
  initLayout();

  initEventListeners();

  initJudgementClient();

  initLoad();
}

function initializePanelVisibility() {
  if (!dsBody || !optionsBody) return;

  // Temporarily expand to measure
  dsBody.classList.remove("collapsed");
  optionsBody.classList.remove("collapsed");

  const dsHeight = dsBody.offsetHeight;
  const optionsHeight = optionsBody.offsetHeight;
  const viewportHeight = window.innerHeight;

  const totalExpandedHeight = dsHeight + optionsHeight;

  if (totalExpandedHeight < viewportHeight / 2) {
    // Expand
    dsBody.classList.remove("collapsed");
    optionsBody.classList.remove("collapsed");
    if (dsCollapseBtn) dsCollapseBtn.innerText = i18n.t("ui.collapse");
    if (optionsCollapseBtn) optionsCollapseBtn.innerText = i18n.t("ui.collapse");
  } else {
    // Collapse
    dsBody.classList.add("collapsed");
    optionsBody.classList.add("collapsed");
    if (dsCollapseBtn) dsCollapseBtn.innerText = i18n.t("ui.expand");
    if (optionsCollapseBtn) optionsCollapseBtn.innerText = i18n.t("ui.expand");
  }
}

// Handle resizing
let resizeTimeout: number | undefined;
window.addEventListener("resize", () => {
  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
  }
  resizeTimeout = window.setTimeout(() => {
    refreshChart();
  }, 100);
});

// Expose for testing
window.setJudgements = (newJudgements: string[], newDeltas?: (number | undefined)[]) => {
  appState.judgements = newJudgements;
  appState.judgementDeltas = newDeltas || [];
  refreshChart();
  updateStatsComponent(null);
};

window.loadTJAContent = (content: string) => {
  appState.loadedTJAContent = content;
  updateParsedCharts(content);
  updateStatus("status.fileLoaded");
};

// biome-ignore lint/suspicious/noExplicitAny: Test helper
window.setViewOptions = (opts: any) => {
  appState.viewOptions = { ...appState.viewOptions, ...opts };
  refreshChart();
};

init();
