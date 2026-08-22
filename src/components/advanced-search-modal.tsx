import * as webjsx from "webjsx";
import type { EseIndexEntry } from "../clients/ese-client.js";
import { appState } from "../state/app-state.js";
import { i18n } from "../utils/i18n.js";
import { getDnStyleCssClass } from "../utils/playdata-status.js";
import type { PlaydataEntry } from "../utils/playdata-types.js";
import "./modal-page.js";

export type Difficulty = "easy" | "normal" | "hard" | "oni" | "ura";

export const ALL_DIFFICULTIES: Difficulty[] = ["easy", "normal", "hard", "oni", "ura"];

/** Maps Difficulty name to the numeric code used in PlaydataEntry. */
export const difficultyToNumber: Record<Difficulty, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
  oni: 4,
  ura: 5,
};

export interface AdvancedSearchCriteria {
  difficulty?: Difficulty[];
  title?: string;
  artist?: string;
  subtitle?: string;
  starsMin?: number;
  starsMax?: number;
  noteCountMin?: number;
  noteCountMax?: number;
  bpmMin?: number;
  bpmMax?: number;
  bpmRangeMin?: number;
  bpmRangeMax?: number;
  platform?: string;
  region?: string;
  playdata?: string;
  dfcDifficulty?: string;
}

export interface PlaydataContext {
  getEntry: (path: string, difficultyNum?: number) => PlaydataEntry | null;
}

/**
 * Get the list of difficulties to check based on the criterion.
 * Returns null if no difficulty filter is active (meaning all).
 */
function getDifficulties(diff: AdvancedSearchCriteria["difficulty"]): Difficulty[] | null {
  if (!diff || diff.length === 0) return null; // null = all
  return diff;
}

/**
 * Determine which specific difficulties of an entry matched the per-difficulty criteria.
 * Returns null if no per-difficulty criteria are active (treat as single item).
 * Returns a Difficulty[] of the matching difficulties when per-difficulty criteria narrow it down.
 */
export function getMatchedDifficulties(
  entry: EseIndexEntry,
  criteria: AdvancedSearchCriteria,
  playdataContext?: PlaydataContext,
): Difficulty[] | null {
  // Only produce difficulty-specific results when per-difficulty criteria are active
  const hasPerDiffCriteria =
    criteria.starsMin != null ||
    criteria.starsMax != null ||
    criteria.noteCountMin != null ||
    criteria.noteCountMax != null ||
    criteria.dfcDifficulty ||
    criteria.playdata;
  if (!hasPerDiffCriteria) return null;

  const baseDiffs = getDifficulties(criteria.difficulty) ?? ALL_DIFFICULTIES;

  // Start with difficulties that exist on this entry
  let candidates = baseDiffs.filter((d) => entry.courses?.[d]);

  // Filter by stars range
  if (criteria.starsMin != null || criteria.starsMax != null) {
    candidates = candidates.filter((d) => {
      const level = entry.courses?.[d]?.level;
      if (level == null) return false;
      if (criteria.starsMin != null && level < criteria.starsMin) return false;
      if (criteria.starsMax != null && level > criteria.starsMax) return false;
      return true;
    });
  }

  // Filter by note count
  if (criteria.noteCountMin != null || criteria.noteCountMax != null) {
    candidates = candidates.filter((d) => {
      const combo = entry.courses?.[d]?.maxCombo;
      if (combo == null) return false;
      if (criteria.noteCountMin != null && combo < criteria.noteCountMin) return false;
      if (criteria.noteCountMax != null && combo > criteria.noteCountMax) return false;
      return true;
    });
  }

  // Filter by DFC difficulty
  if (criteria.dfcDifficulty) {
    candidates = candidates.filter((d) => entry.dfcDifficulty?.[d] === criteria.dfcDifficulty);
  }

  // Filter by playdata
  if (criteria.playdata && playdataContext) {
    candidates = candidates.filter((d) => {
      const playEntry = playdataContext.getEntry(entry.path, difficultyToNumber[d]);
      if (!playEntry) return false;
      return getDnStyleCssClass(playEntry) === criteria.playdata;
    });
  }

  return candidates.length > 0 ? candidates : null;
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

  // Stars (level range) — for "any" difficulty, match if any difficulty is in range
  if (criteria.starsMin != null || criteria.starsMax != null) {
    const diffsToCheck = diffs ?? (["easy", "normal", "hard", "oni", "ura"] as Difficulty[]);
    const hasLevel = diffsToCheck.some((d) => {
      const level = entry.courses?.[d]?.level;
      if (level == null) return false;
      if (criteria.starsMin != null && level < criteria.starsMin) return false;
      if (criteria.starsMax != null && level > criteria.starsMax) return false;
      return true;
    });
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

  // BPM: requested overlap range -> song must overlap with [bpmRangeMin, bpmRangeMax]
  if (criteria.bpmRangeMin != null || criteria.bpmRangeMax != null) {
    if (!entry.bpm) return false;
    const lo = criteria.bpmRangeMin ?? -Infinity;
    const hi = criteria.bpmRangeMax ?? Infinity;
    if (entry.bpm.max < lo || entry.bpm.min > hi) return false;
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

  // DFC Difficulty
  if (criteria.dfcDifficulty) {
    if (!entry.dfcDifficulty) return false;
    const diffsToCheck = diffs ?? (["oni", "ura"] as Difficulty[]);
    const hasDfc = diffsToCheck.some((d) => entry.dfcDifficulty?.[d] === criteria.dfcDifficulty);
    if (!hasDfc) return false;
  }

  return true;
}

/** Check if any criteria is set (non-empty). */
export function hasAnyCriteria(criteria: AdvancedSearchCriteria): boolean {
  return !!(
    (criteria.difficulty && criteria.difficulty.length > 0) ||
    criteria.title ||
    criteria.artist ||
    criteria.subtitle ||
    criteria.starsMin != null ||
    criteria.starsMax != null ||
    criteria.noteCountMin != null ||
    criteria.noteCountMax != null ||
    criteria.bpmMin != null ||
    criteria.bpmMax != null ||
    criteria.bpmRangeMin != null ||
    criteria.bpmRangeMax != null ||
    criteria.platform ||
    criteria.region ||
    criteria.playdata ||
    criteria.dfcDifficulty
  );
}

/** Get a concise summary string of the active criteria. */
export function getAdvancedSearchSummary(criteria: AdvancedSearchCriteria): string {
  if (!hasAnyCriteria(criteria)) return "";

  const parts: string[] = [];

  if (criteria.difficulty && criteria.difficulty.length > 0) {
    const diffLabels = criteria.difficulty.map((d) => i18n.t(`ui.difficulty.${d === "ura" ? "edit" : d}`));
    parts.push(diffLabels.join("/"));
  }

  if (criteria.starsMin != null || criteria.starsMax != null) {
    const min = criteria.starsMin ?? 1;
    const max = criteria.starsMax ?? 10;
    if (min === max) parts.push(`★${min}`);
    else parts.push(`★${min}-${max}`);
  }

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
  if (criteria.bpmRangeMin != null || criteria.bpmRangeMax != null) {
    const min = criteria.bpmRangeMin ?? "0";
    const max = criteria.bpmRangeMax ?? "∞";
    parts.push(`BPM:${min}-${max}`);
  }

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

  if (criteria.dfcDifficulty) {
    parts.push(dfcDisplayName(criteria.dfcDifficulty));
  }

  return parts.join(" • ");
}

/** All possible DFC section names in order from hardest to easiest. */
export const DFC_SECTIONS = [
  "SS",
  "iS+",
  "pS+",
  "iS",
  "pS",
  "iA+",
  "pA+",
  "iA",
  "pA",
  "iB",
  "pB",
  "iC",
  "pC",
  "iD",
  "pD",
  "iE",
  "pE",
  "iF",
] as const;

/** Convert a DFC section code to a user-friendly display name. */
export function dfcDisplayName(code: string): string {
  // "i" prefix -> Competence, "p" prefix -> Individual, no prefix -> as-is
  if (code.startsWith("i")) {
    const rank = code.slice(1);
    return `${i18n.t("ui.advSearch.dfcCompetence")} ${rank}`;
  }
  if (code.startsWith("p")) {
    const rank = code.slice(1);
    return `${i18n.t("ui.advSearch.dfcIndividual")} ${rank}`;
  }
  return code; // e.g. "SS"
}

export class AdvancedSearchModal extends HTMLElement {
  private isOpen = false;
  private criteria: AdvancedSearchCriteria = {};
  private _hasPlaydata = false;
  private modalContainer: HTMLDivElement;

  constructor() {
    super();
    this.modalContainer = document.createElement("div");
  }

  connectedCallback() {
    this.render();
    document.body.appendChild(this.modalContainer);
    i18n.onLanguageChange(() => {
      if (this.isOpen) this.render();
    });
  }

  disconnectedCallback() {
    if (this.modalContainer && this.modalContainer.parentNode === document.body) {
      document.body.removeChild(this.modalContainer);
    }
  }

  open(currentCriteria?: AdvancedSearchCriteria, hasPlaydata = false) {
    if (currentCriteria) {
      this.criteria = { ...currentCriteria };
    }
    this._hasPlaydata = hasPlaydata;
    this.isOpen = true;
    this.render();
  }

  private close() {
    this.isOpen = false;
    this.render();
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

  private handleOpenDifficultyChart() {
    this.dispatchEvent(
      new CustomEvent("difficulty-chart-open", {
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  }

  private updateField(field: keyof AdvancedSearchCriteria, value: unknown) {
    // For array fields, treat empty arrays as unset
    const isEmpty =
      value === "" || value === undefined || value === null || (Array.isArray(value) && value.length === 0);
    if (isEmpty) {
      delete this.criteria[field as keyof AdvancedSearchCriteria];
    } else {
      // biome-ignore lint/suspicious/noExplicitAny: dynamic assignment
      (this.criteria as any)[field] = value;
    }

    // Mutual dependency: DFC sets stars range to 10-10
    if (field === "dfcDifficulty" && value) {
      this.criteria.starsMin = 10;
      this.criteria.starsMax = 10;
    }
    // Stars range changed so 10 is excluded: clear DFC
    if (field === "starsMin" || field === "starsMax") {
      const min = this.criteria.starsMin ?? 1;
      const max = this.criteria.starsMax ?? 10;
      if (min > 10 || max < 10) {
        delete this.criteria.dfcDifficulty;
      }
    }

    this.render();
  }

  private toggleDifficulty(diff: Difficulty) {
    const current = this.criteria.difficulty ? [...this.criteria.difficulty] : [];
    const idx = current.indexOf(diff);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(diff);
    }
    this.updateField("difficulty", current.length > 0 ? current : undefined);
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
    const { platforms, regions } = this.collectKnownValues();
    const c = this.criteria;

    const diffOptions: { value: Difficulty; label: string }[] = [
      { value: "easy", label: i18n.t("ui.difficulty.easy") },
      { value: "normal", label: i18n.t("ui.difficulty.normal") },
      { value: "hard", label: i18n.t("ui.difficulty.hard") },
      { value: "oni", label: i18n.t("ui.difficulty.oni") },
      { value: "ura", label: i18n.t("ui.difficulty.edit") },
    ];

    const starsLabel = i18n.t("ui.advSearch.stars");
    const noteCountLabel = i18n.t("ui.advSearch.noteCount");

    const modalVdom = (
      <modal-page
        id="advanced-search-modal"
        open={this.isOpen || null}
        heading={i18n.t("ui.advSearch.title")}
        max-width="500px"
        onclose={this.close.bind(this)}
      >
        <div className="settings-content">
          {/* Title */}
          <div className="adv-search-field">
            <span className="adv-search-label">{i18n.t("ui.advSearch.titleFilter")}</span>
            <input
              type="text"
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
          <div className="adv-search-field">
            <span className="adv-search-label">{i18n.t("ui.advSearch.artist")}</span>
            <input
              type="text"
              value={c.artist || ""}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              oninput={(e: Event) => this.updateField("artist", (e.target as HTMLInputElement).value)}
            />
          </div>

          {/* Subtitle */}
          <div className="adv-search-field">
            <span className="adv-search-label">{i18n.t("ui.advSearch.subtitle")}</span>
            <input
              type="text"
              value={c.subtitle || ""}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              oninput={(e: Event) => this.updateField("subtitle", (e.target as HTMLInputElement).value)}
            />
          </div>

          {/* Difficulty (toggle buttons) */}
          <div className="adv-search-field">
            <span className="adv-search-label">{i18n.t("ui.advSearch.difficulty")}</span>
            <div className="adv-search-toggles">
              {diffOptions.map((o) => (
                <button
                  type="button"
                  className={`adv-search-toggle${c.difficulty?.includes(o.value) ? " active" : ""}`}
                  onclick={() => this.toggleDifficulty(o.value)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          {/* Stars (range) */}
          <div className="adv-search-field">
            <span className="adv-search-label">{starsLabel}</span>
            <div className="adv-search-range">
              <input
                type="number"
                value={c.starsMin != null ? String(c.starsMin) : ""}
                min="1"
                max="10"
                placeholder={i18n.t("ui.advSearch.min")}
                oninput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateField("starsMin", val ? Number(val) : undefined);
                }}
              />
              <span style="color: var(--text-secondary);">–</span>
              <input
                type="number"
                value={c.starsMax != null ? String(c.starsMax) : ""}
                min="1"
                max="10"
                placeholder={i18n.t("ui.advSearch.max")}
                oninput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateField("starsMax", val ? Number(val) : undefined);
                }}
              />
            </div>
          </div>

          {/* DFC Difficulty (only relevant for 10-star) */}
          <div className="adv-search-field">
            <span className="adv-search-label">{i18n.t("ui.advSearch.dfcDifficulty")}</span>
            <div className="adv-search-dfc-controls">
              <select
                value={c.dfcDifficulty || ""}
                onchange={(e: Event) =>
                  this.updateField("dfcDifficulty", (e.target as HTMLSelectElement).value || undefined)
                }
              >
                <option value="" selected={!c.dfcDifficulty}>
                  {i18n.t("ui.advSearch.any")}
                </option>
                {DFC_SECTIONS.map((s) => (
                  <option value={s} selected={s === c.dfcDifficulty}>
                    {dfcDisplayName(s)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-secondary difficulty-chart-open-btn"
                onclick={this.handleOpenDifficultyChart.bind(this)}
              >
                {i18n.t("ui.difficultyChart.open")}
              </button>
            </div>
          </div>

          {/* BPM (paired) */}
          <div className="adv-search-pair">
            <div className="adv-search-field">
              <span className="adv-search-label">{i18n.t("ui.advSearch.bpmMin")}</span>
              <input
                type="number"
                value={c.bpmMin != null ? String(c.bpmMin) : ""}
                min="1"
                placeholder=""
                oninput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateField("bpmMin", val ? Number(val) : undefined);
                }}
              />
            </div>
            <div className="adv-search-field">
              <span className="adv-search-label">{i18n.t("ui.advSearch.bpmMax")}</span>
              <input
                type="number"
                value={c.bpmMax != null ? String(c.bpmMax) : ""}
                min="1"
                placeholder=""
                oninput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateField("bpmMax", val ? Number(val) : undefined);
                }}
              />
            </div>
          </div>

          {/* BPM Overlap Range */}
          <div className="adv-search-field">
            <span className="adv-search-label">{i18n.t("ui.advSearch.bpmBetween")}</span>
            <div className="adv-search-range">
              <input
                type="number"
                value={c.bpmRangeMin != null ? String(c.bpmRangeMin) : ""}
                min="1"
                placeholder={i18n.t("ui.advSearch.min")}
                oninput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateField("bpmRangeMin", val ? Number(val) : undefined);
                }}
              />
              <span style="color: var(--text-secondary);">–</span>
              <input
                type="number"
                value={c.bpmRangeMax != null ? String(c.bpmRangeMax) : ""}
                min="1"
                placeholder={i18n.t("ui.advSearch.max")}
                oninput={(e: Event) => {
                  const val = (e.target as HTMLInputElement).value;
                  this.updateField("bpmRangeMax", val ? Number(val) : undefined);
                }}
              />
            </div>
          </div>

          {/* Note Count */}
          <div className="adv-search-field">
            <span className="adv-search-label">{noteCountLabel}</span>
            <div className="adv-search-range">
              <input
                type="number"
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

          {/* Platform & Region (paired) */}
          {(platforms.length > 0 || regions.length > 0) && (
            <div className="adv-search-pair">
              {platforms.length > 0 && (
                <div className="adv-search-field">
                  <span className="adv-search-label">{i18n.t("ui.advSearch.platform")}</span>
                  <select
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
              {regions.length > 0 && (
                <div className="adv-search-field">
                  <span className="adv-search-label">{i18n.t("ui.advSearch.region")}</span>
                  <select
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
            </div>
          )}

          {/* Playdata (DN Category) */}
          {this._hasPlaydata && (
            <div className="adv-search-field">
              <span className="adv-search-label">{i18n.t("ui.advSearch.playdata")}</span>
              <select
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
      </modal-page>
    );

    webjsx.applyDiff(this.modalContainer, modalVdom);
    webjsx.applyDiff(this, <span />);
  }
}

customElements.define("advanced-search-modal", AdvancedSearchModal);
