import { registerSW } from "virtual:pwa-register";
import * as Neutralino from "@neutralinojs/lib";
import type { ServerEvent } from "./clients/judgement-client.js";
import "./style.css";
import { startupLog } from "./utils/startup-log.js";

startupLog.record("main module executing");

window.Neutralino = Neutralino;
import "./components/chart-list-panel.js"; // Ensure side-effect
import "./components/local-file-panel.js"; // Ensure side-effect
import "./components/stream-panel.js"; // Ensure side-effect
import type { TesterPanel } from "./components/tester-panel.js";
import "./components/tester-panel.js"; // Ensure side-effect
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
import "./components/chart-options-footer.js"; // Ensure side-effect
import "./components/changelog-panel.js";
import "./components/language-selector.js";
import "./components/settings-panel.js";
import "./components/action-button.js";
import { parseFumenDatabaseHtml } from "./utils/fumen-database-parser.js";
import { parseTaikoWikiRatingHtml } from "./utils/taiko-wiki-parser.js";

import "./components/advanced-search-modal.js";
import * as Renderer from "tja-renderer";

const { createJudgementKey } = Renderer.Private;

type HitInfo = Renderer.Private.HitInfo;
type JudgementMap<T> = Renderer.Private.JudgementMap<T>;
type JudgementValue = Renderer.Private.JudgementValue;
type RenderOptions = Renderer.Private.RenderOptions;

import {
  refreshChart,
  restoreUrlState,
  updateChartSelection,
  updateCollapseLoopState,
  updatePageUrl,
  updateParsedCharts,
  updatePlayerSideOptions,
  updateSelectionUI,
  updateStatsComponent,
} from "./controllers/chart-controller.js";
import { handleLayoutToggle, updateLayout } from "./controllers/layout-controller.js";
import { exampleTJA } from "./core/example-data.js";
import { appState } from "./state/app-state.js";
import { i18n } from "./utils/i18n.js";
import {
  chartListPanel,
  chartModeStatus,
  courseBranchSelect,
  doPanes,
  doTabs,
  dsBody,
  dsCollapseIcon,
  dsPanelHeader,
  dsPanes,
  dsTabs,
  layoutToggleBtn,
  optionsBody,
  optionsCollapseIcon,
  optionsPanelHeader,
  statusDisplay,
  tjaChart,
} from "./view/ui-elements.js";

// Ensure TJAChart is imported for side-effects (custom element registration)
console.log("TJAChart module loaded", TJAChart);
// Ensure NoteStatsDisplay is imported for side-effects
console.log("NoteStatsDisplay module loaded", NoteStatsDisplay);

function initPWA() {
  startupLog.record("initPWA start");

  if (import.meta.env.DEV) {
    startupLog.record("initPWA skip (dev mode)");
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          console.log("Dev mode detected: Unregistering Service Worker", registration);
          registration.unregister();
        }
      });
    }
    return;
  }

  if ("serviceWorker" in navigator) {
    // Log whether a controller (service worker) is already active from a previous load.
    // If so, subsequent fetches may be served from cache.
    const hasController = !!navigator.serviceWorker.controller;
    startupLog.record(
      "SW controller check",
      hasController ? "controller active (cache available)" : "no controller yet (first load or bypassed)",
    );

    const updateSW = registerSW({
      onNeedRefresh() {
        startupLog.record("SW needs refresh (new version available)");
        console.log("New content available, reloading...");
        updateSW(true);
      },
      onOfflineReady() {
        startupLog.record("SW offline ready");
        console.log("App ready to work offline");
      },
      onRegisterError(error) {
        startupLog.record("SW registration error", String(error));
        console.error("SW registration failed", error);
        appState.swRegistrationError = error instanceof Error ? error.message : String(error);
      },
    });

    navigator.serviceWorker.addEventListener("controllerchange", () => {
      startupLog.record("SW controller changed");
      console.log("Controller changed");
    });
  } else {
    startupLog.record("SW not supported");
  }
}

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

  dsTabs.forEach((t) => {
    if (t.getAttribute("data-mode") === mode) t.classList.add("active");
    else t.classList.remove("active");
  });

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
    if (appState.isStreamConnected || appState.isSimulating) {
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

  // Update Mode Status
  const activeTab = document.querySelector("#chart-options-panel .panel-tab.active");
  if (activeTab) {
    updateModeStatus(activeTab.getAttribute("data-do-tab") || "view");
  }

  // Update collapsible buttons text based on state
  if (dsCollapseIcon && dsBody) {
    const isCollapsed = dsBody.classList.contains("collapsed");
    dsCollapseIcon.src = isCollapsed
      ? "assets/heroicons/optimized/24/outline/chevron-down.svg"
      : "assets/heroicons/optimized/24/outline/chevron-up.svg";
    dsCollapseIcon.alt = isCollapsed ? i18n.t("ui.expand") : i18n.t("ui.collapse");
  }
  if (optionsCollapseIcon && optionsBody) {
    const isCollapsed = optionsBody.classList.contains("collapsed");
    optionsCollapseIcon.src = isCollapsed
      ? "assets/heroicons/optimized/24/outline/chevron-down.svg"
      : "assets/heroicons/optimized/24/outline/chevron-up.svg";
    optionsCollapseIcon.alt = isCollapsed ? i18n.t("ui.expand") : i18n.t("ui.collapse");
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
    if (appState.renderOptions.viewMode === "original") {
      appState.renderOptions.viewMode = "judgements-underline";
    }

    // We need to refresh the component status
    const judgementOptions = document.querySelector("judgement-options") as JudgementOptions;
    if (judgementOptions && typeof judgementOptions.refreshStatus === "function") {
      judgementOptions.refreshStatus();
    }
  } else {
    appState.renderOptions.viewMode = "original";
  }

  refreshChart();
}

function updateTesterModeVisibility() {
  const testerTab = document.querySelector('.panel-tab[data-mode="tester"]');
  if (testerTab) {
    (testerTab as HTMLElement).style.display = appState.isTesterMode ? "inline-block" : "none";
  }

  if (!appState.isTesterMode && appState.activeDataSourceMode === "tester") {
    switchDataSourceMode("list");
  }
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

      if (detail.key === "status.chartLoaded") {
        const testerPanel = document.querySelector("tester-panel") as TesterPanel;
        if (testerPanel && typeof testerPanel.resetExampleButton === "function") {
          testerPanel.resetExampleButton();
        }
      }
    });
  }

  window.addEventListener("dev-mode-change", () => {
    updateTesterModeVisibility();
  });

  window.addEventListener("settings-change", () => {
    refreshChart();
  });

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

  if (dsPanelHeader && dsBody && dsCollapseIcon) {
    dsPanelHeader.style.cursor = "pointer";
    dsPanelHeader.addEventListener("click", () => {
      if (dsBody.classList.contains("collapsed")) {
        dsBody.classList.remove("collapsed");

        dsCollapseIcon.src = "assets/heroicons/optimized/24/outline/chevron-up.svg";
        dsCollapseIcon.alt = i18n.t("ui.collapse");
      } else {
        dsBody.classList.add("collapsed");

        dsCollapseIcon.src = "assets/heroicons/optimized/24/outline/chevron-down.svg";
        dsCollapseIcon.alt = i18n.t("ui.expand");
      }
    });
  }

  // Setup Display Options Collapse Button
  if (optionsPanelHeader && optionsBody && optionsCollapseIcon) {
    optionsPanelHeader.style.cursor = "pointer";
    optionsPanelHeader.addEventListener("click", () => {
      if (optionsBody.classList.contains("collapsed")) {
        optionsBody.classList.remove("collapsed");

        optionsCollapseIcon.src = "assets/heroicons/optimized/24/outline/chevron-up.svg";
        optionsCollapseIcon.alt = i18n.t("ui.collapse");
      } else {
        optionsBody.classList.add("collapsed");

        optionsCollapseIcon.src = "assets/heroicons/optimized/24/outline/chevron-down.svg";
        optionsCollapseIcon.alt = i18n.t("ui.expand");
      }
    });
  }

  // Setup File Picker (Now handled by local-file-panel)
  const localFilePanel = document.querySelector("local-file-panel");
  if (localFilePanel) {
    localFilePanel.addEventListener("status-change", (e: Event) => {
      const detail = (e as CustomEvent).detail;
      updateStatus(detail.key, detail.params);
    });

    localFilePanel.addEventListener("chart-loaded", () => {
      // chartListPanel reset example button is no longer relevant as button is gone
      const testerPanel = document.querySelector("tester-panel") as TesterPanel;
      if (testerPanel && typeof testerPanel.resetExampleButton === "function") {
        testerPanel.resetExampleButton();
      }
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
    // Note: updateStatsComponent logic handles separating note hits and branch hits
    updateStatsComponent(hit);
  });

  tjaChart.addEventListener("chart-click", (e: Event) => {
    const detail = (e as CustomEvent).detail;
    const hit = detail.hit as HitInfo | null;

    if (!appState.currentChart) return;
    const activeTab = document.querySelector("#chart-options-panel .panel-tab.active");
    const mode = activeTab ? activeTab.getAttribute("data-do-tab") : "view";

    if (appState.renderOptions.showAllBranches && (mode === "annotation" || mode === "selection")) return;

    // Annotation logic moved to component (annotations-change event)
    if (mode === "annotation") return;

    if (mode !== "selection") return;

    if (appState.displayOnlySelected) return;

    // Selection Logic
    // Only allow selecting notes (charIndex !== -1)
    if (hit && hit.location.charIndex !== -1) {
      if (!appState.renderOptions.selection) {
        appState.renderOptions.selection = {
          start: hit.location,
          end: null,
        };
        appState.selectedNoteHitInfo = hit;
      } else if (appState.renderOptions.selection.start && !appState.renderOptions.selection.end) {
        if (
          appState.renderOptions.selection.start.barIndex === hit.location.barIndex &&
          appState.renderOptions.selection.start.charIndex === hit.location.charIndex
        ) {
          appState.renderOptions.selection = null;
          appState.selectedNoteHitInfo = null;
        } else {
          appState.renderOptions.selection.end = hit.location;
          appState.selectedNoteHitInfo = hit;
        }
      } else {
        appState.renderOptions.selection = {
          start: hit.location,
          end: null,
        };
        appState.selectedNoteHitInfo = hit;
      }
    } else if (!hit) {
      // Clear selection only if clicking on empty space (not a hit)
      appState.renderOptions.selection = null;
      appState.selectedNoteHitInfo = null;
      appState.selectedBranchHitInfo = null;
    } else if (hit && hit.location.charIndex === -1) {
      // Branch line selection
      appState.selectedBranchHitInfo = hit;
    }

    refreshChart();
    updateSelectionUI();
    updateStatsComponent(hit); // hit passed here will update hover states if logic allows, but updateStatsComponent uses appState.selected... as overrides/fallbacks.
    // Wait, updateStatsComponent uses:
    // const noteHit = appState.selectedNoteHitInfo || (hit && hit.charIndex !== -1 ? hit : null);
    // const branchHit = appState.selectedBranchHitInfo || (hit && hit.charIndex === -1 ? hit : null);
    // So if I click, 'hit' is passed.
    // If I click branch line, hit has charIndex -1.
    // selectedBranchHitInfo is set.
    // branchHit becomes selectedBranchHitInfo (which is same as hit).
    // If I click empty space, hit is null. selected is null. branchHit is null.
  });

  courseBranchSelect.addEventListener("difficulty-change", () => {
    updatePlayerSideOptions();
    updateChartSelection(true);
    updatePageUrl();
  });

  courseBranchSelect.addEventListener("branch-change", () => {
    updateChartSelection(false);
  });

  courseBranchSelect.addEventListener("player-side-change", () => {
    updateChartSelection(true);
  });

  // ESE Share Button handled by ChartListPanel
}

function initJudgementClient() {
  // Judgement Client Callbacks

  appState.judgementClient.onMessage(async (event: ServerEvent) => {
    if (event.type === "gameplay_start") {
      console.log("Gameplay Start Event Received");

      appState.judgements.clear();

      appState.currentChart = null;

      appState.hasReceivedGameStart = true;

      // Clear selection
      appState.renderOptions.selection = null;
      appState.selectedNoteHitInfo = null;
      updateSelectionUI();

      updateStatus("status.receiving");

      if (event.tjaSummaries && event.tjaSummaries.length > 0) {
        // Sort by player to ensure we get Player 1
        const sortedSummaries = [...event.tjaSummaries].sort((a, b) => a.player - b.player);
        const summary = sortedSummaries[0];

        updateParsedCharts(summary.tjaContent, true);

        const diff = summary.difficulty.toLowerCase();
        if (appState.parsedTJACharts?.[diff]) {
          courseBranchSelect.difficulty = diff;
          appState.currentChart = appState.parsedTJACharts[diff];
        }
      }

      updateCollapseLoopState();

      refreshChart();

      const testerPanel = document.querySelector("tester-panel") as TesterPanel;
      if (testerPanel && typeof testerPanel.resetExampleButton === "function") {
        testerPanel.resetExampleButton();
      }

      // chartListPanel.resetExampleButton(); // Removed
    } else if (event.type === "judgement") {
      const key = createJudgementKey(event.noteChar, event.noteOrdinalByChar);
      appState.judgements.set(key, {
        judgement: event.judgement,
        delta: event.msDelta || 0,
      });

      refreshChart();
    }
  });

  appState.judgementClient.onStatusChange((status: string) => {
    if (status === "Connected") {
      appState.isStreamConnected = true;

      switchDisplayOptionTab("judgements");

      // Reset for new connection session
      appState.hasReceivedGameStart = false;

      if (appState.isSimulating) {
        updateStatus("status.simConnected");
      } else {
        updateStatus("status.connected");
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
    } else {
      // Disconnected
      appState.isStreamConnected = false;
      appState.hasReceivedGameStart = false;

      updateStatus(appState.isSimulating ? "status.simStopped" : "status.disconnected");
      appState.isSimulating = false;
    }

    // Notify components
    window.dispatchEvent(new CustomEvent("stream-status-change", { detail: { status } }));

    updateDisplayState();
  });
}

function initLoad() {
  startupLog.record("initLoad start");
  restoreUrlState();
  updateStatus("status.ready");
  updateUIText(); // Initialize text

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
    // Load Example Data Directly
    appState.loadedTJAContent = exampleTJA;
    updateParsedCharts(exampleTJA);
    updateStatus("status.exampleLoaded");
  }

  updateTesterModeVisibility();
  setTimeout(() => {
    initializePanelVisibility();
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.opacity = "0";
      startupLog.record("app ready for interactions (loading screen hidden)");
      setTimeout(() => {
        loadingScreen.remove();
      }, 300);
    } else {
      startupLog.record("app ready for interactions");
    }
  }, 0);
}

async function init() {
  startupLog.record("init start");
  try {
    initLayout();
    initEventListeners();
    initJudgementClient();
    initPWA();
    initLoad();
  } catch (e) {
    console.error("Error during app initialization:", e);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Check for Neutralino globals
  const win = window as any;
  const hasGlobals =
    typeof win.NL_TOKEN !== "undefined" ||
    typeof win.NL_PORT !== "undefined" ||
    typeof win.NL_ARGS !== "undefined" ||
    typeof win.NL_CVERSION !== "undefined";

  if (typeof window.Neutralino !== "undefined" && hasGlobals) {
    try {
      window.Neutralino.init();
      window.Neutralino.events.on("ready", () => {
        appState.isNeutralinoConnected = true;
        window.dispatchEvent(new CustomEvent("neutralino-ready"));
      });
    } catch (e) {
      console.warn("Neutralino init failed", e);
    }
  } else {
    console.log("Neutralino lib not found or not running in Neutralino mode");
  }
}

function initializePanelVisibility() {
  if (!dsBody || !optionsBody) return;

  // Temporarily expand to measure
  dsBody.classList.remove("collapsed");
  optionsBody.classList.remove("collapsed");

  const dsHeight = (dsBody.firstElementChild as HTMLElement)?.scrollHeight || dsBody.scrollHeight;
  const optionsHeight = (optionsBody.firstElementChild as HTMLElement)?.scrollHeight || optionsBody.scrollHeight;
  const viewportHeight = window.innerHeight;

  const totalExpandedHeight = dsHeight + optionsHeight;

  if (totalExpandedHeight < viewportHeight / 2) {
    // Expand
    dsBody.classList.remove("collapsed");
    optionsBody.classList.remove("collapsed");
    if (dsCollapseIcon) {
      dsCollapseIcon.src = "assets/heroicons/optimized/24/outline/chevron-up.svg";
      dsCollapseIcon.alt = i18n.t("ui.collapse");
    }
    if (optionsCollapseIcon) {
      optionsCollapseIcon.src = "assets/heroicons/optimized/24/outline/chevron-up.svg";
      optionsCollapseIcon.alt = i18n.t("ui.collapse");
    }
  } else {
    // Collapse
    dsBody.classList.add("collapsed");
    optionsBody.classList.add("collapsed");
    if (dsCollapseIcon) {
      dsCollapseIcon.src = "assets/heroicons/optimized/24/outline/chevron-down.svg";
      dsCollapseIcon.alt = i18n.t("ui.expand");
    }
    if (optionsCollapseIcon) {
      optionsCollapseIcon.src = "assets/heroicons/optimized/24/outline/chevron-down.svg";
      optionsCollapseIcon.alt = i18n.t("ui.expand");
    }
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
window.setJudgements = (newJudgements: JudgementMap<JudgementValue>) => {
  appState.judgements = newJudgements;
  refreshChart();
  updateStatsComponent(null);
};

window.createJudgementKey = createJudgementKey;

window.loadTJAContent = (content: string) => {
  appState.loadedTJAContent = content;
  updateParsedCharts(content);
  updateStatus("status.fileLoaded");
};

window.setRenderOptions = (opts: Partial<RenderOptions>) => {
  appState.renderOptions = { ...appState.renderOptions, ...opts };
  refreshChart();
};

window.parseFumenDatabaseHtml = parseFumenDatabaseHtml;
window.parseTaikoWikiRatingHtml = parseTaikoWikiRatingHtml;

init();
