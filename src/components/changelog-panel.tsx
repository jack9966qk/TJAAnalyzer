import * as webjsx from "webjsx";

export class ChangelogPanel extends HTMLElement {
  private hasLoaded = false;
  private isModalOpen = false;
  private changelogData: any[] = [];
  private modalContainer: HTMLDivElement;

  constructor() {
    super();
    this.modalContainer = document.createElement("div");
  }

  connectedCallback() {
    this.render();
    document.body.appendChild(this.modalContainer);
    this.renderModal();
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
      this.loadChangelog();
    }
  }

  private handleClose() {
    this.isModalOpen = false;
    this.renderModal();
  }

  private async loadChangelog() {
    try {
      const res = await fetch("changelog.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      this.changelogData = Array.isArray(data) ? data : [];
      this.hasLoaded = true;
    } catch (e) {
      console.error("Failed to load changelog:", e);
      this.changelogData = []; // Error state
    }
    this.renderModal();
  }

  render() {
    const vdom = (
      <button type="button" id="changelog-btn" className="text-btn" onclick={this.handleOpen.bind(this)}>
        Changelog
      </button>
    );
    webjsx.applyDiff(this, vdom);
  }

  renderModal() {
    const content = !this.hasLoaded ? (
      <div style="padding:10px; color:#666;">Loading...</div>
    ) : this.changelogData.length === 0 ? (
      <div style="padding:10px;">No changelog available (or failed to load).</div>
    ) : (
      this.changelogData.map((item: any) => (
        <div className="changelog-item">
          <div className="changelog-header">
            <span>{item.date}</span>
            <span style="font-family:monospace;">{item.hash}</span>
          </div>
          <div className="changelog-msg">{item.message}</div>
        </div>
      ))
    );

    const modalVdom = (
      <div
        id="changelog-modal"
        className="modal"
        style={`display: ${this.isModalOpen ? "block" : "none"}`}
        onclick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.handleClose();
        }}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h2>Changelog</h2>
            <span className="close-btn" onclick={this.handleClose.bind(this)}>
              &times;
            </span>
          </div>
          <div id="changelog-list">{content}</div>
        </div>
      </div>
    );

    webjsx.applyDiff(this.modalContainer, modalVdom);
  }
}

customElements.define("changelog-panel", ChangelogPanel);
