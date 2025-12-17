import { ParsedChart, LoopInfo } from './tja-parser.js';

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
}

// Configuration Constants
const BARS_PER_ROW: number = 4;
const PADDING: number = 20;
const RATIOS = {
    BAR_HEIGHT: 0.14,
    ROW_SPACING: 0.11,
    NOTE_RADIUS_SMALL: 0.035,
    NOTE_RADIUS_BIG: 0.05,
    LINE_WIDTH_BAR_BORDER: 0.01,
    LINE_WIDTH_CENTER: 0.005,
    LINE_WIDTH_NOTE_OUTER: 0.022,
    LINE_WIDTH_NOTE_INNER: 0.0075,
    LINE_WIDTH_UNDERLINE_BORDER: 0.008,
    BAR_NUMBER_FONT_SIZE_RATIO: 0.06,
    BAR_NUMBER_OFFSET_Y_RATIO: -0.0015
};

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

function calculateLayout(virtualBars: RenderBarInfo[], chart: ParsedChart, logicalCanvasWidth: number, beatsPerLine: number = 16): { layouts: BarLayout[], constants: any, totalHeight: number } {
    // 1. Determine Base Dimensions
    // The full canvas width (minus padding) represents 'beatsPerLine' beats.
    const availableWidth = logicalCanvasWidth - (PADDING * 2);
    // Base width is width of one 4/4 bar (4 beats). 
    // Number of base bars per row = beatsPerLine / 4
    const baseBarWidth: number = availableWidth / (beatsPerLine / 4);
    
    // Ratios apply to the BASE width to ensure consistent height and note sizes
    const BAR_HEIGHT: number = baseBarWidth * RATIOS.BAR_HEIGHT;
    const ROW_SPACING: number = baseBarWidth * RATIOS.ROW_SPACING;
    
    // Constants for drawing
    const constants = {
        BAR_HEIGHT,
        ROW_SPACING,
        NOTE_RADIUS_SMALL: baseBarWidth * RATIOS.NOTE_RADIUS_SMALL,
        NOTE_RADIUS_BIG: baseBarWidth * RATIOS.NOTE_RADIUS_BIG,
        LW_BAR: baseBarWidth * RATIOS.LINE_WIDTH_BAR_BORDER,
        LW_CENTER: baseBarWidth * RATIOS.LINE_WIDTH_CENTER,
        LW_NOTE_OUTER: baseBarWidth * RATIOS.LINE_WIDTH_NOTE_OUTER,
        LW_NOTE_INNER: baseBarWidth * RATIOS.LINE_WIDTH_NOTE_INNER,
        LW_UNDERLINE_BORDER: baseBarWidth * RATIOS.LINE_WIDTH_UNDERLINE_BORDER,
        BAR_NUMBER_FONT_SIZE: baseBarWidth * RATIOS.BAR_NUMBER_FONT_SIZE_RATIO,
        BAR_NUMBER_OFFSET_Y: baseBarWidth * RATIOS.BAR_NUMBER_OFFSET_Y_RATIO
    };

    // 2. Calculate Layout Positions
    const layouts: BarLayout[] = [];
    let currentRowX = 0;
    let rowIndex = 0;

    for (const info of virtualBars) {
        // Determine width based on measure
        const params = chart.barParams[info.originalIndex];
        const measureRatio = params ? params.measureRatio : 1.0;
        const actualBarWidth = baseBarWidth * measureRatio;

        // Wrap logic:
        // If current row is NOT empty, and adding this bar exceeds available width...
        // Use a small epsilon for float comparison safety
        if (currentRowX > 0 && (currentRowX + actualBarWidth > availableWidth + 1.0)) {
            rowIndex++;
            currentRowX = 0;
        }

        const x = PADDING + currentRowX;
        const y = PADDING + (rowIndex * (BAR_HEIGHT + ROW_SPACING));

        layouts.push({
            x,
            y,
            width: actualBarWidth,
            height: BAR_HEIGHT
        });

        currentRowX += actualBarWidth;
    }

    const totalHeight = layouts.length > 0 
        ? layouts[layouts.length - 1].y + BAR_HEIGHT + PADDING 
        : PADDING * 2;

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
    
    const globalBarStartIndices = calculateGlobalBarStartIndices(chart.bars);
    const virtualBars = getVirtualBars(chart, options, judgements, globalBarStartIndices);
    
    const { layouts, constants } = calculateLayout(virtualBars, chart, logicalCanvasWidth, options.beatsPerLine);
    const { NOTE_RADIUS_SMALL, NOTE_RADIUS_BIG } = constants;

    // Hit testing loop
    // Iterate backwards as per rendering order (notes on top)
    for (let index = virtualBars.length - 1; index >= 0; index--) {
        const info = virtualBars[index];
        const layout = layouts[index];
        
        const barX = layout.x;
        const barY = layout.y; // Top of bar
        const centerY = barY + layout.height / 2;

        const bar = info.bar;
        if (!bar || bar.length === 0) continue;

        const noteStep: number = layout.width / bar.length;
        
        // Calculate start index for this bar
        const startIndex = info.overrideStartIndex !== undefined 
            ? info.overrideStartIndex 
            : globalBarStartIndices[info.originalIndex];

        let localJudgeCount = 0;

        for (let i = 0; i < bar.length; i++) {
            const char = bar[i];
            // Only hit test visual notes
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
                if (['1', '2', '3', '4'].includes(char)) {
                    judgeableIndex = startIndex + localJudgeCount;
                }
                
                const params = chart.barParams[info.originalIndex];
                
                let effectiveBpm = params ? params.bpm : 120;
                if (params && params.bpmChanges) {
                    for (const change of params.bpmChanges) {
                        if (i >= change.index) {
                            effectiveBpm = change.bpm;
                        }
                    }
                }

                let effectiveScroll = params ? params.scroll : 1.0;
                if (params && params.scrollChanges) {
                    for (const change of params.scrollChanges) {
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

export function renderChart(chart: ParsedChart, canvas: HTMLCanvasElement, judgements: string[] = [], judgementDeltas: (number | undefined)[] = [], options: ViewOptions): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("2D rendering context not found for canvas.");
        return;
    }

    const { bars, loop } = chart;
    const logicalCanvasWidth: number = canvas.clientWidth || 800;

    const globalBarStartIndices = calculateGlobalBarStartIndices(bars);
    const balloonIndices = calculateBalloonIndices(bars);
    const virtualBars = getVirtualBars(chart, options, judgements, globalBarStartIndices);
    
    const { layouts, constants, totalHeight } = calculateLayout(virtualBars, chart, logicalCanvasWidth, options.beatsPerLine);
    
    // Adjust for device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = logicalCanvasWidth * dpr;
    canvas.height = totalHeight * dpr;
    canvas.style.width = logicalCanvasWidth + 'px';
    canvas.style.height = totalHeight + 'px';
    
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, logicalCanvasWidth, totalHeight);

    // Layer 1: Backgrounds
    virtualBars.forEach((info, index) => {
        const layout = layouts[index];
        
        drawBarBackground(ctx, layout.x, layout.y, layout.width, layout.height, constants.LW_BAR, constants.LW_CENTER);
        
        // Draw Bar Number
        drawBarNumber(ctx, info.originalIndex + 1, layout.x, layout.y, constants.BAR_NUMBER_FONT_SIZE, constants.BAR_NUMBER_OFFSET_Y);

        // Draw Loop Indicator
        if (info.isLoopStart && loop) {
            ctx.fillStyle = '#000';
            ctx.font = `bold ${constants.BAR_NUMBER_FONT_SIZE}px sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText(`Loop x${loop.iterations}`, layout.x + layout.width, layout.y - constants.BAR_NUMBER_OFFSET_Y);
        }
    });

    // Layer 1.5: Drumrolls and Balloons
    drawLongNotes(ctx, virtualBars, layouts, constants, options.viewMode, chart.balloonCounts, balloonIndices);

    // Layer 2: Notes
    for (let index = virtualBars.length - 1; index >= 0; index--) {
        const info = virtualBars[index];
        const layout = layouts[index];

        const startIndex = info.overrideStartIndex !== undefined 
            ? info.overrideStartIndex 
            : globalBarStartIndices[info.originalIndex];

        drawBarNotes(ctx, info.bar, layout.x, layout.y, layout.width, layout.height, constants.NOTE_RADIUS_SMALL, constants.NOTE_RADIUS_BIG, constants.LW_NOTE_OUTER, constants.LW_NOTE_INNER, constants.LW_UNDERLINE_BORDER, options, startIndex, judgements, judgementDeltas, info.originalIndex, bars, options.collapsedLoop ? loop : undefined);
    }
}

function drawBarBackground(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, borderW: number, centerW: number): void {
    const centerY: number = y + height / 2;

    // Draw Bar Background
    ctx.fillStyle = '#999'; // Darker grey background
    ctx.fillRect(x, y, width, height);
    
    // Draw Bar Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = borderW;
    ctx.strokeRect(x, y, width, height);

    // Draw Center Line
    ctx.strokeStyle = '#ccc';
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
        if (noteCount === 0) continue;
        const noteStep = layout.width / noteCount;
        
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
    let fillColor = '#ff0';
    let innerBorderColor = '#fff';

    if (viewMode === 'judgements') {
        fillColor = '#999';
        innerBorderColor = '#ccc';
    }

    drawCapsule(ctx, startX, endX, centerY, radius, startCap, endCap, borderOuterW, borderInnerW, fillColor, innerBorderColor);
}

function drawBalloonSegment(ctx: CanvasRenderingContext2D, startX: number, endX: number, centerY: number, radius: number, startCap: boolean, endCap: boolean, borderOuterW: number, borderInnerW: number, viewMode: 'original' | 'judgements' | 'judgements-underline' | 'judgements-text', count: number, isKusudama: boolean): void {
    let fillColor = '#ffa500'; // Orangeish for balloon body
    let innerBorderColor = '#fff';

    if (viewMode === 'judgements') {
        fillColor = '#999';
        innerBorderColor = '#ccc';
    }

    // Draw the tail (body)
    // The tail usually starts a bit after the head, but for simplicity we draw it as a capsule behind the head.
    // However, if we draw it as a capsule, the head will be drawn on top of it.
    // If startCap is true, we are drawing the head segment.
    
    drawCapsule(ctx, startX, endX, centerY, radius * 0.8, startCap, endCap, borderOuterW, borderInnerW, fillColor, innerBorderColor);

    // If this is the start segment, draw the balloon head
    if (startCap) {
        let headColor = '#ffa500'; // Orange
        if (isKusudama) headColor = '#ffd700'; // Gold
        
        if (viewMode === 'judgements') {
            headColor = '#999';
        }

        // Draw Head
        ctx.beginPath();
        ctx.arc(startX, centerY, radius, 0, Math.PI * 2);
        
        ctx.lineWidth = borderOuterW;
        ctx.strokeStyle = '#000';
        ctx.stroke();

        ctx.fillStyle = headColor;
        ctx.fill();

        ctx.lineWidth = borderInnerW;
        ctx.strokeStyle = innerBorderColor;
        ctx.stroke();

        // Draw Count
        if (viewMode !== 'judgements') {
            ctx.fillStyle = '#000';
            ctx.font = `bold ${radius * 1.5}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(count.toString(), startX, centerY + (radius * 0.1));
        }
    }
}

function drawCapsule(ctx: CanvasRenderingContext2D, startX: number, endX: number, centerY: number, radius: number, startCap: boolean, endCap: boolean, borderOuterW: number, borderInnerW: number, fillColor: string, innerBorderColor: string): void {
    // Create Path
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

    // 1. Black Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = borderOuterW;
    ctx.stroke();

    // 2. Fill
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


function drawBarNotes(ctx: CanvasRenderingContext2D, bar: string[], x: number, y: number, width: number, height: number, rSmall: number, rBig: number, borderOuterW: number, borderInnerW: number, borderUnderlineW: number, options: ViewOptions, startIndex: number, judgements: string[], judgementDeltas: (number | undefined)[] = [], originalBarIndex: number = -1, bars: string[][] = [], loopInfo?: LoopInfo): void {
    const { viewMode, coloringMode, visibility: judgementVisibility } = options;
    
    // DEBUG LOG
    if (originalBarIndex === 0 && (viewMode === 'judgements' || viewMode === 'judgements-underline' || viewMode === 'judgements-text')) {
        console.log(`drawBarNotes Bar 0: mode=${coloringMode}, deltasLen=${judgementDeltas.length}, judgementsLen=${judgements.length}`);
    }

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
                      noteColors[i] = '#555'; // Dark Grey
                 }
                 // Else null (Unjudged)

            } else {
                // Categorical Logic
                if (globalIndex < judgements.length) {
                    const judge = judgements[globalIndex];
                    if (judge === 'Perfect' && judgementVisibility.perfect) noteColors[i] = '#ffa500';
                    else if (judge === 'Good' && judgementVisibility.good) noteColors[i] = '#fff';
                    else if (judge === 'Poor' && judgementVisibility.poor) noteColors[i] = '#00f';
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
        ctx.strokeStyle = '#000';
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
        ctx.strokeStyle = '#000';

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
                if (judge === 'Perfect') text = '良';
                else if (judge === 'Good') text = '可';
                else if (judge === 'Poor') text = '不可';

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
                color = 'rgba(255, 77, 77, 1)';
                radius = rSmall;
                break;
            case '2': // Ka (Blue Small)
                color = 'rgba(92, 187, 255, 1)';
                radius = rSmall;
                break;
            case '3': // Don (Red Big)
                color = 'rgba(255, 77, 77, 1)';
                radius = rBig;
                isBig = true;
                break;
            case '4': // Ka (Blue Big)
                color = 'rgba(92, 187, 255, 1)';
                radius = rBig;
                isBig = true;
                break;
        }

        if (color) {
            let borderColor = '#fff'; // Default white border

            if (viewMode === 'judgements') {
                color = '#999'; // Default unjudged fill color (Grey)
                borderColor = '#ccc'; // Default unjudged border color (Grey)
                
                const assignedColor = noteColors[i];
                if (assignedColor) {
                    color = assignedColor;
                    borderColor = '#fff'; // Revert to standard white border for judged notes
                }
            }
            
            // Note: In judgements-underline mode, we keep original colors (Red/Blue) and white border
            // The underline is drawn in Phase 1.

            ctx.beginPath();
            ctx.arc(noteX, centerY, radius, 0, Math.PI * 2);

            // Black border (outside)
            ctx.lineWidth = borderOuterW;
            ctx.strokeStyle = '#000';
            ctx.stroke();

            ctx.fillStyle = color;
            ctx.fill();
            
            ctx.lineWidth = borderInnerW;
            ctx.strokeStyle = borderColor; // Dynamic border
            ctx.stroke();
        }
    }
}

function drawBarNumber(ctx: CanvasRenderingContext2D, barNumber: number, x: number, y: number, fontSize: number, offsetY: number): void {
    ctx.save();
    ctx.font = `bold ${fontSize}px 'Consolas', 'Monaco', 'Lucida Console', monospace`;
    ctx.fillStyle = '#333';
    ctx.textAlign = 'left'; // Align to the left bar line
    ctx.textBaseline = 'bottom'; // Position above the bar
    ctx.fillText(barNumber.toString(), x, y - offsetY);
    ctx.restore();
}
