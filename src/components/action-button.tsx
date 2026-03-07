import * as webjsx from "webjsx";
import styleUrl from "../style.css?url";

export interface DropdownItem {
  label: string;
  action: () => Promise<void>;
}

export interface ActionButtonProps {
  "success-label"?: string;
  "error-label"?: string;
  "button-variant"?: "primary" | "secondary";
  "button-size"?: "normal" | "icon";
  "button-title"?: string;
  disabled?: boolean;
  action?: () => Promise<void>;
  dropdownItems?: DropdownItem[];
}

export class ActionButton extends HTMLElement {
  // Attributes
  successLabel = "";
  errorLabel = "";
  buttonVariant: "primary" | "secondary" = "primary";
  buttonSize: "normal" | "icon" = "normal";
  buttonTitle = "";
  action?: () => Promise<void>;
  private _dropdownItems: DropdownItem[] = [];

  // State
  private status: "idle" | "success" | "error" = "idle";
  private isFading = false;
  private _disabled = false;
  private dropdownVisible = false;
  private _renderSuspended = false;
  private _connected = false;

  private handleDocumentClick = (e: MouseEvent) => {
    if (!this.dropdownVisible) return;
    const path = e.composedPath();
    if (!path.includes(this)) {
      this.dropdownVisible = false;
      this.render();
    }
  };

  private handleScroll = () => {
    if (this.dropdownVisible) {
      this.dropdownVisible = false;
      this.render();
    }
  };

  // Implement webjsx render suspension so all prop updates batch into one render.
  __webjsx_suspendRendering() {
    this._renderSuspended = true;
  }

  __webjsx_resumeRendering() {
    this._renderSuspended = false;
    if (this._connected) this.render();
  }

  private renderIfReady() {
    if (!this._renderSuspended && this._connected) this.render();
  }

  get dropdownItems() {
    return this._dropdownItems;
  }

  set dropdownItems(val: DropdownItem[]) {
    this._dropdownItems = val;
    this.renderIfReady();
  }

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
    this._connected = true;
    this.style.display = "block";
    this.render();
    document.addEventListener("click", this.handleDocumentClick);
    window.addEventListener("scroll", this.handleScroll, true);
  }

  disconnectedCallback() {
    this._connected = false;
    document.removeEventListener("click", this.handleDocumentClick);
    window.removeEventListener("scroll", this.handleScroll, true);
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

  private toggleDropdown(e: Event) {
    e.stopPropagation();
    this.dropdownVisible = !this.dropdownVisible;
    this.render();

    if (this.dropdownVisible) {
      requestAnimationFrame(() => {
        const btn = this.shadowRoot?.querySelector(".split-btn-dropdown") as HTMLElement;
        const dropdown = this.shadowRoot?.querySelector(".split-dropdown-menu") as HTMLElement;
        if (btn && dropdown) {
          const rect = this.getBoundingClientRect();
          dropdown.style.top = `${rect.bottom + 4}px`;
          dropdown.style.left = `${rect.left}px`;
          dropdown.style.minWidth = `${rect.width}px`;
        }
      });
    }
  }

  private async handleDropdownItemClick(item: DropdownItem) {
    this.dropdownVisible = false;
    this.render();
    await this.runAction(item.action);
  }

  render() {
    const hasSplit = this.dropdownItems.length > 0;
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

    const baseStyle = `
      transition: opacity 0.15s ease-out, background-color 0.15s;
      opacity: ${this.isFading ? "0" : "1"};
      cursor: ${this.status === "idle" && !this.disabled ? "pointer" : "default"};
      box-sizing: border-box;
    `;

    const vdom =
      hasSplit && showSlot ? (
        <div>
          <link rel="stylesheet" href={styleUrl} />
          <div
            className={`split-btn-container${className ? ` ${className}` : ""}`}
            style={`${baseStyle} width: 100%; height: 100%;`}
          >
            <button
              type="button"
              className={`split-btn-primary${this.buttonVariant === "secondary" ? " btn-secondary" : ""}`}
              disabled={this.disabled || this.status !== "idle"}
              title={this.buttonTitle || undefined}
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
            <div className="split-btn-divider" />
            <button
              type="button"
              className={`split-btn-dropdown${this.buttonVariant === "secondary" ? " btn-secondary" : ""}${this.dropdownVisible ? " active" : ""}`}
              disabled={this.disabled || this.status !== "idle"}
              onclick={(e: Event) => this.toggleDropdown(e)}
            >
              <div className="icon-chevron-down-small" />
            </button>
          </div>
          {this.dropdownVisible && (
            <div className="split-dropdown-menu">
              {this.dropdownItems.map((item) => (
                <button
                  type="button"
                  className="split-dropdown-option"
                  onclick={() => this.handleDropdownItemClick(item)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <link rel="stylesheet" href={styleUrl} />
          <button
            type="button"
            className={className}
            disabled={this.disabled || this.status !== "idle"}
            title={this.buttonTitle || undefined}
            style={`${baseStyle} width: 100%; height: 100%;`}
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
