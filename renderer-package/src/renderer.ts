import { calculateInferredHands } from "./auto-annotation.js";
import {
  createJudgementKey,
  createNoteLocation,
  isBig,
  isJudgeable,
  isRenderable,
  JUDGEABLE_NOTES,
  type JudgementKey,
  JudgementMap,
  LocationMap,
  type NoteLocation,
  NoteType,
  RENDERABLE_NOTES,
} from "./primitives.js";
import type { BarParams, GogoChange, LoopInfo, ParsedChart } from "./tja-parser.js";

export {
  type NoteLocation,
  type JudgementKey,
  JudgementMap,
  LocationMap,
  createJudgementKey,
  createNoteLocation,
  NoteType,
  JUDGEABLE_NOTES,
  RENDERABLE_NOTES,
  isJudgeable,
  isBig,
  isRenderable,
};

export enum JudgementType {
  Perfect = "perfect",
  Great = "great",
  Good = "good",
  Poor = "poor",
  Miss = "miss",
  Bad = "bad",
  Auto = "auto",
  Adlib = "adlib",
  Mine = "mine",
}

export interface JudgementValue {
  judgement: string;
  delta: number;
}

export const PALETTE = {
  background: "#d4d4d4ff",
  text: {
    primary: "#000",
    secondary: "#444",
    inverted: "#000",
    label: "#333",
  },
  ui: {
    barBorder: "#000",
    barVerticalLine: "#ffffffff",
    centerLine: "#ccc",
    gridLine: "#cccccc",
    selectionBorder: "#000",
    annotation: {
      match: "#000",
      mismatch: "#f00",
    },
    warning: {
      background: "#fff0f0",
      text: "#cc0000",
    },
    streamWaiting: {
      background: "#f0f0f0",
      text: "#666",
    },
  },
  notes: {
    don: "rgba(255, 77, 77, 1)",
    ka: "rgba(92, 187, 255, 1)",
    drumroll: "#ff0",
    balloon: "#ffa500",
    kusudama: "#ffd700",
    unjudged: "#999",
    border: {
      white: "#fff",
      black: "#000",
      grey: "#ccc",
      yellow: "#ff0",
    },
  },
  courses: {
    easy: "#ffa500",
    normal: "#00aa00",
    hard: "#555",
    oni: "#c6006e",
    edit: "#800080",
  },
  judgements: {
    perfect: "#ffa500",
    good: "#fff",
    poor: "#00f",
    miss: "#555",
    textBorder: "#000",
  },
  branches: {
    normal: "#2C2C2C",
    expert: "#284E6A",
    master: "#752168",
    default: "#999",
    startLine: "#ff0",
  },
  status: {
    bpm: "#00008B",
    hs: "#8B0000",
    line: "#666",
  },
  gogo: "#f8a33cff",
};

const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const INSETS: Insets = { top: 20, bottom: 20, left: 10, right: 10 };

export const LAYOUT_RATIOS = {
  barHeight: 0.14,
  rowSpacing: 0.16,
  noteRadiusSmall: 0.035,
  noteRadiusBig: 0.05,
  lineWidthBarBorder: 0.01,
  lineWidthCenter: 0.005,
  lineWidthNoteOuter: 0.022,
  lineWidthNoteInner: 0.0075,
  lineWidthUnderlineBorder: 0.008,
  barNumberFontSize: 0.045,
  statusFontSize: 0.045,
  barNumberOffsetY: 0.005,
  headerHeight: 0.35,
};

export function calculateAutoZoomBeats(
  canvasWidth: number,
  barLengths: Map<number, number> = new Map([[4, 1]]),
  insets: Insets = INSETS,
): number {
  if (canvasWidth <= 0) return 16;
  if (barLengths.size === 0) barLengths.set(4, 1);

  // Dynamic minNoteDiameter calculation
  // Start at 10 at width=350, scale linearly until 16 at width=800
  const contentWidth = canvasWidth - (insets.left + insets.right);

  const minD = 10;
  const maxD = 16;
  const minW = 350;
  const maxW = 800;

  let dynamicDiameter = minD;
  if (canvasWidth >= maxW) {
    dynamicDiameter = maxD;
  } else if (canvasWidth <= minW) {
    dynamicDiameter = minD;
  } else {
    dynamicDiameter = minD + ((canvasWidth - minW) * (maxD - minD)) / (maxW - minW);
  }

  // Use the calculated diameter as the effective minimum
  const effectiveMinDiameter = dynamicDiameter;

  // Bleed Ratio (Bar Extension)
  const ratioBleed = LAYOUT_RATIOS.noteRadiusSmall * 2;
  // Note Inner Ratio (for minD check)
  const ratioInner = LAYOUT_RATIOS.noteRadiusSmall * 2;

  // We need to satisfy: NoteInnerDiameter >= effectiveMinDiameter
  // NoteInnerDiameter = BaseBarWidth * ratioInner
  // BaseBarWidth = contentWidth / (Beats/4 + 2 * ratioBleed)
  // (contentWidth * ratioInner) / (Beats/4 + 2 * ratioBleed) >= minD
  // contentWidth * ratioInner / minD >= Beats/4 + 2 * ratioBleed
  // 4 * (contentWidth * ratioInner / minD - 2 * ratioBleed) >= Beats
  const maxBeatsByDiameter = 4 * ((contentWidth * ratioInner) / effectiveMinDiameter - 2 * ratioBleed);

  // Priority 1: Hard max limit 32
  const maxBeatsStrict = 32;

  // Upper bound for target beats based on P1 and P3
  const upperLimit = Math.min(maxBeatsStrict, Math.floor(maxBeatsByDiameter));

  // Priority 2: Must fit the longest bar
  const longestBar = Math.max(...barLengths.keys());
  // Priority 1: Hard min limit 4
  const lowerLimit = Math.max(4, Math.ceil(longestBar));

  // If constraints conflict (Longest Bar > Diameter Limit), Longest Bar wins (Constraint 2 > 3)
  if (lowerLimit >= upperLimit) {
    return lowerLimit;
  }

  // Optimization: Find target in [lowerLimit, upperLimit] that minimizes wasted space
  // We prioritize higher zoom levels (more beats per line) -> Iterate downwards from upperLimit
  let bestTarget = lowerLimit;
  let bestScore = -1;

  let totalBars = 0;
  for (const count of barLengths.values()) totalBars += count;

  for (let t = upperLimit; t >= lowerLimit; t--) {
    // Score based on weighted efficiency: Average % of line used across all bars
    let totalWeightedUsage = 0;

    for (const [len, count] of barLengths) {
      if (len <= 0) continue;
      // How many full bars of length 'len' fit in line 't'?
      const fitCount = Math.floor(t / len);
      if (fitCount > 0) {
        const used = fitCount * len;
        const ratio = used / t;
        totalWeightedUsage += ratio * count;
      }
    }

    const score = totalWeightedUsage / totalBars;

    // Keep track of the best score
    if (score > bestScore) {
      bestScore = score;
      bestTarget = t;
    }
  }

  return bestTarget;
}

// Helper types for renderer and hit testing
export interface RenderBarInfo {
  bar: NoteType[];
  originalIndex: number;
  isLoopStart?: boolean;
  isLoopEnd?: boolean;
  effectiveBarIndex?: number;
}

export interface Frame {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RenderConstants {
  barHeight: number;
  rowSpacing: number;
  noteRadiusSmall: number;
  noteRadiusBig: number;
  lineWidthBarBorder: number;
  lineWidthCenter: number;
  lineWidthNoteOuter: number;
  lineWidthNoteInner: number;
  lineWidthUnderlineBorder: number;
  barNumberFontSize: number;
  statusFontSize: number;
  barNumberOffsetY: number;
  headerHeight: number;
}

export interface LongNoteSegment {
  startX: number;
  endX: number;
  y: number;
  radius: number;
  startCap: boolean;
  endCap: boolean;
  type: NoteType;
  originalBarIndex: number;
  startNoteIndex: number;
}

export interface ChartLayout {
  virtualBars: RenderBarInfo[];
  barFrames: Frame[];
  constants: RenderConstants;
  totalHeight: number;
  globalBarStartIndices: number[];
  balloonIndices: LocationMap<number>;
  inferredHands: LocationMap<string>;
  logicalCanvasWidth: number;
  dpr: number;
  headerHeight: number;
  baseHeaderHeight: number;
  offsetY: number;
  baseBarWidth: number;
  locToJudgementKey: LocationMap<JudgementKey>;
  noteOrdinalToGrid: JudgementMap<{ virtualBarIdx: number; charIdx: number }[]>;
  longNoteSegments: LongNoteSegment[];
  insets: Insets;
}

export interface JudgementVisibility {
  perfect: boolean;
  good: boolean;
  poor: boolean;
}

export interface ViewOptions {
  viewMode: "original" | "judgements" | "judgements-underline" | "judgements-text";
  coloringMode: "categorical" | "gradient";
  visibility: JudgementVisibility;
  collapsedLoop: boolean;
  selectedLoopIteration?: number;
  beatsPerLine: number;
  showAllBranches?: boolean;
  selection: {
    start: NoteLocation;
    end: NoteLocation | null;
  } | null;
  hoveredNote?: (NoteLocation & { branch?: "normal" | "expert" | "master" }) | null;
  annotations?: LocationMap<string>;
  isAnnotationMode?: boolean;
  showTextInAnnotationMode?: boolean;
  alwaysShowAnnotations?: boolean;
  showAttribution?: boolean;
  range?: {
    start: NoteLocation;
    end: NoteLocation;
  };
}

export interface RenderTexts {
  loopPattern: string; // e.g. "Loop x{n}"
  judgement: {
    perfect: string;
    good: string;
    poor: string;
  };
  course?: Record<string, string>;
}

export interface RenderContext {
  canvasContext: CanvasRenderingContext2D;
  options: ViewOptions;
  judgements: JudgementMap<JudgementValue>;
  texts: RenderTexts;
  constants: RenderConstants;
  inferredHands?: LocationMap<string>;
  locToJudgementKey?: LocationMap<JudgementKey>;
}

const DEFAULT_TEXTS: RenderTexts = {
  loopPattern: "Loop x{n}",
  judgement: {
    perfect: "良",
    good: "可",
    poor: "不可",
  },
  course: {
    easy: "Easy",
    normal: "Normal",
    hard: "Hard",
    oni: "Oni",
    edit: "Oni (Ura)",
  },
};

export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
  viewMode: "original",
  coloringMode: "categorical",
  visibility: {
    perfect: true,
    good: true,
    poor: true,
  },
  collapsedLoop: false,
  beatsPerLine: 16,
  selection: null,
  showAttribution: true,
};

function isNoteSelected(barIdx: number, charIdx: number, selection: ViewOptions["selection"]): boolean {
  if (!selection) return false;

  const { start, end } = selection;
  if (!end) {
    return start.barIndex === barIdx && start.charIndex === charIdx;
  }

  // Range selection
  // Determine min/max to handle reverse selection
  let startBar = start.barIndex;
  let startChar = start.charIndex;
  let endBar = end.barIndex;
  let endChar = end.charIndex;

  if (startBar > endBar || (startBar === endBar && startChar > endChar)) {
    [startBar, endBar] = [endBar, startBar];
    [startChar, endChar] = [endChar, startChar];
  }

  if (barIdx < startBar || barIdx > endBar) return false;

  if (barIdx === startBar && barIdx === endBar) {
    return charIdx >= startChar && charIdx <= endChar;
  }

  if (barIdx === startBar) {
    return charIdx >= startChar;
  }

  if (barIdx === endBar) {
    return charIdx <= endChar;
  }

  return true; // strictly between startBar and endBar
}

function getVirtualBars(
  chart: ParsedChart,
  options: ViewOptions,
  judgements: JudgementMap<JudgementValue>,
  locToJudgementKey: LocationMap<JudgementKey>,
): RenderBarInfo[] {
  const { bars, loop } = chart;
  let virtualBars: RenderBarInfo[] = [];

  if (options.collapsedLoop && loop) {
    // Pre-loop
    for (let i = 0; i < loop.startBarIndex; i++) {
      virtualBars.push({ bar: bars[i], originalIndex: i, effectiveBarIndex: i });
    }

    // Calculate loop logic for judgements
    let currentIter = 0;

    if (options.selectedLoopIteration !== undefined) {
      currentIter = options.selectedLoopIteration;
    } else if (
      (options.viewMode === "judgements" ||
        options.viewMode === "judgements-underline" ||
        options.viewMode === "judgements-text") &&
      judgements.size > 0
    ) {
      // Find latest iteration with judgement
      let maxIter = -1;
      for (let iter = 0; iter < loop.iterations; iter++) {
        let hasJudgement = false;
        // Iterate bars in loop period
        for (let k = 0; k < loop.period; k++) {
          const barIdx = loop.startBarIndex + iter * loop.period + k;
          if (barIdx < bars.length) {
            const bar = bars[barIdx];
            if (bar) {
              for (let j = 0; j < bar.length; j++) {
                const char = bar[j];
                if (isJudgeable(char)) {
                  const locKey = { barIndex: barIdx, charIndex: j };
                  const identity = locToJudgementKey.get(locKey);
                  if (identity && judgements.has(identity)) {
                    hasJudgement = true;
                    break;
                  }
                }
              }
            }
          }
          if (hasJudgement) break;
        }
        if (hasJudgement) maxIter = iter;
      }
      if (maxIter !== -1) currentIter = maxIter;
    }

    // Clamp currentIter to valid range [0, loop.iterations - 1]
    if (currentIter < 0) currentIter = 0;
    if (currentIter >= loop.iterations) currentIter = loop.iterations - 1;

    // Loop Body
    for (let i = 0; i < loop.period; i++) {
      const originalIdx = loop.startBarIndex + i;
      const effectiveBarIndex = loop.startBarIndex + currentIter * loop.period + i;

      virtualBars.push({
        bar: bars[originalIdx],
        originalIndex: originalIdx,
        isLoopStart: i === 0,
        isLoopEnd: i === loop.period - 1,
        effectiveBarIndex: effectiveBarIndex,
      });
    }

    // Post-loop
    const postLoopStartIndex = loop.startBarIndex + loop.period * loop.iterations;
    for (let i = postLoopStartIndex; i < bars.length; i++) {
      virtualBars.push({ bar: bars[i], originalIndex: i, effectiveBarIndex: i });
    }
  } else {
    // Standard View
    virtualBars = bars.map((b, i) => ({ bar: b, originalIndex: i, effectiveBarIndex: i }));
  }

  // Handle Partial Rendering (Range)
  if (options.range && (!options.showAllBranches || !chart.branches)) {
    let { start, end } = options.range;

    // Normalize start/end order
    if (start.barIndex > end.barIndex || (start.barIndex === end.barIndex && start.charIndex > end.charIndex)) {
      const temp = start;
      start = end;
      end = temp;
    }

    // Filter bars outside the range
    virtualBars = virtualBars.filter((vb) => vb.originalIndex >= start.barIndex && vb.originalIndex <= end.barIndex);

    // Modify start and end bars to clear notes outside the range
    virtualBars = virtualBars.map((vb) => {
      let modifiedBar = vb.bar;
      let isModified = false;

      // Check Start
      if (vb.originalIndex === start.barIndex) {
        if (!isModified) {
          modifiedBar = [...(vb.bar || [])];
          isModified = true;
        }
        for (let i = 0; i < Math.min(start.charIndex, modifiedBar.length); i++) {
          modifiedBar[i] = NoteType.None;
        }
      }

      // Check End
      if (vb.originalIndex === end.barIndex) {
        if (!isModified) {
          modifiedBar = [...(vb.bar || [])];
          isModified = true;
        }
        for (let i = end.charIndex + 1; i < modifiedBar.length; i++) {
          modifiedBar[i] = NoteType.None;
        }
      }

      if (isModified) {
        return { ...vb, bar: modifiedBar };
      }
      return vb;
    });
  }

  return virtualBars;
}

function calculateGlobalBarStartIndices(bars: NoteType[][]): number[] {
  const indices: number[] = [];
  let currentGlobalNoteIndex = 0;
  for (const bar of bars) {
    indices.push(currentGlobalNoteIndex);
    if (bar) {
      for (const char of bar) {
        if (isJudgeable(char)) {
          currentGlobalNoteIndex++;
        }
      }
    }
  }
  return indices;
}

function calculateLayout(
  virtualBars: RenderBarInfo[],
  chart: ParsedChart,
  logicalCanvasWidth: number,
  options: ViewOptions,
  insets: Insets,
): { barFrames: Frame[]; constants: RenderConstants; totalHeight: number; baseBarWidth: number } {
  // 1. Determine Base Dimensions
  // The full canvas width (minus padding) represents 'beatsPerLine' beats.
  const availableWidth = logicalCanvasWidth - (insets.left + insets.right);
  // Base width is width of one 4/4 bar (4 beats).
  // Number of base bars per row = beatsPerLine / 4
  const baseBarWidth: number = availableWidth / (options.beatsPerLine / 4);

  // Constants for drawing
  const constants = {
    barHeight: baseBarWidth * LAYOUT_RATIOS.barHeight,
    rowSpacing: baseBarWidth * LAYOUT_RATIOS.rowSpacing,
    noteRadiusSmall: baseBarWidth * LAYOUT_RATIOS.noteRadiusSmall,
    noteRadiusBig: baseBarWidth * LAYOUT_RATIOS.noteRadiusBig,
    lineWidthBarBorder: baseBarWidth * LAYOUT_RATIOS.lineWidthBarBorder,
    lineWidthCenter: baseBarWidth * LAYOUT_RATIOS.lineWidthCenter,
    lineWidthNoteOuter: baseBarWidth * LAYOUT_RATIOS.lineWidthNoteOuter,
    lineWidthNoteInner: baseBarWidth * LAYOUT_RATIOS.lineWidthNoteInner,
    lineWidthUnderlineBorder: baseBarWidth * LAYOUT_RATIOS.lineWidthUnderlineBorder,
    barNumberFontSize: baseBarWidth * LAYOUT_RATIOS.barNumberFontSize,
    statusFontSize: baseBarWidth * LAYOUT_RATIOS.statusFontSize,
    barNumberOffsetY: baseBarWidth * LAYOUT_RATIOS.barNumberOffsetY,
    headerHeight: baseBarWidth * LAYOUT_RATIOS.headerHeight,
  };

  // 2. Calculate Layout Positions
  const barFrames: Frame[] = [];
  let currentY = insets.top;
  let currentRowX = 0;
  let currentRowMaxHeight = 0;
  let previousIsBranched: boolean | null = null;
  let isRowEmpty = true;

  for (const info of virtualBars) {
    // Determine width based on measure
    const params = chart.barParams[info.originalIndex];
    const measureRatio = params ? params.measureRatio : 1.0;
    const actualBarWidth = baseBarWidth * measureRatio;

    // Determine if this bar is displayed as branched (3 lanes) or common (1 lane)
    const isBranchedDisplay = (!!options.showAllBranches && chart.branches && params && params.isBranched) || false;
    const thisBarHeight = isBranchedDisplay ? constants.barHeight * 3 : constants.barHeight;

    // Check for break conditions
    let shouldBreak = false;

    // 1. Width Overflow
    if (!isRowEmpty && currentRowX + actualBarWidth > availableWidth + 1.0) {
      shouldBreak = true;
    }

    // 2. Branch State Change (only if not empty row)
    if (!isRowEmpty && previousIsBranched !== null && previousIsBranched !== isBranchedDisplay) {
      shouldBreak = true;
    }

    if (shouldBreak) {
      currentY += currentRowMaxHeight + constants.rowSpacing;
      currentRowX = 0;
      currentRowMaxHeight = 0;
      isRowEmpty = true;
    }

    barFrames.push({
      x: insets.left + currentRowX,
      y: currentY,
      width: actualBarWidth,
      height: thisBarHeight,
    });

    currentRowX += actualBarWidth;
    currentRowMaxHeight = Math.max(currentRowMaxHeight, thisBarHeight);
    previousIsBranched = isBranchedDisplay;
    isRowEmpty = false;
  }

  const totalHeight =
    barFrames.length > 0 ? currentY + currentRowMaxHeight + insets.bottom : insets.top + insets.bottom;

  return { barFrames, constants, totalHeight, baseBarWidth };
}

export interface HitInfo {
  originalBarIndex: number;
  charIndex: number;
  type: NoteType;
  bpm: number;
  scroll: number;
  branch?: "normal" | "expert" | "master";
  ordinal?: number;
}

export function getNoteAt(
  x: number,
  y: number,
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  judgements: JudgementMap<JudgementValue> = new JudgementMap(),
  options: ViewOptions,
  layout?: ChartLayout,
): HitInfo | null {
  let activeLayout: ChartLayout;

  if (layout) {
    activeLayout = layout;
  } else {
    activeLayout = createLayout(chart, canvas, options, judgements);
  }

  const { barFrames, constants, virtualBars } = activeLayout;
  const { noteRadiusSmall: NOTE_RADIUS_SMALL, noteRadiusBig: NOTE_RADIUS_BIG } = constants;
  const maxRadius = NOTE_RADIUS_BIG;

  const isAllBranches = !!options.showAllBranches && !!chart.branches;

  // Hit testing loop
  // Iterate backwards as per rendering order (notes on top)
  for (let index = virtualBars.length - 1; index >= 0; index--) {
    const info = virtualBars[index];
    const frame = barFrames[index];

    // Quick bounding box check
    if (
      x < frame.x - maxRadius ||
      x > frame.x + frame.width + maxRadius ||
      y < frame.y - maxRadius ||
      y > frame.y + frame.height + maxRadius
    ) {
      continue;
    }

    const barX = frame.x;
    let barY = frame.y;

    let targetChart = chart;
    let currentBranch: "normal" | "expert" | "master" | undefined = chart.branchType;
    const params = chart.barParams[info.originalIndex];
    const isBranchedBar = isAllBranches && params && params.isBranched;

    if (isBranchedBar && chart.branches) {
      const subHeight = frame.height / 3;
      if (y >= frame.y && y < frame.y + subHeight) {
        targetChart = chart.branches.normal || chart;
        currentBranch = "normal";
        barY = frame.y;
      } else if (y >= frame.y + subHeight && y < frame.y + 2 * subHeight) {
        targetChart = chart.branches.expert || chart;
        currentBranch = "expert";
        barY = frame.y + subHeight;
      } else if (y >= frame.y + 2 * subHeight && y < frame.y + 3 * subHeight) {
        targetChart = chart.branches.master || chart;
        currentBranch = "master";
        barY = frame.y + 2 * subHeight;
      } else {
        continue;
      }
    }

    const centerY = barY + (isBranchedBar ? frame.height / 3 : frame.height) / 2;

    const bar = targetChart.bars[info.originalIndex];
    if (!bar || bar.length === 0) continue;

    const noteStep: number = frame.width / bar.length;

    for (let i = 0; i < bar.length; i++) {
      const char = bar[i];
      if (!isRenderable(char)) continue;
      // Skip discrete hit testing for End notes to allow long note segment logic to handle them (mapping to head)
      if (char === NoteType.End) continue;

      const noteX: number = barX + i * noteStep;

      // Check distance
      const dx = x - noteX;
      const dy = y - centerY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Determine radius
      let radius = NOTE_RADIUS_SMALL;
      if (isBig(char)) radius = NOTE_RADIUS_BIG;

      if (dist <= radius) {
        // Hit!
        const currentParams = targetChart.barParams[info.originalIndex];

        let effectiveBpm = currentParams ? currentParams.bpm : 120;
        if (currentParams?.bpmChanges) {
          for (const change of currentParams.bpmChanges) {
            if (i >= change.index) {
              effectiveBpm = change.bpm;
            }
          }
        }

        let effectiveScroll = currentParams ? currentParams.scroll : 1.0;
        if (currentParams?.scrollChanges) {
          for (const change of currentParams.scrollChanges) {
            if (i >= change.index) {
              effectiveScroll = change.scroll;
            }
          }
        }

        const effectiveBarIndex = info.effectiveBarIndex !== undefined ? info.effectiveBarIndex : info.originalIndex;

        let ordinal: number | undefined;
        if (activeLayout.locToJudgementKey) {
          const locKey = { barIndex: effectiveBarIndex, charIndex: i };
          const ident = activeLayout.locToJudgementKey.get(locKey);
          if (ident) ordinal = ident.ordinal;
        }

        return {
          originalBarIndex: info.originalIndex,
          charIndex: i,
          type: char,
          bpm: effectiveBpm,
          scroll: effectiveScroll,
          branch: currentBranch,
          ordinal: ordinal,
        };
      }
    }
  }

  if (activeLayout.longNoteSegments) {
    for (const segment of activeLayout.longNoteSegments) {
      // Bounding box check
      const minX = Math.min(segment.startX, segment.endX) - segment.radius;
      const maxX = Math.max(segment.startX, segment.endX) + segment.radius;
      const minY = segment.y - segment.radius;
      const maxY = segment.y + segment.radius;

      if (x < minX || x > maxX || y < minY || y > maxY) continue;

      // Capsule Distance Check
      // Distance from point P(x,y) to line segment AB(startX, y, endX, y)
      // Since y is constant, we just clamp x.
      const clampedX = Math.max(
        Math.min(x, Math.max(segment.startX, segment.endX)),
        Math.min(segment.startX, segment.endX),
      );
      const dx = x - clampedX;
      const dy = y - segment.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= segment.radius) {
        // Hit!
        // We need to fetch additional info (bpm, scroll) for the start note
        const originalBarIdx = segment.originalBarIndex;
        const charIdx = segment.startNoteIndex;

        // Find effective params
        const currentParams = chart.barParams[originalBarIdx];
        let effectiveBpm = currentParams ? currentParams.bpm : 120;
        let effectiveScroll = currentParams ? currentParams.scroll : 1.0;

        if (currentParams?.bpmChanges) {
          for (const change of currentParams.bpmChanges) {
            if (charIdx >= change.index) {
              effectiveBpm = change.bpm;
            }
          }
        }
        if (currentParams?.scrollChanges) {
          for (const change of currentParams.scrollChanges) {
            if (charIdx >= change.index) {
              effectiveScroll = change.scroll;
            }
          }
        }

        let ordinal: number | undefined;
        if (activeLayout.locToJudgementKey) {
          const locKey = { barIndex: originalBarIdx, charIndex: charIdx };
          const ident = activeLayout.locToJudgementKey.get(locKey);
          if (ident) ordinal = ident.ordinal;
        }

        return {
          originalBarIndex: originalBarIdx,
          charIndex: charIdx,
          type: segment.type,
          bpm: effectiveBpm,
          scroll: effectiveScroll,
          branch: chart.branchType,
          // Note: In showAllBranches mode, segments are currently only calculated for the root chart (usually normal branch).
          // Hit testing for other branches' long notes is a known limitation.
          ordinal: ordinal,
        };
      }
    }
  }

  return null;
}

export function getNotePosition(
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  options: ViewOptions,
  targetBarIndex: number,
  targetCharIndex: number,
  layout?: ChartLayout,
): { x: number; y: number } | null {
  let activeLayout: ChartLayout;

  if (layout) {
    activeLayout = layout;
  } else {
    // For getNotePosition we don't need judgements really, pass empty
    activeLayout = createLayout(chart, canvas, options, new JudgementMap());
  }

  const { barFrames, virtualBars } = activeLayout;

  for (let index = 0; index < virtualBars.length; index++) {
    const info = virtualBars[index];
    if (info.originalIndex === targetBarIndex) {
      const frame = barFrames[index];
      const bar = info.bar;
      if (!bar || bar.length === 0) return null;

      const noteStep = frame.width / bar.length;
      const x = frame.x + targetCharIndex * noteStep;

      let y = frame.y + frame.height / 2;

      if (!!options.showAllBranches && chart.branches && chart.barParams[info.originalIndex].isBranched) {
        y = frame.y + frame.height / 6;
      }

      return { x, y };
    }
  }
  return null;
}

export function getGradientColor(delta: number): string {
  const clamped = Math.max(-100, Math.min(100, delta));
  let r = 0;
  let g = 0;
  let b = 0;

  if (clamped < 0) {
    // -100 (#B0CC35: 176, 204, 53) -> 0 (White: 255, 255, 255)
    // t: 0 (at -100) -> 1 (at 0)
    const t = (clamped + 100) / 100;

    // Lerp from Target to White
    r = Math.round(176 + (255 - 176) * t);
    g = Math.round(204 + (255 - 204) * t);
    b = Math.round(53 + (255 - 53) * t);
  } else {
    // 0 (White: 255, 255, 255) -> 100 (#952CD1: 149, 44, 209)
    // t: 0 (at 0) -> 1 (at 100)
    const t = clamped / 100;

    // Lerp from White to Target
    r = Math.round(255 + (149 - 255) * t);
    g = Math.round(255 + (44 - 255) * t);
    b = Math.round(255 + (209 - 255) * t);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function calculateLongNoteSegments(
  virtualBars: RenderBarInfo[],
  barFrames: Frame[],
  constants: RenderConstants,
): LongNoteSegment[] {
  const segments: LongNoteSegment[] = [];
  const { noteRadiusSmall: rSmall, noteRadiusBig: rBig } = constants;

  let currentLongNote: {
    type: NoteType;
    startBarIdx: number;
    startNoteIdx: number;
    originalBarIndex: number;
    originalNoteIdx: number;
  } | null = null;

  for (let i = 0; i < virtualBars.length; i++) {
    const bar = virtualBars[i].bar;
    if (!bar) continue;
    const frame = barFrames[i];

    const originalBarIdx = virtualBars[i].originalIndex;

    const noteCount = bar.length;
    if (noteCount === 0 && !currentLongNote) continue;
    const noteStep = noteCount > 0 ? frame.width / noteCount : 0;

    const barX = frame.x;
    const centerY = frame.y + frame.height / 2;

    let segmentStartIdx = 0;
    let segmentActive = !!currentLongNote;

    for (let j = 0; j < noteCount; j++) {
      const char = bar[j];

      if ([NoteType.Drumroll, NoteType.DrumrollBig, NoteType.Balloon, NoteType.Kusudama].includes(char)) {
        currentLongNote = {
          type: char,
          startBarIdx: i,
          startNoteIdx: j,
          originalBarIndex: originalBarIdx,
          originalNoteIdx: j,
        };
        segmentActive = true;
        segmentStartIdx = j;
      } else if (char === NoteType.End) {
        if (currentLongNote) {
          const radius =
            currentLongNote.type === NoteType.DrumrollBig || currentLongNote.type === NoteType.Kusudama ? rBig : rSmall;
          const startX = barX + segmentStartIdx * noteStep;
          const endX = barX + j * noteStep;

          const hasStartCap = segmentStartIdx === currentLongNote.startNoteIdx && i === currentLongNote.startBarIdx;
          const hasEndCap = true;

          segments.push({
            startX,
            endX,
            y: centerY,
            radius,
            startCap: hasStartCap,
            endCap: hasEndCap,
            type: currentLongNote.type,
            originalBarIndex: currentLongNote.originalBarIndex,
            startNoteIndex: currentLongNote.originalNoteIdx,
          });

          currentLongNote = null;
          segmentActive = false;
        }
      }
    }

    if (segmentActive && currentLongNote) {
      const radius =
        currentLongNote.type === NoteType.DrumrollBig || currentLongNote.type === NoteType.Kusudama ? rBig : rSmall;
      const startX = barX + segmentStartIdx * noteStep;
      const endX = barX + frame.width;

      const hasStartCap = segmentStartIdx === currentLongNote.startNoteIdx && i === currentLongNote.startBarIdx;
      const hasEndCap = false;

      segments.push({
        startX,
        endX,
        y: centerY,
        radius,
        startCap: hasStartCap,
        endCap: hasEndCap,
        type: currentLongNote.type,
        originalBarIndex: currentLongNote.originalBarIndex,
        startNoteIndex: currentLongNote.originalNoteIdx,
      });
    }
  }

  return segments;
}

function measureHeaderHeight(
  ctx: CanvasRenderingContext2D,
  chart: ParsedChart,
  width: number,
  baseHeight: number,
  texts?: RenderTexts,
): number {
  const { title = "Untitled", subtitle = "", level = 0, course = "Oni", bpm = 120 } = chart;

  const titleFontSize = baseHeight * 0.4;
  const subtitleFontSize = baseHeight * 0.25;
  const metaFontSize = baseHeight * 0.25;

  ctx.save();
  ctx.font = `bold ${titleFontSize}px ${FONT_STACK}`;
  const titleWidth = ctx.measureText(title).width;

  ctx.font = `${subtitleFontSize}px ${FONT_STACK}`;
  const subtitleWidth = subtitle ? ctx.measureText(subtitle).width : 0;

  // Course
  const courseKey = course.toLowerCase();
  let courseName = course.charAt(0).toUpperCase() + course.slice(1);
  if (texts?.course?.[courseKey]) {
    courseName = texts.course[courseKey];
  }
  let courseText = courseName;
  if (level > 0) courseText += ` ★${level}`;

  ctx.font = `bold ${metaFontSize}px ${FONT_STACK}`;
  const courseWidth = ctx.measureText(courseText).width;

  // BPM
  let minBpm = bpm;
  let maxBpm = bpm;
  if (chart.barParams) {
    for (const param of chart.barParams) {
      if (param.bpm < minBpm) minBpm = param.bpm;
      if (param.bpm > maxBpm) maxBpm = param.bpm;
      if (param.bpmChanges) {
        for (const change of param.bpmChanges) {
          if (change.bpm < minBpm) minBpm = change.bpm;
          if (change.bpm > maxBpm) maxBpm = change.bpm;
        }
      }
    }
  }
  const bpmText = minBpm === maxBpm ? `BPM: ${minBpm}` : `BPM: ${minBpm}-${maxBpm}`;

  ctx.font = `${metaFontSize}px ${FONT_STACK}`;
  const bpmWidth = ctx.measureText(bpmText).width;

  ctx.restore();

  const GAP = 20;
  const titleOverlap = titleWidth + GAP + courseWidth > width;
  const subtitleOverlap = subtitleWidth + GAP + bpmWidth > width;

  if (titleOverlap || subtitleOverlap) {
    let h = titleFontSize + 5;
    if (subtitle) h += subtitleFontSize + 5;
    h += metaFontSize + 5; // Course
    h += metaFontSize; // BPM

    // Add padding to match the spacing in standard layout (between subtitle and bottom of header area)
    const standardContentHeight = titleFontSize + 5 + subtitleFontSize;
    const extraPadding = Math.max(0, baseHeight - standardContentHeight);

    return h + extraPadding;
  }

  return baseHeight;
}

export function createLayout(
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  options: ViewOptions,
  judgements: JudgementMap<JudgementValue>,
  customDpr?: number,
  texts?: RenderTexts,
  baseInsets: Insets = INSETS,
): ChartLayout {
  // Reset width to 100% to allow measuring the container's available width
  canvas.style.width = "100%";
  let logicalCanvasWidth = canvas.clientWidth;
  if (logicalCanvasWidth === 0) {
    logicalCanvasWidth = canvas.width || 800;
  }

  // Layout Logic: Safe Area + Bleed
  const safeWidth = logicalCanvasWidth - (baseInsets.left + baseInsets.right);
  const beatsPerLine = options.beatsPerLine || 16;
  // For available width calculation, assume all bars have 4 beats
  const barsPerLine = beatsPerLine / 4;

  const ratioBleed = LAYOUT_RATIOS.noteRadiusSmall * 2;
  const baseBarWidth = safeWidth / (barsPerLine + 2 * ratioBleed);
  const bleedPixels = baseBarWidth * ratioBleed;

  const effectiveInsets: Insets = {
    left: baseInsets.left + bleedPixels,
    right: baseInsets.right + bleedPixels,
    top: baseInsets.top,
    bottom: baseInsets.bottom,
  };

  const availableWidth = baseBarWidth * barsPerLine;

  const baseHeaderHeight = baseBarWidth * LAYOUT_RATIOS.headerHeight;

  let headerHeight = baseHeaderHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    headerHeight = measureHeaderHeight(ctx, chart, availableWidth, baseHeaderHeight, texts);
  }

  const statusFontSize = baseBarWidth * LAYOUT_RATIOS.statusFontSize;
  const barNumberOffsetY = baseBarWidth * LAYOUT_RATIOS.barNumberOffsetY;
  const annotationHeight = barNumberOffsetY + 3 * statusFontSize;

  const gap = Math.max(effectiveInsets.top, annotationHeight);
  const offsetY = effectiveInsets.top + headerHeight + gap;

  const { bars } = chart;
  const globalBarStartIndices = calculateGlobalBarStartIndices(bars);
  const balloonIndices = calculateBalloonIndices(bars);
  const { locToJudgementKey } = calculateNoteMaps(bars);
  const virtualBars = getVirtualBars(chart, options, judgements, locToJudgementKey);

  const barLayoutInsets: Insets = {
    ...effectiveInsets,
    top: offsetY,
  };

  const {
    barFrames,
    constants,
    totalHeight: layoutHeight,
  } = calculateLayout(virtualBars, chart, logicalCanvasWidth, options, barLayoutInsets);

  let totalHeight = layoutHeight;
  if (options.showAttribution) {
    totalHeight += constants.statusFontSize * 1.5; // Add some space for attribution
  }

  const longNoteSegments = calculateLongNoteSegments(virtualBars, barFrames, constants);

  // Compute Grid for Dirty Row Optimization
  const noteOrdinalToGrid = new JudgementMap<{ virtualBarIdx: number; charIdx: number }[]>();
  virtualBars.forEach((info, vIdx) => {
    if (info.bar) {
      for (let j = 0; j < info.bar.length; j++) {
        const char = info.bar[j];
        if (isJudgeable(char)) {
          const locKey = { barIndex: info.originalIndex, charIndex: j };
          const ident = locToJudgementKey.get(locKey);

          if (ident) {
            if (!noteOrdinalToGrid.has(ident)) noteOrdinalToGrid.set(ident, []);
            noteOrdinalToGrid.get(ident)?.push({ virtualBarIdx: vIdx, charIdx: j });
          }
        }
      }
    }
  });

  const inferredHands = calculateInferredHands(bars, options.annotations);

  // Adjust for device pixel ratio for sharp rendering
  const dpr = customDpr !== undefined ? customDpr : window.devicePixelRatio || 1;

  return {
    virtualBars,
    barFrames,
    constants,
    totalHeight,
    globalBarStartIndices,
    balloonIndices,
    inferredHands,
    logicalCanvasWidth,
    dpr,
    headerHeight,
    baseHeaderHeight,
    offsetY,
    baseBarWidth,
    locToJudgementKey,
    noteOrdinalToGrid,
    longNoteSegments,
    insets: effectiveInsets,
  };
}

/**
 * Calculates the effective Device Pixel Ratio (DPR) to ensure the canvas stays within
 * browser memory and dimension limits.
 *
 * NOTE: The limits used here (16MP area, 32k dimension) are safe estimations based on
 * iOS Safari's strict canvas limits (approx 4096x4096) and common 16-bit integer limits
 * (32767) in other browsers. This prevents crashes or blank rendering on mobile devices.
 *
 * References:
 * - https://jhildenbiddle.github.io/canvas-size/#/?id=test-results
 * - https://stackoverflow.com/questions/6081483/maximum-size-of-a-canvas-element
 */
export function calculateEffectiveDpr(
  targetDpr: number,
  logicalWidth: number,
  totalHeight: number,
): { effectiveDpr: number; finalCanvasHeight: number; finalStyleHeight: number } {
  // 32,000 is chosen to stay safely under the 32,767 (2^15 - 1) limit common in many browsers.
  const MAX_CANVAS_DIMENSION = 32000;
  // 16,777,216 (16MP) is the maximum safe area for iOS Safari (4096 * 4096).
  const MAX_CANVAS_AREA = 16777216;

  let effectiveDpr = targetDpr;
  if (totalHeight * effectiveDpr > MAX_CANVAS_DIMENSION) {
    effectiveDpr = MAX_CANVAS_DIMENSION / totalHeight;
  }
  const currentArea = logicalWidth * effectiveDpr * (totalHeight * effectiveDpr);
  if (currentArea > MAX_CANVAS_AREA) {
    effectiveDpr = Math.sqrt(MAX_CANVAS_AREA / (logicalWidth * totalHeight));
  }
  if (effectiveDpr > targetDpr) effectiveDpr = targetDpr;

  let finalCanvasHeight = totalHeight * effectiveDpr;
  let finalStyleHeight = totalHeight;

  if (finalCanvasHeight > MAX_CANVAS_DIMENSION) {
    finalCanvasHeight = MAX_CANVAS_DIMENSION;
    finalStyleHeight = MAX_CANVAS_DIMENSION / effectiveDpr;
  }

  return { effectiveDpr, finalCanvasHeight, finalStyleHeight };
}

export function renderLayout(
  canvasContext: CanvasRenderingContext2D,
  layout: ChartLayout,
  chart: ParsedChart,
  judgements: JudgementMap<JudgementValue>,
  options: ViewOptions,
  texts: RenderTexts,
  dirtyRowY?: Set<number>,
): void {
  const {
    logicalCanvasWidth,
    dpr,
    totalHeight,
    barFrames,
    constants,
    virtualBars,
    balloonIndices,
    inferredHands,
    headerHeight,
    baseHeaderHeight,
    locToJudgementKey,
    insets,
  } = layout;

  const { effectiveDpr, finalCanvasHeight, finalStyleHeight } = calculateEffectiveDpr(
    dpr,
    logicalCanvasWidth,
    totalHeight,
  );

  const canvas = canvasContext.canvas;
  // Resize only if full render (dirtyRowY undefined) or if dimensions mismatch
  // Optimization: Trust that canvas size is correct for partial updates
  if (!dirtyRowY) {
    canvas.width = logicalCanvasWidth * effectiveDpr;
    canvas.height = finalCanvasHeight;
    canvas.style.width = `${logicalCanvasWidth}px`;
    canvas.style.height = `${finalStyleHeight}px`;
  }

  canvasContext.resetTransform();
  canvasContext.scale(effectiveDpr, effectiveDpr);

  if (dirtyRowY) {
    canvasContext.save();
    canvasContext.beginPath();
    const rowHeights = new Map<number, number>();
    barFrames.forEach((l) => {
      if (dirtyRowY.has(l.y)) {
        const current = rowHeights.get(l.y) || 0;
        rowHeights.set(l.y, Math.max(current, l.height));
      }
    });

    const MARGIN = constants.noteRadiusBig * 3;
    dirtyRowY.forEach((y) => {
      const h = rowHeights.get(y) || constants.barHeight;
      canvasContext.rect(0, y - MARGIN, logicalCanvasWidth, h + MARGIN * 2);
    });
    canvasContext.clip();

    canvasContext.fillStyle = PALETTE.background;
    dirtyRowY.forEach((y) => {
      const h = rowHeights.get(y) || constants.barHeight;
      canvasContext.fillRect(0, y - MARGIN, logicalCanvasWidth, h + MARGIN * 2);
    });
  } else {
    // Clear
    canvasContext.fillStyle = PALETTE.background;
    canvasContext.fillRect(0, 0, logicalCanvasWidth, totalHeight);
  }

  const renderContext: RenderContext = {
    canvasContext: canvasContext,
    options,
    judgements,
    texts,
    constants,
    inferredHands,
    locToJudgementKey,
  };

  // Layer 0: Header
  if (!dirtyRowY) {
    const effectivePaddingLeft = insets?.left ?? INSETS.left;
    const effectivePaddingRight = insets?.right ?? INSETS.right;
    const effectivePaddingY = insets?.top ?? INSETS.top;
    const availableWidth = logicalCanvasWidth - (effectivePaddingLeft + effectivePaddingRight);
    const headerFrame: Frame = {
      x: effectivePaddingLeft,
      y: effectivePaddingY,
      width: availableWidth,
      height: headerHeight,
    };
    drawChartHeader(canvasContext, chart, headerFrame, texts, baseHeaderHeight);
  }

  const isAllBranches = !!options.showAllBranches && !!chart.branches;
  const BASE_LANE_HEIGHT = constants.barHeight;

  // Layer 1: Backgrounds
  virtualBars.forEach((info, index) => {
    const frame = barFrames[index];
    if (dirtyRowY && !dirtyRowY.has(frame.y)) return;

    drawBarBackgroundWrapper(
      canvasContext,
      frame,
      info,
      index,
      chart,
      options,
      constants,
      virtualBars,
      barFrames,
      texts,
      isAllBranches,
      BASE_LANE_HEIGHT,
      layout.baseBarWidth / 4,
    );
  });

  // Layer 1.5 & 2: Notes
  if (isAllBranches && chart.branches) {
    drawAllBranchesNotes(renderContext, chart, virtualBars, barFrames, balloonIndices, BASE_LANE_HEIGHT, dirtyRowY);
  } else {
    // Layer 1.5: Drumrolls and Balloons
    drawLongNotes(
      canvasContext,
      virtualBars,
      barFrames,
      constants,
      options.viewMode,
      chart.balloonCounts,
      balloonIndices,
      options.selection,
      dirtyRowY,
    );

    // Layer 2: Notes
    for (let index = virtualBars.length - 1; index >= 0; index--) {
      const info = virtualBars[index];
      const frame = barFrames[index];
      if (dirtyRowY && !dirtyRowY.has(frame.y)) continue;

      drawBarNotes(
        renderContext,
        info.bar,
        frame,
        info.originalIndex,
        options.collapsedLoop ? chart.loop : undefined,
        chart.branchType,
        info.effectiveBarIndex,
      );
    }
  }

  if (options.showAttribution && !dirtyRowY) {
    canvasContext.save();
    canvasContext.fillStyle = PALETTE.text.secondary;
    const fontSize = constants.statusFontSize;
    canvasContext.font = `italic ${fontSize}px ${FONT_STACK}`;
    canvasContext.textAlign = "right";
    canvasContext.textBaseline = "bottom";
    const effectivePaddingX = insets?.left ?? INSETS.left;
    canvasContext.fillText(
      "TJA renderer by Jack",
      logicalCanvasWidth - effectivePaddingX,
      totalHeight - fontSize * 0.8,
    );
    canvasContext.restore();
  }

  if (dirtyRowY) {
    canvasContext.restore();
  }
}

function drawBarBackgroundWrapper(
  canvasContext: CanvasRenderingContext2D,
  frame: Frame,
  info: RenderBarInfo,
  index: number,
  chart: ParsedChart,
  options: ViewOptions,
  constants: RenderConstants,
  virtualBars: RenderBarInfo[],
  barFrames: Frame[],
  texts: RenderTexts,
  isAllBranches: boolean,
  BASE_LANE_HEIGHT: number,
  beatWidth: number,
) {
  const params = chart.barParams[info.originalIndex];

  // Fallback if beatWidth is missing or 0
  let effectiveBeatWidth = beatWidth;
  if (!effectiveBeatWidth || effectiveBeatWidth <= 0) {
    const measureRatio = params ? params.measureRatio : 1.0;
    effectiveBeatWidth = frame.width / measureRatio / 4;
  }

  const gogoTime = params ? params.gogoTime : false;
  const gogoChanges = params ? params.gogoChanges : undefined;
  const noteCount = info.bar ? info.bar.length : 0;
  const isBranched = params ? params.isBranched : false;

  // Detect neighbors for over-extension
  let hasLeftNeighbor = false;
  if (index > 0) {
    const prevFrame = barFrames[index - 1];
    if (Math.abs(prevFrame.y - frame.y) < 1.0) {
      hasLeftNeighbor = true;
    }
  }
  let hasRightNeighbor = false;
  if (index < virtualBars.length - 1) {
    const nextFrame = barFrames[index + 1];
    if (Math.abs(nextFrame.y - frame.y) < 1.0) {
      hasRightNeighbor = true;
    }
  }

  const overExtendWidth = 2 * constants.noteRadiusSmall;
  const isBranchStart = params ? !!params.isBranchStart : false;

  if (isAllBranches && chart.branches) {
    if (isBranched) {
      const subHeight = BASE_LANE_HEIGHT;
      const normalFrame: Frame = { x: frame.x, y: frame.y, width: frame.width, height: subHeight };
      drawBarBackground(
        canvasContext,
        normalFrame,
        constants.lineWidthBarBorder,
        true,
        "normal",
        !hasLeftNeighbor,
        !hasRightNeighbor,
        overExtendWidth,
        effectiveBeatWidth,
      );
      const expertFrame: Frame = { x: frame.x, y: frame.y + subHeight, width: frame.width, height: subHeight };
      drawBarBackground(
        canvasContext,
        expertFrame,
        constants.lineWidthBarBorder,
        true,
        "expert",
        !hasLeftNeighbor,
        !hasRightNeighbor,
        overExtendWidth,
        effectiveBeatWidth,
      );
      const masterFrame: Frame = { x: frame.x, y: frame.y + 2 * subHeight, width: frame.width, height: subHeight };
      drawBarBackground(
        canvasContext,
        masterFrame,
        constants.lineWidthBarBorder,
        true,
        "master",
        !hasLeftNeighbor,
        !hasRightNeighbor,
        overExtendWidth,
        effectiveBeatWidth,
      );

      if (isBranchStart) {
        canvasContext.beginPath();
        canvasContext.strokeStyle = PALETTE.branches.startLine;
        canvasContext.lineWidth = constants.lineWidthBarBorder;
        canvasContext.moveTo(frame.x, frame.y);
        canvasContext.lineTo(frame.x, frame.y + frame.height);
        canvasContext.stroke();
      }
    } else {
      drawBarBackground(
        canvasContext,
        frame,
        constants.lineWidthBarBorder,
        false,
        "normal",
        !hasLeftNeighbor,
        !hasRightNeighbor,
        overExtendWidth,
        effectiveBeatWidth,
      );
    }

    if (gogoTime || (gogoChanges && gogoChanges.length > 0)) {
      const stripHeight = constants.barNumberFontSize + constants.barNumberOffsetY * 2;
      const stripY = frame.y - stripHeight - constants.lineWidthBarBorder / 2;
      const gogoFrame: Frame = { x: frame.x, y: stripY, width: frame.width, height: stripHeight };
      drawGogoIndicator(
        canvasContext,
        gogoFrame,
        gogoTime,
        gogoChanges,
        noteCount,
        !hasLeftNeighbor,
        !hasRightNeighbor,
        overExtendWidth,
      );
    }

    const showText =
      options.isAnnotationMode || options.alwaysShowAnnotations ? !!options.showTextInAnnotationMode : true;

    drawBarLabels(
      canvasContext,
      frame,
      info.originalIndex,
      constants.barNumberFontSize,
      constants.statusFontSize,
      constants.barNumberOffsetY,
      params,
      noteCount,
      info.originalIndex === 0,
      constants.lineWidthBarBorder,
      isBranchStart,
      showText,
    );

    if (info.isLoopStart && chart.loop) {
      canvasContext.fillStyle = PALETTE.text.primary;
      canvasContext.font = `bold ${constants.barNumberFontSize}px ${FONT_STACK}`;
      canvasContext.textAlign = "right";
      const text = texts.loopPattern.replace("{n}", chart.loop.iterations.toString());
      canvasContext.fillText(text, frame.x + frame.width, frame.y - constants.barNumberOffsetY);
    }
  } else {
    drawBarBackground(
      canvasContext,
      frame,
      constants.lineWidthBarBorder,
      isBranched,
      chart.branchType,
      !hasLeftNeighbor,
      !hasRightNeighbor,
      overExtendWidth,
      effectiveBeatWidth,
    );

    if (isBranchStart) {
      canvasContext.beginPath();
      canvasContext.strokeStyle = PALETTE.branches.startLine;
      canvasContext.lineWidth = constants.lineWidthBarBorder;
      canvasContext.moveTo(frame.x, frame.y);
      canvasContext.lineTo(frame.x, frame.y + frame.height);
      canvasContext.stroke();
    }

    if (gogoTime || (gogoChanges && gogoChanges.length > 0)) {
      const stripHeight = constants.barNumberFontSize + constants.barNumberOffsetY * 2;
      const stripY = frame.y - stripHeight - constants.lineWidthBarBorder / 2;
      const gogoFrame: Frame = { x: frame.x, y: stripY, width: frame.width, height: stripHeight };
      drawGogoIndicator(
        canvasContext,
        gogoFrame,
        gogoTime,
        gogoChanges,
        noteCount,
        !hasLeftNeighbor,
        !hasRightNeighbor,
        overExtendWidth,
      );
    }

    const showText =
      options.isAnnotationMode || options.alwaysShowAnnotations ? !!options.showTextInAnnotationMode : true;

    drawBarLabels(
      canvasContext,
      frame,
      info.originalIndex,
      constants.barNumberFontSize,
      constants.statusFontSize,
      constants.barNumberOffsetY,
      params,
      noteCount,
      info.originalIndex === 0,
      constants.lineWidthBarBorder,
      isBranchStart,
      showText,
    );

    if (info.isLoopStart && chart.loop) {
      canvasContext.fillStyle = PALETTE.text.primary;
      canvasContext.font = `bold ${constants.barNumberFontSize}px ${FONT_STACK}`;
      canvasContext.textAlign = "right";
      const text = texts.loopPattern.replace("{n}", chart.loop.iterations.toString());
      canvasContext.fillText(text, frame.x + frame.width, frame.y - constants.barNumberOffsetY);
    }
  }
}

function drawAllBranchesNotes(
  renderContext: RenderContext,
  chart: ParsedChart,
  virtualBars: RenderBarInfo[],
  barFrames: Frame[],
  _balloonIndices: LocationMap<number>,
  BASE_LANE_HEIGHT: number,
  dirtyRowY?: Set<number>,
) {
  const { canvasContext, options, constants } = renderContext;
  if (!chart.branches) return;
  const branches: { type: "normal" | "expert" | "master"; data: ParsedChart; yOffset: number }[] = [
    { type: "normal", data: chart.branches.normal || chart, yOffset: 0 },
    { type: "expert", data: chart.branches.expert || chart, yOffset: BASE_LANE_HEIGHT },
    { type: "master", data: chart.branches.master || chart, yOffset: BASE_LANE_HEIGHT * 2 },
  ];

  branches.forEach((b) => {
    const branchVirtualBars = virtualBars.map((vb) => ({
      ...vb,
      bar: b.data.bars[vb.originalIndex],
    }));

    const branchFrames = barFrames.map((f, idx) => {
      const params = chart.barParams[virtualBars[idx].originalIndex];
      const isBranched = params ? params.isBranched : false;

      if (isBranched) {
        return {
          ...f,
          y: f.y + b.yOffset,
          height: BASE_LANE_HEIGHT,
        };
      } else {
        return {
          ...f,
          y: f.y,
          height: BASE_LANE_HEIGHT,
        };
      }
    });

    drawLongNotes(
      canvasContext,
      branchVirtualBars,
      branchFrames,
      constants,
      options.viewMode,
      b.data.balloonCounts,
      calculateBalloonIndices(b.data.bars),
      null,
      dirtyRowY,
    );

    for (let index = branchVirtualBars.length - 1; index >= 0; index--) {
      const info = branchVirtualBars[index];
      const frame = branchFrames[index];
      if (dirtyRowY && !dirtyRowY.has(frame.y)) continue;

      // OPTIMIZATION: If unbranched, only draw for 'normal' branch to avoid overdraw
      const params = chart.barParams[info.originalIndex];
      const isBranched = params ? params.isBranched : false;
      if (!isBranched && b.type !== "normal") continue;

      const branchContext: RenderContext = {
        ...renderContext,
        options: { ...options, annotations: new LocationMap<string>(), selection: null },
      };

      drawBarNotes(
        branchContext,
        info.bar,
        frame,
        info.originalIndex,
        undefined,
        b.type as "normal" | "expert" | "master",
        info.effectiveBarIndex,
      );
    }
  });
}

export function renderChart(
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  judgements: JudgementMap<JudgementValue> = new JudgementMap(),
  options: ViewOptions,
  texts: RenderTexts = DEFAULT_TEXTS,
  customDpr?: number,
): void {
  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) {
    console.error("2D rendering context not found for canvas.");
    return;
  }

  // Use the new createLayout function
  // Note: This recreates the layout on every call, maintaining existing behavior for now
  const layout = createLayout(chart, canvas, options, judgements, customDpr, texts);

  // For now, unpack layout to keep using the existing rendering logic in this function
  // This is an intermediate step. Later we will replace this with renderLayout()
  const {
    virtualBars,
    barFrames,
    constants,
    totalHeight,
    balloonIndices,
    inferredHands,
    logicalCanvasWidth,
    dpr,
    headerHeight,
    baseHeaderHeight,
    locToJudgementKey,
    baseBarWidth,
    insets,
  } = layout;

  const { effectiveDpr, finalCanvasHeight, finalStyleHeight } = calculateEffectiveDpr(
    dpr,
    logicalCanvasWidth,
    totalHeight,
  );

  if (effectiveDpr < dpr) {
    console.warn(`Chart dimensions exceed canvas limits. Reducing DPR from ${dpr} to ${effectiveDpr.toFixed(2)}.`);
  }

  canvas.width = logicalCanvasWidth * effectiveDpr;
  canvas.height = finalCanvasHeight;

  canvas.style.width = `${logicalCanvasWidth}px`;
  canvas.style.height = `${finalStyleHeight}px`;

  canvasContext.scale(effectiveDpr, effectiveDpr);

  // Clear
  canvasContext.fillStyle = PALETTE.background;
  canvasContext.fillRect(0, 0, logicalCanvasWidth, totalHeight);

  const renderContext: RenderContext = {
    canvasContext,
    options,
    judgements,
    texts,
    constants,
    inferredHands,
    locToJudgementKey,
  };

  // Layer 0: Header
  const effectivePaddingLeft = insets?.left ?? INSETS.left;
  const effectivePaddingRight = insets?.right ?? INSETS.right;
  const effectivePaddingY = insets?.top ?? INSETS.top;
  const availableWidth = logicalCanvasWidth - (effectivePaddingLeft + effectivePaddingRight);
  const headerFrame: Frame = {
    x: effectivePaddingLeft,
    y: effectivePaddingY,
    width: availableWidth,
    height: headerHeight,
  };
  drawChartHeader(canvasContext, chart, headerFrame, texts, baseHeaderHeight);

  const isAllBranches = !!options.showAllBranches && !!chart.branches;
  const BASE_LANE_HEIGHT = constants.barHeight;

  // Layer 1: Backgrounds
  virtualBars.forEach((info, index) => {
    const frame = barFrames[index];
    drawBarBackgroundWrapper(
      canvasContext,
      frame,
      info,
      index,
      chart,
      options,
      constants,
      virtualBars,
      barFrames,
      texts,
      isAllBranches,
      BASE_LANE_HEIGHT,
      baseBarWidth / 4,
    );
  });

  // Layer 1.5 & 2: Notes
  if (isAllBranches && chart.branches) {
    drawAllBranchesNotes(renderContext, chart, virtualBars, barFrames, balloonIndices, BASE_LANE_HEIGHT);
  } else {
    // Layer 1.5: Drumrolls and Balloons
    drawLongNotes(
      canvasContext,
      virtualBars,
      barFrames,
      constants,
      options.viewMode,
      chart.balloonCounts,
      balloonIndices,
      options.selection,
    );

    // Layer 2: Notes
    for (let index = virtualBars.length - 1; index >= 0; index--) {
      const info = virtualBars[index];
      const frame = barFrames[index];

      drawBarNotes(
        renderContext,
        info.bar,
        frame,
        info.originalIndex,
        options.collapsedLoop ? chart.loop : undefined,
        chart.branchType,
        info.effectiveBarIndex,
      );
    }
  }
}

function drawTextWithCompression(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  minScale: number = 0.7,
) {
  const width = ctx.measureText(text).width;
  let scale = 1.0;
  if (width > maxWidth) {
    scale = maxWidth / width;
    if (scale < minScale) scale = minScale;
  }

  if (scale < 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, 1.0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(text, x, y);
  }
}

function drawChartHeader(
  canvasContext: CanvasRenderingContext2D,
  chart: ParsedChart,
  frame: Frame,
  texts: RenderTexts,
  baseHeight?: number,
): void {
  const { x, y, width, height } = frame;
  const title = chart.title || "Untitled";
  const subtitle = chart.subtitle || "";
  const startBpm = chart.bpm || 120;
  const level = chart.level || 0;
  const course = chart.course || "Oni";

  // Calculate BPM Range
  let minBpm = startBpm;
  let maxBpm = startBpm;

  if (chart.barParams) {
    for (const param of chart.barParams) {
      if (param.bpm < minBpm) minBpm = param.bpm;
      if (param.bpm > maxBpm) maxBpm = param.bpm;

      if (param.bpmChanges) {
        for (const change of param.bpmChanges) {
          if (change.bpm < minBpm) minBpm = change.bpm;
          if (change.bpm > maxBpm) maxBpm = change.bpm;
        }
      }
    }
  }

  const bpmText = minBpm === maxBpm ? `BPM: ${minBpm}` : `BPM: ${minBpm}-${maxBpm}`;

  const refHeight = baseHeight || height;
  const titleFontSize = refHeight * 0.4;
  const subtitleFontSize = refHeight * 0.25;
  const metaFontSize = refHeight * 0.25;

  // Course & Level
  const courseKey = course.toLowerCase();
  let courseName = course.charAt(0).toUpperCase() + course.slice(1);

  if (texts.course?.[courseKey]) {
    courseName = texts.course[courseKey];
  }

  let courseText = courseName;
  if (level > 0) {
    courseText += ` ★${level}`;
  }

  // Determine course color
  let courseColor = PALETTE.text.primary;
  const c = course.toLowerCase();

  if (c.includes("edit") || c.includes("ura")) {
    courseColor = PALETTE.courses.edit; // Purple
  } else if (c.includes("oni")) {
    courseColor = PALETTE.courses.oni; // Pink (Unchanged)
  } else if (c.includes("hard")) {
    courseColor = PALETTE.courses.hard; // Dark Grey
  } else if (c.includes("normal")) {
    courseColor = PALETTE.courses.normal; // Green
  } else if (c.includes("easy")) {
    courseColor = PALETTE.courses.easy; // Orange
  }

  canvasContext.save();

  // Measure widths to check for overlap
  canvasContext.font = `bold ${titleFontSize}px ${FONT_STACK}`;
  const titleWidth = canvasContext.measureText(title).width;

  canvasContext.font = `${subtitleFontSize}px ${FONT_STACK}`;
  const subtitleWidth = subtitle ? canvasContext.measureText(subtitle).width : 0;

  canvasContext.font = `bold ${metaFontSize}px ${FONT_STACK}`;
  const courseWidth = canvasContext.measureText(courseText).width;

  canvasContext.font = `${metaFontSize}px ${FONT_STACK}`;
  const bpmWidth = canvasContext.measureText(bpmText).width;

  const GAP = 20;
  const titleOverlap = titleWidth + GAP + courseWidth > width;
  const subtitleOverlap = subtitleWidth + GAP + bpmWidth > width;

  if (titleOverlap || subtitleOverlap) {
    // Stacked Layout (Left Aligned)
    let currentY = y;

    // Title
    canvasContext.fillStyle = PALETTE.text.primary;
    canvasContext.font = `bold ${titleFontSize}px ${FONT_STACK}`;
    canvasContext.textAlign = "left";
    canvasContext.textBaseline = "top";
    drawTextWithCompression(canvasContext, title, x, currentY, width);
    currentY += titleFontSize + 5;

    // Subtitle
    if (subtitle) {
      canvasContext.font = `${subtitleFontSize}px ${FONT_STACK}`;
      canvasContext.fillStyle = PALETTE.text.secondary;
      drawTextWithCompression(canvasContext, subtitle, x, currentY, width);
      currentY += subtitleFontSize + 5;
    }

    // Course
    canvasContext.fillStyle = courseColor;
    canvasContext.font = `bold ${metaFontSize}px ${FONT_STACK}`;
    canvasContext.fillText(courseText, x, currentY);
    currentY += metaFontSize + 5;

    // BPM
    canvasContext.fillStyle = PALETTE.text.primary;
    canvasContext.font = `${metaFontSize}px ${FONT_STACK}`;
    canvasContext.fillText(bpmText, x, currentY);
  } else {
    // Standard Layout

    // Draw Title
    canvasContext.fillStyle = PALETTE.text.primary;
    canvasContext.font = `bold ${titleFontSize}px ${FONT_STACK}`;
    canvasContext.textAlign = "left";
    canvasContext.textBaseline = "top";
    canvasContext.fillText(title, x, y);

    // Draw Subtitle (below title)
    if (subtitle) {
      canvasContext.font = `${subtitleFontSize}px ${FONT_STACK}`;
      canvasContext.fillStyle = PALETTE.text.secondary;
      canvasContext.fillText(subtitle, x, y + titleFontSize + 5);
    }

    // Draw Metadata (Right aligned)
    const metaY = y;
    canvasContext.textAlign = "right";

    canvasContext.fillStyle = courseColor;
    canvasContext.font = `bold ${metaFontSize}px ${FONT_STACK}`;
    canvasContext.fillText(courseText, x + width, metaY);

    // BPM
    canvasContext.fillStyle = PALETTE.text.primary;
    canvasContext.font = `${metaFontSize}px ${FONT_STACK}`;
    canvasContext.fillText(bpmText, x + width, metaY + metaFontSize + 5);
  }

  canvasContext.restore();
}

function drawGradientRect(
  canvasContext: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  direction: "left" | "right",
) {
  const grad = canvasContext.createLinearGradient(x, y, x + width, y);
  const cSolid = hexToRgba(color, 1);
  const cMid = hexToRgba(color, 0.2);
  const cTrans = hexToRgba(color, 0);

  if (direction === "left") {
    grad.addColorStop(0, cTrans);
    grad.addColorStop(0.25, cMid);
    grad.addColorStop(0.5, cSolid);
    grad.addColorStop(1, cSolid);
  } else {
    grad.addColorStop(0, cSolid);
    grad.addColorStop(0.5, cSolid);
    grad.addColorStop(0.75, cMid);
    grad.addColorStop(1, cTrans);
  }

  canvasContext.fillStyle = grad;
  canvasContext.fillRect(x, y, width, height);
}

function drawGradientLine(
  canvasContext: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth: number,
  direction: "left" | "right",
) {
  const grad = canvasContext.createLinearGradient(x1, y1, x2, y1); // Horizontal gradient
  const cSolid = hexToRgba(color, 1);
  const cMid = hexToRgba(color, 0.2);
  const cTrans = hexToRgba(color, 0);

  if (direction === "left") {
    grad.addColorStop(0, cTrans);
    grad.addColorStop(0.25, cMid);
    grad.addColorStop(0.5, cSolid);
    grad.addColorStop(1, cSolid);
  } else {
    grad.addColorStop(0, cSolid);
    grad.addColorStop(0.5, cSolid);
    grad.addColorStop(0.75, cMid);
    grad.addColorStop(1, cTrans);
  }

  canvasContext.strokeStyle = grad;
  canvasContext.lineWidth = lineWidth;
  canvasContext.beginPath();
  canvasContext.moveTo(x1, y1);
  canvasContext.lineTo(x2, y2);
  canvasContext.stroke();
}

function drawBarBackground(
  canvasContext: CanvasRenderingContext2D,
  frame: Frame,
  borderW: number,
  isBranched: boolean,
  branchType: string = "normal",
  drawLeftExt: boolean = false,
  drawRightExt: boolean = false,
  overExtendWidth: number = 0,
  beatWidth: number = 0,
): void {
  const { x, y, width, height } = frame;

  let fillColor = PALETTE.branches.default;
  if (isBranched) {
    if (branchType === "normal") fillColor = PALETTE.branches.normal; // Normal
    if (branchType === "expert")
      fillColor = PALETTE.branches.expert; // Professional
    else if (branchType === "master") fillColor = PALETTE.branches.master; // Master
  }

  // Helper for extensions
  const drawExtension = (exX: number, exW: number, isLeft: boolean) => {
    const direction = isLeft ? "left" : "right";

    // 1. Background Gradient
    drawGradientRect(canvasContext, exX, y, exW, height, fillColor, direction);

    // 2. Horizontal Borders Gradient
    // Top Border
    drawGradientLine(canvasContext, exX, y, exX + exW, y, PALETTE.ui.barBorder, borderW, direction);
    // Bottom Border
    drawGradientLine(canvasContext, exX, y + height, exX + exW, y + height, PALETTE.ui.barBorder, borderW, direction);
  };

  if (drawLeftExt && overExtendWidth > 0) {
    drawExtension(x - overExtendWidth, overExtendWidth, true);
  }
  if (drawRightExt && overExtendWidth > 0) {
    drawExtension(x + width, overExtendWidth, false);
  }

  // 1. Fill Background
  canvasContext.fillStyle = fillColor;
  canvasContext.fillRect(x, y, width, height);

  // Draw Grid Lines (Beat Dividers)
  if (beatWidth > 0) {
    const numBeats = width / beatWidth;

    canvasContext.strokeStyle = PALETTE.ui.gridLine; // Use Palette Color
    canvasContext.lineWidth = borderW;
    canvasContext.beginPath();
    // Draw lines at integer beat intervals relative to bar start
    for (let i = 1; i < numBeats - 0.01; i++) {
      const lineX = x + i * beatWidth;
      canvasContext.moveTo(lineX, y);
      canvasContext.lineTo(lineX, y + height);
    }
    canvasContext.stroke();
  }

  // Draw Bar Border (Horizontal)
  canvasContext.strokeStyle = PALETTE.ui.barBorder;
  canvasContext.lineWidth = borderW;
  canvasContext.beginPath();
  canvasContext.moveTo(x, y);
  canvasContext.lineTo(x + width, y);
  canvasContext.moveTo(x, y + height);
  canvasContext.lineTo(x + width, y + height);
  canvasContext.stroke();

  // Draw Bar Border (Vertical)
  canvasContext.strokeStyle = PALETTE.ui.barVerticalLine;
  canvasContext.lineWidth = borderW;
  canvasContext.beginPath();
  canvasContext.moveTo(x, y);
  canvasContext.lineTo(x, y + height);
  canvasContext.moveTo(x + width, y);
  canvasContext.lineTo(x + width, y + height);
  canvasContext.stroke();
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  let r = 0,
    g = 0,
    b = 0;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length === 6) {
    r = parseInt(h.substring(0, 2), 16);
    g = parseInt(h.substring(2, 4), 16);
    b = parseInt(h.substring(4, 6), 16);
  } else if (h.length === 8) {
    r = parseInt(h.substring(0, 2), 16);
    g = parseInt(h.substring(2, 4), 16);
    b = parseInt(h.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function calculateNoteMaps(bars: NoteType[][]): {
  locToJudgementKey: LocationMap<JudgementKey>;
  identToLoc: JudgementMap<NoteLocation[]>;
} {
  const locToJudgementKey = new LocationMap<JudgementKey>();
  const identToLoc = new JudgementMap<NoteLocation[]>();
  const counters: Record<string, number> = {};

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (!bar) continue;
    for (let j = 0; j < bar.length; j++) {
      const char = bar[j];
      if (isJudgeable(char)) {
        if (counters[char] === undefined) counters[char] = 0;

        const ordinal = counters[char];
        const identity: JudgementKey = { char, ordinal };
        const location: NoteLocation = { barIndex: i, charIndex: j };

        locToJudgementKey.set(location, identity);

        if (!identToLoc.has(identity)) {
          identToLoc.set(identity, []);
        }
        identToLoc.get(identity)?.push(location);

        counters[char]++;
      }
    }
  }
  return { locToJudgementKey, identToLoc };
}

function calculateBalloonIndices(bars: NoteType[][]): LocationMap<number> {
  const map = new LocationMap<number>();
  let balloonCount = 0;

  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i];
    if (!bar) continue;
    for (let j = 0; j < bar.length; j++) {
      if (bar[j] === NoteType.Balloon || bar[j] === NoteType.Kusudama) {
        map.set({ barIndex: i, charIndex: j }, balloonCount);
        balloonCount++;
      }
    }
  }
  return map;
}

function drawLongNotes(
  canvasContext: CanvasRenderingContext2D,
  virtualBars: RenderBarInfo[],
  barFrames: Frame[],
  constants: RenderConstants,
  viewMode: "original" | "judgements" | "judgements-underline" | "judgements-text",
  balloonCounts: number[],
  balloonIndices: LocationMap<number>,
  selection: ViewOptions["selection"] | undefined,
  dirtyRowY?: Set<number>,
): void {
  const {
    noteRadiusSmall: rSmall,
    noteRadiusBig: rBig,
    lineWidthNoteOuter: borderOuterW,
    lineWidthNoteInner: borderInnerW,
  } = constants;

  let currentLongNote: {
    type: NoteType;
    startBarIdx: number;
    startNoteIdx: number;
    originalBarIdx: number;
    originalNoteIdx: number;
  } | null = null;

  // Iterate all bars
  for (let i = 0; i < virtualBars.length; i++) {
    const bar = virtualBars[i].bar;
    if (!bar) continue;
    const frame = barFrames[i];
    const isDirty = !dirtyRowY || dirtyRowY.has(frame.y);

    const originalBarIdx = virtualBars[i].originalIndex;

    const noteCount = bar.length;
    if (noteCount === 0 && !currentLongNote) continue;
    const noteStep = noteCount > 0 ? frame.width / noteCount : 0;

    const barX = frame.x;
    const centerY = frame.y + frame.height / 2;

    let segmentStartIdx = 0;
    let segmentActive = !!currentLongNote;

    for (let j = 0; j < noteCount; j++) {
      const char = bar[j];

      if ([NoteType.Drumroll, NoteType.DrumrollBig, NoteType.Balloon, NoteType.Kusudama].includes(char)) {
        // Start a new long note
        currentLongNote = { type: char, startBarIdx: i, startNoteIdx: j, originalBarIdx, originalNoteIdx: j };
        segmentActive = true;
        segmentStartIdx = j;
      } else if (char === NoteType.End) {
        if (currentLongNote) {
          // End the long note
          const radius =
            currentLongNote.type === NoteType.DrumrollBig || currentLongNote.type === NoteType.Kusudama ? rBig : rSmall;
          const startX = barX + segmentStartIdx * noteStep;
          const endX = barX + j * noteStep;

          const hasStartCap = segmentStartIdx === currentLongNote.startNoteIdx && i === currentLongNote.startBarIdx;
          const hasEndCap = true;

          const isSelected = isNoteSelected(
            currentLongNote.originalBarIdx,
            currentLongNote.originalNoteIdx,
            selection || null,
          );

          if (isDirty) {
            if (currentLongNote.type === NoteType.Balloon || currentLongNote.type === NoteType.Kusudama) {
              // Balloon
              const balloonIdx = balloonIndices.get({
                barIndex: currentLongNote.originalBarIdx,
                charIndex: currentLongNote.originalNoteIdx,
              });
              const count =
                balloonIdx !== undefined && balloonCounts[balloonIdx] !== undefined ? balloonCounts[balloonIdx] : 5;
              drawBalloonSegment(
                canvasContext,
                startX,
                endX,
                centerY,
                radius,
                hasStartCap,
                hasEndCap,
                borderOuterW,
                borderInnerW,
                viewMode,
                count,
                currentLongNote.type === NoteType.Kusudama,
                isSelected,
              );
            } else {
              // Drumroll
              drawDrumrollSegment(
                canvasContext,
                startX,
                endX,
                centerY,
                radius,
                hasStartCap,
                hasEndCap,
                borderOuterW,
                borderInnerW,
                viewMode,
                currentLongNote.type,
                isSelected,
              );
            }
          }

          currentLongNote = null;
          segmentActive = false;
        }
      }
    }

    // If still active at end of bar, draw segment to end
    if (segmentActive && currentLongNote) {
      const radius =
        currentLongNote.type === NoteType.DrumrollBig || currentLongNote.type === NoteType.Kusudama ? rBig : rSmall;
      const startX = barX + segmentStartIdx * noteStep;
      const endX = barX + frame.width; // Visual end of bar

      const hasStartCap = segmentStartIdx === currentLongNote.startNoteIdx && i === currentLongNote.startBarIdx;
      const hasEndCap = false; // Continuation

      const isSelected = isNoteSelected(
        currentLongNote.originalBarIdx,
        currentLongNote.originalNoteIdx,
        selection || null,
      );

      if (isDirty) {
        if (currentLongNote.type === NoteType.Balloon || currentLongNote.type === NoteType.Kusudama) {
          const balloonIdx = balloonIndices.get({
            barIndex: currentLongNote.originalBarIdx,
            charIndex: currentLongNote.originalNoteIdx,
          });
          const count =
            balloonIdx !== undefined && balloonCounts[balloonIdx] !== undefined ? balloonCounts[balloonIdx] : 5;
          drawBalloonSegment(
            canvasContext,
            startX,
            endX,
            centerY,
            radius,
            hasStartCap,
            hasEndCap,
            borderOuterW,
            borderInnerW,
            viewMode,
            count,
            currentLongNote.type === NoteType.Kusudama,
            isSelected,
          );
        } else {
          drawDrumrollSegment(
            canvasContext,
            startX,
            endX,
            centerY,
            radius,
            hasStartCap,
            hasEndCap,
            borderOuterW,
            borderInnerW,
            viewMode,
            currentLongNote.type,
            isSelected,
          );
        }
      }
    }
  }
}

function getBorderStyles(
  isSelected: boolean,
  borderOuterW: number,
  borderInnerW: number,
  innerBorderColor: string,
): { outerW: number; innerW: number; innerColor: string } {
  if (isSelected) {
    return {
      outerW: borderOuterW * 2,
      innerW: borderInnerW * 2,
      innerColor: PALETTE.notes.border.yellow,
    };
  }
  return {
    outerW: borderOuterW,
    innerW: borderInnerW,
    innerColor: innerBorderColor,
  };
}

function drawDrumrollSegment(
  canvasContext: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  centerY: number,
  radius: number,
  startCap: boolean,
  endCap: boolean,
  borderOuterW: number,
  borderInnerW: number,
  viewMode: "original" | "judgements" | "judgements-underline" | "judgements-text",
  _type: string,
  isSelected: boolean = false,
): void {
  let fillColor = PALETTE.notes.drumroll;
  let innerBorderColor = PALETTE.notes.border.white;

  if (viewMode === "judgements") {
    fillColor = PALETTE.notes.unjudged;
    innerBorderColor = PALETTE.notes.border.grey;
  }

  // Handle Selection
  const borderStyles = getBorderStyles(isSelected, borderOuterW, borderInnerW, innerBorderColor);

  drawCapsule(
    canvasContext,
    startX,
    endX,
    centerY,
    radius,
    startCap,
    endCap,
    borderStyles.outerW,
    borderStyles.innerW,
    fillColor,
    borderStyles.innerColor,
  );
}

function drawBalloonSegment(
  canvasContext: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  centerY: number,
  radius: number,
  startCap: boolean,
  endCap: boolean,
  borderOuterW: number,
  borderInnerW: number,
  viewMode: "original" | "judgements" | "judgements-underline" | "judgements-text",
  count: number,
  isKusudama: boolean,
  isSelected: boolean = false,
): void {
  let fillColor = PALETTE.notes.balloon; // Orangeish for balloon body
  let innerBorderColor = PALETTE.notes.border.white;

  if (viewMode === "judgements") {
    fillColor = PALETTE.notes.unjudged;
    innerBorderColor = PALETTE.notes.border.grey;
  }

  // Handle Selection
  const {
    outerW: effectiveBorderOuterW,
    innerW: effectiveBorderInnerW,
    innerColor: effectiveInnerBorderColor,
  } = getBorderStyles(isSelected, borderOuterW, borderInnerW, innerBorderColor);

  // Note: For balloon head, we usually want the same inner border color.
  // The original code was using effectiveInnerBorderColor for head too if selected.
  const effectiveHeadInnerBorderColor = effectiveInnerBorderColor;

  // Draw the tail (body)
  // The tail usually starts a bit after the head, but for simplicity we draw it as a capsule behind the head.
  // However, if we draw it as a capsule, the head will be drawn on top of it.
  // If startCap is true, we are drawing the head segment.
  drawCapsule(
    canvasContext,
    startX,
    endX,
    centerY,
    radius * 0.8,
    startCap,
    endCap,
    effectiveBorderOuterW,
    effectiveBorderInnerW,
    fillColor,
    effectiveInnerBorderColor,
  );

  // If this is the start segment, draw the balloon head
  if (startCap) {
    let headColor = PALETTE.notes.balloon; // Orange
    if (isKusudama) headColor = PALETTE.notes.kusudama; // Gold

    if (viewMode === "judgements") {
      headColor = PALETTE.notes.unjudged;
    }

    // Draw Head
    canvasContext.beginPath();
    canvasContext.arc(startX, centerY, radius, 0, Math.PI * 2);

    canvasContext.lineWidth = effectiveBorderOuterW;
    canvasContext.strokeStyle = PALETTE.notes.border.black;
    canvasContext.stroke();

    canvasContext.fillStyle = headColor;
    canvasContext.fill();

    canvasContext.lineWidth = effectiveBorderInnerW;
    canvasContext.strokeStyle = effectiveHeadInnerBorderColor;
    canvasContext.stroke();

    // Draw Count
    if (viewMode !== "judgements") {
      canvasContext.fillStyle = PALETTE.text.inverted;
      canvasContext.font = `bold ${radius * 1.5}px ${FONT_STACK}`;
      canvasContext.textAlign = "center";
      canvasContext.textBaseline = "middle";
      canvasContext.fillText(count.toString(), startX, centerY - radius * 0.2);
    }
  }
}

function drawCapsule(
  canvasContext: CanvasRenderingContext2D,
  startX: number,
  endX: number,
  centerY: number,
  radius: number,
  startCap: boolean,
  endCap: boolean,
  borderOuterW: number,
  borderInnerW: number,
  fillColor: string,
  innerBorderColor: string,
): void {
  // 1. Outer Border (Open Path if no caps to avoid vertical lines)
  canvasContext.beginPath();

  // Top Edge Part
  if (startCap) {
    // From Left-Middle to Top-Left
    canvasContext.arc(startX, centerY, radius, Math.PI, Math.PI * 1.5, false);
  } else {
    canvasContext.moveTo(startX, centerY - radius);
  }

  canvasContext.lineTo(endX, centerY - radius);

  if (endCap) {
    // From Top-Right to Bottom-Right
    canvasContext.arc(endX, centerY, radius, Math.PI * 1.5, Math.PI * 2.5, false);
  } else {
    canvasContext.moveTo(endX, centerY + radius);
  }

  // Bottom Edge Part
  canvasContext.lineTo(startX, centerY + radius);

  if (startCap) {
    // From Bottom-Left to Left-Middle
    canvasContext.arc(startX, centerY, radius, Math.PI * 0.5, Math.PI, false);
  }

  canvasContext.strokeStyle = PALETTE.notes.border.black;
  canvasContext.lineWidth = borderOuterW;
  canvasContext.stroke();

  // 2. Fill (Closed Path)
  canvasContext.beginPath();
  canvasContext.moveTo(startX, centerY + radius);

  // Left Edge
  if (startCap) {
    canvasContext.arc(startX, centerY, radius, Math.PI / 2, Math.PI * 1.5, false);
  } else {
    canvasContext.lineTo(startX, centerY - radius);
  }

  // Top Edge
  canvasContext.lineTo(endX, centerY - radius);

  // Right Edge
  if (endCap) {
    canvasContext.arc(endX, centerY, radius, Math.PI * 1.5, Math.PI * 2.5, false);
  } else {
    canvasContext.lineTo(endX, centerY + radius);
  }

  // Bottom Edge
  canvasContext.lineTo(startX, centerY + radius);
  canvasContext.closePath();

  canvasContext.fillStyle = fillColor;
  canvasContext.fill();

  // 3. Inner Border
  canvasContext.beginPath();

  // 1. Trace Top: Left -> Right
  if (startCap) {
    canvasContext.arc(startX, centerY, radius, Math.PI, Math.PI * 1.5, false);
  } else {
    canvasContext.moveTo(startX, centerY - radius);
  }

  canvasContext.lineTo(endX, centerY - radius);

  if (endCap) {
    canvasContext.arc(endX, centerY, radius, Math.PI * 1.5, Math.PI * 2.5, false);
  } else {
    canvasContext.moveTo(endX, centerY + radius);
  }

  // 2. Trace Bottom: Right -> Left
  canvasContext.lineTo(startX, centerY + radius);

  if (startCap) {
    canvasContext.arc(startX, centerY, radius, Math.PI * 0.5, Math.PI, false);
  }

  canvasContext.strokeStyle = innerBorderColor;
  canvasContext.lineWidth = borderInnerW;
  canvasContext.stroke();
}

function calculateNoteColors(
  renderContext: RenderContext,
  bar: NoteType[],
  noteCount: number,
  originalBarIndex: number,
  loopInfo: LoopInfo | undefined,
  effectiveBarIndex: number | undefined,
): (string | null)[] {
  const { options, judgements, locToJudgementKey } = renderContext;
  const { viewMode, coloringMode, visibility: judgementVisibility } = options;
  const noteColors: (string | null)[] = new Array(noteCount).fill(null);

  if (viewMode === "judgements" || viewMode === "judgements-underline" || viewMode === "judgements-text") {
    for (let i = 0; i < noteCount; i++) {
      const char = bar[i];
      if (!isJudgeable(char)) continue;

      let effectiveDelta: number | undefined;
      let isValidJudge = false;
      let isJudgedButMiss = false; // "None of perfect, good or poor"

      if (coloringMode === "gradient") {
        // Gradient Logic (with Loop Averaging)
        if (
          loopInfo &&
          originalBarIndex >= loopInfo.startBarIndex &&
          originalBarIndex < loopInfo.startBarIndex + loopInfo.period
        ) {
          // Collapsed Loop - Average over iterations
          let sum = 0;
          let count = 0;
          let judgedCount = 0;

          // We need to find the base note (in the first iteration of the loop)
          // `originalBarIndex` is the template bar index.
          // We iterate through all iterations `iter`
          for (let iter = 0; iter < loopInfo.iterations; iter++) {
            const actualBarIdx =
              loopInfo.startBarIndex + iter * loopInfo.period + (originalBarIndex - loopInfo.startBarIndex);
            // Look up ordinal
            if (locToJudgementKey) {
              const locKey = { barIndex: actualBarIdx, charIndex: i };
              const ident = locToJudgementKey.get(locKey);
              if (ident) {
                const judgeData = judgements.get(ident);

                if (judgeData) {
                  const j = judgeData.judgement;
                  // Check visibility
                  if (j === JudgementType.Perfect && !judgementVisibility.perfect) continue;
                  if (j === JudgementType.Good && !judgementVisibility.good) continue;
                  if (j === JudgementType.Poor && !judgementVisibility.poor) continue;

                  judgedCount++;
                  if (j === JudgementType.Perfect || j === JudgementType.Good || j === JudgementType.Poor) {
                    sum += judgeData.delta;
                    count++;
                  }
                }
              }
            }
          }

          if (count > 0) {
            effectiveDelta = sum / count;
            isValidJudge = true;
          } else if (judgedCount > 0) {
            isJudgedButMiss = true;
          }
        } else {
          // Standard or specific iteration
          const barIdx = effectiveBarIndex !== undefined ? effectiveBarIndex : originalBarIndex;
          if (locToJudgementKey) {
            const locKey = { barIndex: barIdx, charIndex: i };
            const ident = locToJudgementKey.get(locKey);
            if (ident) {
              const judgeData = judgements.get(ident);
              if (judgeData) {
                const j = judgeData.judgement;

                let isVisible = true;
                if (j === JudgementType.Perfect && !judgementVisibility.perfect) isVisible = false;
                else if (j === JudgementType.Good && !judgementVisibility.good) isVisible = false;
                else if (j === JudgementType.Poor && !judgementVisibility.poor) isVisible = false;

                if (isVisible) {
                  if (j === JudgementType.Perfect || j === JudgementType.Good || j === JudgementType.Poor) {
                    effectiveDelta = judgeData.delta;
                    isValidJudge = true;
                  } else {
                    isJudgedButMiss = true;
                  }
                }
              }
            }
          }
        }

        if (isValidJudge && effectiveDelta !== undefined) {
          noteColors[i] = getGradientColor(effectiveDelta);
        } else if (isJudgedButMiss) {
          noteColors[i] = PALETTE.judgements.miss; // Dark Grey
        }
      } else {
        // Categorical Logic
        const barIdx = effectiveBarIndex !== undefined ? effectiveBarIndex : originalBarIndex;
        if (locToJudgementKey) {
          const locKey = { barIndex: barIdx, charIndex: i };
          const ident = locToJudgementKey.get(locKey);
          if (ident) {
            const judgeData = judgements.get(ident);
            if (judgeData) {
              const judge = judgeData.judgement;
              if (judge === JudgementType.Perfect && judgementVisibility.perfect)
                noteColors[i] = PALETTE.judgements.perfect;
              else if (judge === JudgementType.Good && judgementVisibility.good)
                noteColors[i] = PALETTE.judgements.good;
              else if (judge === JudgementType.Poor && judgementVisibility.poor)
                noteColors[i] = PALETTE.judgements.poor;
              else if (
                judge &&
                ![JudgementType.Perfect, JudgementType.Good, JudgementType.Poor].includes(judge as JudgementType)
              )
                noteColors[i] = PALETTE.judgements.miss;
            }
          }
        }
      }
    }
  }
  return noteColors;
}

function drawJudgementsUnderline(
  canvasContext: CanvasRenderingContext2D,
  bar: NoteType[],
  noteColors: (string | null)[],
  noteCount: number,
  frame: Frame,
  rSmall: number,
  rBig: number,
  borderUnderlineW: number,
): void {
  const { x, y, width, height } = frame;
  const noteStep = width / noteCount;
  const barBottom = y + height;
  const lineY = barBottom + height * 0.1; // Slightly below bar
  const lineWidth = height * 0.15; // Visible thickness

  // Pass 1.1: Draw Black Borders (Backwards iteration)
  canvasContext.save();
  canvasContext.lineCap = "round";
  canvasContext.strokeStyle = PALETTE.ui.barBorder;
  canvasContext.lineWidth = lineWidth + borderUnderlineW * 2;

  for (let i = noteCount - 1; i >= 0; i--) {
    const noteChar = bar[i];
    // Only for judgeable notes
    if (!isJudgeable(noteChar)) continue;

    // Only draw if we have a valid color
    if (noteColors[i]) {
      const noteX: number = x + i * noteStep;
      const radius = ["3", "4"].includes(noteChar) ? rBig : rSmall;

      canvasContext.beginPath();
      canvasContext.moveTo(noteX - radius, lineY);
      canvasContext.lineTo(noteX + radius, lineY);
      canvasContext.stroke();
    }
  }
  canvasContext.restore();

  // Pass 1.2: Draw Colored Lines (Backwards iteration)
  canvasContext.save();
  canvasContext.lineCap = "round";
  canvasContext.lineWidth = lineWidth;

  for (let i = noteCount - 1; i >= 0; i--) {
    const noteChar = bar[i];
    if (!isJudgeable(noteChar)) continue;

    const color = noteColors[i];
    if (color) {
      const noteX: number = x + i * noteStep;
      const radius = ["3", "4"].includes(noteChar) ? rBig : rSmall;

      canvasContext.strokeStyle = color;
      canvasContext.beginPath();
      canvasContext.moveTo(noteX - radius, lineY);
      canvasContext.lineTo(noteX + radius, lineY);
      canvasContext.stroke();
    }
  }
  canvasContext.restore();
}

function drawJudgementsText(
  canvasContext: CanvasRenderingContext2D,
  bar: NoteType[],
  noteColors: (string | null)[],
  noteCount: number,
  frame: Frame,
  rSmall: number,
  rBig: number,
  texts: RenderTexts,
  judgements: JudgementMap<JudgementValue>,
  locToJudgementKey: LocationMap<JudgementKey> | undefined,
  effectiveBarIndex: number | undefined,
  originalBarIndex: number,
): void {
  const { x, width, height } = frame;
  const centerY = frame.y + frame.height / 2;
  const noteStep = width / noteCount;

  canvasContext.save();
  canvasContext.font = `bold ${rBig * 1.2}px ${FONT_STACK}`;
  canvasContext.textAlign = "center";
  canvasContext.textBaseline = "bottom";
  canvasContext.lineWidth = height * 0.05; // Border width for text
  canvasContext.strokeStyle = PALETTE.judgements.textBorder;

  for (let i = 0; i < noteCount; i++) {
    const noteChar = bar[i];
    if (!isJudgeable(noteChar)) continue;

    const color = noteColors[i];

    if (color) {
      // Look up judgement again
      const barIdx = effectiveBarIndex !== undefined ? effectiveBarIndex : originalBarIndex;
      let judge = "";
      if (locToJudgementKey) {
        const locKey = { barIndex: barIdx, charIndex: i };
        const ident = locToJudgementKey.get(locKey);
        if (ident) {
          const jd = judgements.get(ident);
          if (jd) judge = jd.judgement;
        }
      }

      let text = "";
      if (judge === JudgementType.Perfect) text = texts.judgement.perfect;
      else if (judge === JudgementType.Good) text = texts.judgement.good;
      else if (judge === JudgementType.Poor) text = texts.judgement.poor;

      if (text) {
        const noteX: number = x + i * noteStep;
        const radius = [NoteType.DonBig, NoteType.KaBig].includes(noteChar) ? rBig : rSmall;
        const noteTopY = centerY - radius;
        // Slightly above note
        const textY = noteTopY;

        canvasContext.strokeText(text, noteX, textY);
        canvasContext.fillStyle = color;
        canvasContext.fillText(text, noteX, textY);
      }
    }
  }
  canvasContext.restore();
}

function getNoteStyle(noteChar: NoteType, rSmall: number, rBig: number): { color: string | null; radius: number } {
  let color: string | null = null;
  let radius: number = 0;

  switch (noteChar) {
    case NoteType.Don:
      color = PALETTE.notes.don;
      radius = rSmall;
      break;
    case NoteType.Ka:
      color = PALETTE.notes.ka;
      radius = rSmall;
      break;
    case NoteType.DonBig:
      color = PALETTE.notes.don;
      radius = rBig;
      break;
    case NoteType.KaBig:
      color = PALETTE.notes.ka;
      radius = rBig;
      break;
  }
  return { color, radius };
}

function drawBarNotes(
  renderContext: RenderContext,
  bar: NoteType[],
  frame: Frame,
  originalBarIndex: number = -1,
  loopInfo?: LoopInfo,
  currentBranch?: "normal" | "expert" | "master",
  effectiveBarIndex?: number,
): void {
  const { canvasContext, options, judgements, texts, constants, inferredHands, locToJudgementKey } = renderContext;
  const {
    noteRadiusSmall: rSmall,
    noteRadiusBig: rBig,
    lineWidthNoteOuter: borderOuterW,
    lineWidthNoteInner: borderInnerW,
    lineWidthUnderlineBorder: borderUnderlineW,
  } = constants;
  const { viewMode, selection } = options;

  const { x, width } = frame;
  const centerY = frame.y + frame.height / 2;
  const noteCount = bar.length;
  if (noteCount === 0) return;

  const noteStep = width / noteCount;

  // Pre-calculate colors for judgeable notes if needed
  const noteColors = calculateNoteColors(renderContext, bar, noteCount, originalBarIndex, loopInfo, effectiveBarIndex);

  // Phase 1: Draw Underlines (Judgements Underline Mode only)
  if (viewMode === "judgements-underline") {
    drawJudgementsUnderline(canvasContext, bar, noteColors, noteCount, frame, rSmall, rBig, borderUnderlineW);
  }

  // Phase 1.5: Draw Text (Judgements Text Mode only)
  if (viewMode === "judgements-text") {
    drawJudgementsText(
      canvasContext,
      bar,
      noteColors,
      noteCount,
      frame,
      rSmall,
      rBig,
      texts,
      judgements,
      locToJudgementKey,
      effectiveBarIndex,
      originalBarIndex,
    );
  }

  // Phase 2: Draw Note Heads
  for (let i = noteCount - 1; i >= 0; i--) {
    const noteChar = bar[i];
    const noteX: number = x + i * noteStep;

    const style = getNoteStyle(noteChar, rSmall, rBig);
    let color = style.color;
    const radius = style.radius;

    if (color) {
      let borderColor = PALETTE.notes.border.white;

      if (viewMode === "judgements") {
        color = PALETTE.notes.unjudged;
        borderColor = PALETTE.notes.border.grey;

        const assignedColor = noteColors[i];
        if (assignedColor) {
          color = assignedColor;
          // Revert to standard white border for judged notes
          borderColor = PALETTE.notes.border.white;
        }
      }

      // Note: In judgements-underline mode, we keep original colors (Red/Blue) and white border
      // The underline is drawn in Phase 1.
      canvasContext.beginPath();
      canvasContext.arc(noteX, centerY, radius, 0, Math.PI * 2);

      const isSelected = isNoteSelected(originalBarIndex, i, selection);
      const isHovered =
        options.hoveredNote &&
        options.hoveredNote.barIndex === originalBarIndex &&
        options.hoveredNote.charIndex === i &&
        options.hoveredNote.branch === currentBranch; // Match branch

      // Use helper for selection styles
      const styles = getBorderStyles(isSelected, borderOuterW, borderInnerW, borderColor);
      const effectiveBorderOuterW = styles.outerW;
      const effectiveBorderInnerW = styles.innerW;
      let effectiveInnerBorderColor = styles.innerColor;

      // Apply hover style if not selected
      if (!isSelected && isHovered) {
        effectiveInnerBorderColor = PALETTE.notes.border.yellow;
      }

      canvasContext.lineWidth = effectiveBorderOuterW;
      canvasContext.strokeStyle = PALETTE.notes.border.black;
      canvasContext.stroke();

      canvasContext.fillStyle = color;
      canvasContext.fill();

      canvasContext.lineWidth = effectiveBorderInnerW;
      canvasContext.strokeStyle = effectiveInnerBorderColor; // Dynamic border
      canvasContext.stroke();

      // Annotation Rendering
      if ((options.isAnnotationMode || options.alwaysShowAnnotations) && options.annotations && isJudgeable(noteChar)) {
        const noteId = { barIndex: originalBarIndex, charIndex: i };
        const annotation = options.annotations.get(noteId);
        if (annotation) {
          let textColor = PALETTE.ui.annotation.match;
          if (inferredHands) {
            const inferred = inferredHands.get(noteId);
            if (inferred && inferred !== annotation) {
              textColor = PALETTE.ui.annotation.mismatch;
            }
          }

          canvasContext.save();
          // Larger size
          canvasContext.font = `bold ${rBig * 1.5}px ${FONT_STACK}`;
          canvasContext.fillStyle = textColor;
          canvasContext.textAlign = "center";
          canvasContext.textBaseline = "bottom";

          // Position at the top of the bar, similar to bar numbers
          const textY = frame.y;

          canvasContext.fillText(annotation, noteX, textY);
          canvasContext.restore();
        }
      }
    }
  }
}

function drawBarLabels(
  canvasContext: CanvasRenderingContext2D,
  frame: Frame,
  originalBarIndex: number,
  numFontSize: number,
  statusFontSize: number,
  offsetY: number,
  params: BarParams | undefined,
  noteCount: number,
  isFirstBar: boolean,
  barBorderWidth: number,
  isBranchStart: boolean = false,
  showText: boolean = true,
): void {
  const { x, y, width, height } = frame;
  canvasContext.save();

  const lineHeight = statusFontSize;
  // Stack: BarNum (0), BPM (1), HS (2)
  // Baseline of HS is: y - offsetY - 2 * lineHeight
  // Top of HS is approx: y - offsetY - 3 * lineHeight
  const topY = showText ? y - offsetY - 3 * lineHeight : y;

  // Draw Bar Line Extensions (Left and Right)
  if (showText) {
    canvasContext.lineWidth = barBorderWidth;

    // Left Extension
    canvasContext.beginPath();
    canvasContext.strokeStyle = isBranchStart ? PALETTE.branches.startLine : PALETTE.ui.barVerticalLine;
    canvasContext.moveTo(x, y);
    canvasContext.lineTo(x, topY);
    canvasContext.stroke();

    // Right Extension
    canvasContext.beginPath();
    canvasContext.strokeStyle = PALETTE.ui.barVerticalLine;
    canvasContext.moveTo(x + width, y);
    canvasContext.lineTo(x + width, topY);
    canvasContext.stroke();

    // Text Padding
    const textPadding = statusFontSize * 0.2;

    // 1. Draw Bar Number
    canvasContext.font = `bold ${numFontSize}px 'Consolas', 'Monaco', 'Lucida Console', monospace`;
    canvasContext.fillStyle = PALETTE.text.label;
    canvasContext.textAlign = "left";
    canvasContext.textBaseline = "bottom";

    const barNumY = y - offsetY;
    canvasContext.fillText((originalBarIndex + 1).toString(), x + textPadding, barNumY);
  }

  if (!params) {
    canvasContext.restore();
    return;
  }

  // 2. Prepare Labels
  interface Label {
    type: "BPM" | "HS";
    val: number;
    index: number;
  }
  const labels: Label[] = [];

  if (isFirstBar) {
    labels.push({ type: "BPM", val: params.bpm, index: 0 });
    if (params.scroll !== 1.0) {
      labels.push({ type: "HS", val: params.scroll, index: 0 });
    }
  }

  if (params.bpmChanges) {
    for (const c of params.bpmChanges) {
      const exists = labels.some((l) => l.type === "BPM" && l.index === c.index);
      if (!exists) labels.push({ type: "BPM", val: c.bpm, index: c.index });
    }
  }

  if (params.scrollChanges) {
    for (const c of params.scrollChanges) {
      const exists = labels.some((l) => l.type === "HS" && l.index === c.index);
      if (!exists) labels.push({ type: "HS", val: c.scroll, index: c.index });
    }
  }

  if (labels.length === 0) {
    canvasContext.restore();
    return;
  }

  const bpmY = y - offsetY - lineHeight;
  const hsY = bpmY - lineHeight;

  canvasContext.font = `bold ${statusFontSize}px 'Consolas', 'Monaco', 'Lucida Console', monospace`;

  // Process Mid-Bar Lines
  // Collect unique indices including 0
  const changeIndices = new Set<number>();
  labels.forEach((l) => {
    changeIndices.add(l.index);
  });

  if (changeIndices.size > 0 && noteCount > 0) {
    const hasZero = changeIndices.has(0);
    if (hasZero) {
      // Draw index 0 with full width to cover the bar border
      canvasContext.beginPath();
      canvasContext.strokeStyle = PALETTE.status.line;
      canvasContext.lineWidth = barBorderWidth;
      const lineX = x;
      canvasContext.moveTo(lineX, y + height);
      canvasContext.lineTo(lineX, topY);
      canvasContext.stroke();

      changeIndices.delete(0);
    }

    if (changeIndices.size > 0) {
      canvasContext.beginPath();
      canvasContext.strokeStyle = PALETTE.status.line;
      canvasContext.lineWidth = barBorderWidth * 0.8; // Slightly thinner

      changeIndices.forEach((idx) => {
        const lineX = x + (idx / noteCount) * width;
        canvasContext.moveTo(lineX, y + height); // From bottom of bar
        canvasContext.lineTo(lineX, topY); // To top of labels
      });
      canvasContext.stroke();
    }
  }

  if (showText) {
    // Text Padding
    const textPadding = statusFontSize * 0.2;
    // Render Text
    for (const label of labels) {
      let labelX = x;
      if (noteCount > 0) {
        labelX = x + (label.index / noteCount) * width;
      }

      // Shift text
      const drawX = labelX + textPadding;

      if (label.type === "BPM") {
        canvasContext.fillStyle = PALETTE.status.bpm;
        canvasContext.fillText(`BPM ${label.val}`, drawX, bpmY);
      } else if (label.type === "HS") {
        canvasContext.fillStyle = PALETTE.status.hs;
        canvasContext.fillText(`HS ${label.val}`, drawX, hsY);
      }
    }
  }

  canvasContext.restore();
}

function drawGogoIndicator(
  canvasContext: CanvasRenderingContext2D,
  frame: Frame,
  gogoTime: boolean,
  gogoChanges: GogoChange[] | undefined,
  noteCount: number,
  drawLeftExt: boolean = false,
  drawRightExt: boolean = false,
  overExtendWidth: number = 0,
): void {
  const { x, y, width, height } = frame;
  const GOGO_COLOR = PALETTE.gogo;

  // Helper for extensions
  const drawExtension = (exX: number, exW: number, isLeft: boolean) => {
    const direction = isLeft ? "left" : "right";
    drawGradientRect(canvasContext, exX, y, exW, height, GOGO_COLOR, direction);
  };

  const isStartGogo = gogoTime;
  let isEndGogo = gogoTime;

  if (gogoChanges && gogoChanges.length > 0) {
    // Sort changes by index just in case
    const sortedChanges = [...gogoChanges].sort((a, b) => a.index - b.index);
    isEndGogo = sortedChanges[sortedChanges.length - 1].isGogo;

    // Split Logic
    let currentX = x;
    let isGogo = gogoTime;

    for (const change of sortedChanges) {
      const nextX = x + (change.index / noteCount) * width;

      if (nextX > currentX && isGogo) {
        canvasContext.fillStyle = GOGO_COLOR;
        canvasContext.fillRect(currentX, y, nextX - currentX, height);
      }
      currentX = nextX;
      isGogo = change.isGogo;
    }

    if (currentX < x + width && isGogo) {
      canvasContext.fillStyle = GOGO_COLOR;
      canvasContext.fillRect(currentX, y, x + width - currentX, height);
    }
  } else {
    // Simple Case
    if (gogoTime) {
      canvasContext.fillStyle = GOGO_COLOR;
      canvasContext.fillRect(x, y, width, height);
    }
  }

  // Draw Extensions
  if (isStartGogo && drawLeftExt && overExtendWidth > 0) {
    drawExtension(x - overExtendWidth, overExtendWidth, true);
  }
  if (isEndGogo && drawRightExt && overExtendWidth > 0) {
    drawExtension(x + width, overExtendWidth, false);
  }
}
