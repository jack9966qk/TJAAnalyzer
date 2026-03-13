import { type ChartLayout, createLayout } from "./layout.js";
import {
  BranchName,
  isBig,
  isRenderable,
  JudgementMap,
  type JudgementValue,
  NoteType,
  type RenderOptions,
} from "./primitives.js";
import type { ParsedChart } from "./tja-parser.js";

export interface HitInfo {
  originalBarIndex: number;
  charIndex: number;
  type: NoteType;
  bpm: number;
  scroll: number;
  branch?: BranchName;
  ordinal?: number;
  branchStartParams?: ParsedChart["barParams"][0]["branchStartParams"];
}

export function getBranchLineAt(
  x: number,
  y: number,
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  options: RenderOptions,
  layout?: ChartLayout,
): HitInfo | null {
  let activeLayout: ChartLayout;

  if (layout) {
    activeLayout = layout;
  } else {
    activeLayout = createLayout(chart, canvas, options, new JudgementMap());
  }

  const { barFrames, constants, virtualBars } = activeLayout;
  const { noteRadiusBig: NOTE_RADIUS_BIG } = constants;
  const maxRadius = NOTE_RADIUS_BIG;

  const showText =
    options.isAnnotationMode || options.alwaysShowAnnotations ? !!options.showTextInAnnotationMode : true;
  const extensionHeight = showText ? constants.barNumberOffsetY + 3 * constants.statusFontSize : 0;

  // Check Branch Start Lines (Lowest priority)
  for (let index = virtualBars.length - 1; index >= 0; index--) {
    const info = virtualBars[index];
    const frame = barFrames[index];
    const params = chart.barParams[info.originalIndex];

    // Quick bounding box check
    if (
      x < frame.x - maxRadius ||
      x > frame.x + frame.width + maxRadius ||
      y < frame.y - extensionHeight - maxRadius ||
      y > frame.y + frame.height + maxRadius
    ) {
      continue;
    }

    if (params?.isBranchStart) {
      const lineX = frame.x;
      const hitWidth = 20;
      const topY = showText ? frame.y - constants.barNumberOffsetY - 3 * constants.statusFontSize : frame.y;

      if (Math.abs(x - lineX) <= hitWidth / 2 && y >= topY - maxRadius && y <= frame.y + frame.height + maxRadius) {
        return {
          originalBarIndex: info.originalIndex,
          charIndex: -1,
          type: NoteType.None,
          bpm: params.bpm,
          scroll: params.scroll,
          branch: chart.branchType, // Best effort
          branchStartParams: params.branchStartParams,
        };
      }
    }
  }

  return null;
}

export function getNoteAt(
  x: number,
  y: number,
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  judgements: JudgementMap<JudgementValue> = new JudgementMap(),
  options: RenderOptions,
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
    let currentBranch: BranchName | undefined = chart.branchType;
    const params = chart.barParams[info.originalIndex];
    const isBranchedBar = isAllBranches && params && params.isBranched;

    if (isBranchedBar && chart.branches) {
      const layout = activeLayout.branchLayouts[index];
      let found = false;
      const branches: BranchName[] = [BranchName.Normal, BranchName.Expert, BranchName.Master];

      for (const b of branches) {
        const branchInfo = layout.branches[b];
        if (branchInfo?.visible) {
          const branchY = frame.y + branchInfo.offsetY;
          const branchHeight = activeLayout.constants.barHeight;

          if (y >= branchY && y < branchY + branchHeight) {
            targetChart = chart.branches[b] || chart;
            currentBranch = b;
            barY = branchY;
            found = true;
            break;
          }
        }
      }
      if (!found) continue;
    }

    const centerY = barY + (isBranchedBar ? activeLayout.constants.barHeight : frame.height) / 2;

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
      if (isBig(char)) radius = NOTE_RADIUS_BIG; // Incorrect check: isBig(char) doesn't exist in scope? Wait, it should be imported.

      // Actually, isBig is not imported. It's in primitives.ts but not exported in renderer.ts truncation...
      // Wait, I saw isBig in primitives.ts content earlier. I need to import it.
      // Ah, I missed importing isBig in hit-testing.ts. I need to fix that.
      // But `isBig` was not in the imports I wrote above. Let me check primitives.ts content again.
      // Yes, `isBig` is exported from `primitives.ts`.

      // Wait, I need to check if `isBig` was correctly imported in `hit-testing.ts` content I prepared.
      // It was NOT. I need to add it.

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

export function getChartElementAt(
  x: number,
  y: number,
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  judgements: JudgementMap<JudgementValue>,
  options: RenderOptions,
  layout?: ChartLayout,
): HitInfo | null {
  const noteHit = getNoteAt(x, y, chart, canvas, judgements, options, layout);
  if (noteHit) return noteHit;

  const branchHit = getBranchLineAt(x, y, chart, canvas, options, layout);
  if (branchHit) return branchHit;

  return null;
}

export function getNotePosition(
  chart: ParsedChart,
  canvas: HTMLCanvasElement,
  options: RenderOptions,
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
        const layout = activeLayout.branchLayouts[index];
        let branchY = frame.y;

        if (layout.branches.normal?.visible) {
          branchY += layout.branches.normal.offsetY;
        } else if (layout.branches.expert?.visible) {
          branchY += layout.branches.expert.offsetY;
        } else if (layout.branches.master?.visible) {
          branchY += layout.branches.master.offsetY;
        }

        y = branchY + activeLayout.constants.barHeight / 2;
      }

      return { x, y };
    }
  }
  return null;
}
