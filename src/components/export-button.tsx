import type { MessageBoxChoice } from "@neutralinojs/lib";
import * as webjsx from "webjsx";
import { generateTJAFromSelection } from "../core/tja-exporter.js";
import { appState } from "../state/app-state.js";
import styleUrl from "../style.css?url";
import { shareFile } from "../utils/file-share.js";
import { i18n } from "../utils/i18n.js";
import { courseBranchSelect } from "../view/ui-elements.js";

export interface ExportButtonProps {
  "export-type"?: "download" | "directory";
  "chart-name"?: string;
  "loop-count"?: string | number;
  "gap-count"?: string | number;
  disabled?: boolean;
}

export class ExportButton extends HTMLElement {
  // Attributes/Props
  exportType: "download" | "directory" = "download";
  chartName = "Exported Selection";
  loopCount = 10;
  gapCount = 1;

  get disabled() {
    return this.hasAttribute("disabled");
  }

  set disabled(val: boolean) {
    if (val) {
      this.setAttribute("disabled", "");
    } else {
      this.removeAttribute("disabled");
    }
  }

  // State
  private status: "idle" | "success" | "error" = "idle";
  private isFading = false;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    i18n.onLanguageChange(() => {
      // Update original text if we are in idle state, otherwise it will update on reset
      if (this.status === "idle") {
        this.render();
      }
    });
  }

  static get observedAttributes() {
    return ["export-type", "chart-name", "loop-count", "gap-count", "disabled"];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;

    if (name === "export-type") {
      this.exportType = newValue as "download" | "directory";
    } else if (name === "chart-name") {
      this.chartName = newValue;
    } else if (name === "loop-count") {
      this.loopCount = parseInt(newValue, 10) || 10;
    } else if (name === "gap-count") {
      this.gapCount = parseInt(newValue, 10) || 0;
    }
    // disabled is handled by getter, change triggers render below

    if (this.status === "idle") {
      this.render();
    }
  }

  private generateContent() {
    if (!appState.currentChart || !appState.viewOptions.selection) {
      throw new Error("No selection");
    }
    return generateTJAFromSelection(
      appState.currentChart,
      appState.viewOptions.selection,
      courseBranchSelect.difficulty,
      this.loopCount,
      this.chartName,
      this.gapCount,
    );
  }

  private async handleClick() {
    if (this.disabled || this.status !== "idle") return;

    if (!appState.currentChart || !appState.viewOptions.selection) return;

    try {
      const content = this.generateContent();

      if (this.exportType === "directory") {
        let target: string | FileSystemDirectoryHandle;
        try {
          target = await this.pickDirectory();
        } catch (e) {
          // If cancelled (and caught inside pickDirectory), we just return
          if (e instanceof Error && e.message === "Cancelled by user") return;
          // Real error?
          console.error("Pick failed:", e);
          return;
        }

        await this.saveToDirectory(content, target, async (saveAction) => {
          await this.transitionToResult(async () => {
            await saveAction();
            return "success";
          });
        });
      } else {
        // Download mode
        await shareFile(`${this.chartName}.tja`, content, "text/plain", "Export TJA");
        await this.transitionToResult(async () => "success");
      }
    } catch (e) {
      if (e instanceof Error && e.message === "Cancelled by user") {
        this.status = "idle";
        this.render();
        return;
      }
      console.error("Export failed:", e);
      await this.transitionToResult(async () => "error");
    }
  }

  private async transitionToResult(action: () => Promise<"success" | "error">) {
    this.isFading = true;
    this.render();
    await new Promise((r) => setTimeout(r, 150)); // Wait for fade out

    const result = await action();
    this.status = result;

    this.isFading = false;
    this.render();

    await new Promise((r) => setTimeout(r, 1500));

    this.isFading = true;
    this.render();
    await new Promise((r) => setTimeout(r, 150));

    this.status = "idle";
    this.isFading = false;
    this.render();
  }

  private async pickDirectory(): Promise<string | FileSystemDirectoryHandle> {
    // 1. Neutralino
    if (appState.isNeutralinoConnected && window.Neutralino) {
      const entry = await window.Neutralino.os.showFolderDialog(
        i18n.t("ui.export.selectDir") || "Select Export Directory",
        {},
      );
      if (entry) {
        return entry;
      }
      throw new Error("Cancelled by user");
    }

    // 2. Web File System Access API
    if (window.showDirectoryPicker) {
      try {
        const handle = await window.showDirectoryPicker();
        return handle;
      } catch (e) {
        if (e instanceof Error && e.name === "AbortError") throw new Error("Cancelled by user");
        throw e;
      }
    }

    throw new Error("No directory picker available");
  }

  private async saveToDirectory(
    content: string,
    target: string | FileSystemDirectoryHandle,
    runSave: (action: () => Promise<void>) => Promise<void>,
  ) {
    if (typeof target === "string") {
      await this.exportToDirectoryNeutralino(content, target, runSave);
    } else {
      await this.exportToDirectoryWeb(content, target, runSave);
    }
  }

  private async exportToDirectoryNeutralino(
    content: string,
    path: string,
    runSave: (action: () => Promise<void>) => Promise<void>,
  ) {
    const N = window.Neutralino;
    const fs = N.filesystem;
    const os = N.os;
    const name = this.chartName;

    // Construct paths
    const sep = path.includes("\\") ? "\\" : "/";
    const targetDir = path.endsWith(sep) ? `${path}${name}` : `${path}${sep}${name}`;
    const targetFile = `${targetDir}${sep}${name}.tja`;

    // Check existence
    let exists = false;
    try {
      await fs.getStats(targetDir);
      exists = true;
    } catch (_e) {
      // Not found
    }

    if (exists) {
      const button = await os.showMessageBox(
        "Overwrite?",
        `Directory "${name}" already exists. Overwrite?`,
        "YES_NO" as MessageBoxChoice,
      );
      if (button !== "YES") throw new Error("Cancelled by user");
    }

    // Ready to save
    await runSave(async () => {
      if (exists) {
        // Clear directory
        try {
          await fs.remove(targetDir);
        } catch (e) {
          console.warn("removeDirectory failed", e);
        }
      }

      // Create directory
      try {
        await fs.createDirectory(targetDir);
      } catch (_e) {
        // Ignore
      }

      // Check if directory exists now
      try {
        await fs.getStats(targetDir);
      } catch (_e) {
        throw new Error(`Failed to create directory: ${targetDir}`);
      }

      // Write file
      await fs.writeFile(targetFile, content);
    });
  }

  private async exportToDirectoryWeb(
    content: string,
    rootHandle: FileSystemDirectoryHandle,
    runSave: (action: () => Promise<void>) => Promise<void>,
  ) {
    const name = this.chartName;

    // Check if subdir exists
    // biome-ignore lint/suspicious/noExplicitAny: File System Access API
    let subdirHandle: any;
    let exists = false;
    try {
      subdirHandle = await rootHandle.getDirectoryHandle(name, { create: false });
      exists = true;
    } catch (_e) {
      // Not found
    }

    if (exists) {
      // If it exists, confirm overwrite
      if (!confirm(`Directory "${name}" already exists. Overwrite?`)) {
        throw new Error("Cancelled by user");
      }
    }

    // Ready to save
    await runSave(async () => {
      if (exists) {
        // If confirmed, we need to clear it.
        try {
          await rootHandle.removeEntry(name, { recursive: true });
        } catch (e) {
          // If error is cancelled, rethrow
          if (e instanceof Error && e.message === "Cancelled by user") throw e;
        }
      }

      // Create directory
      subdirHandle = await rootHandle.getDirectoryHandle(name, { create: true });

      // Write file
      const fileHandle = await subdirHandle.getFileHandle(`${name}.tja`, { create: true });
      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();
    });
  }

  render() {
    let className = "control-btn";
    let content = "";

    if (this.status === "idle") {
      content = this.exportType === "download" ? i18n.t("ui.export.download") : i18n.t("ui.export.addToDir");
    } else if (this.status === "success") {
      className = "status-message success";
      content = i18n.t("status.exportSuccess");
    } else if (this.status === "error") {
      className = "status-message error";
      content = i18n.t("status.exportFailed");
    }

    if (this.isFading) {
      // Reuse the entering/fading class style
      // style.css has .status-message.entering { opacity: 0 }
      // We can just add a utility style for opacity
      className += " fading";
    }

    const vdom = (
      <div>
        <link rel="stylesheet" href={styleUrl} />
        <button
          type="button"
          className={className}
          onclick={this.handleClick.bind(this)}
          disabled={this.disabled || this.status !== "idle"}
          style={`width: 100%; transition: opacity 0.15s ease-out, background-color 0.15s; opacity: ${this.isFading ? "0" : "1"}; cursor: ${this.status === "idle" ? "pointer" : "default"}`}
        >
          {content}
        </button>
      </div>
    );

    if (this.shadowRoot) {
      webjsx.applyDiff(this.shadowRoot, vdom);
    }
  }
}

customElements.define("export-button", ExportButton);
