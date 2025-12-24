import { ParsedChart, LoopInfo, GogoChange, BarParams } from './tja-parser.js';

export const PALETTE = {
    background: '#d4d4d4ff',
    text: {
        primary: '#000',
        secondary: '#444',
        inverted: '#000',
        label: '#333'
    },
    ui: {
        barBorder: '#000',
        barVerticalLine: '#ffffffff',
        centerLine: '#ccc',
        selectionBorder: '#000',
        annotation: {
            match: '#000',
            mismatch: '#f00'
        },
        warning: {
            background: '#fff0f0',
            text: '#cc0000'
        },
        streamWaiting: {
            background: '#f0f0f0',
            text: '#666'
        }
    },
    notes: {
        don: 'rgba(255, 77, 77, 1)',
        ka: 'rgba(92, 187, 255, 1)',
        drumroll: '#ff0',
        balloon: '#ffa500',
        kusudama: '#ffd700',
        unjudged: '#999',
        border: {
             white: '#fff',
             black: '#000',
             grey: '#ccc'
        }
    },
    courses: {
        easy: '#ffa500',
        normal: '#00aa00',
        hard: '#555',
        oni: '#c6006e',
        edit: '#800080'
    },
    judgements: {
        perfect: '#ffa500',
        good: '#fff',
        poor: '#00f',
        miss: '#555',
        textBorder: '#000'
    },
    branches: {
        normal: '#2C2C2C',
        expert: '#284E6A',
        master: '#752168',
        default: '#999',
        startLine: '#ff0'
    },
    status: {
        bpm: '#00008B',
        hs: '#8B0000',
        line: '#666'
    },
    gogo: '#f8a33cff'
};

// Helper types for renderer and hit testing
interface RenderBarInfo {
    bar: string[];
    originalIndex: number;
    isLoopStart?: boolean;
    isLoopEnd?: boolean;
    overrideStartIndex?: number; // If set, use this instead of looking up globalBarStartIndices
}

interface BarLayout {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface JudgementVisibility {
    perfect: boolean;
    good: boolean;
    poor: boolean;
}

export interface ViewOptions {
    viewMode: 'original' | 'judgements' | 'judgements-underline' | 'judgements-text';
    coloringMode: 'categorical' | 'gradient';
    visibility: JudgementVisibility;
    collapsedLoop: boolean;
    selectedLoopIteration?: number;
    beatsPerLine: number;
    showAllBranches?: boolean;
    selection: {
        start: { originalBarIndex: number, charIndex: number };
        end: { originalBarIndex: number, charIndex: number } | null;
    } | null;
    annotations?: Record<string, string>;
    isAnnotationMode?: boolean;
}

// Configuration Constants
const BARS_PER_ROW: number = 4;
const PADDING: number = 20;
const RATIOS = {
    BAR_HEIGHT: 0.14,
    ROW_SPACING: 0.16,
    NOTE_RADIUS_SMALL: 0.035,
    NOTE_RADIUS_BIG: 0.05,
    LINE_WIDTH_BAR_BORDER: 0.01,
    LINE_WIDTH_CENTER: 0.005,
    LINE_WIDTH_NOTE_OUTER: 0.022,
    LINE_WIDTH_NOTE_INNER: 0.0075,
    LINE_WIDTH_UNDERLINE_BORDER: 0.008,
    BAR_NUMBER_FONT_SIZE_RATIO: 0.045,
    STATUS_FONT_SIZE_RATIO: 0.045,
    BAR_NUMBER_OFFSET_Y_RATIO: 0.005,
    HEADER_HEIGHT: 0.35
};

export interface RenderTexts {
    loopPattern: string; // e.g. "Loop x{n}"
    judgement: {
        perfect: string;
        good: string;
        poor: string;
    };
    course?: Record<string, string>;
}

const DEFAULT_TEXTS: RenderTexts = {
    loopPattern: "Loop x{n}",
    judgement: {
        perfect: "良",
        good: "可",
        poor: "不可"
    },
    course: {
        'easy': 'Easy',
        'normal': 'Normal',
        'hard': 'Hard',
        'oni': 'Oni',
        'edit': 'Oni (Ura)'
    }
};

function calculateInferredHands(bars: string[][], annotations: Record<string, string> | undefined): Map<string, string> {
    const inferred = new Map<string, string>();
    let lastHand = 'L'; // Initialize to L so the first note (which triggers reset or flip) can become R
    let shouldResetToRight = true;

    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (!bar) continue;
        for (let j = 0; j < bar.length; j++) {
            const char = bar[j];
            const noteId = `${i}_${j}`;

            if (['1', '2', '3', '4'].includes(char)) {
                let currentInferred = 'R';
                
                if (shouldResetToRight) {
                    currentInferred = 'R';
                    shouldResetToRight = false;
                } else {
                    currentInferred = (lastHand === 'R') ? 'L' : 'R';
                }
                
                inferred.set(noteId, currentInferred);

                // Determine source of truth for next note
                if (annotations && annotations[noteId]) {
                    lastHand = annotations[noteId];
                } else {
                    lastHand = currentInferred;
                }
            } else if (char === '8') {
                // End of drumroll/balloon/kusudama
                shouldResetToRight = true;
            }
        }
    }
    return inferred;
}

function isNoteSelected(barIdx: number, charIdx: number, selection: ViewOptions['selection']): boolean {
    if (!selection) return false;
    
    const { start, end } = selection;
    if (!end) {
        return start.originalBarIndex === barIdx && start.charIndex === charIdx;
    }

    // Range selection
    // Determine min/max to handle reverse selection
    let startBar = start.originalBarIndex;
    let startChar = start.charIndex;
    let endBar = end.originalBarIndex;
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

function getVirtualBars(chart: ParsedChart, options: ViewOptions, judgements: string[], globalBarStartIndices: number[]): RenderBarInfo[] {
    const { bars, loop } = chart;
    let virtualBars: RenderBarInfo[] = [];

    if (options.collapsedLoop && loop) {
        // Pre-loop
        for (let i = 0; i < loop.startBarIndex; i++) {
            virtualBars.push({ bar: bars[i], originalIndex: i });
        }

        // Calculate loop logic for judgements
        let currentIter = 0;
        let notesPerLoop = 0;
        let preLoopNotes = globalBarStartIndices[loop.startBarIndex];

        // Calculate notes in one loop iteration
        for (let k = 0; k < loop.period; k++) {
            const bar = bars[loop.startBarIndex + k];
            if (bar) {
                 for (const char of bar) {
                    if (['1', '2', '3', '4'].includes(char)) notesPerLoop++;
                }
            }
        }

        if (options.selectedLoopIteration !== undefined) {
            currentIter = options.selectedLoopIteration;
        } else if ((options.viewMode === 'judgements' || options.viewMode === 'judgements-underline' || options.viewMode === 'judgements-text') && judgements.length > 0) {
            const lastJudgedIndex = judgements.length - 1;
            if (lastJudgedIndex >= preLoopNotes && notesPerLoop > 0) {
                const relativeIndex = lastJudgedIndex - preLoopNotes;
                currentIter = Math.floor(relativeIndex / notesPerLoop);
            }
        }
        
        // Clamp currentIter to valid range [0, loop.iterations - 1]
        // This handles cases where targetLoopIteration might be out of bounds (though main.ts should prevent this)
        // or if judgements go beyond the chart (though that's an edge case)
        if (currentIter < 0) currentIter = 0;
        if (currentIter >= loop.iterations) currentIter = loop.iterations - 1;

        // Loop Body
        for (let i = 0; i < loop.period; i++) {
            const originalIdx = loop.startBarIndex + i;
            const baseStartIndex = globalBarStartIndices[originalIdx];
            
            const effectiveStartIndex = baseStartIndex + (currentIter * notesPerLoop);

            virtualBars.push({
                bar: bars[originalIdx],
                originalIndex: originalIdx,
                isLoopStart: i === 0,
                isLoopEnd: i === loop.period - 1,
                overrideStartIndex: effectiveStartIndex
            });
        }

        // Post-loop
        // Start from the end of the full loop sequence
        const postLoopStartIndex = loop.startBarIndex + (loop.period * loop.iterations);
        for (let i = postLoopStartIndex; i < bars.length; i++) {
            virtualBars.push({ bar: bars[i], originalIndex: i });
        }

    } else {
        // Standard View
        virtualBars = bars.map((b, i) => ({ bar: b, originalIndex: i }));
    }
    return virtualBars;
}

function calculateGlobalBarStartIndices(bars: string[][]): number[] {
    const indices: number[] = [];
    let currentGlobalNoteIndex = 0;
    for (const bar of bars) {
        indices.push(currentGlobalNoteIndex);
        if (bar) {
            for (const char of bar) {
                if (['1', '2', '3', '4'].includes(char)) {
                    currentGlobalNoteIndex++;
                }
            }
        }
    }
    return indices;
}

function calculateLayout(virtualBars: RenderBarInfo[], chart: ParsedChart, logicalCanvasWidth: number, options: ViewOptions, offsetY: number = PADDING): { layouts: BarLayout[], constants: any, totalHeight: number } {
    // 1. Determine Base Dimensions
    // The full canvas width (minus padding) represents 'beatsPerLine' beats.
    const availableWidth = logicalCanvasWidth - (PADDING * 2);
    // Base width is width of one 4/4 bar (4 beats). 
    // Number of base bars per row = beatsPerLine / 4
    const baseBarWidth: number = availableWidth / (options.beatsPerLine / 4);
    
    // Base dimensions for a SINGLE lane
    const BASE_LANE_HEIGHT = baseBarWidth * RATIOS.BAR_HEIGHT;
    const ROW_SPACING = baseBarWidth * RATIOS.ROW_SPACING;
    
    // Constants for drawing
    const constants = {
        BAR_HEIGHT: BASE_LANE_HEIGHT,
        ROW_SPACING,
        NOTE_RADIUS_SMALL: baseBarWidth * RATIOS.NOTE_RADIUS_SMALL,
        NOTE_RADIUS_BIG: baseBarWidth * RATIOS.NOTE_RADIUS_BIG,
        LW_BAR: baseBarWidth * RATIOS.LINE_WIDTH_BAR_BORDER,
        LW_CENTER: baseBarWidth * RATIOS.LINE_WIDTH_CENTER,
        LW_NOTE_OUTER: baseBarWidth * RATIOS.LINE_WIDTH_NOTE_OUTER,
        LW_NOTE_INNER: baseBarWidth * RATIOS.LINE_WIDTH_NOTE_INNER,
        LW_UNDERLINE_BORDER: baseBarWidth * RATIOS.LINE_WIDTH_UNDERLINE_BORDER,
        BAR_NUMBER_FONT_SIZE: baseBarWidth * RATIOS.BAR_NUMBER_FONT_SIZE_RATIO,
        STATUS_FONT_SIZE: baseBarWidth * RATIOS.STATUS_FONT_SIZE_RATIO,
        BAR_NUMBER_OFFSET_Y: baseBarWidth * RATIOS.BAR_NUMBER_OFFSET_Y_RATIO,
        HEADER_HEIGHT: baseBarWidth * RATIOS.HEADER_HEIGHT
    };

    // 2. Calculate Layout Positions
    const layouts: BarLayout[] = [];
    let currentY = offsetY;
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
        const isBranchedDisplay = (options.showAllBranches && chart.branches && params && params.isBranched) || false;
        const thisBarHeight = isBranchedDisplay ? (BASE_LANE_HEIGHT * 3) : BASE_LANE_HEIGHT;

        // Check for break conditions
        let shouldBreak = false;

        // 1. Width Overflow
        if (!isRowEmpty && (currentRowX + actualBarWidth > availableWidth + 1.0)) {
            shouldBreak = true;
        }

        // 2. Branch State Change (only if not empty row)
        if (!isRowEmpty && previousIsBranched !== null && previousIsBranched !== isBranchedDisplay) {
            shouldBreak = true;
        }

        if (shouldBreak) {
            currentY += currentRowMaxHeight + ROW_SPACING;
            currentRowX = 0;
            currentRowMaxHeight = 0;
            isRowEmpty = true;
        }

        layouts.push({
            x: PADDING + currentRowX,
            y: currentY,
            width: actualBarWidth,
            height: thisBarHeight
        });

        currentRowX += actualBarWidth;
        currentRowMaxHeight = Math.max(currentRowMaxHeight, thisBarHeight);
        previousIsBranched = isBranchedDisplay;
        isRowEmpty = false;
    }

    const totalHeight = layouts.length > 0 
        ? currentY + currentRowMaxHeight + PADDING 
        : offsetY + PADDING;

    return { layouts, constants, totalHeight };
}

export interface HitInfo {
    originalBarIndex: number;
    charIndex: number;
    type: string;
    judgeableNoteIndex: number | null; // Global index for judgeable notes (1,2,3,4)
    bpm: number;
    scroll: number;
}

export function getNoteAt(x: number, y: number, chart: ParsedChart, canvas: HTMLCanvasElement, judgements: string[] = [], options: ViewOptions): HitInfo | null {
    const logicalCanvasWidth: number = canvas.clientWidth || 800;

    // Calculate Header Dimensions (Must match renderChart)
    const availableWidth = logicalCanvasWidth - (PADDING * 2);
    const baseBarWidth: number = availableWidth / (options.beatsPerLine / 4);
    const headerHeight = baseBarWidth * RATIOS.HEADER_HEIGHT;
    const offsetY = PADDING + headerHeight + PADDING;
    
    const globalBarStartIndices = calculateGlobalBarStartIndices(chart.bars);
    const virtualBars = getVirtualBars(chart, options, judgements, globalBarStartIndices);
    
    const { layouts, constants } = calculateLayout(virtualBars, chart, logicalCanvasWidth, options, offsetY);
    const { NOTE_RADIUS_SMALL, NOTE_RADIUS_BIG } = constants;

    const isAllBranches = options.showAllBranches && !!chart.branches;

    // Hit testing loop
    // Iterate backwards as per rendering order (notes on top)
    for (let index = virtualBars.length - 1; index >= 0; index--) {
        const info = virtualBars[index];
        const layout = layouts[index];
        
        // Quick bounding box check
        if (x < layout.x || x > layout.x + layout.width || y < layout.y || y > layout.y + layout.height) {
            continue;
        }

        let barX = layout.x;
        let barY = layout.y; 
        
        let targetChart = chart;
        const params = chart.barParams[info.originalIndex];
        const isBranchedBar = isAllBranches && params && params.isBranched;

        if (isBranchedBar && chart.branches) {
            const subHeight = layout.height / 3;
            if (y >= layout.y && y < layout.y + subHeight) {
                targetChart = chart.branches.normal || chart;
                barY = layout.y;
            } else if (y >= layout.y + subHeight && y < layout.y + 2 * subHeight) {
                targetChart = chart.branches.expert || chart;
                barY = layout.y + subHeight;
            } else if (y >= layout.y + 2 * subHeight && y < layout.y + 3 * subHeight) {
                targetChart = chart.branches.master || chart;
                barY = layout.y + 2 * subHeight;
            } else {
                continue; 
            }
        }

        const centerY = barY + (isBranchedBar ? layout.height / 3 : layout.height) / 2;
        
        const bar = targetChart.bars[info.originalIndex];
        if (!bar || bar.length === 0) continue;

        const noteStep: number = layout.width / bar.length;
        
        // Calculate start index for this bar
        const startIndex = info.overrideStartIndex !== undefined 
            ? info.overrideStartIndex 
            : globalBarStartIndices[info.originalIndex];

        let localJudgeCount = 0;

        for (let i = 0; i < bar.length; i++) {
            const char = bar[i];
            if (!['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(char)) continue;

            const noteX: number = barX + (i * noteStep);
            
            // Check distance
            const dx = x - noteX;
            const dy = y - centerY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Determine radius
            let radius = NOTE_RADIUS_SMALL;
            if (['3', '4', '6', '9'].includes(char)) radius = NOTE_RADIUS_BIG;

            if (dist <= radius) {
                // Hit!
                let judgeableIndex: number | null = null;
                if (!isAllBranches && ['1', '2', '3', '4'].includes(char)) {
                    judgeableIndex = startIndex + localJudgeCount;
                }
                
                const currentParams = targetChart.barParams[info.originalIndex];
                
                let effectiveBpm = currentParams ? currentParams.bpm : 120;
                if (currentParams && currentParams.bpmChanges) {
                    for (const change of currentParams.bpmChanges) {
                        if (i >= change.index) {
                            effectiveBpm = change.bpm;
                        }
                    }
                }

                let effectiveScroll = currentParams ? currentParams.scroll : 1.0;
                if (currentParams && currentParams.scrollChanges) {
                    for (const change of currentParams.scrollChanges) {
                        if (i >= change.index) {
                            effectiveScroll = change.scroll;
                        }
                    }
                }
                
                return {
                    originalBarIndex: info.originalIndex,
                    charIndex: i,
                    type: char,
                    judgeableNoteIndex: judgeableIndex,
                    bpm: effectiveBpm,
                    scroll: effectiveScroll
                };
            }

            if (['1', '2', '3', '4'].includes(char)) {
                localJudgeCount++;
            }
        }
    }

    return null;
}

export function exportChartImage(chart: ParsedChart, judgements: string[] = [], judgementDeltas: (number | undefined)[] = [], options: ViewOptions, texts: RenderTexts = DEFAULT_TEXTS): string {
    const canvas = document.createElement('canvas');
    const TARGET_WIDTH = 1024;
    
    // We want the final image to be exactly 1024px wide.
    // We force DPR to 1 so that logical width == physical width.
    canvas.width = TARGET_WIDTH;
    
    // renderChart will resize height
    renderChart(chart, canvas, judgements, judgementDeltas, options, texts, 1);
    
    return canvas.toDataURL('image/png');
}

export function getGradientColor(delta: number): string {
    const clamped = Math.max(-100, Math.min(100, delta));
    let r, g, b;

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

export function renderChart(chart: ParsedChart, canvas: HTMLCanvasElement, judgements: string[] = [], judgementDeltas: (number | undefined)[] = [], options: ViewOptions, texts: RenderTexts = DEFAULT_TEXTS, customDpr?: number): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("2D rendering context not found for canvas.");
        return;
    }

    const { bars, loop } = chart;
    
    // Reset width to 100% to allow measuring the container's available width
    canvas.style.width = '100%';
    let logicalCanvasWidth: number = canvas.clientWidth;

    if (logicalCanvasWidth === 0) {
        logicalCanvasWidth = canvas.width || 800;
    }

    // Calculate Header Dimensions
    const availableWidth = logicalCanvasWidth - (PADDING * 2);
    const baseBarWidth: number = availableWidth / (options.beatsPerLine / 4);
    const headerHeight = baseBarWidth * RATIOS.HEADER_HEIGHT;
    const offsetY = PADDING + headerHeight + PADDING; // Padding above and below header

    const globalBarStartIndices = calculateGlobalBarStartIndices(bars);
    const balloonIndices = calculateBalloonIndices(bars);
    const virtualBars = getVirtualBars(chart, options, judgements, globalBarStartIndices);
    
    const { layouts, constants, totalHeight } = calculateLayout(virtualBars, chart, logicalCanvasWidth, options, offsetY);
    
    const inferredHands = calculateInferredHands(bars, options.annotations);

    // Adjust for device pixel ratio for sharp rendering
    let dpr = customDpr !== undefined ? customDpr : (window.devicePixelRatio || 1);
    
    // Safety check for canvas limits
    const MAX_CANVAS_DIMENSION = 32000;

    if (totalHeight * dpr > MAX_CANVAS_DIMENSION) {
        console.warn(`Chart height (${totalHeight * dpr}px) exceeds canvas limit. Reducing DPR to 1.`);
        dpr = 1;
    }

    let finalCanvasHeight = totalHeight * dpr;
    let finalStyleHeight = totalHeight;

    if (finalCanvasHeight > MAX_CANVAS_DIMENSION) {
        console.warn(`Chart height (${finalCanvasHeight}px) still exceeds canvas limit. Clamping height.`);
        finalCanvasHeight = MAX_CANVAS_DIMENSION;
        finalStyleHeight = MAX_CANVAS_DIMENSION / dpr;
    }

    canvas.width = logicalCanvasWidth * dpr;
    canvas.height = finalCanvasHeight;
    
    canvas.style.width = logicalCanvasWidth + 'px';
    canvas.style.height = finalStyleHeight + 'px';
    
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = PALETTE.background;
    ctx.fillRect(0, 0, logicalCanvasWidth, totalHeight);

    // Layer 0: Header
    drawChartHeader(ctx, chart, PADDING, PADDING, availableWidth, headerHeight, texts);

    const isAllBranches = options.showAllBranches && !!chart.branches;
    const BASE_LANE_HEIGHT = constants.BAR_HEIGHT;

    // Layer 1: Backgrounds
    virtualBars.forEach((info, index) => {
        const layout = layouts[index];
        const params = chart.barParams[info.originalIndex];
        const gogoTime = params ? params.gogoTime : false;
        const gogoChanges = params ? params.gogoChanges : undefined;
        const noteCount = info.bar ? info.bar.length : 0;
        const isBranched = params ? params.isBranched : false;
        
        // Detect Branch Start
        let isBranchStart = false;
        if (isBranched) {
             const prevParams = (info.originalIndex > 0) ? chart.barParams[info.originalIndex - 1] : undefined;
             if (!prevParams || !prevParams.isBranched) {
                 isBranchStart = true;
             }
        }
        
        if (isAllBranches && chart.branches) {
             if (isBranched) {
                 // For branched bar, layout.height should already be 3 * BASE_LANE_HEIGHT (from calculateLayout)
                 // We split this into 3 stacked lanes.
                 const subHeight = BASE_LANE_HEIGHT; 
                 
                 // Draw 3 lanes
                 drawBarBackground(ctx, layout.x, layout.y, layout.width, subHeight, constants.LW_BAR, constants.LW_CENTER, true, 'normal');
                 drawBarBackground(ctx, layout.x, layout.y + subHeight, layout.width, subHeight, constants.LW_BAR, constants.LW_CENTER, true, 'expert');
                 drawBarBackground(ctx, layout.x, layout.y + 2*subHeight, layout.width, subHeight, constants.LW_BAR, constants.LW_CENTER, true, 'master');

                 // Yellow Branch Start Line
                 if (isBranchStart) {
                     ctx.beginPath();
                     ctx.strokeStyle = PALETTE.branches.startLine;
                     ctx.lineWidth = constants.LW_BAR;
                     // Draw line covering full height (3 lanes)
                     ctx.moveTo(layout.x, layout.y);
                     ctx.lineTo(layout.x, layout.y + layout.height);
                     ctx.stroke();
                 }
             } else {
                 // Unbranched (Common) Bar
                 // layout.height should be H (single lane)
                 drawBarBackground(ctx, layout.x, layout.y, layout.width, layout.height, constants.LW_BAR, constants.LW_CENTER, false, 'normal');
             }

             // Common Elements for All Branches Mode (Gogo, Labels, Loop)
             // Place above the top lane (or the single lane)
             
             // Draw Gogo Indicator
             if (gogoTime || (gogoChanges && gogoChanges.length > 0)) {
                const stripHeight = constants.BAR_NUMBER_FONT_SIZE + constants.BAR_NUMBER_OFFSET_Y * 2;
                const stripY = layout.y - stripHeight - (constants.LW_BAR / 2);
                drawGogoIndicator(ctx, layout.x, stripY, stripHeight, layout.width, gogoTime, gogoChanges, noteCount);
             }

             // Draw Bar Labels
             if (!options.isAnnotationMode) {
                // If branched, labels should align with top lane (Normal) height which is BASE_LANE_HEIGHT.
                // If unbranched, height is BASE_LANE_HEIGHT.
                // So always pass BASE_LANE_HEIGHT as height for label drawing context.
                drawBarLabels(ctx, info.originalIndex, layout.x, layout.y, layout.width, BASE_LANE_HEIGHT, constants.BAR_NUMBER_FONT_SIZE, constants.STATUS_FONT_SIZE, constants.BAR_NUMBER_OFFSET_Y, params, noteCount, info.originalIndex === 0, constants.LW_BAR, isBranchStart);
             }

             // Draw Loop Indicator
            if (info.isLoopStart && loop) {
                ctx.fillStyle = PALETTE.text.primary;
                ctx.font = `bold ${constants.BAR_NUMBER_FONT_SIZE}px sans-serif`;
                ctx.textAlign = 'right';
                const text = texts.loopPattern.replace('{n}', loop.iterations.toString());
                ctx.fillText(text, layout.x + layout.width, layout.y - constants.BAR_NUMBER_OFFSET_Y);
            }

        } else {
            // Standard View
            drawBarBackground(ctx, layout.x, layout.y, layout.width, layout.height, constants.LW_BAR, constants.LW_CENTER, isBranched, chart.branchType);
            
            // Yellow Branch Start Line (Standard View)
            if (isBranchStart) {
                 ctx.beginPath();
                 ctx.strokeStyle = PALETTE.branches.startLine;
                 ctx.lineWidth = constants.LW_BAR;
                 ctx.moveTo(layout.x, layout.y);
                 ctx.lineTo(layout.x, layout.y + layout.height);
                 ctx.stroke();
            }

            // Draw Gogo Indicator
            if (gogoTime || (gogoChanges && gogoChanges.length > 0)) {
                const stripHeight = constants.BAR_NUMBER_FONT_SIZE + constants.BAR_NUMBER_OFFSET_Y * 2;
                const stripY = layout.y - stripHeight - (constants.LW_BAR / 2);
                drawGogoIndicator(ctx, layout.x, stripY, stripHeight, layout.width, gogoTime, gogoChanges, noteCount);
            }

            // Draw Bar Labels (Number, BPM, HS)
            if (!options.isAnnotationMode) {
                drawBarLabels(ctx, info.originalIndex, layout.x, layout.y, layout.width, layout.height, constants.BAR_NUMBER_FONT_SIZE, constants.STATUS_FONT_SIZE, constants.BAR_NUMBER_OFFSET_Y, params, noteCount, info.originalIndex === 0, constants.LW_BAR, isBranchStart);
            }

            // Draw Loop Indicator
            if (info.isLoopStart && loop) {
                ctx.fillStyle = PALETTE.text.primary;
                ctx.font = `bold ${constants.BAR_NUMBER_FONT_SIZE}px sans-serif`;
                ctx.textAlign = 'right';
                const text = texts.loopPattern.replace('{n}', loop.iterations.toString());
                ctx.fillText(text, layout.x + layout.width, layout.y - constants.BAR_NUMBER_OFFSET_Y);
            }
        }
    });

    // Layer 1.5 & 2: Notes
    if (isAllBranches && chart.branches) {
        const branches = [
            { type: 'normal', data: chart.branches.normal || chart, yOffset: 0 },
            { type: 'expert', data: chart.branches.expert || chart, yOffset: BASE_LANE_HEIGHT },
            { type: 'master', data: chart.branches.master || chart, yOffset: BASE_LANE_HEIGHT * 2 }
        ];

        branches.forEach(b => {
             // Create virtualBars for this branch
             const branchVirtualBars = virtualBars.map(vb => ({
                 ...vb,
                 bar: b.data.bars[vb.originalIndex]
             }));

             // Dynamically calculate layouts for this branch
             const branchLayouts = layouts.map((l, idx) => {
                 const params = chart.barParams[virtualBars[idx].originalIndex];
                 const isBranched = params ? params.isBranched : false;
                 
                 if (isBranched) {
                     // Branched: Use split height and offset
                     return {
                         ...l,
                         y: l.y + b.yOffset,
                         height: BASE_LANE_HEIGHT
                     };
                 } else {
                     // Unbranched: Use full height, no offset (Centered)
                     // Note: Unbranched bar height is BASE_LANE_HEIGHT. No offset needed.
                     return {
                         ...l,
                         y: l.y,
                         height: BASE_LANE_HEIGHT
                     };
                 }
             });

             drawLongNotes(ctx, branchVirtualBars, branchLayouts, constants, options.viewMode, b.data.balloonCounts, calculateBalloonIndices(b.data.bars));

             for (let index = branchVirtualBars.length - 1; index >= 0; index--) {
                const info = branchVirtualBars[index];
                const layout = branchLayouts[index];
                
                const drawOptions = { ...options, annotations: {}, selection: null };
                
                drawBarNotes(ctx, info.bar, layout.x, layout.y, layout.width, layout.height, constants.NOTE_RADIUS_SMALL, constants.NOTE_RADIUS_BIG, constants.LW_NOTE_OUTER, constants.LW_NOTE_INNER, constants.LW_UNDERLINE_BORDER, drawOptions, 0, [], [], texts, info.originalIndex, b.data.bars, undefined, undefined);
             }
        });

    } else {
        // Layer 1.5: Drumrolls and Balloons
        drawLongNotes(ctx, virtualBars, layouts, constants, options.viewMode, chart.balloonCounts, balloonIndices);

        // Layer 2: Notes
        for (let index = virtualBars.length - 1; index >= 0; index--) {
            const info = virtualBars[index];
            const layout = layouts[index];

            const startIndex = info.overrideStartIndex !== undefined 
                ? info.overrideStartIndex 
                : globalBarStartIndices[info.originalIndex];

            drawBarNotes(ctx, info.bar, layout.x, layout.y, layout.width, layout.height, constants.NOTE_RADIUS_SMALL, constants.NOTE_RADIUS_BIG, constants.LW_NOTE_OUTER, constants.LW_NOTE_INNER, constants.LW_UNDERLINE_BORDER, options, startIndex, judgements, judgementDeltas, texts, info.originalIndex, bars, options.collapsedLoop ? loop : undefined, inferredHands);
        }
    }
}

function drawChartHeader(ctx: CanvasRenderingContext2D, chart: ParsedChart, x: number, y: number, width: number, height: number, texts: RenderTexts): void {
    const title = chart.title || 'Untitled';
    const subtitle = chart.subtitle || '';
    const startBpm = chart.bpm || 120;
    const level = chart.level || 0;
    const course = chart.course || 'Oni';

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

    const bpmText = (minBpm === maxBpm) ? `BPM: ${minBpm}` : `BPM: ${minBpm}-${maxBpm}`;

    const titleFontSize = height * 0.4;
    const subtitleFontSize = height * 0.25;
    const metaFontSize = height * 0.25;

    ctx.save();
    
    // Draw Title
    ctx.fillStyle = PALETTE.text.primary;
    ctx.font = `bold ${titleFontSize}px sans-serif`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(title, x, y);

    // Draw Subtitle (below title)
    if (subtitle) {
        ctx.font = `${subtitleFontSize}px sans-serif`;
        ctx.fillStyle = PALETTE.text.secondary;
        ctx.fillText(subtitle, x, y + titleFontSize + 5);
    }

    // Draw Metadata (Right aligned)
    const metaY = y;
    ctx.textAlign = 'right';
    
    // Course & Level
    const courseKey = course.toLowerCase();
    let courseName = course.charAt(0).toUpperCase() + course.slice(1);
    
    if (texts.course && texts.course[courseKey]) {
        courseName = texts.course[courseKey];
    }
    
    let courseText = courseName;
    if (level > 0) {
        courseText += ` ★${level}`;
    }
    
    // Determine course color
    let courseColor = PALETTE.text.primary;
    const c = course.toLowerCase();
    
    if (c.includes('edit') || c.includes('ura')) {
        courseColor = PALETTE.courses.edit; // Purple
    } else if (c.includes('oni')) {
        courseColor = PALETTE.courses.oni; // Pink (Unchanged)
    } else if (c.includes('hard')) {
        courseColor = PALETTE.courses.hard; // Dark Grey
    } else if (c.includes('normal')) {
        courseColor = PALETTE.courses.normal; // Green
    } else if (c.includes('easy')) {
        courseColor = PALETTE.courses.easy; // Orange
    }

    ctx.fillStyle = courseColor;
    ctx.font = `bold ${metaFontSize}px sans-serif`;
    ctx.fillText(courseText, x + width, metaY);

    // BPM
    ctx.fillStyle = PALETTE.text.primary;
    ctx.font = `${metaFontSize}px sans-serif`;
    ctx.fillText(bpmText, x + width, metaY + metaFontSize + 5);

    ctx.restore();
}

function drawBarBackground(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, borderW: number, centerW: number, isBranched: boolean, branchType: string = 'normal'): void {
    const centerY: number = y + height / 2;
    
    let fillColor = PALETTE.branches.default;
    if (isBranched) {
        if (branchType === 'normal') fillColor = PALETTE.branches.normal; // Normal
        if (branchType === 'expert') fillColor = PALETTE.branches.expert; // Professional
        else if (branchType === 'master') fillColor = PALETTE.branches.master; // Master
    }
    
    // 1. Fill Background
    ctx.fillStyle = fillColor;
    ctx.fillRect(x, y, width, height);
    
    // Draw Bar Border (Horizontal)
    ctx.strokeStyle = PALETTE.ui.barBorder;
    ctx.lineWidth = borderW;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.moveTo(x, y + height);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();

    // Draw Bar Border (Vertical)
    ctx.strokeStyle = PALETTE.ui.barVerticalLine;
    ctx.lineWidth = borderW;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y + height);
    ctx.moveTo(x + width, y);
    ctx.lineTo(x + width, y + height);
    ctx.stroke();

    // Draw Center Line
    ctx.strokeStyle = PALETTE.ui.centerLine;
    ctx.lineWidth = centerW;
    ctx.beginPath();
    ctx.moveTo(x, centerY);
    ctx.lineTo(x + width, centerY);
    ctx.stroke();
}

function calculateBalloonIndices(bars: string[][]): Map<string, number> {
    const map = new Map<string, number>();
    let balloonCount = 0;
    
    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (!bar) continue;
        for (let j = 0; j < bar.length; j++) {
            if (bar[j] === '7' || bar[j] === '9') {
                map.set(`${i}_${j}`, balloonCount);
                balloonCount++;
            }
        }
    }
    return map;
}

function drawLongNotes(ctx: CanvasRenderingContext2D, virtualBars: RenderBarInfo[], layouts: BarLayout[], constants: any, viewMode: 'original' | 'judgements' | 'judgements-underline' | 'judgements-text', balloonCounts: number[], balloonIndices: Map<string, number>): void {
    const { NOTE_RADIUS_SMALL: rSmall, NOTE_RADIUS_BIG: rBig, LW_NOTE_OUTER: borderOuterW, LW_NOTE_INNER: borderInnerW } = constants;
    
    let currentLongNote: { type: string, startBarIdx: number, startNoteIdx: number, originalBarIdx: number, originalNoteIdx: number } | null = null;
    
    // Iterate all bars
    for (let i = 0; i < virtualBars.length; i++) {
        const bar = virtualBars[i].bar;
        if (!bar) continue;
        const layout = layouts[i];
        const originalBarIdx = virtualBars[i].originalIndex;
        
        const noteCount = bar.length;
        if (noteCount === 0 && !currentLongNote) continue;
        const noteStep = noteCount > 0 ? layout.width / noteCount : 0;
        
        const barX = layout.x;
        const centerY = layout.y + layout.height / 2;
        
        // Track the starting index of the segment in THIS bar
        let segmentStartIdx = 0;
        let segmentActive = !!currentLongNote;
        
        for (let j = 0; j < noteCount; j++) {
            const char = bar[j];
            
            if (char === '5' || char === '6' || char === '7' || char === '9') {
                // Start a new long note
                currentLongNote = { type: char, startBarIdx: i, startNoteIdx: j, originalBarIdx, originalNoteIdx: j };
                segmentActive = true;
                segmentStartIdx = j;
            } else if (char === '8') {
                if (currentLongNote) {
                    // End the long note
                    const radius = (currentLongNote.type === '6' || currentLongNote.type === '9') ? rBig : rSmall;
                    const startX = barX + (segmentStartIdx * noteStep);
                    const endX = barX + (j * noteStep);
                    
                    const hasStartCap = (segmentStartIdx === currentLongNote.startNoteIdx && i === currentLongNote.startBarIdx);
                    const hasEndCap = true;
                    
                    if (currentLongNote.type === '7' || currentLongNote.type === '9') {
                        // Balloon
                        const balloonIdx = balloonIndices.get(`${currentLongNote.originalBarIdx}_${currentLongNote.originalNoteIdx}`);
                        const count = balloonIdx !== undefined && balloonCounts[balloonIdx] !== undefined ? balloonCounts[balloonIdx] : 5;
                        drawBalloonSegment(ctx, startX, endX, centerY, radius, hasStartCap, hasEndCap, borderOuterW, borderInnerW, viewMode, count, currentLongNote.type === '9');
                    } else {
                        // Drumroll
                        drawDrumrollSegment(ctx, startX, endX, centerY, radius, hasStartCap, hasEndCap, borderOuterW, borderInnerW, viewMode, currentLongNote.type);
                    }
                    
                    currentLongNote = null;
                    segmentActive = false;
                }
            }
        }
        
        // If still active at end of bar, draw segment to end
        if (segmentActive && currentLongNote) {
            const radius = (currentLongNote.type === '6' || currentLongNote.type === '9') ? rBig : rSmall;
            const startX = barX + (segmentStartIdx * noteStep);
            const endX = barX + layout.width; // Visual end of bar
            
            const hasStartCap = (segmentStartIdx === currentLongNote.startNoteIdx && i === currentLongNote.startBarIdx);
            const hasEndCap = false; // Continuation
            
            if (currentLongNote.type === '7' || currentLongNote.type === '9') {
                const balloonIdx = balloonIndices.get(`${currentLongNote.originalBarIdx}_${currentLongNote.originalNoteIdx}`);
                const count = balloonIdx !== undefined && balloonCounts[balloonIdx] !== undefined ? balloonCounts[balloonIdx] : 5;
                drawBalloonSegment(ctx, startX, endX, centerY, radius, hasStartCap, hasEndCap, borderOuterW, borderInnerW, viewMode, count, currentLongNote.type === '9');
            } else {
                drawDrumrollSegment(ctx, startX, endX, centerY, radius, hasStartCap, hasEndCap, borderOuterW, borderInnerW, viewMode, currentLongNote.type);
            }
        }
    }
}

function drawDrumrollSegment(ctx: CanvasRenderingContext2D, startX: number, endX: number, centerY: number, radius: number, startCap: boolean, endCap: boolean, borderOuterW: number, borderInnerW: number, viewMode: 'original' | 'judgements' | 'judgements-underline' | 'judgements-text', type: string): void {
    let fillColor = PALETTE.notes.drumroll;
    let innerBorderColor = PALETTE.notes.border.white;

    if (viewMode === 'judgements') {
        fillColor = PALETTE.notes.unjudged;
        innerBorderColor = PALETTE.notes.border.grey;
    }

    drawCapsule(ctx, startX, endX, centerY, radius, startCap, endCap, borderOuterW, borderInnerW, fillColor, innerBorderColor);
}

function drawBalloonSegment(ctx: CanvasRenderingContext2D, startX: number, endX: number, centerY: number, radius: number, startCap: boolean, endCap: boolean, borderOuterW: number, borderInnerW: number, viewMode: 'original' | 'judgements' | 'judgements-underline' | 'judgements-text', count: number, isKusudama: boolean): void {
    let fillColor = PALETTE.notes.balloon; // Orangeish for balloon body
    let innerBorderColor = PALETTE.notes.border.white;

    if (viewMode === 'judgements') {
        fillColor = PALETTE.notes.unjudged;
        innerBorderColor = PALETTE.notes.border.grey;
    }

    // Draw the tail (body)
    // The tail usually starts a bit after the head, but for simplicity we draw it as a capsule behind the head.
    // However, if we draw it as a capsule, the head will be drawn on top of it.
    // If startCap is true, we are drawing the head segment.
    
    drawCapsule(ctx, startX, endX, centerY, radius * 0.8, startCap, endCap, borderOuterW, borderInnerW, fillColor, innerBorderColor);

    // If this is the start segment, draw the balloon head
    if (startCap) {
        let headColor = PALETTE.notes.balloon; // Orange
        if (isKusudama) headColor = PALETTE.notes.kusudama; // Gold
        
        if (viewMode === 'judgements') {
            headColor = PALETTE.notes.unjudged;
        }

        // Draw Head
        ctx.beginPath();
        ctx.arc(startX, centerY, radius, 0, Math.PI * 2);
        
        ctx.lineWidth = borderOuterW;
        ctx.strokeStyle = PALETTE.notes.border.black;
        ctx.stroke();

        ctx.fillStyle = headColor;
        ctx.fill();

        ctx.lineWidth = borderInnerW;
        ctx.strokeStyle = innerBorderColor;
        ctx.stroke();

        // Draw Count
        if (viewMode !== 'judgements') {
            ctx.fillStyle = PALETTE.text.inverted;
            ctx.font = `bold ${radius * 1.5}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(count.toString(), startX, centerY - (radius * 0.2));
        }
    }
}

function drawCapsule(ctx: CanvasRenderingContext2D, startX: number, endX: number, centerY: number, radius: number, startCap: boolean, endCap: boolean, borderOuterW: number, borderInnerW: number, fillColor: string, innerBorderColor: string): void {
    // 1. Outer Border (Open Path if no caps to avoid vertical lines)
    ctx.beginPath();

    // Top Edge Part
    if (startCap) {
        // From Left-Middle to Top-Left
        ctx.arc(startX, centerY, radius, Math.PI, Math.PI * 1.5, false);
    } else {
        ctx.moveTo(startX, centerY - radius);
    }
    
    ctx.lineTo(endX, centerY - radius);
    
    if (endCap) {
        // From Top-Right to Bottom-Right
        ctx.arc(endX, centerY, radius, Math.PI * 1.5, Math.PI * 2.5, false);
    } else {
        ctx.moveTo(endX, centerY + radius);
    }

    // Bottom Edge Part
    ctx.lineTo(startX, centerY + radius);
    
    if (startCap) {
        // From Bottom-Left to Left-Middle
        ctx.arc(startX, centerY, radius, Math.PI * 0.5, Math.PI, false);
    }

    ctx.strokeStyle = PALETTE.notes.border.black;
    ctx.lineWidth = borderOuterW;
    ctx.stroke();

    // 2. Fill (Closed Path)
    ctx.beginPath();
    ctx.moveTo(startX, centerY + radius);
    
    // Left Edge
    if (startCap) {
        ctx.arc(startX, centerY, radius, Math.PI / 2, Math.PI * 1.5, false);
    } else {
        ctx.lineTo(startX, centerY - radius);
    }
    
    // Top Edge
    ctx.lineTo(endX, centerY - radius);
    
    // Right Edge
    if (endCap) {
        ctx.arc(endX, centerY, radius, Math.PI * 1.5, Math.PI * 2.5, false);
    } else {
        ctx.lineTo(endX, centerY + radius);
    }
    
    // Bottom Edge
    ctx.lineTo(startX, centerY + radius);
    ctx.closePath();

    ctx.fillStyle = fillColor;
    ctx.fill();

    // 3. Inner Border
    ctx.beginPath();
    
    // 1. Trace Top: Left -> Right
    if (startCap) {
        ctx.arc(startX, centerY, radius, Math.PI, Math.PI * 1.5, false);
    } else {
        ctx.moveTo(startX, centerY - radius);
    }
    
    ctx.lineTo(endX, centerY - radius);
    
    if (endCap) {
        ctx.arc(endX, centerY, radius, Math.PI * 1.5, Math.PI * 2.5, false);
    } else {
        ctx.moveTo(endX, centerY + radius);
    }
    
    // 2. Trace Bottom: Right -> Left
    ctx.lineTo(startX, centerY + radius);
    
    if (startCap) {
        ctx.arc(startX, centerY, radius, Math.PI * 0.5, Math.PI, false);
    }
    
    ctx.strokeStyle = innerBorderColor;
    ctx.lineWidth = borderInnerW;
    ctx.stroke();
}


function drawBarNotes(ctx: CanvasRenderingContext2D, bar: string[], x: number, y: number, width: number, height: number, rSmall: number, rBig: number, borderOuterW: number, borderInnerW: number, borderUnderlineW: number, options: ViewOptions, startIndex: number, judgements: string[], judgementDeltas: (number | undefined)[] = [], texts: RenderTexts, originalBarIndex: number = -1, bars: string[][] = [], loopInfo?: LoopInfo, inferredHands?: Map<string, string>): void {
    const { viewMode, coloringMode, visibility: judgementVisibility, selection } = options;
    
    const centerY: number = y + height / 2;
    const noteCount: number = bar.length;
    if (noteCount === 0) return;

    const noteStep: number = width / noteCount;

    // Map local note indices to global judgeable indices
    const judgeableIndicesInBar: (number | null)[] = new Array(noteCount).fill(null);
    let localCount = 0;
    for(let k = 0; k < noteCount; k++) {
        if (['1', '2', '3', '4'].includes(bar[k])) {
            judgeableIndicesInBar[k] = startIndex + localCount;
            localCount++;
        }
    }

    // Pre-calculate colors for judgeable notes if needed
    const noteColors: (string | null)[] = new Array(noteCount).fill(null);
    
    if (viewMode === 'judgements' || viewMode === 'judgements-underline' || viewMode === 'judgements-text') {
        for(let i = 0; i < noteCount; i++) {
            const globalIndex = judgeableIndicesInBar[i];
            if (globalIndex === null) continue;

            if (coloringMode === 'gradient') {
                 // Gradient Logic (with Loop Averaging)
                 let effectiveDelta: number | undefined;
                 let isValidJudge = false;
                 let isJudgedButMiss = false; // "None of perfect, good or poor"

                 if (loopInfo && originalBarIndex >= loopInfo.startBarIndex && originalBarIndex < loopInfo.startBarIndex + loopInfo.period) {
                      // Collapsed Loop
                      let preLoopNotes = 0;
                      for(let b=0; b<loopInfo.startBarIndex; b++) {
                           const bBar = bars[b];
                           if(bBar) for(const c of bBar) if(['1','2','3','4'].includes(c)) preLoopNotes++;
                      }
                      let notesPerLoop = 0;
                      for(let k=0; k<loopInfo.period; k++) {
                           const bBar = bars[loopInfo.startBarIndex+k];
                           if(bBar) for(const c of bBar) if(['1','2','3','4'].includes(c)) notesPerLoop++;
                      }

                      if (globalIndex >= preLoopNotes && notesPerLoop > 0) {
                           const offsetFromLoopStart = globalIndex - preLoopNotes;
                           const noteIndexInLoop = offsetFromLoopStart % notesPerLoop;
                           
                           let sum = 0;
                           let count = 0;
                           let judgedCount = 0;

                           for(let iter=0; iter<loopInfo.iterations; iter++) {
                                const gIdx = preLoopNotes + noteIndexInLoop + (iter * notesPerLoop);
                                if (gIdx < judgements.length) {
                                     const j = judgements[gIdx];
                                     
                                     // Check visibility
                                     if (j === 'Perfect' && !judgementVisibility.perfect) continue;
                                     if (j === 'Good' && !judgementVisibility.good) continue;
                                     if (j === 'Poor' && !judgementVisibility.poor) continue;

                                     judgedCount++;
                                     if (j === 'Perfect' || j === 'Good' || j === 'Poor') {
                                          const d = judgementDeltas[gIdx];
                                          if (d !== undefined) {
                                               sum += d;
                                               count++;
                                          }
                                     }
                                }
                           }

                           if (count > 0) {
                                effectiveDelta = sum / count;
                                isValidJudge = true;
                           } else if (judgedCount > 0) {
                                // Judged but no valid delta (e.g. all Misses or filtered out?)
                                // If filtered out, judgedCount wouldn't increment.
                                isJudgedButMiss = true;
                           }
                      }
                 } else {
                      // Standard
                      if (globalIndex < judgements.length) {
                           const j = judgements[globalIndex];
                           
                           // Check visibility
                           let isVisible = true;
                           if (j === 'Perfect' && !judgementVisibility.perfect) isVisible = false;
                           else if (j === 'Good' && !judgementVisibility.good) isVisible = false;
                           else if (j === 'Poor' && !judgementVisibility.poor) isVisible = false;

                           if (isVisible) {
                               if (j === 'Perfect' || j === 'Good' || j === 'Poor') {
                                    effectiveDelta = judgementDeltas[globalIndex];
                                    if (effectiveDelta !== undefined) isValidJudge = true;
                               } else {
                                    isJudgedButMiss = true;
                               }
                           }
                      }
                 }

                 if (isValidJudge && effectiveDelta !== undefined) {
                      noteColors[i] = getGradientColor(effectiveDelta);
                 } else if (isJudgedButMiss) {
                      noteColors[i] = PALETTE.judgements.miss; // Dark Grey
                 }
                 // Else null (Unjudged)

            } else {
                // Categorical Logic
                if (globalIndex < judgements.length) {
                    const judge = judgements[globalIndex];
                    if (judge === 'Perfect' && judgementVisibility.perfect) noteColors[i] = PALETTE.judgements.perfect;
                    else if (judge === 'Good' && judgementVisibility.good) noteColors[i] = PALETTE.judgements.good;
                    else if (judge === 'Poor' && judgementVisibility.poor) noteColors[i] = PALETTE.judgements.poor;
                    // Miss is null
                }
            }
        }
    }

    // Phase 1: Draw Underlines (Judgements Underline Mode only)
    if (viewMode === 'judgements-underline') {
        const barBottom = y + height;
        const lineY = barBottom + (height * 0.1); // Slightly below bar
        const lineWidth = height * 0.15; // Visible thickness
        
        // Pass 1.1: Draw Black Borders (Backwards iteration)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = PALETTE.ui.barBorder;
        ctx.lineWidth = lineWidth + (borderUnderlineW * 2);
        
        for (let i = noteCount - 1; i >= 0; i--) {
            const noteChar = bar[i];
            // Only for judgeable notes
            if (!['1', '2', '3', '4'].includes(noteChar)) continue;
            
            // Only draw if we have a valid color
            if (noteColors[i]) {
                const noteX: number = x + (i * noteStep);
                let radius = (['3', '4'].includes(noteChar)) ? rBig : rSmall;

                ctx.beginPath();
                ctx.moveTo(noteX - radius, lineY);
                ctx.lineTo(noteX + radius, lineY);
                ctx.stroke();
            }
        }
        ctx.restore();

        // Pass 1.2: Draw Colored Lines (Backwards iteration)
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineWidth = lineWidth;

        for (let i = noteCount - 1; i >= 0; i--) {
            const noteChar = bar[i];
            if (!['1', '2', '3', '4'].includes(noteChar)) continue;

            const color = noteColors[i];
            if (color) {
                const noteX: number = x + (i * noteStep);
                let radius = (['3', '4'].includes(noteChar)) ? rBig : rSmall;

                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(noteX - radius, lineY);
                ctx.lineTo(noteX + radius, lineY);
                ctx.stroke();
            }
        }
        ctx.restore();
    }
    
    // Phase 1.5: Draw Text (Judgements Text Mode only)
    if (viewMode === 'judgements-text') {
        ctx.save();
        ctx.font = `bold ${rBig * 1.2}px sans-serif`; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.lineWidth = height * 0.05; // Border width for text
        ctx.strokeStyle = PALETTE.judgements.textBorder;

        for (let i = 0; i < noteCount; i++) {
            const noteChar = bar[i];
            if (!['1', '2', '3', '4'].includes(noteChar)) continue;
            
            const color = noteColors[i];
            // We need to look up the judgement text. 
            // noteColors might be gradient, but text content depends on class.
            // We can look up judgement class again using globalIndex.
            const globalIndex = judgeableIndicesInBar[i];
            
            if (color && globalIndex !== null && globalIndex < judgements.length) {
                const judge = judgements[globalIndex];
                let text = '';
                if (judge === 'Perfect') text = texts.judgement.perfect;
                else if (judge === 'Good') text = texts.judgement.good;
                else if (judge === 'Poor') text = texts.judgement.poor;

                if (text) {
                     const noteX: number = x + (i * noteStep);
                     const noteTopY = centerY - (['3', '4'].includes(noteChar) ? rBig : rSmall);
                     // Slightly above note
                     const textY = noteTopY;

                     ctx.strokeText(text, noteX, textY);
                     ctx.fillStyle = color;
                     ctx.fillText(text, noteX, textY);
                }
            }
        }
        ctx.restore();
    }

    // Phase 2: Draw Note Heads
    for (let i = noteCount - 1; i >= 0; i--) {
        const noteChar = bar[i];
        const noteX: number = x + (i * noteStep); 
        
        let color: string | null = null;
        let radius: number = 0;
        let isBig: boolean = false;

        switch (noteChar) {
            case '1': // Don (Red Small)
                color = PALETTE.notes.don;
                radius = rSmall;
                break;
            case '2': // Ka (Blue Small)
                color = PALETTE.notes.ka;
                radius = rSmall;
                break;
            case '3': // Don (Red Big)
                color = PALETTE.notes.don;
                radius = rBig;
                isBig = true;
                break;
            case '4': // Ka (Blue Big)
                color = PALETTE.notes.ka;
                radius = rBig;
                isBig = true;
                break;
        }

        if (color) {
            let borderColor = PALETTE.notes.border.white; // Default white border

            if (viewMode === 'judgements') {
                color = PALETTE.notes.unjudged; // Default unjudged fill color (Grey)
                borderColor = PALETTE.notes.border.grey; // Default unjudged border color (Grey)
                
                const assignedColor = noteColors[i];
                if (assignedColor) {
                    color = assignedColor;
                    borderColor = PALETTE.notes.border.white; // Revert to standard white border for judged notes
                }
            }
            
            // Note: In judgements-underline mode, we keep original colors (Red/Blue) and white border
            // The underline is drawn in Phase 1.

            ctx.beginPath();
            ctx.arc(noteX, centerY, radius, 0, Math.PI * 2);

            // Black border (outside)
            let effectiveBorderOuterW = borderOuterW;
            if (isNoteSelected(originalBarIndex, i, selection)) {
                effectiveBorderOuterW = borderOuterW * 2.5; // Wider border for selected note
            }

            ctx.lineWidth = effectiveBorderOuterW;
            ctx.strokeStyle = PALETTE.notes.border.black;
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.fill();
            
            ctx.lineWidth = borderInnerW;
            ctx.strokeStyle = borderColor; // Dynamic border
            ctx.stroke();

            // Annotation Rendering
            if (options.annotations && ['1', '2', '3', '4'].includes(noteChar)) {
                const noteId = `${originalBarIndex}_${i}`;
                const annotation = options.annotations[noteId];
                if (annotation) {
                    let textColor = PALETTE.ui.annotation.match;
                    if (inferredHands) {
                        const inferred = inferredHands.get(noteId);
                        if (inferred && inferred !== annotation) {
                            textColor = PALETTE.ui.annotation.mismatch; // Red if mismatch
                        }
                    }

                    ctx.save();
                    // Larger size
                    ctx.font = `bold ${rBig * 1.5}px sans-serif`;
                    ctx.fillStyle = textColor;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    
                    // Position at the top of the bar, similar to bar numbers
                    const textY = y;

                    ctx.fillText(annotation, noteX, textY);
                    ctx.restore();
                }
            }
        }
    }
}

function drawBarLabels(ctx: CanvasRenderingContext2D, originalBarIndex: number, x: number, y: number, width: number, height: number, numFontSize: number, statusFontSize: number, offsetY: number, params: BarParams | undefined, noteCount: number, isFirstBar: boolean, barBorderWidth: number, isBranchStart: boolean = false): void {
    ctx.save();
    
    const lineHeight = statusFontSize; 
    // Stack: BarNum (0), BPM (1), HS (2)
    // Baseline of HS is: y - offsetY - 2 * lineHeight
    // Top of HS is approx: y - offsetY - 3 * lineHeight
    const topY = y - offsetY - 3 * lineHeight;
    
    // Draw Bar Line Extensions (Left and Right)
    ctx.lineWidth = barBorderWidth;

    // Left Extension
    ctx.beginPath();
    ctx.strokeStyle = isBranchStart ? PALETTE.branches.startLine : PALETTE.ui.barVerticalLine;
    ctx.moveTo(x, y);
    ctx.lineTo(x, topY);
    ctx.stroke();

    // Right Extension
    ctx.beginPath();
    ctx.strokeStyle = PALETTE.ui.barVerticalLine;
    ctx.moveTo(x + width, y);
    ctx.lineTo(x + width, topY);
    ctx.stroke();

    // Text Padding
    const textPadding = statusFontSize * 0.2;

    // 1. Draw Bar Number
    ctx.font = `bold ${numFontSize}px 'Consolas', 'Monaco', 'Lucida Console', monospace`;
    ctx.fillStyle = PALETTE.text.label;
    ctx.textAlign = 'left'; 
    ctx.textBaseline = 'bottom';
    
    const barNumY = y - offsetY;
    ctx.fillText((originalBarIndex + 1).toString(), x + textPadding, barNumY);

    if (!params) {
        ctx.restore();
        return;
    }

    // 2. Prepare Labels
    interface Label { type: 'BPM'|'HS'; val: number; index: number; }
    const labels: Label[] = [];

    if (isFirstBar) {
        labels.push({ type: 'BPM', val: params.bpm, index: 0 });
        if (params.scroll !== 1.0) {
            labels.push({ type: 'HS', val: params.scroll, index: 0 });
        }
    }

    if (params.bpmChanges) {
        for (const c of params.bpmChanges) {
            const exists = labels.some(l => l.type === 'BPM' && l.index === c.index);
            if (!exists) labels.push({ type: 'BPM', val: c.bpm, index: c.index });
        }
    }

    if (params.scrollChanges) {
        for (const c of params.scrollChanges) {
            const exists = labels.some(l => l.type === 'HS' && l.index === c.index);
            if (!exists) labels.push({ type: 'HS', val: c.scroll, index: c.index });
        }
    }

    if (labels.length === 0) {
        ctx.restore();
        return;
    }

    const bpmY = barNumY - lineHeight; 
    const hsY = bpmY - lineHeight;     

    ctx.font = `bold ${statusFontSize}px 'Consolas', 'Monaco', 'Lucida Console', monospace`;

    // Process Mid-Bar Lines (Dark Grey)
    // Collect unique indices > 0
    const changeIndices = new Set<number>();
    labels.forEach(l => {
        if (l.index > 0) changeIndices.add(l.index);
    });

    if (changeIndices.size > 0 && noteCount > 0) {
        ctx.beginPath();
        ctx.strokeStyle = PALETTE.status.line; // Dark Grey
        ctx.lineWidth = barBorderWidth * 0.8; // Slightly thinner

        changeIndices.forEach(idx => {
            const lineX = x + (idx / noteCount) * width;
            ctx.moveTo(lineX, y + height); // From bottom of bar
            ctx.lineTo(lineX, topY);      // To top of labels
        });
        ctx.stroke();
    }

    // Render Text
    for (const label of labels) {
        let labelX = x;
        if (noteCount > 0) {
             labelX = x + (label.index / noteCount) * width;
        }
        
        // Shift text
        const drawX = labelX + textPadding;

        if (label.type === 'BPM') {
            ctx.fillStyle = PALETTE.status.bpm;
            ctx.fillText(`BPM ${label.val}`, drawX, bpmY);
        } else if (label.type === 'HS') {
            ctx.fillStyle = PALETTE.status.hs;
            ctx.fillText(`HS ${label.val}`, drawX, hsY);
        }
    }

    ctx.restore();
}

function drawGogoIndicator(ctx: CanvasRenderingContext2D, x: number, y: number, height: number, width: number, gogoTime: boolean, gogoChanges: GogoChange[] | undefined, noteCount: number): void {
    const GOGO_COLOR = PALETTE.gogo;

    if (!gogoChanges || gogoChanges.length === 0 || noteCount === 0) {
        // Simple Case
        if (gogoTime) {
            ctx.fillStyle = GOGO_COLOR;
            ctx.fillRect(x, y, width, height);
        }
    } else {
        // Split Logic
        let currentX = x;
        let isGogo = gogoTime;

        // Sort changes by index just in case
        const sortedChanges = [...gogoChanges].sort((a, b) => a.index - b.index);

        for (const change of sortedChanges) {
            const nextX = x + (change.index / noteCount) * width;
            
            if (nextX > currentX && isGogo) {
                ctx.fillStyle = GOGO_COLOR;
                ctx.fillRect(currentX, y, nextX - currentX, height);
            }
            currentX = nextX;
            isGogo = change.isGogo;
        }

        if (currentX < x + width && isGogo) {
            ctx.fillStyle = GOGO_COLOR;
            ctx.fillRect(currentX, y, (x + width) - currentX, height);
        }
    }
}
