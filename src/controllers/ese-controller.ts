import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { eseResults, eseShareBtn } from "../view/ui-elements.js";

interface EseCallbacks {
  updateStatus: (key: string, params?: Record<string, string | number>) => void;
  updateParsedCharts: (content: string) => void;
  resetExampleButton: () => void;
}

export function filterEseResults(query: string, callbacks: EseCallbacks) {
  const { eseTree, eseClient } = appState;
  
  if (!eseTree || !eseResults) return;
  const results = query
    ? eseTree.filter((node) => {
        const q = query.toLowerCase();
        return (
          node.path.toLowerCase().includes(q) ||
          node.title?.toLowerCase().includes(q) ||
          node.titleJp?.toLowerCase().includes(q)
        );
      })
    : eseTree;

  if (results.length === 0) {
    eseResults.innerHTML = `<div class="ese-result-placeholder">${i18n.t("ui.ese.noResults")}</div>`;
    return;
  }

  // Limit results for performance
  const displayResults = results.slice(0, 100);

  eseResults.innerHTML = "";
  displayResults.forEach((node) => {
    const div = document.createElement("div");
    div.className = "ese-result-item";

    // Simple highlighting or just text
    div.innerText = node.path;

    // Highlight if matches current path
    if (appState.currentEsePath && node.path === appState.currentEsePath) {
      div.classList.add("selected");
    }

    div.addEventListener("click", async () => {
      try {
        callbacks.updateStatus("status.loadingChart");
        // Highlight selection
        document.querySelectorAll(".ese-result-item").forEach((el) => {
          el.classList.remove("selected");
        });
        div.classList.add("selected");

        const content = await eseClient.getFileContent(node.path);
        appState.loadedTJAContent = content;
        appState.currentEsePath = node.path; // Update current ESE path
        if (eseShareBtn) eseShareBtn.disabled = false;

        callbacks.updateParsedCharts(content);
        callbacks.updateStatus("status.chartLoaded");
        callbacks.resetExampleButton();
      } catch (e) {
        console.error(e);
        const errMsg = e instanceof Error ? e.message : String(e);
        alert(`Failed to load chart: ${errMsg}`);
        callbacks.updateStatus("status.eseError", { error: errMsg });
      }
    });

    eseResults.appendChild(div);
  });

  if (results.length > 100) {
    const truncationMsg = document.createElement("div");
    truncationMsg.className = "ese-result-placeholder";
    truncationMsg.innerText = i18n.t("ui.ese.truncated");
    eseResults.appendChild(truncationMsg);
  }
}