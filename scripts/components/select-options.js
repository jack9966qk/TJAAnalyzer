import { jsx as _jsx, jsxs as _jsxs } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
import { refreshChart } from "../controllers/chart-controller.js";
import { generateTJAFromSelection } from "../core/tja-exporter.js";
import { appState } from "../state/app-state.js";
import { shareFile } from "../utils/file-share.js";
import { i18n } from "../utils/i18n.js";
import { courseBranchSelect } from "../view/ui-elements.js";
export class SelectOptions extends HTMLElement {
    exportChartName = "Exported Selection";
    exportLoopCount = 10;
    exportGapCount = 1;
    statusMessage = null;
    connectedCallback() {
        this.style.display = "block";
        this.style.width = "100%";
        this.style.boxSizing = "border-box";
        this.render();
        // Listen for language changes
        i18n.onLanguageChange(() => this.render());
    }
    refreshStatus() {
        this.render();
    }
    handleClearSelection() {
        appState.viewOptions.selection = null;
        appState.selectedNoteHitInfo = null;
        refreshChart();
        this.render();
    }
    generateContent() {
        if (!appState.currentChart || !appState.viewOptions.selection) {
            throw new Error("No selection");
        }
        return generateTJAFromSelection(appState.currentChart, appState.viewOptions.selection, courseBranchSelect.difficulty, this.exportLoopCount, this.exportChartName, this.exportGapCount);
    }
    async handleDownload() {
        if (!appState.currentChart || !appState.viewOptions.selection)
            return;
        try {
            const tjaContent = this.generateContent();
            await shareFile(`${this.exportChartName}.tja`, tjaContent, "text/plain", "Export TJA");
            this.dispatchSuccess();
        }
        catch (e) {
            console.error("Export failed:", e);
            this.dispatchError();
        }
    }
    async handleAddToDirectory() {
        if (!appState.currentChart || !appState.viewOptions.selection)
            return;
        // 1. Neutralino
        if (window.Neutralino) {
            try {
                const entries = await window.Neutralino.os.showOpenDialog(i18n.t("ui.export.selectDir") || "Select Export Directory", {
                    properties: ["openDirectory"],
                });
                if (entries && entries.length > 0) {
                    const dir = entries[0];
                    const tjaContent = this.generateContent();
                    await this.exportToDirectoryNeutralino(tjaContent, dir);
                    this.dispatchSuccess();
                }
            }
            catch (e) {
                console.error("Failed to pick directory:", e);
                this.dispatchError();
            }
            return;
        }
        // 2. Web File System Access API
        // biome-ignore lint/suspicious/noExplicitAny: File System Access API
        if (window.showDirectoryPicker) {
            try {
                // biome-ignore lint/suspicious/noExplicitAny: File System Access API
                const handle = await window.showDirectoryPicker();
                if (handle) {
                    const tjaContent = this.generateContent();
                    await this.exportToDirectoryWeb(tjaContent, handle);
                    this.dispatchSuccess();
                }
            }
            catch (e) {
                // AbortError is common if user cancels
                if (e instanceof Error && e.name === "AbortError")
                    return;
                console.error("Failed to pick directory via Web API:", e);
                this.dispatchError();
            }
        }
    }
    dispatchSuccess() {
        this.dispatchEvent(new CustomEvent("status-update", { detail: { key: "status.exportSuccess" }, bubbles: true }));
        this.statusMessage = i18n.t("status.exportSuccess");
        this.render();
        setTimeout(() => {
            this.statusMessage = null;
            this.render();
        }, 3000);
    }
    dispatchError() {
        this.dispatchEvent(new CustomEvent("status-update", { detail: { key: "status.exportFailed" }, bubbles: true }));
        this.statusMessage = i18n.t("status.exportFailed");
        this.render();
        setTimeout(() => {
            this.statusMessage = null;
            this.render();
        }, 3000);
    }
    async exportToDirectoryNeutralino(content, path) {
        const N = window.Neutralino;
        const fs = N.filesystem;
        const os = N.os;
        const name = this.exportChartName;
        // Construct paths
        const sep = path.includes("\\") ? "\\" : "/";
        const targetDir = path.endsWith(sep) ? `${path}${name}` : `${path}${sep}${name}`;
        const targetFile = `${targetDir}${sep}${name}.tja`;
        // Check existence
        let exists = false;
        try {
            await fs.getStats(targetDir);
            exists = true;
        }
        catch (_e) {
            // Not found
        }
        if (exists) {
            const button = await os.showMessageBox("Overwrite?", `Directory "${name}" already exists. Overwrite?`, "YES_NO", "QUESTION");
            if (button !== "YES")
                return;
            // Clear directory
            try {
                await fs.removeDirectory(targetDir);
            }
            catch (e) {
                console.warn("removeDirectory failed", e);
            }
        }
        // Create directory
        try {
            await fs.createDirectory(targetDir);
        }
        catch (_e) {
            // Ignore
        }
        // Write file
        await fs.writeFile(targetFile, content);
    }
    // biome-ignore lint/suspicious/noExplicitAny: File System Access API
    async exportToDirectoryWeb(content, rootHandle) {
        const name = this.exportChartName;
        // Check if subdir exists
        let subdirHandle;
        try {
            subdirHandle = await rootHandle.getDirectoryHandle(name, { create: false });
            // If it exists, confirm overwrite
            // Use standard window.confirm for web
            if (!confirm(`Directory "${name}" already exists. Overwrite?`)) {
                return;
            }
            // If confirmed, we need to clear it.
            // removeEntry is available on directory handle.
            await rootHandle.removeEntry(name, { recursive: true });
        }
        catch (_e) {
            // Not found or error
        }
        // Create directory
        subdirHandle = await rootHandle.getDirectoryHandle(name, { create: true });
        // Write file
        const fileHandle = await subdirHandle.getFileHandle(`${name}.tja`, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }
    handleNameChange(e) {
        this.exportChartName = e.target.value;
    }
    handleLoopChange(e) {
        this.exportLoopCount = parseInt(e.target.value, 10);
    }
    handleGapChange(e) {
        this.exportGapCount = parseInt(e.target.value, 10);
    }
    render() {
        const hasSelection = !!appState.viewOptions.selection;
        const hasNeutralino = !!window.Neutralino;
        // biome-ignore lint/suspicious/noExplicitAny: File System Access API
        const hasWebFS = !!window.showDirectoryPicker;
        const canSelectDir = hasNeutralino || hasWebFS;
        const vdom = (_jsxs("div", { className: "control-group", style: "display: flex; flex-direction: column; gap: 10px; align-items: flex-start;", children: [_jsx("div", { style: "display: flex; width: 100%;", children: _jsx("button", { type: "button", id: "clear-selection-btn", className: "control-btn", onclick: this.handleClearSelection.bind(this), disabled: !hasSelection, children: i18n.t("ui.clearSelection") }) }), _jsxs("div", { style: "display: flex; flex-wrap: wrap; align-items: center; gap: 15px;", children: [_jsxs("label", { style: "display: flex; align-items: center; gap: 5px; white-space: nowrap;", children: [_jsx("span", { style: "font-size: 0.9em;", children: i18n.t("ui.export.loops") }), _jsx("input", { type: "number", id: "export-loop-count", value: this.exportLoopCount.toString(), min: "1", style: "width: 50px; padding: 4px;", oninput: this.handleLoopChange.bind(this) })] }), _jsxs("label", { style: "display: flex; align-items: center; gap: 5px; white-space: nowrap;", children: [_jsx("span", { style: "font-size: 0.9em;", children: i18n.t("ui.export.gap") }), _jsx("input", { type: "number", id: "export-gap-count", value: this.exportGapCount.toString(), min: "0", style: "width: 50px; padding: 4px;", oninput: this.handleGapChange.bind(this) })] })] }), _jsxs("label", { style: "display: flex; flex-direction: column; width: 100%; gap: 5px;", children: [_jsx("span", { style: "font-size: 0.9em;", children: i18n.t("ui.export.chartName") }), _jsx("input", { type: "text", id: "export-chart-name", value: this.exportChartName, placeholder: i18n.t("ui.export.chartName"), style: "width: 100%; padding: 4px; box-sizing: border-box;", oninput: this.handleNameChange.bind(this) })] }), _jsx("button", { type: "button", id: "export-selection-btn", className: "control-btn", onclick: this.handleDownload.bind(this), disabled: !hasSelection, style: "width: 100%;", children: i18n.t("ui.export.download") }), canSelectDir && (_jsx("button", { type: "button", className: "control-btn", onclick: this.handleAddToDirectory.bind(this), disabled: !hasSelection, style: "width: 100%;", children: i18n.t("ui.export.addToDir") })), this.statusMessage && (_jsx("div", { style: "font-size: 0.8em; color: #8f8; width: 100%; text-align: center;", children: this.statusMessage }))] }));
        webjsx.applyDiff(this, vdom);
    }
}
customElements.define("select-options", SelectOptions);
