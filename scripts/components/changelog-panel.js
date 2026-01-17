import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
export class ChangelogPanel extends HTMLElement {
    hasLoaded = false;
    isModalOpen = false;
    changelogData = [];
    modalContainer;
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
    handleOpen() {
        this.isModalOpen = true;
        this.renderModal();
        if (!this.hasLoaded) {
            this.loadChangelog();
        }
    }
    handleClose() {
        this.isModalOpen = false;
        this.renderModal();
    }
    async loadChangelog() {
        try {
            const res = await fetch("changelog.json");
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            this.changelogData = Array.isArray(data) ? data : [];
            this.hasLoaded = true;
        }
        catch (e) {
            console.error("Failed to load changelog:", e);
            this.changelogData = []; // Error state
        }
        this.renderModal();
    }
    render() {
        const vdom = (_jsx("button", { type: "button", id: "changelog-btn", className: "text-btn", onclick: this.handleOpen.bind(this), children: "Changelog" }));
        webjsx.applyDiff(this, vdom);
    }
    renderModal() {
        const content = !this.hasLoaded ? (_jsx("div", { style: "padding:10px; color:#666;", children: "Loading..." })) : this.changelogData.length === 0 ? (_jsx("div", { style: "padding:10px;", children: "No changelog available (or failed to load)." })) : (this.changelogData.map((item) => (_jsxs("div", { className: "changelog-item", children: [_jsxs("div", { className: "changelog-header", children: [_jsx("span", { children: item.date }), _jsx("span", { style: "font-family:monospace;", children: item.hash })] }), _jsx("div", { className: "changelog-msg", children: item.message })] }))));
        const modalVdom = (_jsx("div", { id: "changelog-modal", className: "modal", style: `display: ${this.isModalOpen ? "block" : "none"}`, onclick: (e) => {
                if (e.target === e.currentTarget)
                    this.handleClose();
            }, children: _jsxs("div", { className: "modal-content", children: [_jsxs("div", { className: "modal-header", children: [_jsx("h2", { children: "Changelog" }), _jsx("span", { className: "close-btn", onclick: this.handleClose.bind(this), children: "\u00D7" })] }), _jsx("div", { id: "changelog-list", children: content })] }) }));
        webjsx.applyDiff(this.modalContainer, modalVdom);
    }
}
customElements.define("changelog-panel", ChangelogPanel);
