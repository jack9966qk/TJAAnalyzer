import * as webjsx from "webjsx";
import { i18n } from "../utils/i18n.js";

export class CourseBranchSelect extends HTMLElement {
  private difficulties: string[] = [];
  private selectedDifficulty = "";
  private selectedBranch = "all";
  private branchVisible = false;
  private playerSideOptions: string[] = [];
  private selectedPlayerSide = "";
  private playerSideVisible = false;

  connectedCallback() {
    this.render();
    i18n.onLanguageChange(() => this.render());
  }

  get difficulty(): string {
    return this.selectedDifficulty;
  }

  set difficulty(val: string) {
    this.selectedDifficulty = val;
    this.render();
  }

  get branch(): string {
    return this.selectedBranch;
  }

  set branch(val: string) {
    this.selectedBranch = val;
    this.render();
  }

  setDifficultyOptions(difficulties: string[]) {
    this.difficulties = difficulties;
    if (this.difficulties.length > 0 && !this.difficulties.includes(this.selectedDifficulty)) {
      this.selectedDifficulty = this.difficulties[0];
    }
    this.render();
  }

  clearDifficultyOptions() {
    this.difficulties = [];
    this.selectedDifficulty = "";
    this.render();
  }

  setBranchVisibility(visible: boolean) {
    this.branchVisible = visible;
    this.render();
  }

  get playerSide(): string {
    return this.selectedPlayerSide;
  }

  set playerSide(val: string) {
    this.selectedPlayerSide = val;
    this.render();
  }

  setPlayerSideOptions(options: string[]) {
    this.playerSideOptions = options;
    if (options.length > 0 && !options.includes(this.selectedPlayerSide)) {
      // Default to "single" if available, otherwise first option
      this.selectedPlayerSide = options.includes("single") ? "single" : options[0];
    }
    this.playerSideVisible = options.length > 1;
    this.render();
  }

  clearPlayerSideOptions() {
    this.playerSideOptions = [];
    this.selectedPlayerSide = "";
    this.playerSideVisible = false;
    this.render();
  }

  show() {
    this.hidden = false;
    this.style.display = "flex";
  }

  hide() {
    this.hidden = true;
    this.style.display = "none";
  }

  private handleDifficultyChange(e: Event) {
    this.selectedDifficulty = (e.target as HTMLSelectElement).value;
    this.dispatchEvent(new Event("difficulty-change", { bubbles: true }));
  }

  private handleBranchChange(e: Event) {
    this.selectedBranch = (e.target as HTMLSelectElement).value;
    this.dispatchEvent(new Event("branch-change", { bubbles: true }));
  }

  private handlePlayerSideChange(e: Event) {
    this.selectedPlayerSide = (e.target as HTMLSelectElement).value;
    this.dispatchEvent(new Event("player-side-change", { bubbles: true }));
  }

  render() {
    const vdom = (
      <div style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 15px; margin-bottom: -5px; width: 100%; border-top: 1px solid var(--border-lighter); padding-top: 10px;">
        {/* Difficulty Selector */}
        <div className="control-group">
          <label htmlFor="difficulty-selector-internal">{i18n.t("ui.difficulty")}</label>
          <select
            id="difficulty-selector-internal"
            value={this.selectedDifficulty}
            onchange={this.handleDifficultyChange.bind(this)}
          >
            {this.difficulties.map((diff) => {
              const key = `ui.difficulty.${diff.toLowerCase()}`;
              const translated = i18n.t(key);
              const label = translated !== key ? translated : diff.charAt(0).toUpperCase() + diff.slice(1);
              return <option value={diff}>{label}</option>;
            })}
          </select>
        </div>

        {/* Player Side Selector */}
        <div
          id="player-side-selector-container"
          className="control-group"
          style={this.playerSideVisible ? "display: flex;" : "display: none;"}
          hidden={!this.playerSideVisible}
        >
          <label htmlFor="player-side-selector-internal">{i18n.t("ui.playerSide")}</label>
          <select
            id="player-side-selector-internal"
            value={this.selectedPlayerSide}
            onchange={this.handlePlayerSideChange.bind(this)}
          >
            {this.playerSideOptions.map((side) => {
              const key = `playerSide.${side}`;
              const translated = i18n.t(key);
              const label = translated !== key ? translated : side;
              return <option value={side}>{label}</option>;
            })}
          </select>
        </div>

        {/* Branch Selector */}
        <div
          id="branch-selector-container"
          className="control-group"
          style={this.branchVisible ? "display: flex;" : "display: none;"}
          hidden={!this.branchVisible}
        >
          <label htmlFor="branch-selector-internal">{i18n.t("ui.branch")}</label>
          <select
            id="branch-selector-internal"
            value={this.selectedBranch}
            onchange={this.handleBranchChange.bind(this)}
          >
            <option value="all">{i18n.t("branch.all")}</option>
            <option value="normal">{i18n.t("branch.normal")}</option>
            <option value="expert">{i18n.t("branch.expert")}</option>
            <option value="master">{i18n.t("branch.master")}</option>
          </select>
        </div>
      </div>
    );

    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("course-branch-select", CourseBranchSelect);
