// Helper to determine if a note is selected
function getContextAt(chart, barIndex, charIndex) {
    const params = chart.barParams[barIndex];
    if (!params) {
        return {
            bpm: chart.bpm || 120,
            scroll: 1.0,
            measureRatio: 1.0,
            gogoTime: false,
        };
    }
    let bpm = params.bpm;
    let scroll = params.scroll;
    const measureRatio = params.measureRatio;
    let gogoTime = params.gogoTime;
    if (params.bpmChanges) {
        for (const ch of params.bpmChanges) {
            if (ch.index <= charIndex)
                bpm = ch.bpm;
        }
    }
    if (params.scrollChanges) {
        for (const ch of params.scrollChanges) {
            if (ch.index <= charIndex)
                scroll = ch.scroll;
        }
    }
    if (params.gogoChanges) {
        for (const ch of params.gogoChanges) {
            if (ch.index <= charIndex)
                gogoTime = ch.isGogo;
        }
    }
    return { bpm, scroll, measureRatio, gogoTime };
}
export function generateTJAFromSelection(chart, selection, courseName = "Oni", loopCount = 10, chartName = "Exported Selection", gapCount = 1) {
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
    const selectionBalloons = [];
    let balloonCursor = 0; // Index into chart.balloonCounts
    // Advance cursor to start of selection
    for (let b = 0; b < startBar; b++) {
        const bar = chart.bars[b];
        if (bar) {
            for (const c of bar) {
                if (c === "7" || c === "9")
                    balloonCursor++;
            }
        }
    }
    // Scan selection for balloons
    for (let b = startBar; b <= endBar; b++) {
        const bar = chart.bars[b];
        if (!bar)
            continue;
        // Define valid range for this bar
        const validStart = b === startBar ? startChar : 0;
        const validEnd = b === endBar ? endChar : bar.length - 1;
        for (let i = 0; i < bar.length; i++) {
            const c = bar[i];
            if (c === "7" || c === "9") {
                // If this note is within selection, we keep it and need its value
                if (i >= validStart && i <= validEnd) {
                    if (balloonCursor < chart.balloonCounts.length) {
                        selectionBalloons.push(chart.balloonCounts[balloonCursor]);
                    }
                    else {
                        selectionBalloons.push(5); // Default fallback
                    }
                }
                // Always advance cursor as we pass a balloon in the original chart
                balloonCursor++;
            }
        }
    }
    const exportedBalloons = [];
    for (let i = 0; i < loopCount; i++) {
        exportedBalloons.push(...selectionBalloons);
    }
    // 2. Determine Contexts
    // Start context: State at the BEGINNING of the start bar (index 0).
    const startContext = getContextAt(chart, startBar, 0);
    // End context: State at the END of the end bar.
    const endContext = getContextAt(chart, endBar, 999999);
    // Determine Gogo status for padding/gaps
    const startNoteContext = getContextAt(chart, startBar, startChar);
    const endNoteContext = getContextAt(chart, endBar, endChar);
    const shouldGapBeGogo = startNoteContext.gogoTime && endNoteContext.gogoTime;
    // 3. Generate Header
    const headers = [
        `TITLE:${chartName}`,
        `SUBTITLE:--`,
        `BPM:${formatVal(startContext.bpm)}`,
        `WAVE:placeholder.mp3`,
        `OFFSET:0`,
        `COURSE:${courseName.charAt(0).toUpperCase() + courseName.slice(1)}`,
        `LEVEL:${chart.headers.LEVEL || "10"}`,
    ];
    if (exportedBalloons.length > 0) {
        headers.push(`BALLOON:${exportedBalloons.join(",")}`);
    }
    let tjaContent = `${headers.join("\n")}\n\n#START\n`;
    // 4. Generate Content
    let selectionBlock = "";
    let lastMeasureRatio = startContext.measureRatio;
    for (let b = startBar; b <= endBar; b++) {
        const bar = chart.bars[b];
        const params = chart.barParams[b];
        if (!bar || !params) {
            selectionBlock += ",\n";
            continue;
        }
        // Measure Change logic within selection
        if (Math.abs(params.measureRatio - lastMeasureRatio) > 0.0001) {
            selectionBlock += `#MEASURE ${formatMeasure(params.measureRatio)}\n`;
            lastMeasureRatio = params.measureRatio;
        }
        // Collect commands
        const commandsAt = {};
        // Define valid range
        const validStart = b === startBar ? startChar : 0;
        const validEnd = b === endBar ? endChar : bar.length - 1;
        if (params.bpmChanges) {
            for (const ch of params.bpmChanges) {
                if (!commandsAt[ch.index])
                    commandsAt[ch.index] = [];
                commandsAt[ch.index].push(`#BPMCHANGE ${formatVal(ch.bpm)}`);
            }
        }
        if (params.scrollChanges) {
            for (const ch of params.scrollChanges) {
                if (!commandsAt[ch.index])
                    commandsAt[ch.index] = [];
                commandsAt[ch.index].push(`#SCROLL ${formatVal(ch.scroll)}`);
            }
        }
        if (params.gogoChanges) {
            for (const ch of params.gogoChanges) {
                if (!commandsAt[ch.index])
                    commandsAt[ch.index] = [];
                commandsAt[ch.index].push(ch.isGogo ? "#GOGOSTART" : "#GOGOEND");
            }
        }
        let barString = "";
        for (let i = 0; i < bar.length; i++) {
            if (commandsAt[i]) {
                if (barString.length > 0 && !barString.endsWith("\n"))
                    barString += "\n";
                barString += `${commandsAt[i].join("\n")}\n`;
            }
            const char = bar[i];
            const isSelected = i >= validStart && i <= validEnd;
            barString += isSelected ? char : "0";
        }
        // Trailing commands
        if (commandsAt[bar.length]) {
            if (barString.length > 0 && !barString.endsWith("\n"))
                barString += "\n";
            barString += `${commandsAt[bar.length].join("\n")}\n`;
        }
        selectionBlock += `${barString},\n`;
    }
    // Now assemble the loops
    for (let i = 0; i < loopCount; i++) {
        // Empty Bar (Context Reset / Gap)
        tjaContent += `\n// Loop ${i + 1}\n`;
        tjaContent += `#MEASURE ${formatMeasure(startContext.measureRatio)}\n`;
        tjaContent += `#BPMCHANGE ${formatVal(startContext.bpm)}\n`;
        tjaContent += `#SCROLL ${formatVal(startContext.scroll)}\n`;
        // Gap Gogo State
        tjaContent += `${shouldGapBeGogo ? "#GOGOSTART" : "#GOGOEND"}\n`;
        for (let g = 0; g < gapCount; g++) {
            tjaContent += `0,\n`;
        }
        // Selection Start Correction
        // We need to restore the state expected by the start of the selection block (startContext.gogoTime)
        if (startContext.gogoTime !== shouldGapBeGogo) {
            tjaContent += `${startContext.gogoTime ? "#GOGOSTART" : "#GOGOEND"}\n`;
        }
        // Selection
        tjaContent += selectionBlock;
    }
    // End Padding
    tjaContent += `\n// End Padding\n`;
    tjaContent += `#MEASURE ${formatMeasure(endContext.measureRatio)}\n`;
    tjaContent += `#BPMCHANGE ${formatVal(endContext.bpm)}\n`;
    tjaContent += `#SCROLL ${formatVal(endContext.scroll)}\n`;
    // We treat End Padding as a Gap too
    tjaContent += `${shouldGapBeGogo ? "#GOGOSTART" : "#GOGOEND"}\n`;
    for (let g = 0; g < 3; g++) {
        tjaContent += `0,\n`;
    }
    tjaContent += "#END\n";
    return tjaContent;
}
function formatVal(num) {
    return Number.isInteger(num) ? num.toString() : num.toString();
}
function formatMeasure(ratio) {
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
    return `${ratio}/1`;
}
