import { ParsedChart, LoopInfo } from './tja-parser.js';

// Helper types for renderer and hit testing
interface RenderBarInfo {
    bar: string[];
    originalIndex: number;
    isLoopStart?: boolean;
    isLoopEnd?: boolean;
    overrideStartIndex?: number; // If set, use this instead of looking up globalBarStartIndices
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
                // Clamp to max iterations? 
                // If we exceed, we might want to show the last one, or just let it overflow (and show nothing if out of range)
                // But let's just use it to shift the window.
            }
        }

        // Loop Body
        for (let i = 0; i < loop.period; i++) {
            const originalIdx = loop.startBarIndex + i;
            const baseStartIndex = globalBarStartIndices[originalIdx];
            
            // Shift start index based on current iteration
            // The note at local offset X in this bar corresponds to:
            // BaseStart + (CurrentIter * NotesPerLoop) + LocalOffset?
            // Wait. globalBarStartIndices[originalIdx] is the start index of the bar in the FIRST iteration.
            // If we want the start index of the bar in the CURRENT iteration:
            // It is baseStartIndex + (currentIter * notesPerLoop).
            
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

export interface HitInfo {
    originalBarIndex: number;
    charIndex: number;
    type: string;
    judgeableNoteIndex: number | null; // Global index for judgeable notes (1,2,3,4)
}

export function getNoteAt(x: number, y: number, chart: ParsedChart, canvas: HTMLCanvasElement, collapsed: boolean = false, viewMode: 'original' | 'judgements' = 'original', judgements: string[] = []): HitInfo | null {
    const logicalCanvasWidth: number = canvas.clientWidth || 800;
    const barWidth: number = (logicalCanvasWidth - (PADDING * 2)) / BARS_PER_ROW;

    const BAR_HEIGHT: number = barWidth * RATIOS.BAR_HEIGHT;
    const ROW_SPACING: number = barWidth * RATIOS.ROW_SPACING;
    const NOTE_RADIUS_SMALL: number = barWidth * RATIOS.NOTE_RADIUS_SMALL;
    const NOTE_RADIUS_BIG: number = barWidth * RATIOS.NOTE_RADIUS_BIG;

    const globalBarStartIndices = calculateGlobalBarStartIndices(chart.bars);
    const virtualBars = getVirtualBars(chart, collapsed, viewMode, judgements, globalBarStartIndices);

    // Hit testing loop
    // Iterate backwards as per rendering order (notes on top)
    for (let index = virtualBars.length - 1; index >= 0; index--) {
        const info = virtualBars[index];
        const row: number = Math.floor(index / BARS_PER_ROW);
        const col: number = index % BARS_PER_ROW;

        const barX: number = PADDING + (col * barWidth);
        const barY: number = PADDING + (row * (BAR_HEIGHT + ROW_SPACING));
        const centerY: number = barY + BAR_HEIGHT / 2;

        const bar = info.bar;
        if (!bar || bar.length === 0) continue;

        const noteStep: number = barWidth / bar.length;
        
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
                
                return {
                    originalBarIndex: info.originalIndex,
                    charIndex: i,
                    type: char,
                    judgeableNoteIndex: judgeableIndex
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
    
    // Calculate layout
    const logicalCanvasWidth: number = canvas.clientWidth || 800;
    const barWidth: number = (logicalCanvasWidth - (PADDING * 2)) / BARS_PER_ROW;

    // specific dimensions based on ratios
    const BAR_HEIGHT: number = barWidth * RATIOS.BAR_HEIGHT;
    const ROW_SPACING: number = barWidth * RATIOS.ROW_SPACING;
    const NOTE_RADIUS_SMALL: number = barWidth * RATIOS.NOTE_RADIUS_SMALL;
    const NOTE_RADIUS_BIG: number = barWidth * RATIOS.NOTE_RADIUS_BIG;
    const LW_BAR: number = barWidth * RATIOS.LINE_WIDTH_BAR_BORDER;
    const LW_CENTER: number = barWidth * RATIOS.LINE_WIDTH_CENTER;
    const LW_NOTE_OUTER: number = barWidth * RATIOS.LINE_WIDTH_NOTE_OUTER;
    const LW_NOTE_INNER: number = barWidth * RATIOS.LINE_WIDTH_NOTE_INNER;
    const BAR_NUMBER_FONT_SIZE: number = barWidth * RATIOS.BAR_NUMBER_FONT_SIZE_RATIO;
    const BAR_NUMBER_OFFSET_Y: number = barWidth * RATIOS.BAR_NUMBER_OFFSET_Y_RATIO;

    const globalBarStartIndices = calculateGlobalBarStartIndices(bars);
    const virtualBars = getVirtualBars(chart, collapsed, viewMode, judgements, globalBarStartIndices);

    const totalRows: number = Math.ceil(virtualBars.length / BARS_PER_ROW);
    const logicalCanvasHeight: number = (totalRows * (BAR_HEIGHT + ROW_SPACING)) + (PADDING * 2);

    // Adjust for device pixel ratio for sharp rendering
    const dpr = window.devicePixelRatio || 1;
    canvas.width = logicalCanvasWidth * dpr;
    canvas.height = logicalCanvasHeight * dpr;
    canvas.style.width = logicalCanvasWidth + 'px';
    canvas.style.height = logicalCanvasHeight + 'px';
    
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, logicalCanvasWidth, logicalCanvasHeight);

    // Layer 1: Backgrounds
    virtualBars.forEach((info, index) => {
        const row: number = Math.floor(index / BARS_PER_ROW);
        const col: number = index % BARS_PER_ROW;

        const x: number = PADDING + (col * barWidth);
        const y: number = PADDING + (row * (BAR_HEIGHT + ROW_SPACING));

        drawBarBackground(ctx, x, y, barWidth, BAR_HEIGHT, LW_BAR, LW_CENTER);
        
        // Draw Bar Number
        drawBarNumber(ctx, info.originalIndex + 1, x, y, BAR_NUMBER_FONT_SIZE, BAR_NUMBER_OFFSET_Y);

        // Draw Loop Indicator
        if (info.isLoopStart && loop) {
            ctx.fillStyle = '#000';
            ctx.font = `bold ${BAR_NUMBER_FONT_SIZE}px sans-serif`;
            ctx.textAlign = 'right';
            ctx.fillText(`Loop x${loop.iterations}`, x + barWidth, y - BAR_NUMBER_OFFSET_Y);
        }
    });

    // Layer 1.5: Drumrolls
    // We need to pass the "virtual" structure or handle it.
    // drawDrumrolls iterates `bars`. We can reconstruct a simple 2D array of bars for it?
    // But drawDrumrolls needs to span correctly.
    // If we pass `virtualBars.map(v => v.bar)`, it will draw drumrolls within that sequence.
    // Correct.
    const virtualBarsData = virtualBars.map(v => v.bar);
    drawDrumrolls(ctx, virtualBarsData, barWidth, BAR_HEIGHT, PADDING, ROW_SPACING, BARS_PER_ROW, NOTE_RADIUS_SMALL, NOTE_RADIUS_BIG, LW_NOTE_OUTER, LW_NOTE_INNER, viewMode);

    // Layer 2: Notes
    for (let index = virtualBars.length - 1; index >= 0; index--) {
        const info = virtualBars[index];
        const row: number = Math.floor(index / BARS_PER_ROW);
        const col: number = index % BARS_PER_ROW;

        const x: number = PADDING + (col * barWidth);
        const y: number = PADDING + (row * (BAR_HEIGHT + ROW_SPACING));

        const startIndex = info.overrideStartIndex !== undefined 
            ? info.overrideStartIndex 
            : globalBarStartIndices[info.originalIndex];

        drawBarNotes(ctx, info.bar, x, y, barWidth, BAR_HEIGHT, NOTE_RADIUS_SMALL, NOTE_RADIUS_BIG, LW_NOTE_OUTER, LW_NOTE_INNER, viewMode, startIndex, judgements);
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

function drawDrumrolls(ctx: CanvasRenderingContext2D, bars: string[][], barWidth: number, barHeight: number, padding: number, rowSpacing: number, barsPerRow: number, rSmall: number, rBig: number, borderOuterW: number, borderInnerW: number, viewMode: 'original' | 'judgements'): void {
    let currentDrumroll: { type: string, startBarIdx: number, startNoteIdx: number } | null = null;
    
    // Iterate all bars
    for (let i = 0; i < bars.length; i++) {
        const bar = bars[i];
        if (!bar) continue;
        
        const noteCount = bar.length;
        if (noteCount === 0) continue;
        const noteStep = barWidth / noteCount;
        
        // Determine layout for this bar
        const row = Math.floor(i / barsPerRow);
        const col = i % barsPerRow;
        const barX = padding + (col * barWidth);
        const barY = padding + (row * (barHeight + rowSpacing));
        const centerY = barY + barHeight / 2;
        
        // Track the starting index of the drumroll segment in THIS bar
        let segmentStartIdx = 0;
        let segmentActive = !!currentDrumroll;
        
        for (let j = 0; j < noteCount; j++) {
            const char = bar[j];
            
            if (char === '5' || char === '6') {
                // Start a new drumroll
                // If we were already in one, we restart
                currentDrumroll = { type: char, startBarIdx: i, startNoteIdx: j };
                segmentActive = true;
                segmentStartIdx = j;
            } else if (char === '8') {
                if (currentDrumroll) {
                    // End the drumroll
                    const radius = currentDrumroll.type === '6' ? rBig : rSmall;
                    const startX = barX + (segmentStartIdx * noteStep);
                    const endX = barX + (j * noteStep);
                    
                    // Start cap only if it started at this index in this bar
                    const hasStartCap = (segmentStartIdx === currentDrumroll.startNoteIdx && i === currentDrumroll.startBarIdx);
                    // End cap always true for '8'
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
            const endX = barX + barWidth; // Visual end of bar
            
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

    // Pass 1: Outer Stroke (Black) - Drawn first (under fill/inner stroke but centered on path)
    // Actually in drawBarNotes: Stroke(Black) -> Fill -> Stroke(White).
    // This effectively renders: Half Black Border Outside, Fill, Half White Border Inside (if White < Black).
    
    // Create Path
    ctx.beginPath();
    ctx.moveTo(startX, centerY + radius);
    
    // Left Edge
    if (startCap) {
        ctx.arc(startX, centerY, radius, Math.PI / 2, Math.PI * 1.5, false);
    } else {
        ctx.lineTo(startX, centerY - radius); // Vertical line if not cap (actually need to be careful about not closing if stroking separately? No, it's fine)
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
    ctx.closePath(); // Close the path for filling and closed stroking

    // 1. Black Border
    ctx.strokeStyle = '#000';
    ctx.lineWidth = borderOuterW;
    ctx.stroke();

    // 2. Fill
    ctx.fillStyle = fillColor;
    ctx.fill();

    // 3. Inner Border
    // For drumrolls spanning bars, we don't want to draw the vertical line at the break.
    // However, the path above includes vertical lines for non-caps.
    // If we stroke this path, we get a vertical line at the bar edge.
    // To avoid this, we need a separate open path for stroking if !startCap or !endCap.
    // But `drawBarNotes` uses `stroke()` on `arc` which is a closed shape? No, `arc` is open unless closed?
    // Notes are circles (`arc` 0 to 2PI), so they are effectively closed visually.
    
    // For the drumroll segment:
    // If it's a continuation, we DO NOT want a vertical black/white line at the cut.
    // So we need to build the path carefully for stroking.
    
    // Let's rebuild the path for stroking to exclude the cut edges.
    
    ctx.beginPath();
    // Top Line
    // Start at Top-Left
    if (startCap) {
        // Arc handles the top-left curve
        // We can just trace the whole top/bottom sequence.
        ctx.arc(startX, centerY, radius, Math.PI, Math.PI * 1.5, false); // Left-Center to Top-Center?
        // Wait, easiest is:
        // Move to StartX, CenterY+Radius (Bottom-Left)
        // If startCap: Arc from Bottom-Left to Top-Left
        // Else: Move to Top-Left (Skip vertical line)
        // Line to Top-Right
        // If endCap: Arc from Top-Right to Bottom-Right
        // Else: Move to Bottom-Right (Skip vertical line)
        // Line to Bottom-Left
    }
    
    // Redefine path for stroking (Open at non-caps)
    ctx.beginPath();
    
    // 1. Trace Top: Left -> Right
    if (startCap) {
        ctx.arc(startX, centerY, radius, Math.PI, Math.PI * 1.5, false); // 9 o'clock to 12 o'clock
    } else {
        ctx.moveTo(startX, centerY - radius); // Start at Top-Left
    }
    
    ctx.lineTo(endX, centerY - radius); // Top Edge
    
    if (endCap) {
        ctx.arc(endX, centerY, radius, Math.PI * 1.5, Math.PI * 2.5, false); // 12 o'clock to 6 o'clock (wrapping 0)
    } else {
        ctx.moveTo(endX, centerY + radius); // Jump to Bottom-Right
    }
    
    // 2. Trace Bottom: Right -> Left
    ctx.lineTo(startX, centerY + radius); // Bottom Edge
    
    if (startCap) {
        ctx.arc(startX, centerY, radius, Math.PI * 0.5, Math.PI, false); // 6 o'clock to 9 o'clock
    }
    
    // Stroke White (Inner)
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
