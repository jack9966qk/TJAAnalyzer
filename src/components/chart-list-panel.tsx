import * as webjsx from "webjsx";
import type { GitNode } from "../clients/ese-client.js";
import { refreshChart, updateParsedCharts } from "../controllers/chart-controller.js";
import { exampleTJA } from "../core/example-data.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { courseBranchSelect } from "../view/ui-elements.js";

type DisplayResult = GitNode | { __truncated: true; path?: never; title?: never; titleJp?: never };

export class ChartListPanel extends HTMLElement {
  private _searchQuery = "";
  private _displayResults: DisplayResult[] = [];
  private _isExampleLoaded = false;
  private _pendingEseLoad: { path: string; diff: string } | null = null;

  connectedCallback() {
    this.render();
    i18n.onLanguageChange(() => this.render());
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
    if (!appState.eseTree) {
      this.dispatchStatus("status.loadingEse");
      this.renderLoading();

      appState.eseClient
        .getTjaFiles()
        .then((tree) => {
          appState.eseTree = tree;
          this.dispatchStatus("status.eseReady");
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
      if (this._pendingEseLoad) {
        this.loadEseFromUrl(this._pendingEseLoad.path, this._pendingEseLoad.diff);
        this._pendingEseLoad = null;
      }
      this.render();
    }
  }

  setPendingLoad(path: string, diff: string) {
    this._pendingEseLoad = { path, diff };
  }

  resetExampleButton() {
    this._isExampleLoaded = false;
    this.render();
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
          // Loop state is updated by updateBranchSelectorState usually, but here we just loaded chart.
          // updateParsedCharts calls updateStatsComponent(null).
          // We might need to call updateCollapseLoopState() but it is not imported.
          // Since updateParsedCharts does most setup, let's rely on refreshChart() for now.
        }
      }

      this.dispatchStatus("status.chartLoaded");
      this.resetExampleButton();
    } catch (e) {
      console.error("Error in loadEseFromUrl", e);
      const errMsg = e instanceof Error ? e.message : String(e);
      alert(`Failed to load chart from URL: ${errMsg}`);
      this.dispatchStatus("status.eseError", { error: errMsg });
    }
  }

  public loadExample() {
    this.handleLoadExample();
  }

  private handleLoadExample() {
    appState.loadedTJAContent = exampleTJA;
    this._isExampleLoaded = true;

    appState.currentEsePath = null;
    this._searchQuery = ""; // Clear search
    this.filterResults();

    try {
      updateParsedCharts(appState.loadedTJAContent);
      this.dispatchStatus("status.exampleLoaded");
    } catch (e) {
      console.error("Error loading example:", e);
      const msg = i18n.t("status.parseError", { error: (e as Error).message });
      alert(msg);
      this.dispatchStatus("status.parseError", { error: (e as Error).message });
      this._isExampleLoaded = false;
    }
    this.render();
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
            node.titleJp?.toLowerCase().includes(query)
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
      alert("Link copied to clipboard!");
    } catch (e) {
      console.error("Failed to copy link:", e);
      alert("Failed to copy link.");
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
      this.resetExampleButton();
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
        <div
          className="control-group"
          style="margin-bottom: 10px; border-bottom: 1px solid #eee; padding-bottom: 10px;"
        >
          <button
            type="button"
            id="load-example-btn"
            style="width: 100%;"
            className={this._isExampleLoaded ? "disabled" : ""}
            disabled={this._isExampleLoaded}
            onclick={this.handleLoadExample.bind(this)}
          >
            {this._isExampleLoaded ? i18n.t("ui.example.loaded") : i18n.t("ui.example.load")}
          </button>
        </div>
        <div className="control-group">
          <input
            type="text"
            id="ese-search-input"
            value={this._searchQuery}
            placeholder={i18n.t("ui.ese.searchPlaceholder")}
            style="width: 100%; box-sizing: border-box; padding: 5px;"
            oninput={this.handleSearchInput.bind(this)}
          />
        </div>
        <div className="control-group" style="margin-top: 5px;">
          <button
            type="button"
            id="ese-share-btn"
            style="width: 100%;"
            disabled={!showShare}
            onclick={this.handleShare.bind(this)}
          >
            {i18n.t("ui.ese.share")}
          </button>
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
              return (
                <div
                  className={`ese-result-item ${isSelected ? "selected" : ""}`}
                  onclick={() => this.handleResultClick(node)}
                >
                  {node.path}
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
