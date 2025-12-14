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
    BAR_NUMBER_FONT_SIZE_RATIO: 0.06,
    BAR_NUMBER_OFFSET_Y_RATIO: -0.0015
};

function getVirtualBars(chart: ParsedChart, collapsed: boolean, viewMode: 'original' | 'judgements', judgements: string[], globalBarStartIndices: number[]): RenderBarInfo[] {
    const { bars, loop } = chart;
    let virtualBars: RenderBarInfo[] = [];

    if (collapsed && loop) {
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

        if (viewMode === 'judgements' && judgements.length > 0) {
            const lastJudgedIndex = judgements.length - 1;
            if (lastJudgedIndex >= preLoopNotes && notesPerLoop > 0) {
                const relativeIndex = lastJudgedIndex - preLoopNotes;
                currentIter = Math.floor(relativeIndex / notesPerLoop);
            }
        }

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

function calculateLayout(virtualBars: RenderBarInfo[], chart: ParsedChart, logicalCanvasWidth: number): { layouts: BarLayout[], constants: any, totalHeight: number } {
    // 1. Determine Base Dimensions (Reference 4/4 Bar)
    // We treat the "standard" width as if 4 bars fit in the row.
    const baseBarWidth: number = (logicalCanvasWidth - (PADDING * 2)) / BARS_PER_ROW;
    
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
        BAR_NUMBER_FONT_SIZE: baseBarWidth * RATIOS.BAR_NUMBER_FONT_SIZE_RATIO,
        BAR_NUMBER_OFFSET_Y: baseBarWidth * RATIOS.BAR_NUMBER_OFFSET_Y_RATIO
    };

    // 2. Calculate Layout Positions
    const layouts: BarLayout[] = [];
    let currentRowX = 0;
    let rowIndex = 0;
    let colIndex = 0; // Count in current row

    for (const info of virtualBars) {
        // Determine width based on measure
        const params = chart.barParams[info.originalIndex];
        const measureRatio = params ? params.measureRatio : 1.0;
        const actualBarWidth = baseBarWidth * measureRatio;

        const x = PADDING + currentRowX;
        const y = PADDING + (rowIndex * (BAR_HEIGHT + ROW_SPACING));

        layouts.push({
            x,
            y,
            width: actualBarWidth,
            height: BAR_HEIGHT
        });

        currentRowX += actualBarWidth;
        colIndex++;

        // Wrap every 4 bars (strict count wrapping)
        if (colIndex >= BARS_PER_ROW) {
            colIndex = 0;
            currentRowX = 0;
            rowIndex++;
        }
    }

    const totalRows = Math.ceil(virtualBars.length / BARS_PER_ROW);
    // If the last row was just started (colIndex=0), we might have incremented rowIndex?
    // The loop increments rowIndex AFTER filling the row.
    // If we ended exactly at end of row, colIndex=0, rowIndex incremented. totalRows should be rowIndex.
    // If we have remaining items (colIndex > 0), totalRows should be rowIndex + 1.
    // Actually, simple calculation:
    // If virtualBars is empty, 0 height.
    // Layout logic:
    // y max is based on the LAST item's y + height.
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

export function getNoteAt(x: number, y: number, chart: ParsedChart, canvas: HTMLCanvasElement, collapsed: boolean = false, viewMode: 'original' | 'judgements' = 'original', judgements: string[] = []): HitInfo | null {
    const logicalCanvasWidth: number = canvas.clientWidth || 800;
    
    const globalBarStartIndices = calculateGlobalBarStartIndices(chart.bars);
    const virtualBars = getVirtualBars(chart, collapsed, viewMode, judgements, globalBarStartIndices);
    
    const { layouts, constants } = calculateLayout(virtualBars, chart, logicalCanvasWidth);
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

export function renderChart(chart: ParsedChart, canvas: HTMLCanvasElement, viewMode: 'original' | 'judgements' = 'original', judgements: string[] = [], collapsed: boolean = false): void {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error("2D rendering context not found for canvas.");
        return;
    }

    const { bars, loop } = chart;
    const logicalCanvasWidth: number = canvas.clientWidth || 800;

    const globalBarStartIndices = calculateGlobalBarStartIndices(bars);
    const virtualBars = getVirtualBars(chart, collapsed, viewMode, judgements, globalBarStartIndices);
    
    const { layouts, constants, totalHeight } = calculateLayout(virtualBars, chart, logicalCanvasWidth);
    
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

    // Layer 1.5: Drumrolls
    drawDrumrolls(ctx, virtualBars, layouts, constants, viewMode);

    // Layer 2: Notes
    for (let index = virtualBars.length - 1; index >= 0; index--) {
        const info = virtualBars[index];
        const layout = layouts[index];

        const startIndex = info.overrideStartIndex !== undefined 
            ? info.overrideStartIndex 
            : globalBarStartIndices[info.originalIndex];

        drawBarNotes(ctx, info.bar, layout.x, layout.y, layout.width, layout.height, constants.NOTE_RADIUS_SMALL, constants.NOTE_RADIUS_BIG, constants.LW_NOTE_OUTER, constants.LW_NOTE_INNER, viewMode, startIndex, judgements);
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

function drawDrumrolls(ctx: CanvasRenderingContext2D, virtualBars: RenderBarInfo[], layouts: BarLayout[], constants: any, viewMode: 'original' | 'judgements'): void {
    const { NOTE_RADIUS_SMALL: rSmall, NOTE_RADIUS_BIG: rBig, LW_NOTE_OUTER: borderOuterW, LW_NOTE_INNER: borderInnerW } = constants;
    
    let currentDrumroll: { type: string, startBarIdx: number, startNoteIdx: number } | null = null;
    
    // Iterate all bars
    for (let i = 0; i < virtualBars.length; i++) {
        const bar = virtualBars[i].bar;
        if (!bar) continue;
        const layout = layouts[i];
        
        const noteCount = bar.length;
        if (noteCount === 0) continue;
        const noteStep = layout.width / noteCount;
        
        const barX = layout.x;
        const centerY = layout.y + layout.height / 2;
        
        // Track the starting index of the drumroll segment in THIS bar
        let segmentStartIdx = 0;
        let segmentActive = !!currentDrumroll;
        
        for (let j = 0; j < noteCount; j++) {
            const char = bar[j];
            
            if (char === '5' || char === '6') {
                // Start a new drumroll
                currentDrumroll = { type: char, startBarIdx: i, startNoteIdx: j };
                segmentActive = true;
                segmentStartIdx = j;
            } else if (char === '8') {
                if (currentDrumroll) {
                    // End the drumroll
                    const radius = currentDrumroll.type === '6' ? rBig : rSmall;
                    const startX = barX + (segmentStartIdx * noteStep);
                    const endX = barX + (j * noteStep);
                    
                    const hasStartCap = (segmentStartIdx === currentDrumroll.startNoteIdx && i === currentDrumroll.startBarIdx);
                    const hasEndCap = true;
                    
                    drawDrumrollSegment(ctx, startX, endX, centerY, radius, hasStartCap, hasEndCap, borderOuterW, borderInnerW, viewMode);
                    
                    currentDrumroll = null;
                    segmentActive = false;
                }
            }
        }
        
        // If still active at end of bar, draw segment to end
        if (segmentActive && currentDrumroll) {
            const radius = currentDrumroll.type === '6' ? rBig : rSmall;
            const startX = barX + (segmentStartIdx * noteStep);
            const endX = barX + layout.width; // Visual end of bar
            
            const hasStartCap = (segmentStartIdx === currentDrumroll.startNoteIdx && i === currentDrumroll.startBarIdx);
            const hasEndCap = false; // Continuation
            
            drawDrumrollSegment(ctx, startX, endX, centerY, radius, hasStartCap, hasEndCap, borderOuterW, borderInnerW, viewMode);
        }
    }
}

function drawDrumrollSegment(ctx: CanvasRenderingContext2D, startX: number, endX: number, centerY: number, radius: number, startCap: boolean, endCap: boolean, borderOuterW: number, borderInnerW: number, viewMode: 'original' | 'judgements'): void {
    let fillColor = '#ff0';
    let innerBorderColor = '#fff';

    if (viewMode === 'judgements') {
        fillColor = '#999';
        innerBorderColor = '#ccc';
    }

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

function drawBarNotes(ctx: CanvasRenderingContext2D, bar: string[], x: number, y: number, width: number, height: number, rSmall: number, rBig: number, borderOuterW: number, borderInnerW: number, viewMode: 'original' | 'judgements', startIndex: number, judgements: string[]): void {
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

    // Iterate backwards so later notes are drawn first (appearing behind earlier notes)
    for (let i = noteCount - 1; i >= 0; i--) {
        const noteChar = bar[i];
        // Position calculated using the ORIGINAL index 'i'
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
            // '5' and '6' (Drumrolls) are handled in drawDrumrolls, so ignored here
            case '7': // Balloon
            case '9': // Kusudama
                color = '#ff0'; // Yellow
                radius = (noteChar === '9') ? rBig : rSmall;
                break;
            // '0' is space
            // '8' is end of roll (ignore for point rendering)
        }

        if (color) {
            let borderColor = '#fff'; // Default white border

            if (viewMode === 'judgements') {
                color = '#999'; // Default unjudged fill color (Grey)
                borderColor = '#ccc'; // Default unjudged border color (Grey)
                
                const globalIndex = judgeableIndicesInBar[i];
                if (globalIndex !== null && globalIndex < judgements.length) {
                    const judge = judgements[globalIndex];
                    borderColor = '#fff'; // Revert to standard white border for judged notes
                    
                    if (judge === 'Perfect') color = 'orange';
                    else if (judge === 'Good') color = 'white';
                    else if (judge === 'Poor') color = 'blue';
                }
            }

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
