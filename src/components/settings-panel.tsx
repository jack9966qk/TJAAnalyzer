import * as webjsx from "webjsx";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";

export class SettingsPanel extends HTMLElement {
  private isModalOpen = false;
  private modalContainer: HTMLDivElement;

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
  }

  disconnectedCallback() {
    if (this.modalContainer && this.modalContainer.parentNode === document.body) {
      document.body.removeChild(this.modalContainer);
    }
  }

  private handleOpen() {
    this.isModalOpen = true;
    this.renderModal();
  }

  private handleClose() {
    this.isModalOpen = false;
    this.renderModal();
  }

  private handleDevModeToggle(e: Event) {
    appState.isTesterMode = (e.target as HTMLInputElement).checked;
    window.dispatchEvent(new Event("dev-mode-change"));
    this.renderModal();
  }

  render() {
    const vdom = (
      <button
        type="button"
        className="settings-btn"
        onclick={this.handleOpen.bind(this)}
        aria-label={i18n.t("ui.settings")}
        title={i18n.t("ui.settings")}
      >
        <div className="icon-settings" />
      </button>
    );
    webjsx.applyDiff(this, vdom);
  }

  renderModal() {
    const devModeToggle = (
      <div
        className="about-item"
        style="padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between;"
      >
        <label style="display: flex; align-items: center; width: 100%; cursor: pointer;">
          <input
            type="checkbox"
            checked={appState.isTesterMode}
            onchange={this.handleDevModeToggle.bind(this)}
            style="margin-right: 10px;"
          />
          {i18n.t("ui.devMode")}
        </label>
      </div>
    );

    const modalVdom = (
      <div
        id="settings-modal"
        className={`modal ${this.isModalOpen ? "open" : ""}`}
        onclick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.handleClose();
        }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2>{i18n.t("ui.settings")}</h2>
            <button
              type="button"
              className="close-btn"
              onclick={this.handleClose.bind(this)}
              aria-label={i18n.t("ui.close")}
            >
              <div className="modal-close-icon" />
            </button>
          </div>
          <div className="settings-content" style="padding: 20px;">
            <div style="display: flex; flex-direction: column; gap: 10px;">{devModeToggle}</div>
          </div>
        </div>
      </div>
    );

    webjsx.applyDiff(this.modalContainer, modalVdom);
  }
}

customElements.define("settings-panel", SettingsPanel);
