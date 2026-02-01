import * as webjsx from "webjsx";
import { i18n } from "../utils/i18n.js";

export class LanguageSelector extends HTMLElement {
  connectedCallback() {
    this.render();
    i18n.onLanguageChange(() => this.render());
  }

  handleLanguageChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    i18n.language = target.value;
  }

  render() {
    const currentLang = i18n.language;
    const languages = [
      { code: "en", label: "English" },
      { code: "zh", label: "中文" },
      { code: "ja", label: "日本語" },
    ];

    const vdom = (
      <div className="language-selector-container" style="position: relative; display: inline-block;">
        {/* Visual Button */}
        <div className="lang-btn">
          <div className="icon-language" />
          <div className="icon-chevron-down-small" />
        </div>

        {/* Native Select Overlay */}
        <select
          value={currentLang}
          onchange={this.handleLanguageChange.bind(this)}
          aria-label="Select Language"
          style="
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            opacity: 0;
            cursor: pointer;
            appearance: none;
            -webkit-appearance: none;
            z-index: 1;
          "
        >
          {languages.map((lang) => (
            <option value={lang.code} selected={currentLang === lang.code}>
              {lang.label}
            </option>
          ))}
        </select>
      </div>
    );
    webjsx.applyDiff(this, vdom);
  }
}

customElements.define("language-selector", LanguageSelector);
