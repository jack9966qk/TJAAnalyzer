import { calculateInferredHands } from "./auto-annotation.js";
import {
  BranchName,
  isJudgeable,
  type JudgementKey,
  JudgementMap,
  type JudgementValue,
  LocationMap,
  type NoteLocation,
  NoteType,
  type RenderTexts,
  type ViewOptions,
} from "./primitives.js";
import type { BarParams, ParsedChart } from "./tja-parser.js";

export const FONT_STACK = "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif";

export interface Insets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export const INSETS: Insets = { top: 20, bottom: 20, left: 10, right: 10 };

/**
 * All values are ratios relative to `baseBarWidth` (the pixel width of a 4/4 bar).
 *
 * Note border sizes are the actual visible thickness of each border layer.
 * Drawing order is from inner to outer: fill → inner border → outer border.
 */
export interface LayoutRatios {
  /** Height of a single bar lane. */
  barHeight: number;
  /** Vertical spacing between rows of bars. */
  rowSpacing: number;
  /** Total outer radius of a small note (don/ka), including fill and all border layers. */
  noteRadiusSmall: number;
  /** Total outer radius of a big note (DON/KA), including fill and all border layers. */
  noteRadiusBig: number;
  /** Stroke width of horizontal/vertical bar border lines. */
  lineWidthBarBorder: number;
  /** Stroke width of the center line within a bar. */
  lineWidthCenter: number;
  /** Actual visible thickness of the outer (black) note border ring. */
  lineWidthNoteOuter: number;
  /** Actual visible thickness of the inner (white/colored) note border ring. */
  lineWidthNoteInner: number;
  /** Stroke width of the judgement underline border. */
  lineWidthUnderlineBorder: number;
  /** Font size for bar number labels above each bar. */
  barNumberFontSize: number;
  /** Font size for BPM/HS status labels above bars. */
  statusFontSize: number;
  /** Vertical offset between bar number text baseline and bar top edge. */
  barNumberOffsetY: number;
  /** Height of the chart header area (title, subtitle, course, BPM). */
  headerHeight: number;
}

export const LAYOUT_RATIOS: LayoutRatios = {
  barHeight: 0.14,
  rowSpacing: 0.16,
  noteRadiusSmall: 0.046,
  noteRadiusBig: 0.061,
  lineWidthBarBorder: 0.01,
  lineWidthCenter: 0.005,
  lineWidthNoteOuter: 0.007,
  lineWidthNoteInner: 0.008,
  lineWidthUnderlineBorder: 0.008,
  barNumberFontSize: 0.045,
  statusFontSize: 0.045,
  barNumberOffsetY: 0.005,
  headerHeight: 0.35,
};

export function resolveLayoutRatios(overrides?: Partial<LayoutRatios>): LayoutRatios {
  if (!overrides) return LAYOUT_RATIOS;
  return { ...LAYOUT_RATIOS, ...overrides };
}

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
  nextSongFontSize: number;
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

export interface BranchLayoutInfo {
  branches: Record<BranchName, { offsetY: number; visible: boolean } | undefined>;
  laneCount: number;
}

export interface ChartLayout {
  virtualBars: RenderBarInfo[];
  barFrames: Frame[];
  branchLayouts: BranchLayoutInfo[];
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

export function calculateAutoZoomBeats(
  canvasWidth: number,
  barLengths: Map<number, number> = new Map([[4, 1]]),
  insets: Insets = INSETS,
  layoutRatios?: Partial<LayoutRatios>,
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
  const resolved = resolveLayoutRatios(layoutRatios);
  const ratioBleed = resolved.noteRadiusSmall * 2;
  // Note Inner Ratio (for minD check)
  const ratioInner = resolved.noteRadiusSmall * 2;

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

export function generateBaseVirtualBars(
  chart: ParsedChart,
  options: ViewOptions,
  judgements: JudgementMap<JudgementValue>,
  locToJudgementKey: LocationMap<JudgementKey>,
): RenderBarInfo[] {
  const { bars, loop } = chart;
  const virtualBars: RenderBarInfo[] = [];

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
    for (let i = 0; i < bars.length; i++) {
      virtualBars.push({ bar: bars[i], originalIndex: i, effectiveBarIndex: i });
    }
  }
  return virtualBars;
}

export function isNoteSelected(barIdx: number, charIdx: number, selection: ViewOptions["selection"]): boolean {
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

export function filterVirtualBarsByRange(virtualBars: RenderBarInfo[], range: ViewOptions["range"]): RenderBarInfo[] {
  if (!range) return virtualBars;

  let { start, end } = range;

  // Normalize start/end order
  if (start.barIndex > end.barIndex || (start.barIndex === end.barIndex && start.charIndex > end.charIndex)) {
    const temp = start;
    start = end;
    end = temp;
  }

  // Filter bars outside the range
  const filteredBars = virtualBars.filter(
    (vb) => vb.originalIndex >= start.barIndex && vb.originalIndex <= end.barIndex,
  );

  // Modify start and end bars to clear notes outside the range
  return filteredBars.map((vb) => {
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

export function getVirtualBars(
  chart: ParsedChart,
  options: ViewOptions,
  judgements: JudgementMap<JudgementValue>,
  locToJudgementKey: LocationMap<JudgementKey>,
): RenderBarInfo[] {
  let virtualBars = generateBaseVirtualBars(chart, options, judgements, locToJudgementKey);

  // Handle Partial Rendering (Range)
  if (options.range && (!options.showAllBranches || !chart.branches)) {
    virtualBars = filterVirtualBarsByRange(virtualBars, options.range);
  }

  return virtualBars;
}

export function calculateGlobalBarStartIndices(bars: NoteType[][]): number[] {
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

export function determineVisibleBranches(
  chart: ParsedChart,
  params: BarParams | undefined,
  options: ViewOptions,
): Set<BranchName> {
  const visibleBranches = new Set<BranchName>();

  const isBranched = params?.isBranched;
  if (!isBranched) {
    visibleBranches.add(BranchName.Normal);
    return visibleBranches;
  }

  if (!options.showAllBranches || !chart.branches) {
    // Not showing all branches, treat as single lane of the current chart's branch type
    const branch = chart.branchType || BranchName.Normal;
    visibleBranches.add(branch);
    return visibleBranches;
  }

  // showAllBranches is true and chart.branches exists
  if (options.hideUnreachableBranches && params.reachableBranches) {
    if (params.reachableBranches.normal) visibleBranches.add(BranchName.Normal);
    if (params.reachableBranches.expert) visibleBranches.add(BranchName.Expert);
    if (params.reachableBranches.master) visibleBranches.add(BranchName.Master);
    if (visibleBranches.size > 0) {
      return visibleBranches;
    }
  }

  // Show all 3
  visibleBranches.add(BranchName.Normal);
  visibleBranches.add(BranchName.Expert);
  visibleBranches.add(BranchName.Master);
  return visibleBranches;
}

export interface RowItem {
  virtualBarIndex: number;
  width: number;
  visibleBranches: Set<BranchName>;
}

export function shouldBreakRow(
  currentRowItems: RowItem[],
  currentRowWidth: number,
  actualBarWidth: number,
  availableWidth: number,
  rowIsMultiLane: boolean,
  itemIsMultiLane: boolean,
  params: BarParams | undefined,
): boolean {
  if (currentRowItems.length === 0) return false;

  if (currentRowWidth + actualBarWidth > availableWidth + 1.0) {
    return true;
  }

  if (rowIsMultiLane !== itemIsMultiLane) {
    return true;
  }

  if (params?.nextSongChanges && params.nextSongChanges.length > 0) {
    return true;
  }

  return false;
}

export function calculateLayout(
  virtualBars: RenderBarInfo[],
  chart: ParsedChart,
  logicalCanvasWidth: number,
  options: ViewOptions,
  insets: Insets,
  layoutRatios?: Partial<LayoutRatios>,
): {
  barFrames: Frame[];
  branchLayouts: BranchLayoutInfo[];
  constants: RenderConstants;
  totalHeight: number;
  baseBarWidth: number;
} {
  // 1. Determine Base Dimensions
  const availableWidth = logicalCanvasWidth - (insets.left + insets.right);
  const baseBarWidth: number = availableWidth / (options.beatsPerLine / 4);

  // Constants for drawing
  const resolved = resolveLayoutRatios(layoutRatios);
  const constants = {
    barHeight: baseBarWidth * resolved.barHeight,
    rowSpacing: baseBarWidth * resolved.rowSpacing,
    noteRadiusSmall: baseBarWidth * resolved.noteRadiusSmall,
    noteRadiusBig: baseBarWidth * resolved.noteRadiusBig,
    lineWidthBarBorder: baseBarWidth * resolved.lineWidthBarBorder,
    lineWidthCenter: baseBarWidth * resolved.lineWidthCenter,
    lineWidthNoteOuter: baseBarWidth * resolved.lineWidthNoteOuter,
    lineWidthNoteInner: baseBarWidth * resolved.lineWidthNoteInner,
    lineWidthUnderlineBorder: baseBarWidth * resolved.lineWidthUnderlineBorder,
    barNumberFontSize: baseBarWidth * resolved.barNumberFontSize,
    statusFontSize: baseBarWidth * resolved.statusFontSize,
    nextSongFontSize: baseBarWidth * resolved.statusFontSize * 0.9,
    barNumberOffsetY: baseBarWidth * resolved.barNumberOffsetY,
    headerHeight: baseBarWidth * resolved.headerHeight,
  };

  // 2. Calculate Layout Positions
  const barFrames: Frame[] = [];
  const branchLayouts: BranchLayoutInfo[] = [];

  let currentY = insets.top;

  // Row Accumulation
  let currentRowItems: RowItem[] = [];
  let currentRowWidth = 0;
  let rowIsMultiLane = false;

  const flushRow = () => {
    if (currentRowItems.length === 0) return;

    // 1. Determine Row Branches (Union)
    const rowBranchesSet = new Set<BranchName>();
    for (const item of currentRowItems) {
      for (const b of item.visibleBranches) {
        rowBranchesSet.add(b);
      }
    }

    // Sort: Normal -> Expert -> Master
    const sortedRowBranches: BranchName[] = [];
    if (rowBranchesSet.has(BranchName.Normal)) sortedRowBranches.push(BranchName.Normal);
    if (rowBranchesSet.has(BranchName.Expert)) sortedRowBranches.push(BranchName.Expert);
    if (rowBranchesSet.has(BranchName.Master)) sortedRowBranches.push(BranchName.Master);

    let maxNumBranches = 0;
    for (const item of currentRowItems) {
      maxNumBranches = Math.max(maxNumBranches, item.visibleBranches.size);
    }

    const rowHeight = (maxNumBranches > 1 ? sortedRowBranches.length : 1) * constants.barHeight;

    let currentX = insets.left;

    for (const item of currentRowItems) {
      // Build BranchLayoutInfo
      const layoutInfo: BranchLayoutInfo = {
        branches: { [BranchName.Normal]: undefined, [BranchName.Expert]: undefined, [BranchName.Master]: undefined },
        laneCount: maxNumBranches > 1 ? sortedRowBranches.length : 1,
      };

      if (maxNumBranches > 1) {
        // Stacked
        for (const b of item.visibleBranches) {
          const idx = sortedRowBranches.indexOf(b);
          if (idx !== -1) {
            layoutInfo.branches[b] = {
              offsetY: idx * constants.barHeight,
              visible: true,
            };
          }
        }
      } else {
        // Collapsed (Single Lane)
        for (const b of item.visibleBranches) {
          layoutInfo.branches[b] = {
            offsetY: 0,
            visible: true,
          };
        }
      }

      barFrames.push({
        x: currentX,
        y: currentY,
        width: item.width,
        height: rowHeight,
      });
      branchLayouts.push(layoutInfo);

      currentX += item.width;
    }

    currentY += rowHeight + constants.rowSpacing;
    currentRowItems = [];
    currentRowWidth = 0;
    rowIsMultiLane = false;
  };

  for (let i = 0; i < virtualBars.length; i++) {
    const info = virtualBars[i];
    const params = chart.barParams[info.originalIndex];
    const measureRatio = params ? params.measureRatio : 1.0;
    const actualBarWidth = baseBarWidth * measureRatio;

    // Determine Visible Branches
    const visibleBranches = determineVisibleBranches(chart, params, options);

    const itemIsMultiLane = visibleBranches.size > 1;

    // Break Conditions
    if (
      shouldBreakRow(
        currentRowItems,
        currentRowWidth,
        actualBarWidth,
        availableWidth,
        rowIsMultiLane,
        itemIsMultiLane,
        params,
      )
    ) {
      flushRow();
    }

    // Add to Row
    currentRowItems.push({
      virtualBarIndex: i,
      width: actualBarWidth,
      visibleBranches,
    });
    currentRowWidth += actualBarWidth;
    if (currentRowItems.length === 1) {
      rowIsMultiLane = itemIsMultiLane;
    }
  }

  // Final Flush
  flushRow();

  const finalHeight =
    currentY > insets.top ? currentY - constants.rowSpacing + insets.bottom : insets.top + insets.bottom;

  return { barFrames, branchLayouts, constants, totalHeight: finalHeight, baseBarWidth };
}

export function calculateLongNoteSegments(
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
    if (frame.height <= 0) continue;

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

export function measureHeaderHeight(
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

export function calculateNoteMaps(bars: NoteType[][]): {
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

export function calculateBalloonIndices(bars: NoteType[][]): LocationMap<number> {
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

export function createLayout(
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  options: ViewOptions,
  judgements: JudgementMap<JudgementValue>,
  customDpr?: number,
  texts?: RenderTexts,
  baseInsets: Insets = INSETS,
  layoutRatios?: Partial<LayoutRatios>,
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

  const resolved = resolveLayoutRatios(layoutRatios);
  const ratioBleed = resolved.noteRadiusSmall * 2;
  const baseBarWidth = safeWidth / (barsPerLine + 2 * ratioBleed);
  const bleedPixels = baseBarWidth * ratioBleed;

  const effectiveInsets: Insets = {
    left: baseInsets.left + bleedPixels,
    right: baseInsets.right + bleedPixels,
    top: baseInsets.top,
    bottom: baseInsets.bottom,
  };

  const availableWidth = baseBarWidth * barsPerLine;

  const baseHeaderHeight = baseBarWidth * resolved.headerHeight;

  let headerHeight = baseHeaderHeight;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    headerHeight = measureHeaderHeight(ctx, chart, availableWidth, baseHeaderHeight, texts);
  }

  const statusFontSize = baseBarWidth * resolved.statusFontSize;
  const barNumberOffsetY = baseBarWidth * resolved.barNumberOffsetY;
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
    branchLayouts,
    constants,
    totalHeight: layoutHeight,
  } = calculateLayout(virtualBars, chart, logicalCanvasWidth, options, barLayoutInsets, layoutRatios);

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
    branchLayouts,
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
