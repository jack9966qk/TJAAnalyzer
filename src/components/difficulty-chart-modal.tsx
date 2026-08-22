import * as webjsx from "webjsx";
import type { EseIndexEntry } from "../clients/ese-client.js";
import { i18n } from "../utils/i18n.js";
import { getDnStyleCssClass, getScoreRankChar, getScoreRankCssClass } from "../utils/playdata-status.js";
import type { PlaydataEntry } from "../utils/playdata-types.js";
import { DFC_SECTIONS, type Difficulty, dfcDisplayName } from "./advanced-search-modal.js";
import "./modal-page.js";

export interface DifficultyChartItem {
  node: EseIndexEntry;
  difficulty: Difficulty;
  section: string;
  title: string;
  playdata: PlaydataEntry | null;
}

export interface DifficultyChartSelection {
  node: EseIndexEntry;
  difficulty: Difficulty;
  section: string;
}

export class DifficultyChartModal extends HTMLElement {
  private isOpen = false;
  private items: DifficultyChartItem[] = [];
  private modalContainer: HTMLDivElement;
  private resizeObserver: ResizeObserver | null = null;
  private observedChartWidth = 0;
  private titleFitFrame: number | null = null;

  constructor() {
    super();
    this.modalContainer = document.createElement("div");
  }

  connectedCallback() {
    this.render();
    document.body.appendChild(this.modalContainer);
    this.resizeObserver = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 0;
      if (Math.abs(width - this.observedChartWidth) < 0.5) return;

      this.observedChartWidth = width;
      this.scheduleTitleFit();
    });
    this.observeDifficultyChart();
    i18n.onLanguageChange(() => {
      if (this.isOpen) this.render();
    });
  }

  disconnectedCallback() {
    this.resizeObserver?.disconnect();
    if (this.titleFitFrame !== null) cancelAnimationFrame(this.titleFitFrame);
    if (this.modalContainer.parentNode === document.body) {
      document.body.removeChild(this.modalContainer);
    }
  }

  open(items: DifficultyChartItem[]) {
    this.items = items;
    this.isOpen = true;
    this.render();
  }

  private close() {
    this.isOpen = false;
    this.render();
  }

  private handleSelect(item: DifficultyChartItem) {
    const detail: DifficultyChartSelection = {
      node: item.node,
      difficulty: item.difficulty,
      section: item.section,
    };
    this.dispatchEvent(
      new CustomEvent("difficulty-chart-select", {
        detail,
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  }

  private getDifficultyLabel(difficulty: Difficulty): string {
    return i18n.t(`ui.difficulty.${difficulty}`);
  }

  private observeDifficultyChart() {
    this.resizeObserver?.disconnect();
    const chart = this.modalContainer.querySelector(".difficulty-chart");
    if (chart) this.resizeObserver?.observe(chart);
  }

  private scheduleTitleFit() {
    if (this.titleFitFrame !== null) cancelAnimationFrame(this.titleFitFrame);
    this.titleFitFrame = null;
    if (!this.isOpen) return;

    this.titleFitFrame = requestAnimationFrame(() => {
      this.titleFitFrame = null;
      this.fitTitleFonts();
    });
  }

  private fitTitleFonts() {
    const titles = this.modalContainer.querySelectorAll<HTMLElement>(".difficulty-chart-item-title");

    titles.forEach((title) => {
      title.style.removeProperty("--difficulty-chart-title-scale");

      for (const scale of [0.9, 0.8, 0.7]) {
        const lineHeight = Number.parseFloat(getComputedStyle(title).lineHeight);
        if (title.scrollHeight <= lineHeight * 3 + 0.5) break;
        title.style.setProperty("--difficulty-chart-title-scale", String(scale));
      }
    });
  }

  private renderItem(item: DifficultyChartItem) {
    const entry = item.playdata;
    const dnClass = entry ? getDnStyleCssClass(entry) : "dn-white";
    const score = entry ? String(entry.score) : "";
    const rankChar = entry ? getScoreRankChar(entry.scoreRank) : "";
    const rankClass = entry ? getScoreRankCssClass(entry.scoreRank) : "";
    const good = entry ? String(entry.good) : "";
    const bad = entry ? String(entry.bad) : "";
    const difficultyLabel = this.getDifficultyLabel(item.difficulty);
    const statsLabel = entry
      ? `, ${i18n.t("ui.difficultyChart.score")} ${score}${rankChar ? `, ${i18n.t("ui.chartList.scoreRank")} ${rankChar}` : ""}, ${i18n.t("judgement.good")} ${good}, ${i18n.t("judgement.poor")} ${bad}`
      : "";

    return (
      <button
        type="button"
        className={`difficulty-chart-item ${dnClass}`}
        onclick={() => this.handleSelect(item)}
        aria-label={`${item.title}, ${difficultyLabel}${statsLabel}`}
      >
        <span className="difficulty-chart-item-heading">
          <span className="difficulty-chart-item-title">{item.title}</span>
          <span className="difficulty-chart-course">{difficultyLabel}</span>
        </span>
        {entry && (
          <span className="difficulty-chart-item-stats">
            {rankChar && <span className={`score-rank-box difficulty-chart-rank ${rankClass}`}>{rankChar}</span>}
            <strong className="difficulty-chart-score">{score}</strong>
            <span className="difficulty-chart-counts">
              <strong>{good}</strong> ({bad})
            </span>
          </span>
        )}
      </button>
    );
  }

  render() {
    const groups = DFC_SECTIONS.map((section) => ({
      section,
      items: this.items.filter((item) => item.section === section),
    })).filter((group) => group.items.length > 0);

    const modalVdom = (
      <modal-page
        id="difficulty-chart-modal"
        open={this.isOpen || null}
        heading={i18n.t("ui.difficultyChart.title")}
        max-width="1100px"
        onclose={this.close.bind(this)}
      >
        <div className="difficulty-chart">
          {groups.length > 0 ? (
            groups.map((group) => (
              <section className="difficulty-chart-section">
                <h3>{dfcDisplayName(group.section)}</h3>
                <div className="difficulty-chart-grid">{group.items.map((item) => this.renderItem(item))}</div>
              </section>
            ))
          ) : (
            <div className="difficulty-chart-empty">{i18n.t("ui.difficultyChart.empty")}</div>
          )}
        </div>
      </modal-page>
    );

    webjsx.applyDiff(this.modalContainer, modalVdom);
    webjsx.applyDiff(this, <span />);
    this.observeDifficultyChart();
    this.scheduleTitleFit();
  }
}

customElements.define("difficulty-chart-modal", DifficultyChartModal);
