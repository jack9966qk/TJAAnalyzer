import "./style.css";
import "./components/annotate-options.js";
import "./components/changelog-panel.js";
import "./components/chart-list-panel.js";
import "./components/course-branch-select.js";
import "./components/export-button.js";
import "./components/judgement-options.js";
import "./components/local-file-panel.js";
import "./components/note-stats.js";
import "./components/save-image-button.js";
import "./components/select-options.js";
import "./components/stream-panel.js";
import "./components/tester-panel.js";
import "./components/tja-chart.js";
import "./components/view-options.js";
import { appState } from "./state/app-state.js";
import { i18n } from "./utils/i18n.js";

// Mock global objects if needed
interface CustomWindow extends Window {
  // biome-ignore lint/suspicious/noExplicitAny: Mocking global objects
  i18n?: any;
  // biome-ignore lint/suspicious/noExplicitAny: Mocking global objects
  appState?: any;
}

const customWindow = window as unknown as CustomWindow;

if (!customWindow.i18n) {
  customWindow.i18n = i18n;
}
if (!customWindow.appState) {
  customWindow.appState = appState;
}

function init() {
  const params = new URLSearchParams(window.location.search);
  const componentName = params.get("component");
  const container = document.getElementById("component-container");
  const width = params.get("width");

  if (container && width) {
    container.style.maxWidth = `${width}px`;
  }

  if (componentName && container) {
    try {
      const el = document.createElement(componentName);
      // Add ID if needed for specific selectors in tests
      el.id = "test-component";

      // Special handling for some components if they require props or context
      // Most are self-contained or use global appState.

      container.appendChild(el);

      // For Save Image Button, it needs text content usually
      if (componentName === "save-image-button") {
        el.innerText = "Save Image";
      }
    } catch (e) {
      container.innerHTML = `<div style="color:red">Error creating component: ${e}</div>`;
    }
  } else if (container) {
    container.innerHTML = "<div>Please specify ?component=name in URL</div>";
  }
}

init();
