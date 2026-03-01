import * as webjsx from "webjsx";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { courseBranchSelect } from "../view/ui-elements.js";
import "./save-image-button.js";

interface VendorFullScreenElement extends HTMLElement {
  mozRequestFullScreen?(): Promise<void>;
  webkitRequestFullscreen?(): Promise<void>;
  msRequestFullscreen?(): Promise<void>;
}

interface VendorDocument extends Document {
  mozFullScreenElement?: Element;
  webkitFullscreenElement?: Element;
  msFullscreenElement?: Element;
  mozCancelFullScreen?(): Promise<void>;
  webkitExitFullscreen?(): Promise<void>;
  msExitFullscreen?(): Promise<void>;
}

export class ChartOptionsFooter extends HTMLElement {
  private wikiDropdownVisible = false;

  private handleStatusChange = () => this.render();
  private handleDifficultyChange = () => this.render();
  private handleDocumentClick = (e: MouseEvent) => {
    if (this.wikiDropdownVisible) {
      const target = e.target as HTMLElement;
      if (!target.closest(".wiki-btn") && !target.closest(".wiki-dropdown")) {
        this.wikiDropdownVisible = false;
        this.render();
      }
    }
  };

  private handleScroll = () => {
    if (this.wikiDropdownVisible) {
      this.wikiDropdownVisible = false;
      this.render();
    }
  };

  connectedCallback() {
    this.render();
    // Listen for language changes
    i18n.onLanguageChange(() => this.render());
    window.addEventListener("status-change", this.handleStatusChange);
    window.addEventListener("difficulty-change", this.handleDifficultyChange);
    document.addEventListener("click", this.handleDocumentClick);
    window.addEventListener("scroll", this.handleScroll, true);
  }

  disconnectedCallback() {
    window.removeEventListener("status-change", this.handleStatusChange);
    window.removeEventListener("difficulty-change", this.handleDifficultyChange);
    document.removeEventListener("click", this.handleDocumentClick);
    window.removeEventListener("scroll", this.handleScroll, true);
  }

  private toggleWikiDropdown(e: Event) {
    e.stopPropagation();
    this.wikiDropdownVisible = !this.wikiDropdownVisible;
    this.render();

    if (this.wikiDropdownVisible) {
      // Position the dropdown fixed to viewport so it escapes overflow:hidden
      requestAnimationFrame(() => {
        const btn = this.querySelector(".wiki-btn") as HTMLElement;
        const dropdown = this.querySelector(".wiki-dropdown") as HTMLElement;
        if (btn && dropdown) {
          const rect = btn.getBoundingClientRect();
          dropdown.style.position = "fixed";
          dropdown.style.top = `${rect.bottom + 4}px`;
          dropdown.style.left = `${rect.left}px`;
          // Reset bottom/min-width from CSS if needed, though our CSS sets them
        }
      });
    }
  }

  private handleFullscreen() {
    const chart = document.getElementById("chart-component");
    if (chart) {
      const doc = document as VendorDocument;
      const el = chart as VendorFullScreenElement;

      const isFullscreen =
        doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;
      const isPseudoFullscreen = chart.classList.contains("pseudo-fullscreen");

      if (!isFullscreen && !isPseudoFullscreen) {
        let requestPromise: Promise<void> | undefined;
        if (el.requestFullscreen) {
          requestPromise = el.requestFullscreen();
        } else if (el.webkitRequestFullscreen) {
          requestPromise = el.webkitRequestFullscreen();
        } else if (el.mozRequestFullScreen) {
          requestPromise = el.mozRequestFullScreen();
        } else if (el.msRequestFullscreen) {
          requestPromise = el.msRequestFullscreen();
        }

        if (requestPromise) {
          requestPromise.catch((_err: Error) => {
            // Fallback to pseudo fullscreen if native fails (common on mobile)
            chart.classList.add("pseudo-fullscreen");
          });
        } else {
          // Fallback immediately if API not present
          chart.classList.add("pseudo-fullscreen");
        }
      } else {
        if (doc.exitFullscreen) {
          doc.exitFullscreen().catch(() => {});
        } else if (doc.webkitExitFullscreen) {
          doc.webkitExitFullscreen();
        } else if (doc.mozCancelFullScreen) {
          doc.mozCancelFullScreen();
        } else if (doc.msExitFullscreen) {
          doc.msExitFullscreen();
        }
        chart.classList.remove("pseudo-fullscreen");
      }
    }
  }

  render() {
    // Apply styles to host
    this.classList.add("chart-options-footer");

    let wikiUrl: string | undefined;
    let wikiUrlKo: string | undefined;

    if (appState.currentEsePath && appState.eseTree) {
      const entry = appState.eseTree.find((e) => e.path === appState.currentEsePath);
      if (entry?.courses && courseBranchSelect) {
        const diff = courseBranchSelect.difficulty;
        const course = entry.courses[diff as keyof typeof entry.courses];
        if (course) {
          wikiUrl = course.url;
          wikiUrlKo = course.urlKo;
        }
      }
    }

    const hasWiki = !!(wikiUrl || wikiUrlKo);

    const vdom = (
      <div style="display: contents;">
        <div style="display: flex; align-items: center;">
          <save-image-button id="export-image-footer-btn"></save-image-button>

          {hasWiki && (
            <div style="position: relative; margin-left: 8px;">
              <button
                type="button"
                className={`wiki-btn ${this.wikiDropdownVisible ? "active" : ""}`}
                onclick={this.toggleWikiDropdown.bind(this)}
              >
                Wiki
                <div className="icon-chevron-down-small" style="margin-left: 4px;" />
              </button>
              {this.wikiDropdownVisible && (
                <div className="wiki-dropdown">
                  {wikiUrl && (
                    <a href={wikiUrl} target="_blank" rel="noopener noreferrer" className="wiki-option">
                      WikiWiki
                      <div className="icon-external-link" />
                    </a>
                  )}
                  {wikiUrlKo && (
                    <a href={wikiUrlKo} target="_blank" rel="noopener noreferrer" className="wiki-option">
                      taiko.wiki
                      <div className="icon-external-link" />
                    </a>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div style="display: flex; align-items: center;">
          <button
            type="button"
            className="control-btn"
            onclick={this.handleFullscreen.bind(this)}
            title={i18n.t("ui.fullscreen")}
            style="display: flex; align-items: center; justify-content: center; padding: 8px;"
          >
            <img
              src="assets/heroicons/optimized/24/outline/arrows-pointing-out.svg"
              alt="Fullscreen"
              style="width: 20px; height: 20px; filter: brightness(0) invert(1);"
            />
          </button>
        </div>
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("chart-options-footer", ChartOptionsFooter);
