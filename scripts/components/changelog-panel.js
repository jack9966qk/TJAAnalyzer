import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { i18n } from "../utils/i18n.js";
export class ChangelogPanel extends HTMLElement {
    hasLoaded = false;
    isModalOpen = false;
    changelogData = [];
    eseCommit = null;
    modalContainer;
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
    handleOpen() {
        this.isModalOpen = true;
        this.renderModal();
        if (!this.hasLoaded) {
            this.loadData();
        }
    }
    handleClose() {
        this.isModalOpen = false;
        this.renderModal();
    }
    async loadData() {
        try {
            // Load Changelog
            const res = await fetch("changelog.json");
            if (res.ok) {
                const data = await res.json();
                this.changelogData = Array.isArray(data) ? data : [];
            }
            else {
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
            }
            catch (e) {
                console.warn("Failed to load ESE index for metadata:", e);
            }
            this.hasLoaded = true;
        }
        catch (e) {
            console.error("Failed to load data:", e);
            this.changelogData = [];
        }
        this.renderModal();
    }
    render() {
        const vdom = (_jsx("button", { type: "button", id: "changelog-btn", className: "text-btn", onclick: this.handleOpen.bind(this), children: i18n.t("ui.about") }));
        webjsx.applyDiff(this, vdom);
    }
    renderModal() {
        const content = !this.hasLoaded ? (_jsx("div", { style: "padding:10px; color:#666;", children: i18n.t("ui.loading") })) : this.changelogData.length === 0 ? (_jsx("div", { style: "padding:10px;", children: i18n.t("ui.noChangelog") })) : (this.changelogData.map((item) => (_jsxs("div", { className: "changelog-item", children: [_jsxs("div", { className: "changelog-header", children: [_jsx("span", { children: item.date }), _jsx("span", { style: "font-family:monospace;", children: item.hash })] }), _jsx("div", { className: "changelog-msg", children: item.message })] }))));
        const eseInfo = this.eseCommit ? (_jsxs("div", { className: "about-item", style: "padding: 12px; background: var(--bg-panel-header); border-radius: 6px; border: 1px solid var(--border-light);", children: [_jsx("div", { style: "font-weight: bold; margin-bottom: 4px;", children: i18n.t("ui.eseDb") }), _jsxs("div", { style: "font-size: 0.9em; display: flex; flex-direction: column; gap: 2px;", children: [_jsxs("div", { children: [i18n.t("ui.commit"), ": ", _jsx("span", { style: "font-family:monospace", children: this.eseCommit.sha.substring(0, 7) })] }), _jsxs("div", { children: [i18n.t("ui.update"), ": ", new Date(this.eseCommit.date).toLocaleString()] })] })] })) : null;
        const modalVdom = (_jsx("div", { id: "changelog-modal", className: "modal", style: `display: ${this.isModalOpen ? "block" : "none"}`, onclick: (e) => {
                if (e.target === e.currentTarget)
                    this.handleClose();
            }, children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h2", { children: i18n.t("ui.about") }), _jsx("span", { className: "close-btn", onclick: this.handleClose.bind(this), children: "\u00D7" })] }), _jsxs("div", { className: "about-content", style: "padding: 20px 20px 10px 20px;", children: [_jsxs("div", { style: "display: flex; flex-direction: column; gap: 10px; margin-bottom: 15px;", children: [_jsxs("a", { href: "https://github.com/jack9966qk/TJAAnalyzer/issues/new", target: "_blank", rel: "noopener", className: "about-item", style: "display: block; padding: 12px; background: var(--bg-panel-header); border-radius: 6px; color: var(--text-primary); text-decoration: none; border: 1px solid var(--border-light);", onmouseenter: (e) => {
                                            e.currentTarget.style.backgroundColor = "var(--bg-hover)";
                                        }, onmouseleave: (e) => {
                                            e.currentTarget.style.backgroundColor = "var(--bg-panel-header)";
                                        }, children: [_jsx("div", { style: "font-weight: bold;", children: i18n.t("ui.feedback") }), _jsx("div", { style: "font-size: 0.85em; color: var(--text-secondary); margin-top: 4px;", children: "GitHub Issues" })] }), eseInfo] }), _jsx("h3", { style: "margin: 0 0 5px 0; font-size: 1.1em; color: var(--text-primary);", children: i18n.t("ui.changelog") })] }), _jsx("div", { id: "changelog-list", style: "padding: 0 20px 20px 20px; border-top: 1px solid var(--border-lighter);", children: content })] }) }));
        webjsx.applyDiff(this.modalContainer, modalVdom);
    }
}
customElements.define("changelog-panel", ChangelogPanel);
