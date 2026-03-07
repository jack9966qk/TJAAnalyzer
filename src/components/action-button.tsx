import * as webjsx from "webjsx";
import styleUrl from "../style.css?url";

export interface ActionButtonProps {
  "success-label"?: string;
  "error-label"?: string;
  "button-variant"?: "primary" | "secondary";
  "button-size"?: "normal" | "icon";
  "button-title"?: string;
  disabled?: boolean;
  action?: () => Promise<void>;
}

export class ActionButton extends HTMLElement {
  // Attributes
  successLabel = "";
  errorLabel = "";
  buttonVariant: "primary" | "secondary" = "primary";
  buttonSize: "normal" | "icon" = "normal";
  buttonTitle = "";
  action?: () => Promise<void>;

  // State
  private status: "idle" | "success" | "error" = "idle";
  private isFading = false;
  private _disabled = false;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static get observedAttributes() {
    return ["success-label", "error-label", "button-variant", "button-size", "button-title", "disabled"];
  }

  attributeChangedCallback(name: string, oldValue: string, newValue: string) {
    if (oldValue === newValue) return;

    if (name === "success-label") {
      this.successLabel = newValue ?? "";
    } else if (name === "error-label") {
      this.errorLabel = newValue ?? "";
    } else if (name === "button-variant") {
      this.buttonVariant = (newValue as "primary" | "secondary") ?? "primary";
    } else if (name === "button-size") {
      this.buttonSize = (newValue as "normal" | "icon") ?? "normal";
    } else if (name === "button-title") {
      this.buttonTitle = newValue ?? "";
    } else if (name === "disabled") {
      this._disabled = newValue !== null;
    }

    if (this.status === "idle") {
      this.render();
    }
  }

  get disabled() {
    return this._disabled;
  }

  set disabled(val: boolean) {
    this._disabled = val;
    if (val) {
      this.setAttribute("disabled", "");
    } else {
      this.removeAttribute("disabled");
    }
    this.render();
  }

  // Public method to trigger action with feedback
  public async runAction(action: () => Promise<void>) {
    if (this.disabled || this.status !== "idle") return;

    await this.transitionToResult(async () => {
      await action();
      return "success";
    });
  }

  connectedCallback() {
    this.style.display = "block";
    this.render();
  }

  private async transitionToResult(action: () => Promise<"success" | "error">) {
    const hasFeedback = !!(this.successLabel || this.errorLabel);

    if (hasFeedback) {
      this.isFading = true;
      this.render();
      await new Promise((r) => setTimeout(r, 150)); // Wait for fade out
    }

    // Perform action
    let result: "success" | "error" | "idle" = "idle";
    try {
      result = await action();
    } catch (e) {
      if (e instanceof Error && e.message === "Cancelled by user") {
        result = "idle";
      } else {
        console.error("Action failed:", e);
        result = "error";
      }
    }

    if (!hasFeedback) {
      return;
    }

    // Show status only when there's a label for this result
    const hasLabel = (result === "success" && this.successLabel) || (result === "error" && this.errorLabel);

    if (!hasLabel) {
      this.status = "idle";
      this.isFading = false;
      this.render();
      return;
    }

    this.status = result as "success" | "error" | "idle";
    this.isFading = false;
    this.render();

    if (result !== "idle") {
      await new Promise((r) => setTimeout(r, 1500));

      this.isFading = true;
      this.render();
      await new Promise((r) => setTimeout(r, 150));

      this.status = "idle";
      this.isFading = false;
      this.render();
    }
  }

  render() {
    let className = "";
    let showSlot = true;
    let message = "";

    if (this.status === "success" && this.successLabel) {
      className = "status-message success";
      message = this.successLabel;
      showSlot = false;
    } else if (this.status === "error" && this.errorLabel) {
      className = "status-message error";
      message = this.errorLabel;
      showSlot = false;
    } else {
      if (this.buttonVariant === "secondary") {
        className = "btn-secondary";
      }
      if (this.buttonSize === "icon") {
        className = className ? `${className} btn-icon` : "btn-icon";
      }
    }

    if (this.isFading) {
      className += " fading";
    }

    const style = `
      width: 100%;
      height: 100%;
      transition: opacity 0.15s ease-out, background-color 0.15s;
      opacity: ${this.isFading ? "0" : "1"};
      cursor: ${this.status === "idle" && !this.disabled ? "pointer" : "default"};
      box-sizing: border-box;
    `;

    const vdom = (
      <div>
        <link rel="stylesheet" href={styleUrl} />
        <button
          type="button"
          className={className}
          disabled={this.disabled || this.status !== "idle"}
          title={this.buttonTitle || undefined}
          style={style}
          onclick={() => {
            if (this.action) {
              this.runAction(this.action);
            }
          }}
        >
          <span style={showSlot ? "display: contents;" : "display: none;"}>
            <slot></slot>
          </span>
          {!showSlot && message}
        </button>
      </div>
    );

    if (this.shadowRoot) {
      webjsx.applyDiff(this.shadowRoot, vdom);
    }
  }
}

customElements.define("action-button", ActionButton);
