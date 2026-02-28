import {
  drawGradientLine,
  drawGradientRect,
  drawTextWithCompression,
  getGradientColor,
  snapForDevicePixel,
} from "./drawing-utils.js";
import { getBranchLineAt, getChartElementAt, getNoteAt, getNotePosition, type HitInfo } from "./hit-testing.js";
import {
  type BranchLayoutInfo,
  type ChartLayout,
  calculateAutoZoomBeats,
  calculateBalloonIndices,
  calculateEffectiveDpr,
  calculateLayout,
  createLayout,
  FONT_STACK,
  type Frame,
  INSETS,
  type Insets,
  isNoteSelected,
  LAYOUT_RATIOS,
  type LayoutRatios,
  type RenderBarInfo,
  type RenderConstants,
} from "./layout.js";
import {
  BranchName,
  DEFAULT_TEXTS,
  DEFAULT_VIEW_OPTIONS,
  isJudgeable,
  type JudgementKey,
  JudgementMap,
  JudgementType,
  type JudgementValue,
  LocationMap,
  NoteType,
  type RenderTexts,
  type ViewMode,
  type ViewOptions,
} from "./primitives.js";

import type { BarParams, GogoChange, LoopInfo, ParsedChart } from "./tja-parser.js";

// Re-exports to maintain API compatibility
export { getGradientColor } from "./drawing-utils.js";
export { getBranchLineAt, getChartElementAt, getNoteAt, getNotePosition, type HitInfo };
export {
  calculateAutoZoomBeats,
  calculateLayout,
  createLayout,
  INSETS,
  LAYOUT_RATIOS,
  type ChartLayout,
  type Insets,
  type LayoutRatios,
};
export { BranchName, DEFAULT_TEXTS, DEFAULT_VIEW_OPTIONS, JudgementType, LocationMap, NoteType };
export type { JudgementKey, JudgementMap, JudgementValue, RenderTexts, ViewMode, ViewOptions };

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
  gogo: "#f8a33c",
};

export interface RenderContext {
  canvasContext: CanvasRenderingContext2D;
  options: ViewOptions;
  judgements: JudgementMap<JudgementValue>;
  texts: RenderTexts;
  constants: RenderConstants;
  inferredHands?: LocationMap<string>;
  locToJudgementKey?: LocationMap<JudgementKey>;
}

export function getBorderStyles(
  isSelected: boolean,
  borderOuterW: number,
  borderInnerW: number,
  innerBorderColor: string,
): { outerW: number; innerW: number; innerColor: string } {
  if (isSelected) {
    return {
      outerW: borderOuterW * 2,
      innerW: borderInnerW * 1.5,
      innerColor: PALETTE.notes.border.yellow,
    };
  }
  return {
    outerW: borderOuterW,
    innerW: borderInnerW,
    innerColor: innerBorderColor,
  };
}

export function getNoteStyle(
  noteChar: NoteType,
  rSmall: number,
  rBig: number,
): { color: string | null; radius: number } {
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

export function drawCapsule(
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
  drawLeftExt: boolean = false,
  drawRightExt: boolean = false,
  overExtendWidth: number = 0,
): void {
  // radius is the total outer extent. Borders are drawn as filled shapes
  // from outer to inner for crisp edges (no stroke straddling).
  const innerBorderR = radius - borderOuterW;
  const fillR = radius - borderOuterW - borderInnerW;

  const drawExtension = (exX: number, exW: number, isLeft: boolean) => {
    const direction = isLeft ? "left" : "right";
    drawGradientRect(canvasContext, exX, centerY - radius, exW, radius * 2, PALETTE.notes.border.black, direction);
    drawGradientRect(canvasContext, exX, centerY - innerBorderR, exW, innerBorderR * 2, innerBorderColor, direction);
    drawGradientRect(canvasContext, exX, centerY - fillR, exW, fillR * 2, fillColor, direction);
  };

  if (drawLeftExt && overExtendWidth > 0 && !startCap) {
    drawExtension(startX - overExtendWidth, overExtendWidth, true);
  }
  if (drawRightExt && overExtendWidth > 0 && !endCap) {
    drawExtension(endX, overExtendWidth, false);
  }

  // Helper to trace a closed, filled capsule path at a given radius
  const traceCapsuleFillPath = (r: number) => {
    canvasContext.beginPath();
    if (startCap) {
      canvasContext.arc(startX, centerY, r, Math.PI / 2, Math.PI * 1.5, false);
    } else {
      canvasContext.moveTo(startX, centerY - r);
    }
    canvasContext.lineTo(endX, centerY - r);
    if (endCap) {
      canvasContext.arc(endX, centerY, r, Math.PI * 1.5, Math.PI * 2.5, false);
    } else {
      canvasContext.lineTo(endX, centerY + r);
    }
    canvasContext.lineTo(startX, centerY + r);
    if (startCap) {
      // closePath completes the arc back to the start
    }
    canvasContext.closePath();
  };

  // 1. Outer Border (outermost, black)
  traceCapsuleFillPath(radius);
  canvasContext.fillStyle = PALETTE.notes.border.black;
  canvasContext.fill();

  // 2. Inner Border (middle layer)
  traceCapsuleFillPath(innerBorderR);
  canvasContext.fillStyle = innerBorderColor;
  canvasContext.fill();

  // 3. Fill (innermost, note color)
  traceCapsuleFillPath(fillR);
  canvasContext.fillStyle = fillColor;
  canvasContext.fill();
}

function drawChartHeader(
  canvasContext: CanvasRenderingContext2D,
  chart: ParsedChart,
  frame: Frame,
  texts: RenderTexts,
  baseHeight?: number,
  options?: ViewOptions,
): void {
  const { x, y, width, height } = frame;
  const title = options?.titleOverride ?? (chart.title || "Untitled");
  const subtitle = options?.subtitleOverride ?? (chart.subtitle || "");
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
    courseColor = PALETTE.courses.edit;
  } else if (c.includes("oni")) {
    courseColor = PALETTE.courses.oni;
  } else if (c.includes("hard")) {
    courseColor = PALETTE.courses.hard;
  } else if (c.includes("normal")) {
    courseColor = PALETTE.courses.normal;
  } else if (c.includes("easy")) {
    courseColor = PALETTE.courses.easy;
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

function drawVerticalBarLine(
  canvasContext: CanvasRenderingContext2D,
  x: number,
  y: number,
  height: number,
  topY: number,
  type: "branch" | "status" | "barLine",
  config: {
    barBorderWidth: number;
    dpr: number;
  },
) {
  const { barBorderWidth, dpr } = config;
  const snap = (v: number) => snapForDevicePixel(v, barBorderWidth, dpr);
  const snappedWidth = Math.max(1, Math.round(barBorderWidth * dpr)) / dpr;
  const lineX = snap(x);

  canvasContext.beginPath();
  canvasContext.lineWidth = snappedWidth;

  if (type === "branch") {
    canvasContext.strokeStyle = PALETTE.branches.startLine;
    canvasContext.moveTo(lineX, topY); // From top of labels
    canvasContext.lineTo(lineX, y + height); // To bottom of bar
  } else if (type === "status") {
    canvasContext.strokeStyle = PALETTE.status.line;
    canvasContext.moveTo(lineX, topY); // From top of labels
    canvasContext.lineTo(lineX, y + height); // To bottom of bar
  } else if (type === "barLine") {
    canvasContext.strokeStyle = PALETTE.ui.barVerticalLine;
    canvasContext.moveTo(lineX, topY); // From top of labels
    canvasContext.lineTo(lineX, y + height); // To bottom of bar
  }

  canvasContext.stroke();
}

export interface BarStatusLabel {
  type: "BPM" | "HS";
  val: number;
  index: number;
}

function getBarStatusLabels(
  params: BarParams | undefined,
  isFirstBar: boolean,
  prevParams?: BarParams,
  prevNoteCount?: number,
): BarStatusLabel[] {
  const labels: BarStatusLabel[] = [];
  if (!params) return labels;

  if (isFirstBar) {
    labels.push({ type: "BPM", val: params.bpm, index: 0 });
    if (params.scroll !== 1.0) {
      labels.push({ type: "HS", val: params.scroll, index: 0 });
    }
  }

  if (prevParams && prevNoteCount !== undefined) {
    if (prevParams.bpmChanges) {
      for (const c of prevParams.bpmChanges) {
        if (c.index === prevNoteCount) {
          labels.push({ type: "BPM", val: c.bpm, index: 0 });
        }
      }
    }
    if (prevParams.scrollChanges) {
      for (const c of prevParams.scrollChanges) {
        if (c.index === prevNoteCount) {
          labels.push({ type: "HS", val: c.scroll, index: 0 });
        }
      }
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

  return labels;
}

function drawBarLines(
  canvasContext: CanvasRenderingContext2D,
  frame: Frame,
  params: BarParams | undefined,
  noteCount: number,
  barBorderWidth: number,
  statusFontSize: number,
  barNumberOffsetY: number,
  isBranchStart: boolean,
  showText: boolean,
  dpr: number,
  isFirstBar: boolean,
  prevParams?: BarParams,
  prevNoteCount?: number,
) {
  const { x, y, width, height } = frame;
  const lineHeight = statusFontSize;
  const topY = showText ? y - barNumberOffsetY - 3 * lineHeight : y;

  const positions = new Map<number, "branch" | "status" | "barLine">();

  // Vertical Bar Lines - Medium Priority
  positions.set(0, "barLine"); // Left edge (can be overwritten by branch/status)
  positions.set(Math.round(width * 100) / 100, "barLine"); // Right edge

  // Status Lines (BPM/HS/Scroll) - High Priority
  const labels = getBarStatusLabels(params, isFirstBar, prevParams, prevNoteCount);
  const uniqueIndices = new Set(labels.map((l) => l.index));

  uniqueIndices.forEach((idx) => {
    // Only map valid proportional indices (or index 0 when empty)
    if (noteCount > 0 && idx < noteCount) {
      const pos = (idx / noteCount) * width;
      positions.set(Math.round(pos * 100) / 100, "status");
    } else if (idx === 0) {
      positions.set(0, "status");
    }
  });

  // Branch Start - Highest Priority (Left edge only)
  if (isBranchStart) {
    positions.set(0, "branch");
  }

  // Render all line sorted by position
  const sortedPositions = Array.from(positions.keys()).sort((a, b) => a - b);

  sortedPositions.forEach((pos) => {
    const type = positions.get(pos);
    if (!type) return;
    drawVerticalBarLine(canvasContext, x + pos, y, height, topY, type, {
      barBorderWidth,
      dpr,
    });
  });
}

function drawBarBackground(
  canvasContext: CanvasRenderingContext2D,
  frame: Frame,
  borderW: number,
  branchType?: BranchName,
  drawLeftExt: boolean = false,
  drawRightExt: boolean = false,
  overExtendWidth: number = 0,
  beatWidth: number = 0,
  dpr: number = 1,
): void {
  const { x, y, width, height } = frame;

  const snapLine = (v: number) => snapForDevicePixel(v, borderW, dpr);
  const snappedBorderW = Math.max(1, Math.round(borderW * dpr)) / dpr;

  let fillColor = PALETTE.branches.default;
  if (branchType) {
    if (branchType === BranchName.Normal) fillColor = PALETTE.branches.normal; // Normal
    if (branchType === BranchName.Expert)
      fillColor = PALETTE.branches.expert; // Professional
    else if (branchType === BranchName.Master) fillColor = PALETTE.branches.master; // Master
  }

  // Helper for extensions
  const drawExtension = (exX: number, exW: number, isLeft: boolean) => {
    const direction = isLeft ? "left" : "right";

    // 1. Background Gradient
    drawGradientRect(canvasContext, exX, y, exW, height, fillColor, direction);

    // 2. Horizontal Borders Gradient
    // Top Border
    drawGradientLine(canvasContext, exX, snapLine(y), exX + exW, snapLine(y), PALETTE.ui.barBorder, borderW, direction);
    // Bottom Border
    drawGradientLine(
      canvasContext,
      exX,
      snapLine(y + height),
      exX + exW,
      snapLine(y + height),
      PALETTE.ui.barBorder,
      borderW,
      direction,
    );
  };

  if (drawLeftExt && overExtendWidth > 0) {
    drawExtension(x - overExtendWidth, overExtendWidth, true);
  }
  if (drawRightExt && overExtendWidth > 0) {
    drawExtension(x + width, overExtendWidth, false);
  }

  // Fill Background
  canvasContext.fillStyle = fillColor;
  canvasContext.fillRect(x, y, width, height);

  // Draw Grid Lines (Beat Dividers)
  if (beatWidth > 0) {
    canvasContext.strokeStyle = PALETTE.ui.gridLine;
    canvasContext.lineWidth = snappedBorderW;
    canvasContext.beginPath();

    const numBeats = width / beatWidth;
    // Draw lines at integer beat intervals relative to bar start
    // We use a small epsilon for float comparison safety
    for (let i = 1; i < numBeats - 0.01; i++) {
      const lineX = snapLine(x + i * beatWidth);
      canvasContext.moveTo(lineX, y);
      canvasContext.lineTo(lineX, y + height);
    }

    canvasContext.stroke();
  }

  // Draw Bar Border (Horizontal)
  const sY = snapLine(y);
  const sYH = snapLine(y + height);

  canvasContext.strokeStyle = PALETTE.ui.barBorder;
  canvasContext.lineWidth = snappedBorderW;
  canvasContext.beginPath();
  canvasContext.moveTo(x, sY);
  canvasContext.lineTo(x + width, sY);
  canvasContext.moveTo(x, sYH);
  canvasContext.lineTo(x + width, sYH);
  canvasContext.stroke();
}

function drawBarLabels(
  canvasContext: CanvasRenderingContext2D,
  frame: Frame,
  originalBarIndex: number,
  numFontSize: number,
  statusFontSize: number,
  nextSongFontSize: number,
  offsetY: number,
  params: BarParams | undefined,
  noteCount: number,
  isFirstBar: boolean,
  barBorderWidth: number,
  showText: boolean = true,
  dpr: number = 1,
  prevParams?: BarParams,
  prevNoteCount?: number,
): void {
  const { x, y, width } = frame;
  canvasContext.save();

  const lineHeight = statusFontSize;

  // Draw Bar Line Extensions (Left and Right)
  const snappedBarBorderWidth = Math.max(1, Math.round(barBorderWidth * dpr)) / dpr;
  if (showText) {
    canvasContext.lineWidth = snappedBarBorderWidth;

    // Text Padding
    const textPadding = statusFontSize * 0.2;

    // 1. Draw Bar Number
    canvasContext.font = `bold ${numFontSize}px 'Consolas', 'Monaco', 'Lucida Console', monospace`;
    canvasContext.fillStyle = PALETTE.text.label;
    canvasContext.textAlign = "left";
    canvasContext.textBaseline = "bottom";

    const barNumY = y - offsetY;
    const barNumText = (originalBarIndex + 1).toString();
    canvasContext.fillText(barNumText, x + textPadding, barNumY);

    // 1.5 Draw Next Song Info
    if (params?.nextSongChanges && params.nextSongChanges.length > 0) {
      const nextSong = params.nextSongChanges[0].nextSong;
      const text = `Next: ${nextSong.title}`;

      canvasContext.font = `italic ${nextSongFontSize}px ${FONT_STACK}`;
      // Draw to the right of bar number
      const barNumWidth = canvasContext.measureText(barNumText).width;
      const nextSongX = x + textPadding + barNumWidth + 10;

      // Ensure it doesn't overflow (basic compression)
      drawTextWithCompression(canvasContext, text, nextSongX, barNumY, width - (nextSongX - x));
    }
  }

  if (!params) {
    canvasContext.restore();
    return;
  }

  const labels = getBarStatusLabels(params, isFirstBar, prevParams, prevNoteCount);

  if (labels.length === 0) {
    canvasContext.restore();
    return;
  }

  const bpmY = y - offsetY - lineHeight;
  const hsY = bpmY - lineHeight;

  canvasContext.font = `bold ${statusFontSize}px 'Consolas', 'Monaco', 'Lucida Console', monospace`;

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
  branchLayouts: BranchLayoutInfo[],
  texts: RenderTexts,
  _isAllBranches: boolean,
  BASE_LANE_HEIGHT: number,
  beatWidth: number,
  dpr: number = 1,
) {
  const params = chart.barParams[info.originalIndex];
  const layout = branchLayouts[index];

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

  // Draw Backgrounds based on Branch Layout
  const branches: BranchName[] = [BranchName.Normal, BranchName.Expert, BranchName.Master];
  for (const b of branches) {
    const branchInfo = layout.branches[b];
    if (branchInfo?.visible) {
      const bFrame: Frame = {
        x: frame.x,
        y: frame.y + branchInfo.offsetY,
        width: frame.width,
        height: BASE_LANE_HEIGHT,
      };

      drawBarBackground(
        canvasContext,
        bFrame,
        constants.lineWidthBarBorder,
        isBranched ? b : undefined,
        !hasLeftNeighbor,
        !hasRightNeighbor,
        overExtendWidth,
        effectiveBeatWidth,
        dpr,
      );
    }
  }

  const showText =
    options.isAnnotationMode || options.alwaysShowAnnotations ? !!options.showTextInAnnotationMode : true;

  const isHovered =
    !!options.hoveredNote &&
    options.hoveredNote.barIndex === info.originalIndex &&
    options.hoveredNote.charIndex === -1;

  if (isBranchStart) {
    const topY = showText ? frame.y - constants.barNumberOffsetY - 3 * constants.statusFontSize : frame.y;
    // Hover highlight: Black outline
    if (isHovered) {
      canvasContext.save();
      canvasContext.beginPath();
      canvasContext.lineCap = "square";
      canvasContext.strokeStyle = PALETTE.ui.selectionBorder;
      canvasContext.lineWidth = constants.lineWidthBarBorder * 3;
      // Draw single continuous highlight from top of extension to bottom of lane
      const snap = (v: number) => snapForDevicePixel(v, constants.lineWidthBarBorder, dpr);
      const snX = snap(frame.x);
      canvasContext.moveTo(snX, topY);
      canvasContext.lineTo(snX, frame.y + frame.height);
      canvasContext.stroke();
      canvasContext.restore();
    }
  }

  let prevParams: BarParams | undefined;
  let prevNoteCount: number | undefined;
  if (info.originalIndex > 0) {
    prevParams = chart.barParams[info.originalIndex - 1];
    prevNoteCount = chart.bars[info.originalIndex - 1]?.length || 0;
  }

  const isFirstBar = info.originalIndex === 0;

  drawBarLines(
    canvasContext,
    frame,
    params,
    noteCount,
    constants.lineWidthBarBorder,
    constants.statusFontSize,
    constants.barNumberOffsetY,
    isBranchStart,
    showText,
    dpr,
    isFirstBar,
    prevParams,
    prevNoteCount,
  );

  drawBarLabels(
    canvasContext,
    frame,
    info.originalIndex,
    constants.barNumberFontSize,
    constants.statusFontSize,
    constants.nextSongFontSize,
    constants.barNumberOffsetY,
    params,
    noteCount,
    isFirstBar,
    constants.lineWidthBarBorder,
    showText,
    dpr,
    prevParams,
    prevNoteCount,
  );

  if (info.isLoopStart && chart.loop) {
    canvasContext.fillStyle = PALETTE.text.primary;
    canvasContext.font = `bold ${constants.barNumberFontSize}px ${FONT_STACK}`;
    canvasContext.textAlign = "right";
    const text = texts.loopPattern.replace("{n}", chart.loop.iterations.toString());
    canvasContext.fillText(text, frame.x + frame.width, frame.y - constants.barNumberOffsetY);
  }
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

function drawBarNotes(
  renderContext: RenderContext,
  bar: NoteType[],
  frame: Frame,
  originalBarIndex: number = -1,
  loopInfo?: LoopInfo,
  currentBranch?: BranchName,
  effectiveBarIndex?: number,
): void {
  const { canvasContext, options, judgements, texts, constants, inferredHands, locToJudgementKey } = renderContext;
  const {
    noteRadiusSmall: rSmall,
    noteRadiusBig: rBig,
    lineWidthNoteOuter: borderOuterW,
    lineWidthNoteInner: borderInnerW,
    lineWidthNoteInnerBig: borderInnerBigW,
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
      const isSelected = isNoteSelected(originalBarIndex, i, selection);
      const isHovered =
        options.hoveredNote &&
        options.hoveredNote.barIndex === originalBarIndex &&
        options.hoveredNote.charIndex === i &&
        options.hoveredNote.branch === currentBranch; // Match branch

      // Use helper for selection styles
      const effectiveBorderInnerWBase = radius === rBig ? borderInnerBigW : borderInnerW;
      const styles = getBorderStyles(isSelected, borderOuterW, effectiveBorderInnerWBase, borderColor);
      const effectiveBorderOuterW = styles.outerW;
      const effectiveBorderInnerW = styles.innerW;
      let effectiveInnerBorderColor = styles.innerColor;

      // Apply hover style if not selected
      if (!isSelected && isHovered) {
        effectiveInnerBorderColor = PALETTE.notes.border.yellow;
      }

      // Draw from outer to inner using filled circles for crisp edges.
      // radius is the total outer extent including all borders.
      const fillR = radius - effectiveBorderOuterW - effectiveBorderInnerW;

      // 1. Outer border (outermost, black)
      canvasContext.beginPath();
      canvasContext.arc(noteX, centerY, radius, 0, Math.PI * 2);
      canvasContext.fillStyle = PALETTE.notes.border.black;
      canvasContext.fill();

      // 2. Inner border (middle layer)
      canvasContext.beginPath();
      canvasContext.arc(noteX, centerY, radius - effectiveBorderOuterW, 0, Math.PI * 2);
      canvasContext.fillStyle = effectiveInnerBorderColor;
      canvasContext.fill();

      // 3. Fill (innermost, note color)
      canvasContext.beginPath();
      canvasContext.arc(noteX, centerY, fillR, 0, Math.PI * 2);
      canvasContext.fillStyle = color;
      canvasContext.fill();

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
  drawLeftExt: boolean = false,
  drawRightExt: boolean = false,
  overExtendWidth: number = 0,
): void {
  let fillColor = PALETTE.notes.drumroll;
  let innerBorderColor = PALETTE.notes.border.white;

  if (viewMode === "judgements") {
    fillColor = PALETTE.notes.unjudged;
    innerBorderColor = PALETTE.notes.border.grey;
  }

  // Handle Selection
  // Drumrolls ignore the inner border width for the body to retain the total size but show more fill color.
  const tailBorderStyles = getBorderStyles(isSelected, borderOuterW, 0, innerBorderColor);

  drawCapsule(
    canvasContext,
    startX,
    endX,
    centerY,
    radius,
    startCap,
    endCap,
    tailBorderStyles.outerW,
    tailBorderStyles.innerW,
    fillColor,
    tailBorderStyles.innerColor,
    drawLeftExt,
    drawRightExt,
    overExtendWidth,
  );

  // If this is the start segment, draw the leading circle
  if (startCap) {
    const headBorderStyles = getBorderStyles(isSelected, borderOuterW, borderInnerW, innerBorderColor);

    // 1. Outer Border
    canvasContext.beginPath();
    canvasContext.arc(startX, centerY, radius, 0, Math.PI * 2);
    canvasContext.fillStyle = PALETTE.notes.border.black;
    canvasContext.fill();

    // 2. Inner Border
    const innerBorderR = radius - headBorderStyles.outerW;
    if (innerBorderR > 0) {
      canvasContext.beginPath();
      canvasContext.arc(startX, centerY, innerBorderR, 0, Math.PI * 2);
      canvasContext.fillStyle = headBorderStyles.innerColor;
      canvasContext.fill();
    }

    // 3. Fill
    const fillR = innerBorderR - headBorderStyles.innerW;
    if (fillR > 0) {
      canvasContext.beginPath();
      canvasContext.arc(startX, centerY, fillR, 0, Math.PI * 2);
      canvasContext.fillStyle = fillColor;
      canvasContext.fill();
    }
  }
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
  drawLeftExt: boolean = false,
  drawRightExt: boolean = false,
  overExtendWidth: number = 0,
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

  const tailBorderStyles = getBorderStyles(isSelected, borderOuterW, 0, innerBorderColor);

  // Draw the tail (body)
  // The tail usually starts a bit after the head, but for simplicity we draw it as a capsule behind the head.
  // However, if we draw it as a capsule, the head will be drawn on top of it.
  // If startCap is true, we are drawing the head segment.
  drawCapsule(
    canvasContext,
    startX,
    endX,
    centerY,
    radius * 0.7,
    startCap,
    endCap,
    tailBorderStyles.outerW,
    tailBorderStyles.innerW,
    fillColor,
    tailBorderStyles.innerColor,
    drawLeftExt,
    drawRightExt,
    overExtendWidth,
  );

  // If this is the start segment, draw the balloon head
  if (startCap) {
    let headColor = PALETTE.notes.balloon; // Orange
    if (isKusudama) headColor = PALETTE.notes.kusudama; // Gold

    if (viewMode === "judgements") {
      headColor = PALETTE.notes.unjudged;
    }

    // Draw Head from outer to inner using filled circles for crisp edges
    const fillR = radius - effectiveBorderOuterW - effectiveBorderInnerW;

    // 1. Outer border (outermost, black)
    canvasContext.beginPath();
    canvasContext.arc(startX, centerY, radius, 0, Math.PI * 2);
    canvasContext.fillStyle = PALETTE.notes.border.black;
    canvasContext.fill();

    // 2. Inner border (middle layer)
    canvasContext.beginPath();
    canvasContext.arc(startX, centerY, radius - effectiveBorderOuterW, 0, Math.PI * 2);
    canvasContext.fillStyle = effectiveHeadInnerBorderColor;
    canvasContext.fill();

    // 3. Fill (innermost, head color)
    canvasContext.beginPath();
    canvasContext.arc(startX, centerY, fillR, 0, Math.PI * 2);
    canvasContext.fillStyle = headColor;
    canvasContext.fill();

    // Draw Count
    if (viewMode !== "judgements") {
      canvasContext.fillStyle = PALETTE.text.inverted;
      canvasContext.font = `bold ${radius * 1.25}px ${FONT_STACK}`;
      canvasContext.textAlign = "center";
      canvasContext.textBaseline = "middle";
      canvasContext.fillText(count.toString(), startX, centerY);
    }
  }
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
    lineWidthNoteInnerBig: borderInnerBigW,
  } = constants;

  let currentLongNote: {
    type: NoteType;
    startBarIdx: number;
    startNoteIdx: number;
    originalBarIdx: number;
    originalNoteIdx: number;
  } | null = null;

  const overExtendWidth = 2 * constants.noteRadiusSmall;

  // Iterate all bars
  for (let i = 0; i < virtualBars.length; i++) {
    const bar = virtualBars[i].bar;
    if (!bar) continue;
    const frame = barFrames[i];
    if (frame.height <= 0) continue;
    const isDirty = !dirtyRowY || dirtyRowY.has(frame.y);

    const originalBarIdx = virtualBars[i].originalIndex;

    const noteCount = bar.length;
    if (noteCount === 0 && !currentLongNote) continue;
    const noteStep = noteCount > 0 ? frame.width / noteCount : 0;

    const barX = frame.x;
    const centerY = frame.y + frame.height / 2;

    const hasLeftNeighbor = i > 0 && Math.abs(barFrames[i - 1].y - frame.y) < 1.0;
    const hasRightNeighbor = i < virtualBars.length - 1 && Math.abs(barFrames[i + 1].y - frame.y) < 1.0;
    const drawLeftExt = !hasLeftNeighbor;
    const drawRightExt = !hasRightNeighbor;

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
          const isBig = currentLongNote.type === NoteType.DrumrollBig || currentLongNote.type === NoteType.Kusudama;
          const radius = isBig ? rBig : rSmall;
          const effectiveBorderInnerW = isBig ? borderInnerBigW : borderInnerW;

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
                effectiveBorderInnerW,
                viewMode,
                count,
                currentLongNote.type === NoteType.Kusudama,
                isSelected,
                !hasStartCap && drawLeftExt,
                !hasEndCap && drawRightExt,
                overExtendWidth,
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
                effectiveBorderInnerW,
                viewMode,
                currentLongNote.type,
                isSelected,
                !hasStartCap && drawLeftExt,
                !hasEndCap && drawRightExt,
                overExtendWidth,
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
      const isBig = currentLongNote.type === NoteType.DrumrollBig || currentLongNote.type === NoteType.Kusudama;
      const radius = isBig ? rBig : rSmall;
      const effectiveBorderInnerW = isBig ? borderInnerBigW : borderInnerW;

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
            effectiveBorderInnerW,
            viewMode,
            count,
            currentLongNote.type === NoteType.Kusudama,
            isSelected,
            !hasStartCap && drawLeftExt,
            !hasEndCap && drawRightExt,
            overExtendWidth,
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
            effectiveBorderInnerW,
            viewMode,
            currentLongNote.type,
            isSelected,
            !hasStartCap && drawLeftExt,
            !hasEndCap && drawRightExt,
            overExtendWidth,
          );
        }
      }
    }
  }
}

function drawAllBranchesNotes(
  renderContext: RenderContext,
  chart: ParsedChart,
  virtualBars: RenderBarInfo[],
  barFrames: Frame[],
  branchLayouts: BranchLayoutInfo[],
  _balloonIndices: LocationMap<number>,
  BASE_LANE_HEIGHT: number,
  dirtyRowY?: Set<number>,
) {
  const { canvasContext, options, constants } = renderContext;
  if (!chart.branches) return;
  const branches: { type: BranchName; data: ParsedChart }[] = [
    { type: BranchName.Normal, data: chart.branches.normal || chart },
    { type: BranchName.Expert, data: chart.branches.expert || chart },
    { type: BranchName.Master, data: chart.branches.master || chart },
  ];

  branches.forEach((b) => {
    const branchVirtualBars = virtualBars.map((vb) => ({
      ...vb,
      bar: b.data.bars[vb.originalIndex],
    }));

    const branchFrames = barFrames.map((f, idx) => {
      const layout = branchLayouts[idx];
      const branchInfo = layout.branches[b.type];

      if (branchInfo?.visible) {
        return {
          ...f,
          y: f.y + branchInfo.offsetY,
          height: BASE_LANE_HEIGHT,
        };
      }
      return {
        ...f,
        height: 0,
        width: 0,
      };
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
      if (frame.height <= 0) continue;

      // OPTIMIZATION: If unbranched, only draw for 'normal' branch to avoid overdraw
      const params = chart.barParams[info.originalIndex];
      const isBranched = params ? params.isBranched : false;
      if (!isBranched && b.type !== BranchName.Normal) continue;

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
        b.type as BranchName,
        info.effectiveBarIndex,
      );
    }
  });
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

  if (effectiveDpr < dpr && !dirtyRowY) {
    console.warn(`Chart dimensions exceed canvas limits. Reducing DPR from ${dpr} to ${effectiveDpr.toFixed(2)}.`);
  }

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
    drawChartHeader(canvasContext, chart, headerFrame, texts, baseHeaderHeight, options);
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
      layout.branchLayouts,
      texts,
      isAllBranches,
      BASE_LANE_HEIGHT,
      layout.baseBarWidth / 4,
      effectiveDpr,
    );
  });

  // Layer 1.5 & 2: Notes
  if (isAllBranches && chart.branches) {
    drawAllBranchesNotes(
      renderContext,
      chart,
      virtualBars,
      barFrames,
      layout.branchLayouts,
      balloonIndices,
      BASE_LANE_HEIGHT,
      dirtyRowY,
    );
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

export function renderChart(
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  judgements: JudgementMap<JudgementValue> = new JudgementMap(),
  options: ViewOptions,
  texts: RenderTexts = DEFAULT_TEXTS,
  customDpr?: number,
  layoutRatios?: Partial<LayoutRatios>,
): void {
  const canvasContext = canvas.getContext("2d");
  if (!canvasContext) {
    console.error("2D rendering context not found for canvas.");
    return;
  }

  const layout = createLayout(chart, canvas, options, judgements, customDpr, texts, undefined, layoutRatios);
  renderLayout(canvasContext, layout, chart, judgements, options, texts);
}
