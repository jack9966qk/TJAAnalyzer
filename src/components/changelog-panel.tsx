import * as webjsx from "webjsx";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";

interface ChangelogItem {
  date: string;
  hash: string;
  message: string;
}

interface EseCommit {
  sha: string;
  date: string;
}

function getPlatform(): string {
  if (appState.isNeutralinoConnected) {
    return "Neutralino";
  }
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "PWA";
  }
  return "Browser";
}

export class ChangelogPanel extends HTMLElement {
  private hasLoaded = false;
  private isModalOpen = false;
  private changelogData: ChangelogItem[] = [];
  private eseCommit: EseCommit | null = null;
  private modalContainer: HTMLDivElement;
  private appVersion: string | null = null;

  constructor() {
    super();
    this.modalContainer = document.createElement("div");
  }

  connectedCallback() {
    this.render();
    document.body.appendChild(this.modalContainer);
    this.renderModal();

    i18n.onLanguageChange(() => {
      this.render();
      this.renderModal();
    });

    // Listen for Neutralino ready event to update platform label
    if (window.Neutralino) {
      window.Neutralino.events.on("ready", () => {
        this.renderModal();
      });
    }
  }

  disconnectedCallback() {
    if (this.modalContainer && this.modalContainer.parentNode === document.body) {
      document.body.removeChild(this.modalContainer);
    }
  }

  private handleOpen() {
    this.isModalOpen = true;
    this.renderModal();
    if (!this.hasLoaded) {
      this.loadData();
    }
  }

  private handleClose() {
    this.isModalOpen = false;
    this.renderModal();
  }

  private async loadData() {
    try {
      // Load Version
      try {
        const resVer = await fetch("version.json");
        if (resVer.ok) {
          const dataVer = await resVer.json();
          if (dataVer?.version) {
            this.appVersion = dataVer.version;
          }
        }
      } catch (e) {
        console.warn("Failed to load version:", e);
      }

      // Load Changelog
      const res = await fetch("changelog.json");
      if (res.ok) {
        const data = await res.json();
        this.changelogData = Array.isArray(data) ? data : [];
      } else {
        console.warn(`Failed to load changelog: ${res.status}`);
      }

      // Load ESE Index
      try {
        const resEse = await fetch("ese_index.json");
        if (resEse.ok) {
          const dataEse = await resEse.json();
          if (dataEse.commit) {
            this.eseCommit = dataEse.commit;
          }
        }
      } catch (e) {
        console.warn("Failed to load ESE index for metadata:", e);
      }

      this.hasLoaded = true;
    } catch (e) {
      console.error("Failed to load data:", e);
      this.changelogData = [];
    }
    this.renderModal();
  }

  render() {
    const vdom = (
      <button type="button" id="changelog-btn" className="text-btn" onclick={this.handleOpen.bind(this)}>
        {i18n.t("ui.about")}
      </button>
    );
    webjsx.applyDiff(this, vdom);
  }

  renderModal() {
    const content = !this.hasLoaded ? (
      <div style="padding:10px; color:#666;">{i18n.t("ui.loading")}</div>
    ) : this.changelogData.length === 0 ? (
      <div style="padding:10px;">{i18n.t("ui.noChangelog")}</div>
    ) : (
      this.changelogData.map((item: ChangelogItem) => (
        <div className="changelog-item">
          <div className="changelog-header">
            <span>{item.date}</span>
            <span style="font-family:monospace;">{item.hash}</span>
          </div>
          <div className="changelog-msg">{item.message}</div>
        </div>
      ))
    );

    const versionInfo = this.appVersion ? (
      <div
        className="about-item"
        style="padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;"
      >
        <div style="font-weight: bold;">{i18n.t("ui.version") || "Version"}</div>
        <div style="font-family: monospace;">
          {this.appVersion} ({getPlatform()})
        </div>
      </div>
    ) : null;

    const eseInfo = this.eseCommit ? (
      <div
        className="about-item"
        style="padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light);"
      >
        <div style="font-weight: bold; margin-bottom: 4px;">{i18n.t("ui.eseDb")}</div>
        <div style="font-size: 0.9em; display: flex; flex-direction: column; gap: 2px;">
          <div>
            {i18n.t("ui.commit")}: <span style="font-family:monospace">{this.eseCommit.sha.substring(0, 7)}</span>
          </div>
          <div>
            {i18n.t("ui.update")}: {new Date(this.eseCommit.date).toLocaleString()}
          </div>
        </div>
      </div>
    ) : null;

    const pwaDebugInfo = appState.isTesterMode ? (
      <div
        className="about-item"
        style="padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light);"
      >
        <div style="font-weight: bold; margin-bottom: 4px;">PWA Debug Info</div>
        <div style="font-size: 0.9em; display: flex; flex-direction: column; gap: 2px;">
          <div>
            Controller:{" "}
            <span style="font-family:monospace">{navigator.serviceWorker?.controller ? "Active" : "None"}</span>
          </div>
          <div>
            State: <span style="font-family:monospace">{navigator.serviceWorker?.controller?.state || "N/A"}</span>
          </div>
          <div>
            Scope:{" "}
            <span style="font-family:monospace">
              {navigator.serviceWorker?.controller?.scriptURL
                ? new URL(navigator.serviceWorker.controller.scriptURL).pathname
                : "N/A"}
            </span>
          </div>
          <div>
            Online: <span style="font-family:monospace">{navigator.onLine ? "Yes" : "No"}</span>
          </div>
          <div>
            Secure Context: <span style="font-family:monospace">{window.isSecureContext ? "Yes" : "No"}</span>
          </div>
          {appState.swRegistrationError && (
            <div style="color: red; word-break: break-all;">
              SW Error: <span style="font-family:monospace">{appState.swRegistrationError}</span>
            </div>
          )}
        </div>
      </div>
    ) : null;

    const modalVdom = (
      <div
        id="changelog-modal"
        className={`modal ${this.isModalOpen ? "open" : ""}`}
        onclick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.handleClose();
        }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2>{i18n.t("ui.about")}</h2>
            <button
              type="button"
              className="close-btn"
              onclick={this.handleClose.bind(this)}
              aria-label={i18n.t("ui.close")}
            >
              <div className="modal-close-icon" />
            </button>
          </div>
          <div className="about-content" style="padding: 20px 20px 10px 20px;">
            <div style="display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;">
              <a
                href="https://github.com/jack9966qk/TJAAnalyzer/issues/new"
                target="_blank"
                rel="noopener"
                className="about-item"
                style="display: block; padding: 12px; background: var(--bg-panel-header); border-radius: 6px; color: var(--text-primary); text-decoration: none; border: 1px solid var(--border-light);"
                onmouseenter={(e: MouseEvent) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-hover)";
                }}
                onmouseleave={(e: MouseEvent) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = "var(--bg-panel-header)";
                }}
              >
                <div style="font-weight: bold;">{i18n.t("ui.feedback")}</div>
                <div style="font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;">GitHub Issues</div>
              </a>
              {versionInfo}
              {eseInfo}
              {pwaDebugInfo}
            </div>

            <h3 style="margin: 0 0 5px 0; font-size: 1.1em; color: var(--text-primary);">{i18n.t("ui.changelog")}</h3>
          </div>
          <div id="changelog-list" style="padding: 0 20px 20px 20px; border-top: 1px solid var(--border-lighter);">
            {content}
          </div>
        </div>
      </div>
    );

    webjsx.applyDiff(this.modalContainer, modalVdom);
  }
}

customElements.define("changelog-panel", ChangelogPanel);
