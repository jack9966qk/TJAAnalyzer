import { i18n } from "../utils/i18n.js";

export class CourseBranchSelect extends HTMLElement {
  private diffSelectElement!: HTMLSelectElement;
  private branchSelectElement!: HTMLSelectElement;
  private branchContainer!: HTMLElement;
  private isRendered = false;

  // Pending states for async loading
  private pendingDifficultyOptions: string[] | null = null;
  private pendingDifficulty: string | null = null;
  private pendingBranch: string | null = null;
  private pendingBranchVisible: boolean | null = null;

  get difficulty(): string {
    return this.diffSelectElement ? this.diffSelectElement.value : this.pendingDifficulty || "";
  }

  set difficulty(val: string) {
    if (this.diffSelectElement) {
      this.diffSelectElement.value = val;
    } else {
      this.pendingDifficulty = val;
    }
  }

  get branch(): string {
    return this.branchSelectElement ? this.branchSelectElement.value : this.pendingBranch || "all";
  }

  set branch(val: string) {
    if (this.branchSelectElement) {
      this.branchSelectElement.value = val;
    } else {
      this.pendingBranch = val;
    }
  }

  connectedCallback() {
    if (!this.isRendered) {
      this.loadTemplate();
      this.isRendered = true;
    }
    // Listen for language changes - updateTexts check for elements inside
    i18n.onLanguageChange(() => this.updateTexts());
  }

  private async loadTemplate() {
    // Styling
    this.style.display = "flex";
    this.style.flexWrap = "wrap";
    this.style.gap = "10px";
    this.style.alignItems = "center";
    this.style.marginTop = "15px";
    this.style.marginBottom = "-5px";
    this.style.width = "100%";
    this.style.borderTop = "1px solid var(--border-lighter)";
    this.style.paddingTop = "10px";

    if (this.innerHTML.trim()) {
      this.initializeComponent();
      return;
    }

    const path = "scripts/components/course-branch-select.html";

    try {
      const response = await fetch(path);
      if (response.ok) {
        this.innerHTML = await response.text();
        this.initializeComponent();
      } else {
        console.error(`Error loading template from ${path}: ${response.status} ${response.statusText}`);
        this.innerText = "Error loading template.";
        return;
      }
    } catch (e) {
      console.error(`Error fetching ${path}:`, e);
      this.innerText = "Error loading template.";
      return;
    }
  }

  private initializeComponent() {
    this.diffSelectElement = this.querySelector("#difficulty-selector-internal") as HTMLSelectElement;
    this.branchSelectElement = this.querySelector("#branch-selector-internal") as HTMLSelectElement;
    this.branchContainer = this.querySelector("#branch-selector-container") as HTMLElement;

    if (this.diffSelectElement) {
      this.diffSelectElement.addEventListener("change", () => {
        this.dispatchEvent(new Event("difficulty-change", { bubbles: true }));
      });
    }

    if (this.branchSelectElement) {
      this.branchSelectElement.addEventListener("change", () => {
        this.dispatchEvent(new Event("branch-change", { bubbles: true }));
      });
    }

    // Apply Pending States
    if (this.pendingDifficultyOptions) {
      this.setDifficultyOptions(this.pendingDifficultyOptions);
      this.pendingDifficultyOptions = null;
    }

    if (this.pendingDifficulty !== null) {
      this.difficulty = this.pendingDifficulty;
      this.pendingDifficulty = null;
    }

    if (this.pendingBranch !== null) {
      this.branch = this.pendingBranch;
      this.pendingBranch = null;
    }

    if (this.pendingBranchVisible !== null) {
      this.setBranchVisibility(this.pendingBranchVisible);
      this.pendingBranchVisible = null;
    }

    // Initial text update
    this.updateTexts();
  }

  setDifficultyOptions(difficulties: string[]) {
    if (!this.diffSelectElement) {
      this.pendingDifficultyOptions = difficulties;
      return;
    }

    this.diffSelectElement.innerHTML = "";
    difficulties.forEach((diff) => {
      const option = document.createElement("option");
      option.value = diff;
      const key = `ui.difficulty.${diff.toLowerCase()}`;
      const translated = i18n.t(key);
      option.textContent = translated !== key ? translated : diff.charAt(0).toUpperCase() + diff.slice(1);
      option.setAttribute("data-i18n", key); // For dynamic updates
      this.diffSelectElement.appendChild(option);
    });

    if (difficulties.length > 0) {
      this.diffSelectElement.value = difficulties[0];
    }
  }

  clearDifficultyOptions() {
    if (this.diffSelectElement) {
      this.diffSelectElement.innerHTML = "";
    } else {
      this.pendingDifficultyOptions = [];
    }
  }

  setBranchVisibility(visible: boolean) {
    if (this.branchContainer) {
      this.branchContainer.hidden = !visible;
      this.branchContainer.style.display = visible ? "flex" : "none";
      if (visible) {
        this.updateTexts();
      }
    } else {
      this.pendingBranchVisible = visible;
    }
  }

  private updateTexts() {
    this.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) {
        el.textContent = i18n.t(key);
      }
    });
  }

  show() {
    this.hidden = false;
    this.style.display = "flex";
  }

  hide() {
    this.hidden = true;
    this.style.display = "none";
  }
}

customElements.define("course-branch-select", CourseBranchSelect);
