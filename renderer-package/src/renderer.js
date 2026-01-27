import { calculateInferredHands } from "./auto-annotation.js";
import { createJudgementKey, createNoteLocation, isBig, isJudgeable, isRenderable, JUDGEABLE_NOTES, JudgementMap, LocationMap, NoteType, RENDERABLE_NOTES, } from "./primitives.js";
export { JudgementMap, LocationMap, createJudgementKey, createNoteLocation, NoteType, JUDGEABLE_NOTES, RENDERABLE_NOTES, isJudgeable, isBig, isRenderable, };
export var JudgementType;
(function (JudgementType) {
    JudgementType["Perfect"] = "perfect";
    JudgementType["Great"] = "great";
    JudgementType["Good"] = "good";
    JudgementType["Poor"] = "poor";
    JudgementType["Miss"] = "miss";
    JudgementType["Bad"] = "bad";
    JudgementType["Auto"] = "auto";
    JudgementType["Adlib"] = "adlib";
    JudgementType["Mine"] = "mine";
})(JudgementType || (JudgementType = {}));
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
const FONT_STACK = "'Hiragino Kaku Gothic ProN', 'Meiryo', 'Yu Gothic', sans-serif";
export const PADDING = 20;
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
export function calculateAutoZoomBeats(availableWidth, minNoteDiameter = 18) {
    if (availableWidth <= 0)
        return 16;
    const BEATS_PER_BAR = 4;
    // visualNoteWidthRatio = (2 * radius) + lineWidth
    // Note: logic follows that in applyAutoZoom to ensure consistency
    const visualNoteWidthRatio = LAYOUT_RATIOS.noteRadiusSmall * 2 + LAYOUT_RATIOS.lineWidthNoteOuter;
    const maxBeats = (availableWidth * visualNoteWidthRatio * BEATS_PER_BAR) / minNoteDiameter;
    // Ensure it is even and at least 4
    let targetBeats = Math.floor(maxBeats / 2) * 2;
    targetBeats = Math.max(4, targetBeats);
    return targetBeats;
}
const DEFAULT_TEXTS = {
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
export const DEFAULT_VIEW_OPTIONS = {
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
};
function isNoteSelected(barIdx, charIdx, selection) {
    if (!selection)
        return false;
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
    if (barIdx < startBar || barIdx > endBar)
        return false;
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
function getVirtualBars(chart, options, judgements, locToJudgementKey) {
    const { bars, loop } = chart;
    let virtualBars = [];
    if (options.collapsedLoop && loop) {
        // Pre-loop
        for (let i = 0; i < loop.startBarIndex; i++) {
            virtualBars.push({ bar: bars[i], originalIndex: i, effectiveBarIndex: i });
        }
        // Calculate loop logic for judgements
        let currentIter = 0;
        if (options.selectedLoopIteration !== undefined) {
            currentIter = options.selectedLoopIteration;
        }
        else if ((options.viewMode === "judgements" ||
            options.viewMode === "judgements-underline" ||
            options.viewMode === "judgements-text") &&
            judgements.size > 0) {
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
                    if (hasJudgement)
                        break;
                }
                if (hasJudgement)
                    maxIter = iter;
            }
            if (maxIter !== -1)
                currentIter = maxIter;
        }
        // Clamp currentIter to valid range [0, loop.iterations - 1]
        if (currentIter < 0)
            currentIter = 0;
        if (currentIter >= loop.iterations)
            currentIter = loop.iterations - 1;
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
    }
    else {
        // Standard View
        virtualBars = bars.map((b, i) => ({ bar: b, originalIndex: i, effectiveBarIndex: i }));
    }
    return virtualBars;
}
function calculateGlobalBarStartIndices(bars) {
    const indices = [];
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
function calculateLayout(virtualBars, chart, logicalCanvasWidth, options, offsetY = PADDING) {
    // 1. Determine Base Dimensions
    // The full canvas width (minus padding) represents 'beatsPerLine' beats.
    const availableWidth = logicalCanvasWidth - PADDING * 2;
    // Base width is width of one 4/4 bar (4 beats).
    // Number of base bars per row = beatsPerLine / 4
    const baseBarWidth = availableWidth / (options.beatsPerLine / 4);
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
    const barFrames = [];
    let currentY = offsetY;
    let currentRowX = 0;
    let currentRowMaxHeight = 0;
    let previousIsBranched = null;
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
            x: PADDING + currentRowX,
            y: currentY,
            width: actualBarWidth,
            height: thisBarHeight,
        });
        currentRowX += actualBarWidth;
        currentRowMaxHeight = Math.max(currentRowMaxHeight, thisBarHeight);
        previousIsBranched = isBranchedDisplay;
        isRowEmpty = false;
    }
    const totalHeight = barFrames.length > 0 ? currentY + currentRowMaxHeight + PADDING : offsetY + PADDING;
    return { barFrames, constants, totalHeight, baseBarWidth };
}
export function getNoteAt(x, y, chart, canvas, judgements = new JudgementMap(), options, layout) {
    let activeLayout;
    if (layout) {
        activeLayout = layout;
    }
    else {
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
        if (x < frame.x - maxRadius ||
            x > frame.x + frame.width + maxRadius ||
            y < frame.y - maxRadius ||
            y > frame.y + frame.height + maxRadius) {
            continue;
        }
        const barX = frame.x;
        let barY = frame.y;
        let targetChart = chart;
        let currentBranch = chart.branchType;
        const params = chart.barParams[info.originalIndex];
        const isBranchedBar = isAllBranches && params && params.isBranched;
        if (isBranchedBar && chart.branches) {
            const subHeight = frame.height / 3;
            if (y >= frame.y && y < frame.y + subHeight) {
                targetChart = chart.branches.normal || chart;
                currentBranch = "normal";
                barY = frame.y;
            }
            else if (y >= frame.y + subHeight && y < frame.y + 2 * subHeight) {
                targetChart = chart.branches.expert || chart;
                currentBranch = "expert";
                barY = frame.y + subHeight;
            }
            else if (y >= frame.y + 2 * subHeight && y < frame.y + 3 * subHeight) {
                targetChart = chart.branches.master || chart;
                currentBranch = "master";
                barY = frame.y + 2 * subHeight;
            }
            else {
                continue;
            }
        }
        const centerY = barY + (isBranchedBar ? frame.height / 3 : frame.height) / 2;
        const bar = targetChart.bars[info.originalIndex];
        if (!bar || bar.length === 0)
            continue;
        const noteStep = frame.width / bar.length;
        for (let i = 0; i < bar.length; i++) {
            const char = bar[i];
            if (!isRenderable(char))
                continue;
            // Skip discrete hit testing for End notes to allow long note segment logic to handle them (mapping to head)
            if (char === NoteType.End)
                continue;
            const noteX = barX + i * noteStep;
            // Check distance
            const dx = x - noteX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Determine radius
            let radius = NOTE_RADIUS_SMALL;
            if (isBig(char))
                radius = NOTE_RADIUS_BIG;
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
                let ordinal;
                if (activeLayout.locToJudgementKey) {
                    const locKey = { barIndex: effectiveBarIndex, charIndex: i };
                    const ident = activeLayout.locToJudgementKey.get(locKey);
                    if (ident)
                        ordinal = ident.ordinal;
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
            if (x < minX || x > maxX || y < minY || y > maxY)
                continue;
            // Capsule Distance Check
            // Distance from point P(x,y) to line segment AB(startX, y, endX, y)
            // Since y is constant, we just clamp x.
            const clampedX = Math.max(Math.min(x, Math.max(segment.startX, segment.endX)), Math.min(segment.startX, segment.endX));
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
                let ordinal;
                if (activeLayout.locToJudgementKey) {
                    const locKey = { barIndex: originalBarIdx, charIndex: charIdx };
                    const ident = activeLayout.locToJudgementKey.get(locKey);
                    if (ident)
                        ordinal = ident.ordinal;
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
export function getNotePosition(chart, canvas, options, targetBarIndex, targetCharIndex, layout) {
    let activeLayout;
    if (layout) {
        activeLayout = layout;
    }
    else {
        // For getNotePosition we don't need judgements really, pass empty
        activeLayout = createLayout(chart, canvas, options, new JudgementMap());
    }
    const { barFrames, virtualBars } = activeLayout;
    for (let index = 0; index < virtualBars.length; index++) {
        const info = virtualBars[index];
        if (info.originalIndex === targetBarIndex) {
            const frame = barFrames[index];
            const bar = info.bar;
            if (!bar || bar.length === 0)
                return null;
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
export function getGradientColor(delta) {
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
    }
    else {
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
function calculateLongNoteSegments(virtualBars, barFrames, constants) {
    const segments = [];
    const { noteRadiusSmall: rSmall, noteRadiusBig: rBig } = constants;
    let currentLongNote = null;
    for (let i = 0; i < virtualBars.length; i++) {
        const bar = virtualBars[i].bar;
        if (!bar)
            continue;
        const frame = barFrames[i];
        const originalBarIdx = virtualBars[i].originalIndex;
        const noteCount = bar.length;
        if (noteCount === 0 && !currentLongNote)
            continue;
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
            }
            else if (char === NoteType.End) {
                if (currentLongNote) {
                    const radius = currentLongNote.type === NoteType.DrumrollBig || currentLongNote.type === NoteType.Kusudama ? rBig : rSmall;
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
            const radius = currentLongNote.type === NoteType.DrumrollBig || currentLongNote.type === NoteType.Kusudama ? rBig : rSmall;
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
export function createLayout(chart, canvas, options, judgements, customDpr) {
    // Reset width to 100% to allow measuring the container's available width
    canvas.style.width = "100%";
    let logicalCanvasWidth = canvas.clientWidth;
    if (logicalCanvasWidth === 0) {
        logicalCanvasWidth = canvas.width || 800;
    }
    // Calculate Header Dimensions
    const availableWidth = logicalCanvasWidth - PADDING * 2;
    const baseBarWidth = availableWidth / (options.beatsPerLine / 4);
    const headerHeight = baseBarWidth * LAYOUT_RATIOS.headerHeight;
    const offsetY = PADDING + headerHeight + PADDING; // Padding above and below header
    const { bars } = chart;
    const globalBarStartIndices = calculateGlobalBarStartIndices(bars);
    const balloonIndices = calculateBalloonIndices(bars);
    const { locToJudgementKey } = calculateNoteMaps(bars);
    const virtualBars = getVirtualBars(chart, options, judgements, locToJudgementKey);
    const { barFrames, constants, totalHeight } = calculateLayout(virtualBars, chart, logicalCanvasWidth, options, offsetY);
    const longNoteSegments = calculateLongNoteSegments(virtualBars, barFrames, constants);
    // Compute Grid for Dirty Row Optimization
    const noteOrdinalToGrid = new JudgementMap();
    virtualBars.forEach((info, vIdx) => {
        if (info.bar) {
            for (let j = 0; j < info.bar.length; j++) {
                const char = info.bar[j];
                if (isJudgeable(char)) {
                    const locKey = { barIndex: info.originalIndex, charIndex: j };
                    const ident = locToJudgementKey.get(locKey);
                    if (ident) {
                        if (!noteOrdinalToGrid.has(ident))
                            noteOrdinalToGrid.set(ident, []);
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
        offsetY,
        baseBarWidth,
        locToJudgementKey,
        noteOrdinalToGrid,
        longNoteSegments,
    };
}
export function renderLayout(canvasContext, layout, chart, judgements, options, texts, dirtyRowY) {
    const { logicalCanvasWidth, dpr, totalHeight, barFrames, constants, virtualBars, balloonIndices, inferredHands, headerHeight, locToJudgementKey, } = layout;
    // Safety check for canvas limits
    const MAX_CANVAS_DIMENSION = 32000;
    let effectiveDpr = dpr;
    if (totalHeight * effectiveDpr > MAX_CANVAS_DIMENSION) {
        effectiveDpr = 1;
    }
    let finalCanvasHeight = totalHeight * effectiveDpr;
    let finalStyleHeight = totalHeight;
    if (finalCanvasHeight > MAX_CANVAS_DIMENSION) {
        finalCanvasHeight = MAX_CANVAS_DIMENSION;
        finalStyleHeight = MAX_CANVAS_DIMENSION / effectiveDpr;
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
        const rowHeights = new Map();
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
    }
    else {
        // Clear
        canvasContext.fillStyle = PALETTE.background;
        canvasContext.fillRect(0, 0, logicalCanvasWidth, totalHeight);
    }
    const renderContext = {
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
        const availableWidth = logicalCanvasWidth - PADDING * 2;
        const headerFrame = { x: PADDING, y: PADDING, width: availableWidth, height: headerHeight };
        drawChartHeader(canvasContext, chart, headerFrame, texts);
    }
    const isAllBranches = !!options.showAllBranches && !!chart.branches;
    const BASE_LANE_HEIGHT = constants.barHeight;
    // Layer 1: Backgrounds
    virtualBars.forEach((info, index) => {
        const frame = barFrames[index];
        if (dirtyRowY && !dirtyRowY.has(frame.y))
            return;
        drawBarBackgroundWrapper(canvasContext, frame, info, index, chart, options, constants, virtualBars, barFrames, texts, isAllBranches, BASE_LANE_HEIGHT, layout.baseBarWidth / 4);
    });
    // Layer 1.5 & 2: Notes
    if (isAllBranches && chart.branches) {
        drawAllBranchesNotes(renderContext, chart, virtualBars, barFrames, balloonIndices, BASE_LANE_HEIGHT, dirtyRowY);
    }
    else {
        // Layer 1.5: Drumrolls and Balloons
        drawLongNotes(canvasContext, virtualBars, barFrames, constants, options.viewMode, chart.balloonCounts, balloonIndices, options.selection, dirtyRowY);
        // Layer 2: Notes
        for (let index = virtualBars.length - 1; index >= 0; index--) {
            const info = virtualBars[index];
            const frame = barFrames[index];
            if (dirtyRowY && !dirtyRowY.has(frame.y))
                continue;
            drawBarNotes(renderContext, info.bar, frame, info.originalIndex, options.collapsedLoop ? chart.loop : undefined, chart.branchType, info.effectiveBarIndex);
        }
    }
    if (dirtyRowY) {
        canvasContext.restore();
    }
}
function drawBarBackgroundWrapper(canvasContext, frame, info, index, chart, options, constants, virtualBars, barFrames, texts, isAllBranches, BASE_LANE_HEIGHT, beatWidth) {
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
            const normalFrame = { x: frame.x, y: frame.y, width: frame.width, height: subHeight };
            drawBarBackground(canvasContext, normalFrame, constants.lineWidthBarBorder, true, "normal", !hasLeftNeighbor, !hasRightNeighbor, overExtendWidth, effectiveBeatWidth);
            const expertFrame = { x: frame.x, y: frame.y + subHeight, width: frame.width, height: subHeight };
            drawBarBackground(canvasContext, expertFrame, constants.lineWidthBarBorder, true, "expert", !hasLeftNeighbor, !hasRightNeighbor, overExtendWidth, effectiveBeatWidth);
            const masterFrame = { x: frame.x, y: frame.y + 2 * subHeight, width: frame.width, height: subHeight };
            drawBarBackground(canvasContext, masterFrame, constants.lineWidthBarBorder, true, "master", !hasLeftNeighbor, !hasRightNeighbor, overExtendWidth, effectiveBeatWidth);
            if (isBranchStart) {
                canvasContext.beginPath();
                canvasContext.strokeStyle = PALETTE.branches.startLine;
                canvasContext.lineWidth = constants.lineWidthBarBorder;
                canvasContext.moveTo(frame.x, frame.y);
                canvasContext.lineTo(frame.x, frame.y + frame.height);
                canvasContext.stroke();
            }
        }
        else {
            drawBarBackground(canvasContext, frame, constants.lineWidthBarBorder, false, "normal", !hasLeftNeighbor, !hasRightNeighbor, overExtendWidth, effectiveBeatWidth);
        }
        if (gogoTime || (gogoChanges && gogoChanges.length > 0)) {
            const stripHeight = constants.barNumberFontSize + constants.barNumberOffsetY * 2;
            const stripY = frame.y - stripHeight - constants.lineWidthBarBorder / 2;
            const gogoFrame = { x: frame.x, y: stripY, width: frame.width, height: stripHeight };
            drawGogoIndicator(canvasContext, gogoFrame, gogoTime, gogoChanges, noteCount, !hasLeftNeighbor, !hasRightNeighbor, overExtendWidth);
        }
        const showText = options.isAnnotationMode || options.alwaysShowAnnotations ? !!options.showTextInAnnotationMode : true;
        drawBarLabels(canvasContext, frame, info.originalIndex, constants.barNumberFontSize, constants.statusFontSize, constants.barNumberOffsetY, params, noteCount, info.originalIndex === 0, constants.lineWidthBarBorder, isBranchStart, showText);
        if (info.isLoopStart && chart.loop) {
            canvasContext.fillStyle = PALETTE.text.primary;
            canvasContext.font = `bold ${constants.barNumberFontSize}px ${FONT_STACK}`;
            canvasContext.textAlign = "right";
            const text = texts.loopPattern.replace("{n}", chart.loop.iterations.toString());
            canvasContext.fillText(text, frame.x + frame.width, frame.y - constants.barNumberOffsetY);
        }
    }
    else {
        drawBarBackground(canvasContext, frame, constants.lineWidthBarBorder, isBranched, chart.branchType, !hasLeftNeighbor, !hasRightNeighbor, overExtendWidth, effectiveBeatWidth);
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
            const gogoFrame = { x: frame.x, y: stripY, width: frame.width, height: stripHeight };
            drawGogoIndicator(canvasContext, gogoFrame, gogoTime, gogoChanges, noteCount, !hasLeftNeighbor, !hasRightNeighbor, overExtendWidth);
        }
        const showText = options.isAnnotationMode || options.alwaysShowAnnotations ? !!options.showTextInAnnotationMode : true;
        drawBarLabels(canvasContext, frame, info.originalIndex, constants.barNumberFontSize, constants.statusFontSize, constants.barNumberOffsetY, params, noteCount, info.originalIndex === 0, constants.lineWidthBarBorder, isBranchStart, showText);
        if (info.isLoopStart && chart.loop) {
            canvasContext.fillStyle = PALETTE.text.primary;
            canvasContext.font = `bold ${constants.barNumberFontSize}px ${FONT_STACK}`;
            canvasContext.textAlign = "right";
            const text = texts.loopPattern.replace("{n}", chart.loop.iterations.toString());
            canvasContext.fillText(text, frame.x + frame.width, frame.y - constants.barNumberOffsetY);
        }
    }
}
function drawAllBranchesNotes(renderContext, chart, virtualBars, barFrames, _balloonIndices, BASE_LANE_HEIGHT, dirtyRowY) {
    const { canvasContext, options, constants } = renderContext;
    if (!chart.branches)
        return;
    const branches = [
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
            }
            else {
                return {
                    ...f,
                    y: f.y,
                    height: BASE_LANE_HEIGHT,
                };
            }
        });
        drawLongNotes(canvasContext, branchVirtualBars, branchFrames, constants, options.viewMode, b.data.balloonCounts, calculateBalloonIndices(b.data.bars), null, dirtyRowY);
        for (let index = branchVirtualBars.length - 1; index >= 0; index--) {
            const info = branchVirtualBars[index];
            const frame = branchFrames[index];
            if (dirtyRowY && !dirtyRowY.has(frame.y))
                continue;
            // OPTIMIZATION: If unbranched, only draw for 'normal' branch to avoid overdraw
            const params = chart.barParams[info.originalIndex];
            const isBranched = params ? params.isBranched : false;
            if (!isBranched && b.type !== "normal")
                continue;
            const branchContext = {
                ...renderContext,
                options: { ...options, annotations: new LocationMap(), selection: null },
            };
            drawBarNotes(branchContext, info.bar, frame, info.originalIndex, undefined, b.type, info.effectiveBarIndex);
        }
    });
}
export function renderChart(chart, canvas, judgements = new JudgementMap(), options, texts = DEFAULT_TEXTS, customDpr) {
    const canvasContext = canvas.getContext("2d");
    if (!canvasContext) {
        console.error("2D rendering context not found for canvas.");
        return;
    }
    // Use the new createLayout function
    // Note: This recreates the layout on every call, maintaining existing behavior for now
    const layout = createLayout(chart, canvas, options, judgements, customDpr);
    // For now, unpack layout to keep using the existing rendering logic in this function
    // This is an intermediate step. Later we will replace this with renderLayout()
    const { virtualBars, barFrames, constants, totalHeight, balloonIndices, inferredHands, logicalCanvasWidth, dpr, headerHeight, locToJudgementKey, baseBarWidth, } = layout;
    // Safety check for canvas limits
    const MAX_CANVAS_DIMENSION = 32000;
    if (totalHeight * dpr > MAX_CANVAS_DIMENSION) {
        console.warn(`Chart height (${totalHeight * dpr}px) exceeds canvas limit. Reducing DPR to 1.`);
    }
    let effectiveDpr = dpr;
    if (totalHeight * effectiveDpr > MAX_CANVAS_DIMENSION) {
        effectiveDpr = 1;
    }
    let finalCanvasHeight = totalHeight * effectiveDpr;
    let finalStyleHeight = totalHeight;
    if (finalCanvasHeight > MAX_CANVAS_DIMENSION) {
        console.warn(`Chart height (${finalCanvasHeight}px) still exceeds canvas limit. Clamping height.`);
        finalCanvasHeight = MAX_CANVAS_DIMENSION;
        finalStyleHeight = MAX_CANVAS_DIMENSION / effectiveDpr;
    }
    canvas.width = logicalCanvasWidth * effectiveDpr;
    canvas.height = finalCanvasHeight;
    canvas.style.width = `${logicalCanvasWidth}px`;
    canvas.style.height = `${finalStyleHeight}px`;
    canvasContext.scale(effectiveDpr, effectiveDpr);
    // Clear
    canvasContext.fillStyle = PALETTE.background;
    canvasContext.fillRect(0, 0, logicalCanvasWidth, totalHeight);
    const renderContext = {
        canvasContext,
        options,
        judgements,
        texts,
        constants,
        inferredHands,
        locToJudgementKey,
    };
    // Layer 0: Header
    const availableWidth = logicalCanvasWidth - PADDING * 2;
    const headerFrame = { x: PADDING, y: PADDING, width: availableWidth, height: headerHeight };
    drawChartHeader(canvasContext, chart, headerFrame, texts);
    const isAllBranches = !!options.showAllBranches && !!chart.branches;
    const BASE_LANE_HEIGHT = constants.barHeight;
    // Layer 1: Backgrounds
    virtualBars.forEach((info, index) => {
        const frame = barFrames[index];
        drawBarBackgroundWrapper(canvasContext, frame, info, index, chart, options, constants, virtualBars, barFrames, texts, isAllBranches, BASE_LANE_HEIGHT, baseBarWidth / 4);
    });
    // Layer 1.5 & 2: Notes
    if (isAllBranches && chart.branches) {
        drawAllBranchesNotes(renderContext, chart, virtualBars, barFrames, balloonIndices, BASE_LANE_HEIGHT);
    }
    else {
        // Layer 1.5: Drumrolls and Balloons
        drawLongNotes(canvasContext, virtualBars, barFrames, constants, options.viewMode, chart.balloonCounts, balloonIndices, options.selection);
        // Layer 2: Notes
        for (let index = virtualBars.length - 1; index >= 0; index--) {
            const info = virtualBars[index];
            const frame = barFrames[index];
            drawBarNotes(renderContext, info.bar, frame, info.originalIndex, options.collapsedLoop ? chart.loop : undefined, chart.branchType, info.effectiveBarIndex);
        }
    }
}
function drawChartHeader(canvasContext, chart, frame, texts) {
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
            if (param.bpm < minBpm)
                minBpm = param.bpm;
            if (param.bpm > maxBpm)
                maxBpm = param.bpm;
            if (param.bpmChanges) {
                for (const change of param.bpmChanges) {
                    if (change.bpm < minBpm)
                        minBpm = change.bpm;
                    if (change.bpm > maxBpm)
                        maxBpm = change.bpm;
                }
            }
        }
    }
    const bpmText = minBpm === maxBpm ? `BPM: ${minBpm}` : `BPM: ${minBpm}-${maxBpm}`;
    const titleFontSize = height * 0.4;
    const subtitleFontSize = height * 0.25;
    const metaFontSize = height * 0.25;
    canvasContext.save();
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
    }
    else if (c.includes("oni")) {
        courseColor = PALETTE.courses.oni; // Pink (Unchanged)
    }
    else if (c.includes("hard")) {
        courseColor = PALETTE.courses.hard; // Dark Grey
    }
    else if (c.includes("normal")) {
        courseColor = PALETTE.courses.normal; // Green
    }
    else if (c.includes("easy")) {
        courseColor = PALETTE.courses.easy; // Orange
    }
    canvasContext.fillStyle = courseColor;
    canvasContext.font = `bold ${metaFontSize}px ${FONT_STACK}`;
    canvasContext.fillText(courseText, x + width, metaY);
    // BPM
    canvasContext.fillStyle = PALETTE.text.primary;
    canvasContext.font = `${metaFontSize}px ${FONT_STACK}`;
    canvasContext.fillText(bpmText, x + width, metaY + metaFontSize + 5);
    canvasContext.restore();
}
function drawGradientRect(canvasContext, x, y, width, height, color, direction) {
    const grad = canvasContext.createLinearGradient(x, y, x + width, y);
    const cSolid = hexToRgba(color, 1);
    const cMid = hexToRgba(color, 0.2);
    const cTrans = hexToRgba(color, 0);
    if (direction === "left") {
        grad.addColorStop(0, cTrans);
        grad.addColorStop(0.25, cMid);
        grad.addColorStop(0.5, cSolid);
        grad.addColorStop(1, cSolid);
    }
    else {
        grad.addColorStop(0, cSolid);
        grad.addColorStop(0.5, cSolid);
        grad.addColorStop(0.75, cMid);
        grad.addColorStop(1, cTrans);
    }
    canvasContext.fillStyle = grad;
    canvasContext.fillRect(x, y, width, height);
}
function drawGradientLine(canvasContext, x1, y1, x2, y2, color, lineWidth, direction) {
    const grad = canvasContext.createLinearGradient(x1, y1, x2, y1); // Horizontal gradient
    const cSolid = hexToRgba(color, 1);
    const cMid = hexToRgba(color, 0.2);
    const cTrans = hexToRgba(color, 0);
    if (direction === "left") {
        grad.addColorStop(0, cTrans);
        grad.addColorStop(0.25, cMid);
        grad.addColorStop(0.5, cSolid);
        grad.addColorStop(1, cSolid);
    }
    else {
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
function drawBarBackground(canvasContext, frame, borderW, isBranched, branchType = "normal", drawLeftExt = false, drawRightExt = false, overExtendWidth = 0, beatWidth = 0) {
    const { x, y, width, height } = frame;
    let fillColor = PALETTE.branches.default;
    if (isBranched) {
        if (branchType === "normal")
            fillColor = PALETTE.branches.normal; // Normal
        if (branchType === "expert")
            fillColor = PALETTE.branches.expert; // Professional
        else if (branchType === "master")
            fillColor = PALETTE.branches.master; // Master
    }
    // Helper for extensions
    const drawExtension = (exX, exW, isLeft) => {
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
function hexToRgba(hex, alpha) {
    const h = hex.replace("#", "");
    let r = 0, g = 0, b = 0;
    if (h.length === 3) {
        r = parseInt(h[0] + h[0], 16);
        g = parseInt(h[1] + h[1], 16);
        b = parseInt(h[2] + h[2], 16);
    }
    else if (h.length === 6) {
        r = parseInt(h.substring(0, 2), 16);
        g = parseInt(h.substring(2, 4), 16);
        b = parseInt(h.substring(4, 6), 16);
    }
    else if (h.length === 8) {
        r = parseInt(h.substring(0, 2), 16);
        g = parseInt(h.substring(2, 4), 16);
        b = parseInt(h.substring(4, 6), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
function calculateNoteMaps(bars) {
    const locToJudgementKey = new LocationMap();
    const identToLoc = new JudgementMap();
    const counters = {};
    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (!bar)
            continue;
        for (let j = 0; j < bar.length; j++) {
            const char = bar[j];
            if (isJudgeable(char)) {
                if (counters[char] === undefined)
                    counters[char] = 0;
                const ordinal = counters[char];
                const identity = { char, ordinal };
                const location = { barIndex: i, charIndex: j };
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
function calculateBalloonIndices(bars) {
    const map = new LocationMap();
    let balloonCount = 0;
    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (!bar)
            continue;
        for (let j = 0; j < bar.length; j++) {
            if (bar[j] === NoteType.Balloon || bar[j] === NoteType.Kusudama) {
                map.set({ barIndex: i, charIndex: j }, balloonCount);
                balloonCount++;
            }
        }
    }
    return map;
}
function drawLongNotes(canvasContext, virtualBars, barFrames, constants, viewMode, balloonCounts, balloonIndices, selection, dirtyRowY) {
    const { noteRadiusSmall: rSmall, noteRadiusBig: rBig, lineWidthNoteOuter: borderOuterW, lineWidthNoteInner: borderInnerW, } = constants;
    let currentLongNote = null;
    // Iterate all bars
    for (let i = 0; i < virtualBars.length; i++) {
        const bar = virtualBars[i].bar;
        if (!bar)
            continue;
        const frame = barFrames[i];
        const isDirty = !dirtyRowY || dirtyRowY.has(frame.y);
        const originalBarIdx = virtualBars[i].originalIndex;
        const noteCount = bar.length;
        if (noteCount === 0 && !currentLongNote)
            continue;
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
            }
            else if (char === NoteType.End) {
                if (currentLongNote) {
                    // End the long note
                    const radius = currentLongNote.type === NoteType.DrumrollBig || currentLongNote.type === NoteType.Kusudama ? rBig : rSmall;
                    const startX = barX + segmentStartIdx * noteStep;
                    const endX = barX + j * noteStep;
                    const hasStartCap = segmentStartIdx === currentLongNote.startNoteIdx && i === currentLongNote.startBarIdx;
                    const hasEndCap = true;
                    const isSelected = isNoteSelected(currentLongNote.originalBarIdx, currentLongNote.originalNoteIdx, selection || null);
                    if (isDirty) {
                        if (currentLongNote.type === NoteType.Balloon || currentLongNote.type === NoteType.Kusudama) {
                            // Balloon
                            const balloonIdx = balloonIndices.get({
                                barIndex: currentLongNote.originalBarIdx,
                                charIndex: currentLongNote.originalNoteIdx,
                            });
                            const count = balloonIdx !== undefined && balloonCounts[balloonIdx] !== undefined ? balloonCounts[balloonIdx] : 5;
                            drawBalloonSegment(canvasContext, startX, endX, centerY, radius, hasStartCap, hasEndCap, borderOuterW, borderInnerW, viewMode, count, currentLongNote.type === NoteType.Kusudama, isSelected);
                        }
                        else {
                            // Drumroll
                            drawDrumrollSegment(canvasContext, startX, endX, centerY, radius, hasStartCap, hasEndCap, borderOuterW, borderInnerW, viewMode, currentLongNote.type, isSelected);
                        }
                    }
                    currentLongNote = null;
                    segmentActive = false;
                }
            }
        }
        // If still active at end of bar, draw segment to end
        if (segmentActive && currentLongNote) {
            const radius = currentLongNote.type === NoteType.DrumrollBig || currentLongNote.type === NoteType.Kusudama ? rBig : rSmall;
            const startX = barX + segmentStartIdx * noteStep;
            const endX = barX + frame.width; // Visual end of bar
            const hasStartCap = segmentStartIdx === currentLongNote.startNoteIdx && i === currentLongNote.startBarIdx;
            const hasEndCap = false; // Continuation
            const isSelected = isNoteSelected(currentLongNote.originalBarIdx, currentLongNote.originalNoteIdx, selection || null);
            if (isDirty) {
                if (currentLongNote.type === NoteType.Balloon || currentLongNote.type === NoteType.Kusudama) {
                    const balloonIdx = balloonIndices.get({
                        barIndex: currentLongNote.originalBarIdx,
                        charIndex: currentLongNote.originalNoteIdx,
                    });
                    const count = balloonIdx !== undefined && balloonCounts[balloonIdx] !== undefined ? balloonCounts[balloonIdx] : 5;
                    drawBalloonSegment(canvasContext, startX, endX, centerY, radius, hasStartCap, hasEndCap, borderOuterW, borderInnerW, viewMode, count, currentLongNote.type === NoteType.Kusudama, isSelected);
                }
                else {
                    drawDrumrollSegment(canvasContext, startX, endX, centerY, radius, hasStartCap, hasEndCap, borderOuterW, borderInnerW, viewMode, currentLongNote.type, isSelected);
                }
            }
        }
    }
}
function getBorderStyles(isSelected, borderOuterW, borderInnerW, innerBorderColor) {
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
function drawDrumrollSegment(canvasContext, startX, endX, centerY, radius, startCap, endCap, borderOuterW, borderInnerW, viewMode, _type, isSelected = false) {
    let fillColor = PALETTE.notes.drumroll;
    let innerBorderColor = PALETTE.notes.border.white;
    if (viewMode === "judgements") {
        fillColor = PALETTE.notes.unjudged;
        innerBorderColor = PALETTE.notes.border.grey;
    }
    // Handle Selection
    const borderStyles = getBorderStyles(isSelected, borderOuterW, borderInnerW, innerBorderColor);
    drawCapsule(canvasContext, startX, endX, centerY, radius, startCap, endCap, borderStyles.outerW, borderStyles.innerW, fillColor, borderStyles.innerColor);
}
function drawBalloonSegment(canvasContext, startX, endX, centerY, radius, startCap, endCap, borderOuterW, borderInnerW, viewMode, count, isKusudama, isSelected = false) {
    let fillColor = PALETTE.notes.balloon; // Orangeish for balloon body
    let innerBorderColor = PALETTE.notes.border.white;
    if (viewMode === "judgements") {
        fillColor = PALETTE.notes.unjudged;
        innerBorderColor = PALETTE.notes.border.grey;
    }
    // Handle Selection
    const { outerW: effectiveBorderOuterW, innerW: effectiveBorderInnerW, innerColor: effectiveInnerBorderColor, } = getBorderStyles(isSelected, borderOuterW, borderInnerW, innerBorderColor);
    // Note: For balloon head, we usually want the same inner border color.
    // The original code was using effectiveInnerBorderColor for head too if selected.
    const effectiveHeadInnerBorderColor = effectiveInnerBorderColor;
    // Draw the tail (body)
    // The tail usually starts a bit after the head, but for simplicity we draw it as a capsule behind the head.
    // However, if we draw it as a capsule, the head will be drawn on top of it.
    // If startCap is true, we are drawing the head segment.
    drawCapsule(canvasContext, startX, endX, centerY, radius * 0.8, startCap, endCap, effectiveBorderOuterW, effectiveBorderInnerW, fillColor, effectiveInnerBorderColor);
    // If this is the start segment, draw the balloon head
    if (startCap) {
        let headColor = PALETTE.notes.balloon; // Orange
        if (isKusudama)
            headColor = PALETTE.notes.kusudama; // Gold
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
function drawCapsule(canvasContext, startX, endX, centerY, radius, startCap, endCap, borderOuterW, borderInnerW, fillColor, innerBorderColor) {
    // 1. Outer Border (Open Path if no caps to avoid vertical lines)
    canvasContext.beginPath();
    // Top Edge Part
    if (startCap) {
        // From Left-Middle to Top-Left
        canvasContext.arc(startX, centerY, radius, Math.PI, Math.PI * 1.5, false);
    }
    else {
        canvasContext.moveTo(startX, centerY - radius);
    }
    canvasContext.lineTo(endX, centerY - radius);
    if (endCap) {
        // From Top-Right to Bottom-Right
        canvasContext.arc(endX, centerY, radius, Math.PI * 1.5, Math.PI * 2.5, false);
    }
    else {
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
    }
    else {
        canvasContext.lineTo(startX, centerY - radius);
    }
    // Top Edge
    canvasContext.lineTo(endX, centerY - radius);
    // Right Edge
    if (endCap) {
        canvasContext.arc(endX, centerY, radius, Math.PI * 1.5, Math.PI * 2.5, false);
    }
    else {
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
    }
    else {
        canvasContext.moveTo(startX, centerY - radius);
    }
    canvasContext.lineTo(endX, centerY - radius);
    if (endCap) {
        canvasContext.arc(endX, centerY, radius, Math.PI * 1.5, Math.PI * 2.5, false);
    }
    else {
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
function calculateNoteColors(renderContext, bar, noteCount, originalBarIndex, loopInfo, effectiveBarIndex) {
    const { options, judgements, locToJudgementKey } = renderContext;
    const { viewMode, coloringMode, visibility: judgementVisibility } = options;
    const noteColors = new Array(noteCount).fill(null);
    if (viewMode === "judgements" || viewMode === "judgements-underline" || viewMode === "judgements-text") {
        for (let i = 0; i < noteCount; i++) {
            const char = bar[i];
            if (!isJudgeable(char))
                continue;
            let effectiveDelta;
            let isValidJudge = false;
            let isJudgedButMiss = false; // "None of perfect, good or poor"
            if (coloringMode === "gradient") {
                // Gradient Logic (with Loop Averaging)
                if (loopInfo &&
                    originalBarIndex >= loopInfo.startBarIndex &&
                    originalBarIndex < loopInfo.startBarIndex + loopInfo.period) {
                    // Collapsed Loop - Average over iterations
                    let sum = 0;
                    let count = 0;
                    let judgedCount = 0;
                    // We need to find the base note (in the first iteration of the loop)
                    // `originalBarIndex` is the template bar index.
                    // We iterate through all iterations `iter`
                    for (let iter = 0; iter < loopInfo.iterations; iter++) {
                        const actualBarIdx = loopInfo.startBarIndex + iter * loopInfo.period + (originalBarIndex - loopInfo.startBarIndex);
                        // Look up ordinal
                        if (locToJudgementKey) {
                            const locKey = { barIndex: actualBarIdx, charIndex: i };
                            const ident = locToJudgementKey.get(locKey);
                            if (ident) {
                                const judgeData = judgements.get(ident);
                                if (judgeData) {
                                    const j = judgeData.judgement;
                                    // Check visibility
                                    if (j === JudgementType.Perfect && !judgementVisibility.perfect)
                                        continue;
                                    if (j === JudgementType.Good && !judgementVisibility.good)
                                        continue;
                                    if (j === JudgementType.Poor && !judgementVisibility.poor)
                                        continue;
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
                    }
                    else if (judgedCount > 0) {
                        isJudgedButMiss = true;
                    }
                }
                else {
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
                                if (j === JudgementType.Perfect && !judgementVisibility.perfect)
                                    isVisible = false;
                                else if (j === JudgementType.Good && !judgementVisibility.good)
                                    isVisible = false;
                                else if (j === JudgementType.Poor && !judgementVisibility.poor)
                                    isVisible = false;
                                if (isVisible) {
                                    if (j === JudgementType.Perfect || j === JudgementType.Good || j === JudgementType.Poor) {
                                        effectiveDelta = judgeData.delta;
                                        isValidJudge = true;
                                    }
                                    else {
                                        isJudgedButMiss = true;
                                    }
                                }
                            }
                        }
                    }
                }
                if (isValidJudge && effectiveDelta !== undefined) {
                    noteColors[i] = getGradientColor(effectiveDelta);
                }
                else if (isJudgedButMiss) {
                    noteColors[i] = PALETTE.judgements.miss; // Dark Grey
                }
            }
            else {
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
                            else if (judge &&
                                ![JudgementType.Perfect, JudgementType.Good, JudgementType.Poor].includes(judge))
                                noteColors[i] = PALETTE.judgements.miss;
                        }
                    }
                }
            }
        }
    }
    return noteColors;
}
function drawJudgementsUnderline(canvasContext, bar, noteColors, noteCount, frame, rSmall, rBig, borderUnderlineW) {
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
        if (!isJudgeable(noteChar))
            continue;
        // Only draw if we have a valid color
        if (noteColors[i]) {
            const noteX = x + i * noteStep;
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
        if (!isJudgeable(noteChar))
            continue;
        const color = noteColors[i];
        if (color) {
            const noteX = x + i * noteStep;
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
function drawJudgementsText(canvasContext, bar, noteColors, noteCount, frame, rSmall, rBig, texts, judgements, locToJudgementKey, effectiveBarIndex, originalBarIndex) {
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
        if (!isJudgeable(noteChar))
            continue;
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
                    if (jd)
                        judge = jd.judgement;
                }
            }
            let text = "";
            if (judge === JudgementType.Perfect)
                text = texts.judgement.perfect;
            else if (judge === JudgementType.Good)
                text = texts.judgement.good;
            else if (judge === JudgementType.Poor)
                text = texts.judgement.poor;
            if (text) {
                const noteX = x + i * noteStep;
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
function getNoteStyle(noteChar, rSmall, rBig) {
    let color = null;
    let radius = 0;
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
function drawBarNotes(renderContext, bar, frame, originalBarIndex = -1, loopInfo, currentBranch, effectiveBarIndex) {
    const { canvasContext, options, judgements, texts, constants, inferredHands, locToJudgementKey } = renderContext;
    const { noteRadiusSmall: rSmall, noteRadiusBig: rBig, lineWidthNoteOuter: borderOuterW, lineWidthNoteInner: borderInnerW, lineWidthUnderlineBorder: borderUnderlineW, } = constants;
    const { viewMode, selection } = options;
    const { x, width } = frame;
    const centerY = frame.y + frame.height / 2;
    const noteCount = bar.length;
    if (noteCount === 0)
        return;
    const noteStep = width / noteCount;
    // Pre-calculate colors for judgeable notes if needed
    const noteColors = calculateNoteColors(renderContext, bar, noteCount, originalBarIndex, loopInfo, effectiveBarIndex);
    // Phase 1: Draw Underlines (Judgements Underline Mode only)
    if (viewMode === "judgements-underline") {
        drawJudgementsUnderline(canvasContext, bar, noteColors, noteCount, frame, rSmall, rBig, borderUnderlineW);
    }
    // Phase 1.5: Draw Text (Judgements Text Mode only)
    if (viewMode === "judgements-text") {
        drawJudgementsText(canvasContext, bar, noteColors, noteCount, frame, rSmall, rBig, texts, judgements, locToJudgementKey, effectiveBarIndex, originalBarIndex);
    }
    // Phase 2: Draw Note Heads
    for (let i = noteCount - 1; i >= 0; i--) {
        const noteChar = bar[i];
        const noteX = x + i * noteStep;
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
            const isHovered = options.hoveredNote &&
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
function drawBarLabels(canvasContext, frame, originalBarIndex, numFontSize, statusFontSize, offsetY, params, noteCount, isFirstBar, barBorderWidth, isBranchStart = false, showText = true) {
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
    const labels = [];
    if (isFirstBar) {
        labels.push({ type: "BPM", val: params.bpm, index: 0 });
        if (params.scroll !== 1.0) {
            labels.push({ type: "HS", val: params.scroll, index: 0 });
        }
    }
    if (params.bpmChanges) {
        for (const c of params.bpmChanges) {
            const exists = labels.some((l) => l.type === "BPM" && l.index === c.index);
            if (!exists)
                labels.push({ type: "BPM", val: c.bpm, index: c.index });
        }
    }
    if (params.scrollChanges) {
        for (const c of params.scrollChanges) {
            const exists = labels.some((l) => l.type === "HS" && l.index === c.index);
            if (!exists)
                labels.push({ type: "HS", val: c.scroll, index: c.index });
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
    const changeIndices = new Set();
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
            }
            else if (label.type === "HS") {
                canvasContext.fillStyle = PALETTE.status.hs;
                canvasContext.fillText(`HS ${label.val}`, drawX, hsY);
            }
        }
    }
    canvasContext.restore();
}
function drawGogoIndicator(canvasContext, frame, gogoTime, gogoChanges, noteCount, drawLeftExt = false, drawRightExt = false, overExtendWidth = 0) {
    const { x, y, width, height } = frame;
    const GOGO_COLOR = PALETTE.gogo;
    // Helper for extensions
    const drawExtension = (exX, exW, isLeft) => {
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
    }
    else {
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
