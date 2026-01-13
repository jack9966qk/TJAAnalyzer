function createInitialState(bpm) {
    return {
        bpm: bpm,
        scroll: 1.0,
        measureRatio: 1.0,
        gogoTime: false,
        currentBarBuffer: '',
        currentBarBpmChanges: [],
        currentBarScrollChanges: [],
        currentBarGogoChanges: []
    };
}
function cloneState(s) {
    return {
        bpm: s.bpm,
        scroll: s.scroll,
        measureRatio: s.measureRatio,
        gogoTime: s.gogoTime,
        currentBarBuffer: s.currentBarBuffer,
        currentBarBpmChanges: [...s.currentBarBpmChanges],
        currentBarScrollChanges: [...s.currentBarScrollChanges],
        currentBarGogoChanges: [...s.currentBarGogoChanges]
    };
}
export function parseTJA(content) {
    const lines = content.split(/\r?\n/);
    const courses = {};
    const courseHeaders = {};
    let currentCourse = null;
    let isParsingChart = false;
    let globalHeader = {};
    // First pass: extract raw chart data for each course and headers
    for (let line of lines) {
        line = line.trim();
        if (!line)
            continue;
        if (line.startsWith('COURSE:')) {
            currentCourse = line.substring(7).trim();
            courses[currentCourse.toLowerCase()] = [];
            courseHeaders[currentCourse.toLowerCase()] = {};
            isParsingChart = false;
        }
        else if (line.startsWith('#START')) {
            isParsingChart = true;
        }
        else if (line.startsWith('#END')) {
            isParsingChart = false;
            currentCourse = null;
        }
        else if (isParsingChart && currentCourse) {
            // Remove comments
            const commentIndex = line.indexOf('//');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex).trim();
            }
            if (line) {
                courses[currentCourse.toLowerCase()].push(line);
            }
        }
        else if (!isParsingChart) {
            // Header parsing
            const parts = line.split(':');
            if (parts.length >= 2) {
                const key = parts[0].trim().toUpperCase();
                const val = parts.slice(1).join(':').trim(); // Handle colons in value
                if (currentCourse) {
                    courseHeaders[currentCourse.toLowerCase()][key] = val;
                }
                else {
                    globalHeader[key] = val;
                }
            }
        }
    }
    const parsedCourses = {};
    for (const courseName in courses) {
        if (Object.prototype.hasOwnProperty.call(courses, courseName)) {
            const courseData = courses[courseName];
            const headers = { ...globalHeader, ...courseHeaders[courseName] };
            // Metadata Extraction
            const title = headers['TITLEJA'] || headers['TITLE'] || '';
            const subtitle = headers['SUBTITLEJA'] || headers['SUBTITLE'] || '';
            const bpm = parseFloat(headers['BPM']) || 120;
            const level = parseInt(headers['LEVEL']) || 0;
            const course = headers['COURSE'] || courseName;
            // Parse BALLOON counts
            let balloonCounts = [];
            const balloonStr = headers['BALLOON'];
            if (balloonStr) {
                balloonCounts = balloonStr.split(/[,]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            }
            // Buffers for parsing
            const normalBars = [];
            const normalParams = [];
            const expertBars = [];
            const expertParams = [];
            const masterBars = [];
            const masterParams = [];
            let stateN = createInitialState(bpm);
            let stateE = createInitialState(bpm);
            let stateM = createInitialState(bpm);
            // Parsing helper
            const parseLines = (linesToParse, bars, params, state, isBranched, markFirstAsBranchStart = false) => {
                let barStartBpm = state.bpm;
                let barStartScroll = state.scroll;
                let barStartGogoTime = state.gogoTime;
                // Note: Measure ratio logic in TJA is tricky. Usually #MEASURE applies to the NEXT bar.
                // We use state.measureRatio as the ratio for the CURRENT accumulating bar.
                let isFirstBar = true;
                for (const line of linesToParse) {
                    if (line.startsWith('#')) {
                        const upperLine = line.toUpperCase();
                        if (upperLine.startsWith('#BPMCHANGE')) {
                            const parts = line.split(/[:\s]+/);
                            if (parts.length >= 2) {
                                const val = parseFloat(parts[1]);
                                if (!isNaN(val)) {
                                    state.bpm = val;
                                    state.currentBarBpmChanges.push({ index: state.currentBarBuffer.length, bpm: val });
                                }
                            }
                        }
                        else if (upperLine.startsWith('#BPM:')) { // Handle incorrect usage
                            const val = parseFloat(line.substring(5));
                            if (!isNaN(val)) {
                                state.bpm = val;
                                state.currentBarBpmChanges.push({ index: state.currentBarBuffer.length, bpm: val });
                            }
                        }
                        else if (upperLine.startsWith('#SCROLL')) {
                            const parts = line.split(/[:\s]+/);
                            if (parts.length >= 2) {
                                const val = parseFloat(parts[1]);
                                if (!isNaN(val)) {
                                    state.scroll = val;
                                    state.currentBarScrollChanges.push({ index: state.currentBarBuffer.length, scroll: val });
                                }
                            }
                        }
                        else if (upperLine.startsWith('#MEASURE')) {
                            const parts = line.split(/[:\s]+/);
                            if (parts.length >= 2) {
                                const fraction = parts[1].split('/');
                                if (fraction.length === 2) {
                                    const num = parseFloat(fraction[0]);
                                    const den = parseFloat(fraction[1]);
                                    if (!isNaN(num) && !isNaN(den) && den !== 0) {
                                        state.measureRatio = num / den;
                                    }
                                }
                            }
                        }
                        else if (upperLine.startsWith('#GOGOSTART')) {
                            state.gogoTime = true;
                            state.currentBarGogoChanges.push({ index: state.currentBarBuffer.length, isGogo: true });
                            if (state.currentBarBuffer.length === 0)
                                barStartGogoTime = true;
                        }
                        else if (upperLine.startsWith('#GOGOEND')) {
                            state.gogoTime = false;
                            state.currentBarGogoChanges.push({ index: state.currentBarBuffer.length, isGogo: false });
                            if (state.currentBarBuffer.length === 0)
                                barStartGogoTime = false;
                        }
                        // Ignore other commands
                        continue;
                    }
                    let tempLine = line;
                    while (true) {
                        const commaIdx = tempLine.indexOf(',');
                        if (commaIdx === -1) {
                            state.currentBarBuffer += tempLine;
                            break;
                        }
                        else {
                            const segment = tempLine.substring(0, commaIdx);
                            state.currentBarBuffer += segment;
                            const cleanedBar = state.currentBarBuffer.trim();
                            if (cleanedBar.length === 0) {
                                bars.push([]);
                            }
                            else {
                                bars.push(cleanedBar.split(''));
                            }
                            params.push({
                                bpm: barStartBpm,
                                scroll: barStartScroll,
                                measureRatio: state.measureRatio,
                                gogoTime: barStartGogoTime,
                                isBranched: isBranched,
                                isBranchStart: isBranched && markFirstAsBranchStart && isFirstBar,
                                bpmChanges: state.currentBarBpmChanges.length > 0 ? [...state.currentBarBpmChanges] : undefined,
                                scrollChanges: state.currentBarScrollChanges.length > 0 ? [...state.currentBarScrollChanges] : undefined,
                                gogoChanges: state.currentBarGogoChanges.length > 0 ? [...state.currentBarGogoChanges] : undefined
                            });
                            isFirstBar = false;
                            barStartBpm = state.bpm;
                            barStartScroll = state.scroll;
                            barStartGogoTime = state.gogoTime;
                            state.currentBarBpmChanges = [];
                            state.currentBarScrollChanges = [];
                            state.currentBarGogoChanges = [];
                            state.currentBarBuffer = '';
                            tempLine = tempLine.substring(commaIdx + 1);
                        }
                    }
                }
            };
            // Main Parse Loop
            let bufferCommon = [];
            let bufferN = [];
            let bufferE = [];
            let bufferM = [];
            let inBranch = false;
            let currentBranchTarget = 'n';
            let hasSeenBranchStart = false; // To track if we should even create branch objects
            // Process line by line
            for (const line of courseData) {
                const upper = line.toUpperCase().trim();
                if (upper.startsWith('#BRANCHSTART')) {
                    hasSeenBranchStart = true;
                    // Flush Common to all
                    if (bufferCommon.length > 0) {
                        parseLines(bufferCommon, normalBars, normalParams, stateN, false);
                        parseLines(bufferCommon, expertBars, expertParams, stateE, false);
                        parseLines(bufferCommon, masterBars, masterParams, stateM, false);
                        bufferCommon = [];
                    }
                    // Flush previous branch if implicitly ended
                    if (inBranch) {
                        const srcN = bufferN;
                        const srcE = bufferE.length > 0 ? bufferE : srcN; // Fallback N
                        const srcM = bufferM.length > 0 ? bufferM : srcE; // Fallback E
                        parseLines(srcN, normalBars, normalParams, stateN, true, true);
                        parseLines(srcE, expertBars, expertParams, stateE, true, true);
                        parseLines(srcM, masterBars, masterParams, stateM, true, true);
                    }
                    inBranch = true;
                    currentBranchTarget = 'n';
                    bufferN = [];
                    bufferE = [];
                    bufferM = [];
                }
                else if (upper.startsWith('#BRANCHEND')) {
                    // Flush Branches
                    const srcN = bufferN;
                    const srcE = bufferE.length > 0 ? bufferE : srcN; // Fallback N
                    const srcM = bufferM.length > 0 ? bufferM : srcE; // Fallback E
                    parseLines(srcN, normalBars, normalParams, stateN, true, true);
                    parseLines(srcE, expertBars, expertParams, stateE, true, true);
                    parseLines(srcM, masterBars, masterParams, stateM, true, true);
                    inBranch = false;
                    bufferN = [];
                    bufferE = [];
                    bufferM = [];
                }
                else if (inBranch && upper === '#N') {
                    currentBranchTarget = 'n';
                }
                else if (inBranch && upper === '#E') {
                    currentBranchTarget = 'e';
                }
                else if (inBranch && upper === '#M') {
                    currentBranchTarget = 'm';
                }
                else {
                    if (inBranch) {
                        if (currentBranchTarget === 'n')
                            bufferN.push(line);
                        else if (currentBranchTarget === 'e')
                            bufferE.push(line);
                        else if (currentBranchTarget === 'm')
                            bufferM.push(line);
                    }
                    else {
                        bufferCommon.push(line);
                    }
                }
            }
            // Flush remaining
            if (inBranch) {
                // Implicit end of branch
                const srcN = bufferN;
                const srcE = bufferE.length > 0 ? bufferE : srcN;
                const srcM = bufferM.length > 0 ? bufferM : srcE;
                parseLines(srcN, normalBars, normalParams, stateN, true, true);
                parseLines(srcE, expertBars, expertParams, stateE, true, true);
                parseLines(srcM, masterBars, masterParams, stateM, true, true);
            }
            else if (bufferCommon.length > 0) {
                parseLines(bufferCommon, normalBars, normalParams, stateN, false);
                parseLines(bufferCommon, expertBars, expertParams, stateE, false);
                parseLines(bufferCommon, masterBars, masterParams, stateM, false);
            }
            // Create Charts
            const createChart = (bars, params, type) => {
                return {
                    bars,
                    barParams: params,
                    loop: detectLoop(bars),
                    balloonCounts,
                    headers,
                    title,
                    subtitle,
                    bpm,
                    level,
                    course,
                    branchType: type
                };
            };
            const normalChart = createChart(normalBars, normalParams, 'normal');
            if (hasSeenBranchStart) {
                normalChart.branches = {
                    normal: normalChart,
                    expert: createChart(expertBars, expertParams, 'expert'),
                    master: createChart(masterBars, masterParams, 'master')
                };
            }
            parsedCourses[courseName] = normalChart;
        }
    }
    return parsedCourses;
}
function detectLoop(bars) {
    // 1. Identify start (first non-empty bar)
    let firstNonEmpty = -1;
    for (let i = 0; i < bars.length; i++) {
        if (!isBarEmpty(bars[i])) {
            firstNonEmpty = i;
            break;
        }
    }
    // If completely empty or no bars
    if (firstNonEmpty === -1)
        return undefined;
    const remainingLength = bars.length - firstNonEmpty;
    // Try period lengths
    for (let period = 1; period <= remainingLength / 2; period++) {
        // Define the pattern
        const pattern = bars.slice(firstNonEmpty, firstNonEmpty + period);
        // Check how many times this pattern repeats
        let iterations = 0;
        let isPatternMatch = true;
        let currentIdx = firstNonEmpty;
        while (currentIdx + period <= bars.length) {
            // Check if the segment matches pattern
            let match = true;
            for (let k = 0; k < period; k++) {
                if (!areBarsEqual(bars[currentIdx + k], pattern[k])) {
                    match = false;
                    break;
                }
            }
            if (match) {
                iterations++;
                currentIdx += period;
            }
            else {
                break;
            }
        }
        // We need at least 2 iterations to call it a loop
        if (iterations >= 2) {
            // Verify that everything remaining after the loop is empty
            let remainingEmpty = true;
            for (let i = currentIdx; i < bars.length; i++) {
                if (!isBarEmpty(bars[i])) {
                    remainingEmpty = false;
                    break;
                }
            }
            if (remainingEmpty) {
                return {
                    startBarIndex: firstNonEmpty,
                    period: period,
                    iterations: iterations
                };
            }
        }
    }
    return undefined;
}
function isBarEmpty(bar) {
    if (bar.length === 0)
        return true;
    return bar.every(c => c === '0');
}
function areBarsEqual(b1, b2) {
    if (b1.length !== b2.length)
        return false;
    for (let i = 0; i < b1.length; i++) {
        if (b1[i] !== b2[i])
            return false;
    }
    return true;
}
