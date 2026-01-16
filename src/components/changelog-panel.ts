import { i18n } from "../utils/i18n.js";

export class ChangelogPanel extends HTMLElement {
  private btn: HTMLButtonElement;
  private modal: HTMLDivElement;
  private list: HTMLDivElement;
  private closeBtn: HTMLElement;
  private hasLoaded: boolean = false;

  constructor() {
    super();
    // We use Light DOM to inherit global styles (modal, buttons, etc.)
    // this.attachShadow({ mode: 'open' }); 
    
    this.innerHTML = `
      <button id="changelog-btn" class="text-btn">Changelog</button>
      <div id="changelog-modal" class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Changelog</h2>
                <span class="close-btn">&times;</span>
            </div>
            <div id="changelog-list"></div>
        </div>
      </div>
    `;

    this.btn = this.querySelector("#changelog-btn") as HTMLButtonElement;
    this.modal = this.querySelector("#changelog-modal") as HTMLDivElement;
    this.list = this.querySelector("#changelog-list") as HTMLDivElement;
    this.closeBtn = this.querySelector(".close-btn") as HTMLElement;

    this.setupEventListeners();
  }

  connectedCallback() {
    // Move modal to body to ensure it's on top of everything (z-index context)
    document.body.appendChild(this.modal);
  }

  disconnectedCallback() {
    if (this.modal && this.modal.parentNode === document.body) {
      document.body.removeChild(this.modal);
    }
  }

  private setupEventListeners() {
    this.btn.addEventListener("click", () => {
      this.openModal();
    });

    this.closeBtn.addEventListener("click", () => {
      this.closeModal();
    });
  }

  private handleWindowClick = (event: MouseEvent) => {
    if (event.target === this.modal) {
      this.closeModal();
    }
  };

  private openModal() {
    this.modal.style.display = "block";
    window.addEventListener("click", this.handleWindowClick);
    
    if (!this.hasLoaded) {
      this.loadChangelog();
    }
  }

  private closeModal() {
    this.modal.style.display = "none";
    window.removeEventListener("click", this.handleWindowClick);
  }

  private async loadChangelog() {
    this.list.innerHTML = '<div style="padding:10px; color:#666;">Loading...</div>';
    try {
      const res = await fetch("changelog.json");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      this.list.innerHTML = "";
      if (Array.isArray(data) && data.length > 0) {
        // biome-ignore lint/suspicious/noExplicitAny: Changelog data is untyped
        data.forEach((item: any) => {
          const div = document.createElement("div");
          div.className = "changelog-item";
          div.innerHTML = `
            <div class="changelog-header">
                <span>${item.date}</span>
                <span style="font-family:monospace;">${item.hash}</span>
            </div>
            <div class="changelog-msg">${item.message}</div>
          `;
          this.list.appendChild(div);
        });
      } else {
        this.list.innerHTML = '<div style="padding:10px;">No changelog available.</div>';
      }
      this.hasLoaded = true;
    } catch (e) {
      console.error("Failed to load changelog:", e);
      this.list.innerHTML = '<div style="padding:10px; color:red;">Failed to load changelog.</div>';
    }
  }
}

customElements.define("changelog-panel", ChangelogPanel);
