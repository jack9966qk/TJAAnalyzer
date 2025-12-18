import { ParsedChart, BarParams, BPMChange, ScrollChange } from './tja-parser.js';
import { ViewOptions } from './renderer.js';

interface ExportContext {
    chart: ParsedChart;
    selection: NonNullable<ViewOptions['selection']>;
}

export function generateTJAFromSelection(chart: ParsedChart, selection: NonNullable<ViewOptions['selection']>, courseName: string = 'Oni'): string {
    const { start, end } = selection;

    // Normalize selection range
    let startBar = start.originalBarIndex;
    let startChar = start.charIndex;
    let endBar = end ? end.originalBarIndex : startBar;
    let endChar = end ? end.charIndex : startChar;

    if (startBar > endBar || (startBar === endBar && startChar > endChar)) {
        [startBar, endBar] = [endBar, startBar];
        [startChar, endChar] = [endChar, startChar];
    }
    
    // 1. Calculate Balloon Data
    const exportedBalloons: number[] = [];
    let balloonCursor = 0; // Index into chart.balloonCounts
    
    // Advance cursor to start of selection
    for (let b = 0; b < startBar; b++) {
        const bar = chart.bars[b];
        if (bar) {
            for (const c of bar) {
                if (c === '7' || c === '9') balloonCursor++;
            }
        }
    }

    // Scan selection for balloons
    // We need to simulate the export process to know which balloons are kept
    for (let b = startBar; b <= endBar; b++) {
        const bar = chart.bars[b];
        if (!bar) continue;

        // Define valid range for this bar
        const validStart = (b === startBar) ? startChar : 0;
        const validEnd = (b === endBar) ? endChar : bar.length - 1;

        for (let i = 0; i < bar.length; i++) {
            const c = bar[i];
            if (c === '7' || c === '9') {
                // If this note is within selection, we keep it and need its value
                if (i >= validStart && i <= validEnd) {
                    if (balloonCursor < chart.balloonCounts.length) {
                        exportedBalloons.push(chart.balloonCounts[balloonCursor]);
                    } else {
                        exportedBalloons.push(5); // Default fallback
                    }
                }
                // Always advance cursor as we pass a balloon in the original chart
                balloonCursor++;
            }
        }
    }

    // 2. Generate Header
    const headers: string[] = [
        `TITLE:Exported Selection`,
        `SUBTITLE:--`,
        `BPM:${formatVal(chart.barParams[startBar]?.bpm || 120)}`,
        `WAVE:placeholder.mp3`,
        `OFFSET:0`,
        `COURSE:${courseName.charAt(0).toUpperCase() + courseName.slice(1)}`,
        `LEVEL:${chart.headers['LEVEL'] || '10'}`
    ];
    
    if (exportedBalloons.length > 0) {
        headers.push(`BALLOON:${exportedBalloons.join(',')}`);
    }

    let tjaContent = headers.join('\n') + '\n\n#START\n';

    // 3. Initial State Commands
    const startParams = chart.barParams[startBar];
    if (startParams) {
        // Emit SCROLL and MEASURE. BPM is in header, but if it changes immediately, we handle it in loop.
        // Actually, if the first bar has a BPM change at index 0, it will be handled in the loop.
        // But if the "current BPM" is inherited, the Header BPM covers it.
        // Wait, Header BPM sets the initial BPM.
        // If `startParams.bpm` != Header BPM (which we set to `startParams.bpm`), we are fine.
        // But what if `startParams.bpm` is different from `chart.barParams[0].bpm`?
        // We set Header BPM to `startParams.bpm`. So the chart starts with correct BPM.
        
        tjaContent += `#SCROLL ${formatVal(startParams.scroll)}\n`;
        // Measure ratio: convert to fraction if possible
        tjaContent += `#MEASURE ${formatMeasure(startParams.measureRatio)}\n`;
    }

    // 4. Generate Bars
    let lastMeasureRatio = startParams ? startParams.measureRatio : 1.0;

    for (let b = startBar; b <= endBar; b++) {
        const bar = chart.bars[b];
        const params = chart.barParams[b];

        if (!bar || !params) {
            tjaContent += ',\n';
            continue;
        }

        // Check for Measure Change
        if (b > startBar && Math.abs(params.measureRatio - lastMeasureRatio) > 0.0001) {
            tjaContent += `#MEASURE ${formatMeasure(params.measureRatio)}\n`;
            lastMeasureRatio = params.measureRatio;
        }

        // Construct Bar Line with interleaved commands
        const validStart = (b === startBar) ? startChar : 0;
        const validEnd = (b === endBar) ? endChar : bar.length - 1;

        // Collect commands for this bar
        // bpmChanges and scrollChanges are usually sparse.
        // They have an 'index' property.
        // We iterate note by note.
        
        // Commands mapping: index -> string[]
        const commandsAt: Record<number, string[]> = {};
        
        if (params.bpmChanges) {
            for (const ch of params.bpmChanges) {
                if (!commandsAt[ch.index]) commandsAt[ch.index] = [];
                commandsAt[ch.index].push(`#BPMCHANGE ${formatVal(ch.bpm)}`);
            }
        }
        if (params.scrollChanges) {
            for (const ch of params.scrollChanges) {
                if (!commandsAt[ch.index]) commandsAt[ch.index] = [];
                commandsAt[ch.index].push(`#SCROLL ${formatVal(ch.scroll)}`);
            }
        }

        let barString = '';
        
        // Iterate through the bar length (original length)
        // We must preserve length to maintain timing if we zero out notes.
        for (let i = 0; i < bar.length; i++) {
            // Emit commands if any
            if (commandsAt[i]) {
                // To support commands, we might need to break the line?
                // Standard TJA: commands are on their own line.
                // So: `note1` `\n#CMD\n` `note2` ...
                // But TJA bars are comma terminated.
                // Can we have `11\n#CMD\n11,`? Yes.
                if (barString.length > 0 && !barString.endsWith('\n')) barString += '\n';
                barString += commandsAt[i].join('\n') + '\n';
            }

            const char = bar[i];
            const isSelected = (i >= validStart && i <= validEnd);
            
            // If selected, keep char. Else '0'.
            barString += isSelected ? char : '0';
        }
        
        // Handle commands at the very end of bar? (index == length)
        // TJA parser usually associates index=length with end of bar?
        // But `bpmChanges` index is based on `currentBarBuffer.length`.
        // If we had `1111#BPMCHANGE`, index is 4.
        if (commandsAt[bar.length]) {
            if (barString.length > 0 && !barString.endsWith('\n')) barString += '\n';
            barString += commandsAt[bar.length].join('\n') + '\n';
        }

        tjaContent += barString + ',\n';
    }

    tjaContent += '#END\n';
    return tjaContent;
}

function formatVal(num: number): string {
    return Number.isInteger(num) ? num.toString() : num.toString();
}

function formatMeasure(ratio: number): string {
    // Try to find x/4
    const x = ratio * 4;
    if (Math.abs(x - Math.round(x)) < 0.001) {
        return `${Math.round(x)}/4`;
    }
    // Try x/16
    const y = ratio * 16;
    if (Math.abs(y - Math.round(y)) < 0.001) {
        return `${Math.round(y)}/16`;
    }
    // Fallback
    return `${ratio}/1`; // valid? TJA usually expects int/int.
    // 4/4 = 1.
}
