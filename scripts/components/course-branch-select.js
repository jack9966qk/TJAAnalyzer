import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { i18n } from "../utils/i18n.js";
export class CourseBranchSelect extends HTMLElement {
    difficulties = [];
    selectedDifficulty = "";
    selectedBranch = "all";
    branchVisible = false;
    connectedCallback() {
        this.render();
        i18n.onLanguageChange(() => this.render());
    }
    get difficulty() {
        return this.selectedDifficulty;
    }
    set difficulty(val) {
        this.selectedDifficulty = val;
        this.render();
    }
    get branch() {
        return this.selectedBranch;
    }
    set branch(val) {
        this.selectedBranch = val;
        this.render();
    }
    setDifficultyOptions(difficulties) {
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
    setBranchVisibility(visible) {
        this.branchVisible = visible;
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
    handleDifficultyChange(e) {
        this.selectedDifficulty = e.target.value;
        this.dispatchEvent(new Event("difficulty-change", { bubbles: true }));
    }
    handleBranchChange(e) {
        this.selectedBranch = e.target.value;
        this.dispatchEvent(new Event("branch-change", { bubbles: true }));
    }
    render() {
        const vdom = (_jsxs("div", { style: "display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 15px; margin-bottom: -5px; width: 100%; border-top: 1px solid var(--border-lighter); padding-top: 10px;", children: [_jsxs("div", { className: "control-group", children: [_jsx("label", { htmlFor: "difficulty-selector-internal", children: i18n.t("ui.difficulty") }), _jsx("select", { id: "difficulty-selector-internal", value: this.selectedDifficulty, onchange: this.handleDifficultyChange.bind(this), children: this.difficulties.map((diff) => {
                                const key = `ui.difficulty.${diff.toLowerCase()}`;
                                const translated = i18n.t(key);
                                const label = translated !== key ? translated : diff.charAt(0).toUpperCase() + diff.slice(1);
                                return _jsx("option", { value: diff, children: label });
                            }) })] }), _jsxs("div", { id: "branch-selector-container", className: "control-group", style: this.branchVisible ? "display: flex;" : "display: none;", hidden: !this.branchVisible, children: [_jsx("label", { htmlFor: "branch-selector-internal", children: i18n.t("ui.branch") }), _jsxs("select", { id: "branch-selector-internal", value: this.selectedBranch, onchange: this.handleBranchChange.bind(this), children: [_jsx("option", { value: "all", children: i18n.t("branch.all") }), _jsx("option", { value: "normal", children: i18n.t("branch.normal") }), _jsx("option", { value: "expert", children: i18n.t("branch.expert") }), _jsx("option", { value: "master", children: i18n.t("branch.master") })] })] })] }));
        webjsx.applyDiff(this, vdom);
    }
}
customElements.define("course-branch-select", CourseBranchSelect);
