import * as webjsx from "webjsx";
import type { EseIndexEntry } from "../clients/ese-client.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import type { PlaydataEntry } from "../utils/playdata-parser.js";
import { getDnStyleCssClass } from "../utils/playdata-status.js";

type Difficulty = "easy" | "normal" | "hard" | "oni" | "ura";

export interface AdvancedSearchCriteria {
  difficulty?: "any" | Difficulty | "oni/ura";
  title?: string;
  artist?: string;
  subtitle?: string;
  stars?: number;
  noteCountMin?: number;
  noteCountMax?: number;
  bpmMin?: number;
  bpmMax?: number;
  platform?: string;
  region?: string;
  playdata?: string;
}

export interface PlaydataContext {
  getEntry: (path: string) => PlaydataEntry | null;
}

/**
 * Get the list of difficulties to check based on the criterion.
 * For "any", returns all; for "oni/ura", returns both.
 */
function getDifficulties(diff: AdvancedSearchCriteria["difficulty"]): Difficulty[] | null {
  if (!diff || diff === "any") return null; // null = all
  if (diff === "oni/ura") return ["oni", "ura"];
  return [diff];
}

/**
 * Pure filtering function: check if an EseIndexEntry matches the given criteria.
 * When playdata context is provided, also filters by DN-style playdata category.
 */
export function matchesAdvancedCriteria(
  entry: EseIndexEntry,
  criteria: AdvancedSearchCriteria,
  playdataContext?: PlaydataContext,
): boolean {
  const diffs = getDifficulties(criteria.difficulty);

  // Difficulty: entry must have at least one course for the specified difficulty
  if (diffs) {
    const hasDiff = diffs.some((d) => entry.courses?.[d]);
    if (!hasDiff) return false;
  }

  // Title (same fields as simple search)
  if (criteria.title) {
    const q = criteria.title.toLowerCase();
    const match =
      entry.path.toLowerCase().includes(q) ||
      entry.title?.toLowerCase().includes(q) ||
      entry.titleJp?.toLowerCase().includes(q) ||
      entry.titleOfficial?.toLowerCase().includes(q) ||
      entry.titleCn?.toLowerCase().includes(q) ||
      entry.titleKo?.toLowerCase().includes(q);
    if (!match) return false;
  }

  // Artist
  if (criteria.artist) {
    const q = criteria.artist.toLowerCase();
    const match = entry.artist?.toLowerCase().includes(q);
    if (!match) return false;
  }

  // Subtitle
  if (criteria.subtitle) {
    const q = criteria.subtitle.toLowerCase();
    const match = entry.subtitle?.toLowerCase().includes(q) || entry.subtitleJp?.toLowerCase().includes(q);
    if (!match) return false;
  }

  // Stars (level) — for "any" difficulty, match if any difficulty has the level
  if (criteria.stars != null) {
    const diffsToCheck = diffs ?? (["easy", "normal", "hard", "oni", "ura"] as Difficulty[]);
    const hasLevel = diffsToCheck.some((d) => entry.courses?.[d]?.level === criteria.stars);
    if (!hasLevel) return false;
  }

  // Note count — for "any" difficulty, match if any difficulty is in range
  if (criteria.noteCountMin != null || criteria.noteCountMax != null) {
    const diffsToCheck = diffs ?? (["easy", "normal", "hard", "oni", "ura"] as Difficulty[]);
    const hasMatch = diffsToCheck.some((d) => {
      const combo = entry.courses?.[d]?.maxCombo;
      if (combo == null) return false;
      if (criteria.noteCountMin != null && combo < criteria.noteCountMin) return false;
      if (criteria.noteCountMax != null && combo > criteria.noteCountMax) return false;
      return true;
    });
    if (!hasMatch) return false;
  }

  // BPM: requested min BPM -> song must reach at least this BPM (max >= bpmMin)
  if (criteria.bpmMin != null) {
    if (!entry.bpm || entry.bpm.max < criteria.bpmMin) return false;
  }

  // BPM: requested max BPM -> song must go as low as this BPM (min <= bpmMax)
  if (criteria.bpmMax != null) {
    if (!entry.bpm || entry.bpm.min > criteria.bpmMax) return false;
  }

  // Platform
  if (criteria.platform) {
    if (!entry.platforms?.includes(criteria.platform)) return false;
  }

  // Region
  if (criteria.region) {
    const regionVal = entry.region?.[criteria.region];
    if (regionVal == null || regionVal <= 0) return false;
  }

  // Playdata (DN category)
  if (criteria.playdata && playdataContext) {
    const playEntry = playdataContext.getEntry(entry.path);
    if (!playEntry) return false;
    const dnClass = getDnStyleCssClass(playEntry);
    if (dnClass !== criteria.playdata) return false;
  }

  return true;
}

/** Check if any criteria is set (non-empty). */
export function hasAnyCriteria(criteria: AdvancedSearchCriteria): boolean {
  return !!(
    (criteria.difficulty && criteria.difficulty !== "any") ||
    criteria.title ||
    criteria.artist ||
    criteria.subtitle ||
    criteria.stars != null ||
    criteria.noteCountMin != null ||
    criteria.noteCountMax != null ||
    criteria.bpmMin != null ||
    criteria.bpmMax != null ||
    criteria.platform ||
    criteria.region ||
    criteria.playdata
  );
}

/** Get a concise summary string of the active criteria. */
export function getAdvancedSearchSummary(criteria: AdvancedSearchCriteria): string {
  if (!hasAnyCriteria(criteria)) return "";

  const parts: string[] = [];

  if (criteria.difficulty && criteria.difficulty !== "any") {
    if (criteria.difficulty === "oni/ura") parts.push(`${i18n.t("ui.difficulty.oni")}/${i18n.t("ui.difficulty.edit")}`);
    else parts.push(i18n.t(`ui.difficulty.${criteria.difficulty === "ura" ? "edit" : criteria.difficulty}`));
  }

  if (criteria.stars != null) parts.push(`★${criteria.stars}`);

  if (criteria.title) parts.push(criteria.title);
  if (criteria.artist) parts.push(criteria.artist);
  if (criteria.subtitle) parts.push(criteria.subtitle);

  if (criteria.noteCountMin != null || criteria.noteCountMax != null) {
    const min = criteria.noteCountMin ?? 0;
    const max = criteria.noteCountMax ?? "∞";
    parts.push(`🎵 ${min}-${max}`);
  }

  if (criteria.bpmMin != null) parts.push(`BPM≥${criteria.bpmMin}`);
  if (criteria.bpmMax != null) parts.push(`BPM≤${criteria.bpmMax}`);

  if (criteria.platform) parts.push(criteria.platform);
  if (criteria.region) parts.push(criteria.region);

  if (criteria.playdata) {
    const dnLabelMap: Record<string, string> = {
      "dn-cyan": i18n.t("ui.advSearch.dnCyan"),
      "dn-green": i18n.t("ui.advSearch.dnGreen"),
      "dn-gold": i18n.t("ui.advSearch.dnGold"),
      "dn-grey": i18n.t("ui.advSearch.dnGrey"),
      "dn-white": i18n.t("ui.advSearch.dnWhite"),
    };
    parts.push(dnLabelMap[criteria.playdata] ?? criteria.playdata);
  }

  return parts.join(" • ");
}

export class AdvancedSearchModal extends HTMLElement {
  private isOpen = false;
  private modalContainer: HTMLDivElement;
  private criteria: AdvancedSearchCriteria = {};
  private _hasPlaydata = false;

  constructor() {
    super();
    this.modalContainer = document.createElement("div");
    document.body.appendChild(this.modalContainer);
  }

  connectedCallback() {
    this.render();
    i18n.onLanguageChange(() => {
      if (this.isOpen) this.renderModal();
    });
  }

  open(currentCriteria?: AdvancedSearchCriteria, hasPlaydata = false) {
    if (currentCriteria) {
      this.criteria = { ...currentCriteria };
    }
    this._hasPlaydata = hasPlaydata;
    this.isOpen = true;
    this.renderModal();
  }

  private close() {
    this.isOpen = false;
    this.renderModal();
  }

  private handleApply() {
    this.dispatchEvent(
      new CustomEvent("advanced-search-apply", {
        detail: { criteria: { ...this.criteria } },
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  }

  private handleClearAll() {
    this.criteria = {};
    this.dispatchEvent(
      new CustomEvent("advanced-search-clear", {
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  }

  private updateField(field: keyof AdvancedSearchCriteria, value: unknown) {
    if (value === "" || value === undefined || value === null) {
      delete this.criteria[field as keyof AdvancedSearchCriteria];
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic assignment
      (this.criteria as any)[field] = value;
    }
    this.renderModal();
  }

  private collectKnownValues(): { platforms: string[]; regions: string[] } {
    const platformSet = new Set<string>();
    const regionSet = new Set<string>();
    const eseTree = appState.eseTree;
    if (eseTree) {
      for (const entry of eseTree) {
        if (entry.platforms) {
          for (const p of entry.platforms) platformSet.add(p);
        }
        if (entry.region) {
          for (const r of Object.keys(entry.region)) regionSet.add(r);
        }
      }
    }
    return {
      platforms: [...platformSet].sort(),
      regions: [...regionSet].sort(),
    };
  }

  render() {
    // The trigger button is rendered in chart-list-panel, this component only manages the modal
    webjsx.applyDiff(this, <span />);
  }

  renderModal() {
    const { platforms, regions } = this.collectKnownValues();
    const c = this.criteria;

    const diffOptions: { value: string; label: string }[] = [
      { value: "any", label: i18n.t("ui.advSearch.any") },
      { value: "easy", label: i18n.t("ui.difficulty.easy") },
      { value: "normal", label: i18n.t("ui.difficulty.normal") },
      { value: "hard", label: i18n.t("ui.difficulty.hard") },
      { value: "oni", label: i18n.t("ui.difficulty.oni") },
      { value: "ura", label: i18n.t("ui.difficulty.edit") },
      { value: "oni/ura", label: `${i18n.t("ui.difficulty.oni")}/${i18n.t("ui.difficulty.edit")}` },
    ];

    const starsLabel = i18n.t("ui.advSearch.stars");
    const noteCountLabel = i18n.t("ui.advSearch.noteCount");

    const fieldStyle = "display: flex; align-items: center; gap: 8px; margin-bottom: 12px;";
    const labelStyle = "min-width: 100px; font-size: 14px; color: var(--text-secondary); flex-shrink: 0;";
    const inputStyle =
      "flex: 1; padding: 5px 8px; font-size: 14px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--bg-input); color: var(--text-primary); box-sizing: border-box;";
    const numberInputStyle = `${inputStyle} max-width: 80px;`;
    const rangeStyle = "display: flex; align-items: center; gap: 6px; flex: 1;";

    const modalVdom = (
      <div
        id="advanced-search-modal"
        className={`modal ${this.isOpen ? "open" : ""}`}
        onclick={(e: MouseEvent) => {
          if (e.target === e.currentTarget) this.close();
        }}
      >
        <div className="modal-content" style="max-width: 500px;">
          <div className="modal-header">
            <h2>{i18n.t("ui.advSearch.title")}</h2>
            <button type="button" className="close-btn" onclick={this.close.bind(this)} aria-label={i18n.t("ui.close")}>
              <div className="modal-close-icon" />
            </button>
          </div>
          <div className="settings-content" style="padding: 20px; overflow-y: auto; flex: 1; min-height: 0;">
            {/* Title */}
            <div style={fieldStyle}>
              <span style={labelStyle}>{i18n.t("ui.advSearch.titleFilter")}</span>
              <input
                type="text"
                style={inputStyle}
                value={c.title || ""}
                placeholder={i18n.t("ui.advSearch.titlePlaceholder")}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                oninput={(e: Event) => this.updateField("title", (e.target as HTMLInputElement).value)}
              />
            </div>

            {/* Artist */}
            <div style={fieldStyle}>
              <span style={labelStyle}>{i18n.t("ui.advSearch.artist")}</span>
              <input
                type="text"
                style={inputStyle}
                value={c.artist || ""}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                oninput={(e: Event) => this.updateField("artist", (e.target as HTMLInputElement).value)}
              />
            </div>

            {/* Subtitle */}
            <div style={fieldStyle}>
              <span style={labelStyle}>{i18n.t("ui.advSearch.subtitle")}</span>
              <input
                type="text"
                style={inputStyle}
                value={c.subtitle || ""}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                oninput={(e: Event) => this.updateField("subtitle", (e.target as HTMLInputElement).value)}
              />
            </div>

            {/* Difficulty & Stars Row */}
            <div style={fieldStyle}>
              <span style={labelStyle}>{i18n.t("ui.advSearch.difficulty")}</span>
              <div style="display: flex; align-items: center; gap: 16px; flex: 1;">
                <select
                  style={`${inputStyle} flex: 1;`}
                  value={c.difficulty || "any"}
                  onchange={(e: Event) => this.updateField("difficulty", (e.target as HTMLSelectElement).value)}
                >
                  {diffOptions.map((o) => (
                    <option value={o.value} selected={o.value === (c.difficulty || "any")}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <div style="display: flex; align-items: center; gap: 8px; flex: 1.2;">
                  <span style="font-size: 14px; color: var(--text-secondary); width: 60px; flex-shrink: 0;">
                    {starsLabel}
                  </span>
                  <input
                    type="number"
                    style={`${numberInputStyle} flex: 1; max-width: none;`}
                    value={c.stars != null ? String(c.stars) : ""}
                    min="1"
                    max="10"
                    placeholder="1-10"
                    oninput={(e: Event) => {
                      const val = (e.target as HTMLInputElement).value;
                      this.updateField("stars", val ? Number(val) : undefined);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* BPM Row */}
            <div style={fieldStyle}>
              <span style={labelStyle}>{i18n.t("ui.advSearch.bpmMin")}</span>
              <input
                type="number"
                style={numberInputStyle}
                value={c.bpmMin != null ? String(c.bpmMin) : ""}
                min="1"
                placeholder=""
                oninput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateField("bpmMin", val ? Number(val) : undefined);
                }}
              />
              <span style="font-size: 14px; color: var(--text-secondary); margin-left: 12px; flex-shrink: 0;">
                {i18n.t("ui.advSearch.bpmMax")}
              </span>
              <input
                type="number"
                style={numberInputStyle}
                value={c.bpmMax != null ? String(c.bpmMax) : ""}
                min="1"
                placeholder=""
                oninput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateField("bpmMax", val ? Number(val) : undefined);
                }}
              />
            </div>

            {/* Note Count */}
            <div style={fieldStyle}>
              <span style={labelStyle}>{noteCountLabel}</span>
              <div style={rangeStyle}>
                <input
                  type="number"
                  style={numberInputStyle}
                  value={c.noteCountMin != null ? String(c.noteCountMin) : ""}
                  min="0"
                  placeholder={i18n.t("ui.advSearch.min")}
                  oninput={(e: Event) => {
                    const val = (e.target as HTMLInputElement).value;
                    this.updateField("noteCountMin", val ? Number(val) : undefined);
                  }}
                />
                <span style="color: var(--text-secondary);">–</span>
                <input
                  type="number"
                  style={numberInputStyle}
                  value={c.noteCountMax != null ? String(c.noteCountMax) : ""}
                  min="0"
                  placeholder={i18n.t("ui.advSearch.max")}
                  oninput={(e: Event) => {
                    const val = (e.target as HTMLInputElement).value;
                    this.updateField("noteCountMax", val ? Number(val) : undefined);
                  }}
                />
              </div>
            </div>

            {/* Platform */}
            {platforms.length > 0 && (
              <div style={fieldStyle}>
                <span style={labelStyle}>{i18n.t("ui.advSearch.platform")}</span>
                <select
                  style={inputStyle}
                  value={c.platform || ""}
                  onchange={(e: Event) =>
                    this.updateField("platform", (e.target as HTMLSelectElement).value || undefined)
                  }
                >
                  <option value="">{i18n.t("ui.advSearch.any")}</option>
                  {platforms.map((p) => (
                    <option value={p} selected={p === c.platform}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Region */}
            {regions.length > 0 && (
              <div style={fieldStyle}>
                <span style={labelStyle}>{i18n.t("ui.advSearch.region")}</span>
                <select
                  style={inputStyle}
                  value={c.region || ""}
                  onchange={(e: Event) =>
                    this.updateField("region", (e.target as HTMLSelectElement).value || undefined)
                  }
                >
                  <option value="">{i18n.t("ui.advSearch.any")}</option>
                  {regions.map((r) => (
                    <option value={r} selected={r === c.region}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Playdata (DN Category) */}
            {this._hasPlaydata && (
              <div style={fieldStyle}>
                <span style={labelStyle}>{i18n.t("ui.advSearch.playdata")}</span>
                <select
                  style={inputStyle}
                  value={c.playdata || ""}
                  onchange={(e: Event) =>
                    this.updateField("playdata", (e.target as HTMLSelectElement).value || undefined)
                  }
                >
                  <option value="" selected={!c.playdata}>
                    {i18n.t("ui.advSearch.any")}
                  </option>
                  <option value="dn-cyan" selected={c.playdata === "dn-cyan"}>
                    {i18n.t("ui.advSearch.dnCyan")}
                  </option>
                  <option value="dn-green" selected={c.playdata === "dn-green"}>
                    {i18n.t("ui.advSearch.dnGreen")}
                  </option>
                  <option value="dn-gold" selected={c.playdata === "dn-gold"}>
                    {i18n.t("ui.advSearch.dnGold")}
                  </option>
                  <option value="dn-grey" selected={c.playdata === "dn-grey"}>
                    {i18n.t("ui.advSearch.dnGrey")}
                  </option>
                  <option value="dn-white" selected={c.playdata === "dn-white"}>
                    {i18n.t("ui.advSearch.dnWhite")}
                  </option>
                </select>
              </div>
            )}

            {/* Action buttons */}
            <div style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-lighter);">
              <button type="button" className="btn-secondary" onclick={this.handleClearAll.bind(this)}>
                {i18n.t("ui.advSearch.clearAll")}
              </button>
              <button type="button" onclick={this.handleApply.bind(this)}>
                {i18n.t("ui.advSearch.apply")}
              </button>
            </div>
          </div>
        </div>
      </div>
    );

    webjsx.applyDiff(this.modalContainer, modalVdom);
  }
}

customElements.define("advanced-search-modal", AdvancedSearchModal);
