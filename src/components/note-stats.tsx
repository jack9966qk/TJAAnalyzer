import * as webjsx from "webjsx";
import {
  getGradientColor,
  type HitInfo,
  JudgementMap,
  JudgementType,
  type JudgementValue,
  PALETTE,
  type ViewOptions,
} from "../core/renderer.js";
import type { ParsedChart } from "../core/tja-parser.js";
import { i18n } from "../utils/i18n.js";

export class NoteStatsDisplay extends HTMLElement {
  private _hit: HitInfo | null = null;
  private _chart: ParsedChart | null = null;
  private _viewOptions: ViewOptions | null = null;
  private _judgements: JudgementMap<JudgementValue> = new JudgementMap();

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  set hit(value: HitInfo | null) {
    this._hit = value;
    this.render();
  }

  set chart(value: ParsedChart | null) {
    this._chart = value;
    this.render();
  }

  set viewOptions(value: ViewOptions | null) {
    this._viewOptions = value;
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

  private getNoteName(char: string): string {
    const map: Record<string, string> = {
      "1": "don",
      "2": "ka",
      "3": "DON",
      "4": "KA",
      "5": "roll",
      "6": "ROLL",
      "7": "balloon",
      "9": "Kusudama",
    };
    return map[char] || "unknown";
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

  private getGapInfo(chart: ParsedChart, currentBarIdx: number, currentCharIdx: number): string | null {
    const currentBar = chart.bars[currentBarIdx];
    const currentTotal = currentBar.length;

    for (let i = currentCharIdx - 1; i >= 0; i--) {
      if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(currentBar[i])) {
        const prevPos = i / currentTotal;
        const curPos = currentCharIdx / currentTotal;
        const diff = curPos - prevPos;
        return this.formatGap(diff);
      }
    }

    for (let b = currentBarIdx - 1; b >= 0; b--) {
      const prevBar = chart.bars[b];
      if (!prevBar || prevBar.length === 0) {
        const minGap = currentCharIdx / currentTotal + (currentBarIdx - b);
        if (minGap > 1.0 + 0.001) return null;
        continue;
      }

      const prevTotal = prevBar.length;

      for (let i = prevTotal - 1; i >= 0; i--) {
        if (["1", "2", "3", "4", "5", "6", "7", "8", "9"].includes(prevBar[i])) {
          const distInCurrent = currentCharIdx / currentTotal;
          const distBetween = (currentBarIdx - b - 1) * 1.0;
          const distInPrev = (prevTotal - i) / prevTotal;

          const totalGap = distInCurrent + distBetween + distInPrev;

          if (totalGap <= 1.0 + 0.0001) {
            return this.formatGap(totalGap);
          } else {
            return null;
          }
        }
      }

      const minGap = currentCharIdx / currentTotal + (currentBarIdx - b);
      if (minGap > 1.0) return null;
    }

    return null;
  }

  render() {
    const def = "-";
    const hit = this._hit;
    const chart = this._chart;
    const options = this._viewOptions;
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
    if (hit?.branch && chart && chart.branches) {
      if (hit.branch === "normal") targetChart = chart.branches.normal || chart;
      else if (hit.branch === "expert") targetChart = chart.branches.expert || chart;
      else if (hit.branch === "master") targetChart = chart.branches.master || chart;
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
        if (hit.originalBarIndex >= loop.startBarIndex && hit.originalBarIndex < loop.startBarIndex + loop.period) {
          const counters: Record<string, number> = {};
          const map = new Map<string, number>();
          // Build map for relevant bars? Or full chart.
          for (let i = 0; i < targetChart.bars.length; i++) {
            const bar = targetChart.bars[i];
            if (bar)
              for (let j = 0; j < bar.length; j++) {
                const c = bar[j];
                if (["1", "2", "3", "4"].includes(c)) {
                  if (!counters[c]) counters[c] = 0;
                  map.set(`${i}_${j}`, counters[c]);
                  counters[c]++;
                }
              }
          }

          // Determine relative position
          // `hit.originalBarIndex` is inside the first loop iteration (template).
          const relBarIdx = hit.originalBarIndex - loop.startBarIndex; // 0 to period-1

          let currentIterationIdx = -1;
          const iterationOrdinals: number[] = [];

          for (let iter = 0; iter < loop.iterations; iter++) {
            const actualBarIdx = loop.startBarIndex + iter * loop.period + relBarIdx;
            const ord = map.get(`${actualBarIdx}_${hit.charIndex}`);
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
      const g = this.getGapInfo(targetChart, hit.originalBarIndex, hit.charIndex);
      if (g) gap = g;
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
                background-color: var(--bg-panel-header, #f5f5f5);
                align-items: center;
                justify-content: center;
                border: 1px solid var(--border-lighter, #e0e0e0);
                margin-top: 10px;
                border-radius: 6px;
                box-sizing: border-box;
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
            .hidden {
                display: none !important;
            }
            `}</style>
        <div id="container">
          {StatBox(i18n.t("stats.type"), hit ? this.getNoteName(hit.type) : def)}
          {StatBox(i18n.t("stats.gap"), gap)}
          {StatBox(i18n.t("stats.bpm"), hit ? this.formatBPM(hit.bpm) : def)}
          {StatBox(i18n.t("stats.hs"), hit ? this.formatHS(hit.scroll) : def)}
          {StatBox(i18n.t("stats.seenBpm"), hit ? this.formatBPM(hit.bpm * hit.scroll) : def)}

          {collapsed ? (
            <div style="display: contents;">
              {StatBox(i18n.t("stats.avgDelta"), avgDeltaVal)}
              <div className="stat-full-line">Deltas: {allDeltasElements}</div>
            </div>
          ) : (
            StatBox(i18n.t("stats.delta"), deltaVal)
          )}
        </div>
      </div>
    );

    if (this.shadowRoot) {
      webjsx.applyDiff(this.shadowRoot, vdom);
    }
  }
}

customElements.define("note-stats", NoteStatsDisplay);
