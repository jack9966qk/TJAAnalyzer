import { i18n } from "../utils/i18n.js";
export class DifficultySelect extends HTMLElement {
    selectElement;
    isRendered = false;
    constructor() {
        super();
    }
    ensureRender() {
        if (!this.isRendered) {
            this.render();
            this.isRendered = true;
        }
    }
    get value() {
        this.ensureRender();
        return this.selectElement ? this.selectElement.value : "";
    }
    set value(val) {
        this.ensureRender();
        if (this.selectElement) {
            this.selectElement.value = val;
        }
    }
    get options() {
        this.ensureRender();
        return this.selectElement?.options;
    }
    connectedCallback() {
        this.ensureRender();
        this.updateTexts();
        i18n.onLanguageChange(() => this.updateTexts());
    }
    render() {
        this.className = "control-row";
        // Default hidden state as per original
        this.style.display = "none";
        this.hidden = true;
        this.innerHTML = `
      <label for="difficulty-selector-internal" data-i18n="ui.difficulty">Difficulty:</label>
      <select id="difficulty-selector-internal"></select>
    `;
        this.selectElement = this.querySelector("#difficulty-selector-internal");
        this.selectElement.addEventListener("change", () => {
            this.dispatchEvent(new Event("change", { bubbles: true }));
        });
    }
    setOptions(difficulties) {
        this.ensureRender();
        if (!this.selectElement)
            return;
        this.selectElement.innerHTML = "";
        difficulties.forEach((diff) => {
            const option = document.createElement("option");
            option.value = diff;
            const key = `ui.difficulty.${diff.toLowerCase()}`;
            const translated = i18n.t(key);
            option.textContent = translated !== key ? translated : diff.charAt(0).toUpperCase() + diff.slice(1);
            option.setAttribute("data-i18n", key); // For dynamic updates
            this.selectElement.appendChild(option);
        });
        if (difficulties.length > 0) {
            this.selectElement.value = difficulties[0];
        }
    }
    clearOptions() {
        if (this.selectElement)
            this.selectElement.innerHTML = "";
    }
    updateTexts() {
        const label = this.querySelector("label");
        if (label)
            label.textContent = i18n.t("ui.difficulty");
        if (this.selectElement) {
            Array.from(this.selectElement.options).forEach((opt) => {
                const key = opt.getAttribute("data-i18n");
                if (key) {
                    opt.textContent = i18n.t(key);
                }
            });
        }
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
customElements.define("difficulty-select", DifficultySelect);
