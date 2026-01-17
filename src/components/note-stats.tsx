import { getGradientColor, type HitInfo, PALETTE, type ViewOptions } from "../core/renderer.js";
import type { ParsedChart } from "../core/tja-parser.js";
import { i18n } from "../utils/i18n.js";

export class NoteStatsDisplay extends HTMLElement {
  private _hit: HitInfo | null = null;
  private _chart: ParsedChart | null = null;
  private _viewOptions: ViewOptions | null = null;
  private _judgements: string[] = [];
  private _judgementDeltas: (number | undefined)[] = [];
  private container: HTMLDivElement;

  constructor() {
    super();
    this.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = `
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
        `;

    this.container = document.createElement("div");
    this.container.id = "container";

    this.shadowRoot?.appendChild(style);
    this.shadowRoot?.appendChild(this.container);
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

  set judgements(value: string[]) {
    this._judgements = value;
    this.render();
  }

  set judgementDeltas(value: (number | undefined)[]) {
    this._judgementDeltas = value;
    this.render();
  }

  private createStatBox(label: string, value: string, highlight: boolean = false): string {
    return `
            <div class="stat-box">
                <div class="stat-label">${label}</div>
                <div class="stat-value ${highlight ? "stat-value-highlight" : ""}">${value}</div>
            </div>
        `;
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

  private render() {
    if (!this._viewOptions) return;

    let html = "";
    const def = "-";
    const hit = this._hit;
    const chart = this._chart;
    const options = this._viewOptions;
    const judgements = this._judgements;
    const judgementDeltas = this._judgementDeltas;

    const { collapsedLoop: collapsed, viewMode, coloringMode, visibility: judgementVisibility } = options;

    // Resolve target chart based on branch
    let targetChart = chart;
    if (hit?.branch && chart && chart.branches) {
      if (hit.branch === "normal") targetChart = chart.branches.normal || chart;
      else if (hit.branch === "expert") targetChart = chart.branches.expert || chart;
      else if (hit.branch === "master") targetChart = chart.branches.master || chart;
    }

    // 1. Type
    html += this.createStatBox(i18n.t("stats.type"), hit ? this.getNoteName(hit.type) : def);

    // 2. Gap
    let gap = def;
    if (hit && targetChart) {
      const g = this.getGapInfo(targetChart, hit.originalBarIndex, hit.charIndex);
      if (g) gap = g;
    }
    html += this.createStatBox(i18n.t("stats.gap"), gap);

    // 3. BPM
    html += this.createStatBox(i18n.t("stats.bpm"), hit ? this.formatBPM(hit.bpm) : def);

    // 4. HS
    html += this.createStatBox(i18n.t("stats.hs"), hit ? this.formatHS(hit.scroll) : def);

    // 5. Perceived BPM
    html += this.createStatBox(i18n.t("stats.seenBpm"), hit ? this.formatBPM(hit.bpm * hit.scroll) : def);

    // 6. Judgements (Deltas)
    let deltaVal = def;
    let avgDeltaVal = def;
    let allDeltasStr = "";

    if (
      hit &&
      (viewMode === "judgements" || viewMode === "judgements-underline" || viewMode === "judgements-text") &&
      hit.judgeableNoteIndex !== null &&
      targetChart
    ) {
      const deltas: number[] = [];

      if (collapsed && targetChart.loop) {
        const loop = targetChart.loop;
        if (hit.originalBarIndex >= loop.startBarIndex && hit.originalBarIndex < loop.startBarIndex + loop.period) {
          // Loop Logic
          let baseIndex = 0;
          for (let b = 0; b < hit.originalBarIndex; b++) {
            const bar = targetChart.bars[b];
            if (bar) {
              for (const c of bar) if (["1", "2", "3", "4"].includes(c)) baseIndex++;
            }
          }
          let offsetInBar = 0;
          const targetBar = targetChart.bars[hit.originalBarIndex];
          for (let c = 0; c < hit.charIndex; c++) {
            if (["1", "2", "3", "4"].includes(targetBar[c])) offsetInBar++;
          }
          const noteIndexInFirstIter = baseIndex + offsetInBar;

          let notesPerLoop = 0;
          for (let k = 0; k < loop.period; k++) {
            const bar = targetChart.bars[loop.startBarIndex + k];
            if (bar) {
              for (const c of bar) if (["1", "2", "3", "4"].includes(c)) notesPerLoop++;
            }
          }

          // Determine current iteration index for bolding
          let currentIterationIdx = -1;

          if (options.selectedLoopIteration !== undefined) {
            currentIterationIdx = options.selectedLoopIteration;
          } else {
            let preLoopNotes = 0;
            for (let i = 0; i < loop.startBarIndex; i++) {
              const bar = targetChart.bars[i];
              if (bar) for (const c of bar) if (["1", "2", "3", "4"].includes(c)) preLoopNotes++;
            }
            const lastJudgedIndex = judgements.length - 1;
            if (lastJudgedIndex >= preLoopNotes && notesPerLoop > 0) {
              const relativeIndex = lastJudgedIndex - preLoopNotes;
              currentIterationIdx = Math.floor(relativeIndex / notesPerLoop);
            }
          }
          if (currentIterationIdx < 0) currentIterationIdx = 0;

          const deltasStrings: string[] = [];
          for (let iter = 0; iter < loop.iterations; iter++) {
            const globalIdx = noteIndexInFirstIter + iter * notesPerLoop;
            if (globalIdx < judgementDeltas.length) {
              const delta = judgementDeltas[globalIdx];
              const judge = judgements[globalIdx];

              // Check visibility
              let isVisible = true;
              if (judge === "Perfect" && !judgementVisibility.perfect) isVisible = false;
              else if (judge === "Good" && !judgementVisibility.good) isVisible = false;
              else if (judge === "Poor" && !judgementVisibility.poor) isVisible = false;

              if (!isVisible) continue;

              if (delta !== undefined) deltas.push(delta);

              let s = delta !== undefined ? delta.toString() : "?";

              let color = "";
              if (coloringMode === "gradient") {
                if ((judge === "Perfect" || judge === "Good" || judge === "Poor") && delta !== undefined) {
                  color = getGradientColor(delta);
                } else {
                  color = PALETTE.judgements.miss; // Dark Grey for non-standard
                }
              } else {
                if (judge === "Perfect") color = PALETTE.judgements.perfect;
                else if (judge === "Good") color = PALETTE.judgements.good;
                else if (judge === "Poor") color = PALETTE.judgements.poor;
              }

              if (color) {
                s = `<span style="color: ${color}">${s}</span>`;
              }

              if (iter === currentIterationIdx) {
                s = `<b>${s}</b>`;
              }
              deltasStrings.push(s);
            }
          }

          if (deltas.length > 0) {
            const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
            avgDeltaVal = `${avg.toFixed(1)}ms`;

            if (coloringMode === "gradient") {
              const avgColor = getGradientColor(avg);
              avgDeltaVal = `<span style="color: ${avgColor}">${avgDeltaVal}</span>`;
            }

            allDeltasStr = deltasStrings.join(", ");
          }
        } else {
          if (hit.judgeableNoteIndex < judgementDeltas.length) {
            const delta = judgementDeltas[hit.judgeableNoteIndex];
            const judge = judgements[hit.judgeableNoteIndex];

            // Check visibility
            let isVisible = true;
            if (judge === "Perfect" && !judgementVisibility.perfect) isVisible = false;
            else if (judge === "Good" && !judgementVisibility.good) isVisible = false;
            else if (judge === "Poor" && !judgementVisibility.poor) isVisible = false;

            if (isVisible && delta !== undefined) {
              avgDeltaVal = `${delta}ms`;

              let s = delta.toString();
              let color = "";

              if (coloringMode === "gradient") {
                if (judge === "Perfect" || judge === "Good" || judge === "Poor") {
                  color = getGradientColor(delta);
                } else {
                  color = PALETTE.judgements.miss;
                }
              } else {
                if (judge === "Perfect") color = PALETTE.judgements.perfect;
                else if (judge === "Good") color = PALETTE.judgements.good;
                else if (judge === "Poor") color = PALETTE.judgements.poor;
              }

              if (color) s = `<span style="color: ${color}">${s}</span>`;
              if (coloringMode === "gradient" && color) {
                avgDeltaVal = `<span style="color: ${color}">${avgDeltaVal}</span>`;
              }

              allDeltasStr = s;
            }
          }
        }
      } else {
        // Standard Mode
        if (hit.judgeableNoteIndex < judgementDeltas.length) {
          const delta = judgementDeltas[hit.judgeableNoteIndex];
          const judge = judgements[hit.judgeableNoteIndex];

          // Check visibility
          let isVisible = true;
          if (judge === "Perfect" && !judgementVisibility.perfect) isVisible = false;
          else if (judge === "Good" && !judgementVisibility.good) isVisible = false;
          else if (judge === "Poor" && !judgementVisibility.poor) isVisible = false;

          if (isVisible && delta !== undefined) {
            deltaVal = `${delta}ms`;

            let color = "";
            if (coloringMode === "gradient") {
              if (judge === "Perfect" || judge === "Good" || judge === "Poor") {
                color = getGradientColor(delta);
              } else {
                color = PALETTE.judgements.miss;
              }
            } else {
              if (judge === "Perfect") color = PALETTE.judgements.perfect;
              else if (judge === "Good") color = PALETTE.judgements.good;
              else if (judge === "Poor") color = PALETTE.judgements.poor;
            }

            if (color) deltaVal = `<span style="color: ${color}">${deltaVal}</span>`;
          }
        }
      }
    }

    if (collapsed) {
      html += this.createStatBox(i18n.t("stats.avgDelta"), avgDeltaVal);
      html += `<div class="stat-full-line">Deltas: ${allDeltasStr}</div>`;
    } else {
      html += this.createStatBox(i18n.t("stats.delta"), deltaVal);
    }

    this.container.innerHTML = html;
  }
}

customElements.define("note-stats", NoteStatsDisplay);
