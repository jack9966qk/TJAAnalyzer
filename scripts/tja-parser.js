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
            // Determine initial BPM
            let currentBpm = bpm;
            // Parse BALLOON counts
            let balloonCounts = [];
            const balloonStr = headers['BALLOON'];
            if (balloonStr) {
                balloonCounts = balloonStr.split(/[,]+/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
            }
            let barStartBpm = currentBpm;
            let currentScroll = 1.0;
            let barStartScroll = currentScroll;
            let currentMeasureRatio = 1.0;
            let barStartMeasureRatio = currentMeasureRatio;
            let currentGogoTime = false;
            let barStartGogoTime = currentGogoTime;
            const bars = [];
            const barParams = [];
            let currentBarBuffer = '';
            let currentBarBpmChanges = [];
            let currentBarScrollChanges = [];
            let currentBarGogoChanges = [];
            for (const line of courseData) {
                if (line.startsWith('#')) {
                    // Command processing
                    const upperLine = line.toUpperCase();
                    if (upperLine.startsWith('#BPMCHANGE')) {
                        // Can be space or colon separator
                        const parts = line.split(/[:\s]+/);
                        if (parts.length >= 2) {
                            const val = parseFloat(parts[1]);
                            if (!isNaN(val)) {
                                currentBpm = val;
                                currentBarBpmChanges.push({ index: currentBarBuffer.length, bpm: val });
                            }
                        }
                    }
                    else if (upperLine.startsWith('#BPM:')) {
                        const val = parseFloat(line.substring(5));
                        if (!isNaN(val)) {
                            currentBpm = val;
                            currentBarBpmChanges.push({ index: currentBarBuffer.length, bpm: val });
                        }
                    }
                    else if (upperLine.startsWith('#SCROLL')) {
                        // SCROLL can be #SCROLL:1.0 or #SCROLL 1.0
                        const parts = line.split(/[:\s]+/);
                        if (parts.length >= 2) {
                            const val = parseFloat(parts[1]);
                            if (!isNaN(val)) {
                                currentScroll = val;
                                currentBarScrollChanges.push({ index: currentBarBuffer.length, scroll: val });
                            }
                        }
                    }
                    else if (upperLine.startsWith('#MEASURE')) {
                        // #MEASURE x/y
                        const parts = line.split(/[:\s]+/);
                        if (parts.length >= 2) {
                            const fraction = parts[1].split('/');
                            if (fraction.length === 2) {
                                const num = parseFloat(fraction[0]);
                                const den = parseFloat(fraction[1]);
                                if (!isNaN(num) && !isNaN(den) && den !== 0) {
                                    // 4/4 is 1.0.  x/y is (x/y) / (4/4) = x/y * 1 = x/y?
                                    // No, standard bar is 4/4.
                                    // So ratio = (num/den) / (4/4) = num/den.
                                    currentMeasureRatio = num / den;
                                    // If we are in the middle of a bar, does it apply immediately?
                                    // Usually commands apply to the NEXT bar unless inside.
                                    // But TJA commands are stream-processed.
                                    // For simplicity, we assume #MEASURE is usually at the start of a line/bar.
                                    // We'll update the 'current' which will be latched at the end of the bar.
                                }
                            }
                        }
                    }
                    else if (upperLine.startsWith('#GOGOSTART')) {
                        currentGogoTime = true;
                        if (currentBarBuffer.length === 0) {
                            barStartGogoTime = true;
                        }
                        else {
                            currentBarGogoChanges.push({ index: currentBarBuffer.length, isGogo: true });
                        }
                    }
                    else if (upperLine.startsWith('#GOGOEND')) {
                        currentGogoTime = false;
                        if (currentBarBuffer.length === 0) {
                            barStartGogoTime = false;
                        }
                        else {
                            currentBarGogoChanges.push({ index: currentBarBuffer.length, isGogo: false });
                        }
                    }
                    continue;
                }
                // Process note data
                // Split by comma. Everything up to comma is part of current bar.
                // If comma exists, we push current bar and start new.
                // We must handle multiple commas in one line.
                let tempLine = line;
                while (true) {
                    const commaIdx = tempLine.indexOf(',');
                    if (commaIdx === -1) {
                        currentBarBuffer += tempLine;
                        break;
                    }
                    else {
                        // Found a bar end
                        const segment = tempLine.substring(0, commaIdx);
                        currentBarBuffer += segment;
                        // Push bar
                        const cleanedBar = currentBarBuffer.trim();
                        // See logic about empty string vs empty bar.
                        // Standard parser: empty string between commas is empty bar.
                        if (cleanedBar.length === 0) {
                            bars.push([]);
                        }
                        else {
                            bars.push(cleanedBar.split(''));
                        }
                        // Use the measure ratio that was active at the start of this bar (or during?)
                        // Typically #MEASURE is placed before the bar data.
                        // If we encountered #MEASURE inside this bar's lines, `currentMeasureRatio` is updated.
                        // Ideally we should use the value active for this bar. 
                        // If it changed mid-bar, that's rare/undefined behavior for TJA usually. 
                        // We will use the `currentMeasureRatio` as it stands when we finish the bar.
                        // Wait, if I have:
                        // #MEASURE 4/4
                        // 1111,
                        // #MEASURE 3/4
                        // 111,
                        // The first bar gets 4/4 (1.0). The second gets 3/4.
                        // Our `barStartMeasureRatio` isn't tracking updates properly if we just use `current`.
                        // But we don't really have `barStartMeasureRatio` logic fully fleshed out above for commands mid-bar.
                        // However, standard TJA commands are between lines.
                        // So `currentMeasureRatio` should be correct when we hit the comma.
                        barParams.push({
                            bpm: barStartBpm,
                            scroll: barStartScroll,
                            measureRatio: currentMeasureRatio,
                            gogoTime: barStartGogoTime,
                            bpmChanges: currentBarBpmChanges.length > 0 ? [...currentBarBpmChanges] : undefined,
                            scrollChanges: currentBarScrollChanges.length > 0 ? [...currentBarScrollChanges] : undefined,
                            gogoChanges: currentBarGogoChanges.length > 0 ? [...currentBarGogoChanges] : undefined
                        });
                        // Prepare for next bar
                        barStartBpm = currentBpm;
                        barStartScroll = currentScroll;
                        barStartGogoTime = currentGogoTime;
                        // measure ratio persists until changed
                        currentBarBpmChanges = [];
                        currentBarScrollChanges = [];
                        currentBarGogoChanges = [];
                        currentBarBuffer = '';
                        tempLine = tempLine.substring(commaIdx + 1);
                    }
                }
            }
            // Handle any remaining buffer?
            // Usually valid TJA ends with comma. If there is leftover text without comma, strict parsers might ignore or warn.
            // We'll ignore it to avoid partial bars unless it's just whitespace.
            if (currentBarBuffer.trim().length > 0) {
                // If we want to be robust, we could treat it as a bar if non-empty, but standard is comma-terminated.
            }
            const loop = detectLoop(bars);
            parsedCourses[courseName] = {
                bars,
                barParams,
                loop,
                balloonCounts,
                headers,
                title,
                subtitle,
                bpm,
                level,
                course
            };
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
