import * as Renderer from "tja-renderer";
import * as webjsx from "webjsx";
import { i18n } from "../utils/i18n.js";
import { getGapMeasures, getGapMs } from "../utils/note-gap.js";

const { getGradientColor, JUDGEABLE_NOTES, JudgementMap, JudgementType, PALETTE } = Renderer.Private;

type HitInfo = Renderer.Private.HitInfo;
type JudgementMap<T> = Renderer.Private.JudgementMap<T>;
type JudgementValue = Renderer.Private.JudgementValue;
type ParsedChart = Renderer.Private.ParsedChart;
type RenderOptions = Renderer.Private.RenderOptions;

export class NoteStatsDisplay extends HTMLElement {
  private _hit: HitInfo | null = null;
  private _branchHit: HitInfo | null = null;
  private _chart: ParsedChart | null = null;
  private _renderOptions: RenderOptions | null = null;
  private _judgements: JudgementMap<JudgementValue> = new JudgementMap();

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
    i18n.onLanguageChange(() => this.render());
  }

  set hit(value: HitInfo | null) {
    this._hit = value;
    this.render();
  }

  set branchHit(value: HitInfo | null) {
    this._branchHit = value;
    this.render();
  }

  set chart(value: ParsedChart | null) {
    this._chart = value;
    this.render();
  }

  set renderOptions(value: RenderOptions | null) {
    this._renderOptions = value;
    this.render();
  }

  set judgements(value: JudgementMap<JudgementValue>) {
    this._judgements = value;
    this.render();
  }

  private formatBPM(val: number): string {
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
  }

  private formatHS(val: number): string {
    return val % 1 === 0 ? val.toFixed(1) : val.toFixed(2);
  }

  private formatGap(gap: number): string {
    const commonDenominators = [4, 8, 12, 16, 24, 32, 48, 64];
    for (const d of commonDenominators) {
      const val = gap * d;
      if (Math.abs(val - Math.round(val)) < 0.001) {
        const num = Math.round(val);
        const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
        const divisor = gcd(num, d);
        return `${num / divisor}/${d / divisor}`;
      }
    }
    return gap.toFixed(3);
  }

  private static readonly GAP_OPTIONS = { requireJudgeable: true, maxMeasures: 1 } as const;

  render() {
    const def = "-";
    const hit = this._hit;
    const branchHit = this._branchHit;
    const chart = this._chart;
    const options = this._renderOptions;
    const judgements = this._judgements;

    const {
      collapsedLoop: collapsed,
      viewMode,
      coloringMode,
      visibility: judgementVisibility,
    } = options || {
      collapsedLoop: false,
      viewMode: "original",
      coloringMode: "categorical",
      visibility: { perfect: true, good: true, poor: true },
    };

    // Resolve target chart based on branch
    let targetChart = chart;
    if (hit?.location?.branch && chart && chart.branches) {
      if (hit.location.branch === "normal") targetChart = chart.branches.normal || chart;
      else if (hit.location.branch === "expert") targetChart = chart.branches.expert || chart;
      else if (hit.location.branch === "master") targetChart = chart.branches.master || chart;
    }

    // Calculation Logic
    let deltaVal: JSX.Element | string = def;
    let avgDeltaVal: JSX.Element | string = def;
    let allDeltasElements: JSX.Element[] = [];

    if (
      hit &&
      options &&
      (viewMode === "judgements" || viewMode === "judgements-underline" || viewMode === "judgements-text") &&
      hit.ordinal !== undefined && // Use ordinal instead of judgeableNoteIndex
      targetChart
    ) {
      const deltas: number[] = [];

      if (collapsed && targetChart.loop) {
        const loop = targetChart.loop;
        if (hit.location.barIndex >= loop.startBarIndex && hit.location.barIndex < loop.startBarIndex + loop.period) {
          const counters: Record<string, number> = {};
          const map = new Map<string, number>();
          // Build map for relevant bars? Or full chart.
          for (let i = 0; i < targetChart.bars.length; i++) {
            const bar = targetChart.bars[i];
            if (bar)
              for (let j = 0; j < bar.length; j++) {
                const c = bar[j];
                if (JUDGEABLE_NOTES.includes(c)) {
                  if (!counters[c]) counters[c] = 0;
                  map.set(`${i}_${j}`, counters[c]);
                  counters[c]++;
                }
              }
          }

          // Determine relative position
          // `hit.location.barIndex` is inside the first loop iteration (template).
          const relBarIdx = hit.location.barIndex - loop.startBarIndex; // 0 to period-1

          let currentIterationIdx = -1;
          const iterationOrdinals: number[] = [];

          for (let iter = 0; iter < loop.iterations; iter++) {
            const actualBarIdx = loop.startBarIndex + iter * loop.period + relBarIdx;
            const ord = map.get(`${actualBarIdx}_${hit.location.charIndex}`);
            if (ord !== undefined) {
              iterationOrdinals.push(ord);
              if (ord === hit.ordinal) {
                currentIterationIdx = iter;
              }
            } else {
              iterationOrdinals.push(-1); // Should not happen if loop logic is correct
            }
          }

          // Render Deltas for all iterations
          for (let iter = 0; iter < iterationOrdinals.length; iter++) {
            const ord = iterationOrdinals[iter];
            if (ord === -1) continue;

            const key = { char: hit.type, ordinal: ord };
            const judgeData = judgements.get(key);

            if (judgeData) {
              const delta = judgeData.delta;
              const judge = judgeData.judgement;

              // Check visibility
              let isVisible = true;
              if (judge === JudgementType.Perfect && !judgementVisibility.perfect) isVisible = false;
              else if (judge === JudgementType.Good && !judgementVisibility.good) isVisible = false;
              else if (judge === JudgementType.Poor && !judgementVisibility.poor) isVisible = false;

              if (!isVisible) continue;

              deltas.push(delta);

              const text = delta.toString();
              let color = "";

              if (coloringMode === "gradient") {
                if (judge === JudgementType.Perfect || judge === JudgementType.Good || judge === JudgementType.Poor) {
                  color = getGradientColor(delta);
                } else {
                  color = PALETTE.judgements.miss; // Dark Grey for non-standard
                }
              } else {
                if (judge === JudgementType.Perfect) color = PALETTE.judgements.perfect;
                else if (judge === JudgementType.Good) color = PALETTE.judgements.good;
                else if (judge === JudgementType.Poor) color = PALETTE.judgements.poor;
              }

              let el = <span style={color ? `color: ${color}` : ""}>{text}</span>;
              if (iter === currentIterationIdx) {
                el = <b>{el}</b>;
              }

              allDeltasElements.push(el);
            }
          }

          // Add commas
          if (allDeltasElements.length > 0) {
            const joined: JSX.Element[] = [];
            allDeltasElements.forEach((el, i) => {
              joined.push(el);
              if (i < allDeltasElements.length - 1) joined.push(<span>, </span>);
            });
            allDeltasElements = joined;
          }

          if (deltas.length > 0) {
            const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
            const avgStr = `${avg.toFixed(1)}ms`;

            if (coloringMode === "gradient") {
              const avgColor = getGradientColor(avg);
              avgDeltaVal = <span style={`color: ${avgColor}`}>{avgStr}</span>;
            } else {
              avgDeltaVal = avgStr;
            }
          }
        } else {
          const key = { char: hit.type, ordinal: hit.ordinal };
          const judgeData = judgements.get(key);

          if (judgeData) {
            const delta = judgeData.delta;
            const judge = judgeData.judgement;

            let isVisible = true;
            if (judge === JudgementType.Perfect && !judgementVisibility.perfect) isVisible = false;
            else if (judge === JudgementType.Good && !judgementVisibility.good) isVisible = false;
            else if (judge === JudgementType.Poor && !judgementVisibility.poor) isVisible = false;

            if (isVisible) {
              avgDeltaVal = `${delta}ms`;
              let color = "";

              if (coloringMode === "gradient") {
                if (judge === JudgementType.Perfect || judge === JudgementType.Good || judge === JudgementType.Poor) {
                  color = getGradientColor(delta);
                } else {
                  color = PALETTE.judgements.miss;
                }
              } else {
                if (judge === JudgementType.Perfect) color = PALETTE.judgements.perfect;
                else if (judge === JudgementType.Good) color = PALETTE.judgements.good;
                else if (judge === JudgementType.Poor) color = PALETTE.judgements.poor;
              }

              let el = <span>{delta}</span>;
              if (color) el = <span style={`color: ${color}`}>{delta}</span>;
              allDeltasElements = [el];

              if (coloringMode === "gradient" && color) {
                avgDeltaVal = <span style={`color: ${color}`}>{avgDeltaVal}</span>;
              }
            }
          }
        }
      } else {
        // Standard Mode
        const key = { char: hit.type, ordinal: hit.ordinal };
        const judgeData = judgements.get(key);

        if (judgeData) {
          const delta = judgeData.delta;
          const judge = judgeData.judgement;

          let isVisible = true;
          if (judge === JudgementType.Perfect && !judgementVisibility.perfect) isVisible = false;
          else if (judge === JudgementType.Good && !judgementVisibility.good) isVisible = false;
          else if (judge === JudgementType.Poor && !judgementVisibility.poor) isVisible = false;

          if (isVisible) {
            deltaVal = `${delta}ms`;
            let color = "";
            if (coloringMode === "gradient") {
              if (judge === JudgementType.Perfect || judge === JudgementType.Good || judge === JudgementType.Poor) {
                color = getGradientColor(delta);
              } else {
                color = PALETTE.judgements.miss;
              }
            } else {
              if (judge === JudgementType.Perfect) color = PALETTE.judgements.perfect;
              else if (judge === JudgementType.Good) color = PALETTE.judgements.good;
              else if (judge === JudgementType.Poor) color = PALETTE.judgements.poor;
            }

            if (color) deltaVal = <span style={`color: ${color}`}>{deltaVal}</span>;
          }
        }
      }
    }

    // JSX Building
    const StatBox = (label: string, value: string | JSX.Element) => (
      <div className="stat-box">
        <div className="stat-label">{label}</div>
        <div className="stat-value">{value}</div>
      </div>
    );

    let gap = def;
    if (hit && targetChart) {
      const { barIndex, charIndex } = hit.location;
      const raw = getGapMeasures(targetChart, barIndex, charIndex, NoteStatsDisplay.GAP_OPTIONS);
      if (raw !== null) {
        const formatted = this.formatGap(raw);
        const ms = getGapMs(targetChart, barIndex, charIndex, NoteStatsDisplay.GAP_OPTIONS);
        if (ms !== null) {
          const seconds = (ms / 1000).toFixed(3);
          gap = `${formatted} (${seconds}s)`;
        } else {
          gap = formatted;
        }
      }
    }

    // Branch Stats Logic
    let branchStats: JSX.Element | null = null;
    const hasBranches = !!chart?.branches || (chart?.barParams?.some((p) => !!p.branchStartParams) ?? false);

    if (branchHit || hasBranches) {
      const params = branchHit?.branchStartParams;
      const typeLabel = params ? i18n.t(`stats.branch.type.${params.type}`) : def;
      const expertVal = params ? params.p1.toString() : def;
      const masterVal = params ? params.p2.toString() : def;

      let reachable = { normal: true, expert: true, master: true };
      if (branchHit && chart && chart.barParams[branchHit.location.barIndex]) {
        const barParams = chart.barParams[branchHit.location.barIndex];
        if (barParams.reachableBranches) {
          reachable = barParams.reachableBranches;
        }
      }

      branchStats = (
        <div className="branch-info-panel">
          <div className="branch-row">
            <span className="label">{i18n.t("stats.branch.type")}:</span>
            <span className="val">{typeLabel}</span>
          </div>
          <div className="branch-row" style={!reachable.expert ? "text-decoration: line-through; opacity: 0.6;" : ""}>
            <span className="label">{i18n.t("stats.branch.expert")}:</span>
            <span className="val">{expertVal}</span>
          </div>
          <div className="branch-row" style={!reachable.master ? "text-decoration: line-through; opacity: 0.6;" : ""}>
            <span className="label">{i18n.t("stats.branch.master")}:</span>
            <span className="val">{masterVal}</span>
          </div>
        </div>
      );
    }

    const vdom = (
      <div style="display: contents;">
        <style>{`
            :host {
                display: block;
            }
            #container {
                min-height: 80px;
                display: flex;
                flex-wrap: wrap;
                gap: 10px;
                padding: 10px;
                background-color: var(--bg-app);
                align-items: center;
                justify-content: center;
                border: 1px solid var(--border-color, #e0e0e0);
                border-radius: 6px;
                box-sizing: border-box;
                box-shadow: 0 2px 4px var(--shadow-color);
            }
            .stat-box {
                background-color: var(--stat-box-bg, #37474f);
                color: var(--stat-box-text, #eceff1);
                padding: 6px 12px;
                border-radius: 6px;
                display: flex;
                flex-direction: column;
                align-items: center;
                min-width: 90px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            }
            .stat-box-wide {
                flex-basis: 208px;
                min-width: 208px;
            }
            .stat-label {
                font-size: 0.7em;
                color: var(--stat-label, #b0bec5);
                text-transform: uppercase;
                letter-spacing: 1px;
                margin-bottom: 4px;
            }
            .stat-value {
                font-size: 1.2em;
                font-weight: bold;
                font-family: 'Consolas', monospace;
            }
            .stat-value-highlight {
                color: #ffeb3b;
            }
            .stat-full-line {
                flex-basis: 100%;
                background-color: var(--stat-box-bg, #37474f);
                color: var(--stat-box-text, #eceff1);
                padding: 10px 15px;
                border-radius: 6px;
                margin-top: 5px;
                font-family: 'Consolas', monospace;
                font-size: 0.9em;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                word-wrap: break-word;
                height: 4.5em;
                overflow-y: auto;
            }
            .branch-info-panel {
                flex-basis: 208px;
                min-width: 208px;
                background-color: var(--stat-box-bg, #37474f);
                color: var(--stat-box-text, #eceff1);
                padding: 10px 15px;
                border-radius: 6px;
                font-family: 'Consolas', monospace;
                font-size: 0.9em;
                box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                display: flex;
                flex-direction: column;
                justify-content: center;
                min-height: 4.5em;
            }
            .branch-row {
                display: flex;
                justify-content: space-between;
                margin-bottom: 4px;
            }
            .branch-row:last-child {
                margin-bottom: 0;
            }
            .label {
                color: var(--stat-label, #b0bec5);
                margin-right: 8px;
            }
            .val {
                font-weight: bold;
            }
            `}</style>
        <div id="container">
          <div className="stat-box stat-box-wide">
            <div className="stat-label">{i18n.t("stats.gap")}</div>
            <div className="stat-value">{gap}</div>
          </div>
          {StatBox(i18n.t("stats.bpm"), hit?.bpm != null ? this.formatBPM(hit.bpm) : def)}
          {StatBox(i18n.t("stats.hs"), hit?.scroll != null ? this.formatHS(hit.scroll) : def)}
          {StatBox(
            i18n.t("stats.seenBpm"),
            hit?.bpm != null && hit?.scroll != null ? this.formatBPM(hit.bpm * hit.scroll) : def,
          )}

          {collapsed ? (
            <div style="display: contents;">
              {StatBox(i18n.t("stats.avgDelta"), avgDeltaVal)}
              <div className="stat-full-line">Deltas: {allDeltasElements}</div>
            </div>
          ) : (
            StatBox(i18n.t("stats.delta"), deltaVal)
          )}

          {branchStats}
        </div>
      </div>
    );

    if (this.shadowRoot) {
      webjsx.applyDiff(this.shadowRoot, vdom);
    }
  }
}

customElements.define("note-stats", NoteStatsDisplay);
