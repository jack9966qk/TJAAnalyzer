export interface LoopInfo {
    startBarIndex: number;
    period: number;
    iterations: number;
}

export interface ParsedChart {
    bars: string[][];
    loop?: LoopInfo;
}

export function parseTJA(content: string): Record<string, ParsedChart> {
    const lines: string[] = content.split(/\r?\n/);
    const courses: Record<string, string[]> = {};
    let currentCourse: string | null = null;
    let isParsingChart: boolean = false;

    // First pass: extract raw chart data for each course
    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        if (line.startsWith('COURSE:')) {
            currentCourse = line.substring(7).trim();
            // Normalize common course names if needed, but strict matching is usually fine
            // except for case sensitivity.
            // Let's store by lower case for easier lookup.
            courses[currentCourse.toLowerCase()] = [];
            isParsingChart = false;
        } else if (line.startsWith('#START')) {
            isParsingChart = true;
        } else if (line.startsWith('#END')) {
            isParsingChart = false;
            currentCourse = null;
        } else if (isParsingChart && currentCourse) {
            // Remove comments
            const commentIndex: number = line.indexOf('//');
            if (commentIndex !== -1) {
                line = line.substring(0, commentIndex).trim();
            }
            
            // Ignore commands (lines starting with #)
            if (line.startsWith('#')) {
                continue;
            }

            if (line) {
                courses[currentCourse.toLowerCase()].push(line);
            }
        }
    }

    const parsedCourses: Record<string, ParsedChart> = {};

    for (const courseName in courses) {
        if (Object.prototype.hasOwnProperty.call(courses, courseName)) {
            const courseData = courses[courseName];
            // Combine lines into one string
            const fullString: string = courseData.join('');
            
            // Split by comma to get bars
            // Note: The last bar might have a trailing comma, resulting in an empty string at the end.
            const rawBars: string[] = fullString.split(',');

            // Remove the last element if it's empty (result of trailing comma)
            if (rawBars.length > 0 && rawBars[rawBars.length - 1].trim() === '') {
                rawBars.pop();
            }

            const bars: string[][] = rawBars.map((rawBar: string) => {
                const cleanedBar: string = rawBar.trim();
                // A bar containing only '0's is a rest bar, but still a bar.
                // An empty string might be an artifact of splitting.
                // However, standard TJA ends with a comma, so the last element is empty.
                // We should filter out empty strings if they are truly empty (length 0).
                // Empty string means empty bar (rest) in our new logic? 
                // Wait, if it's empty, we return empty array, which is "empty bar".
                if (cleanedBar.length === 0) return [];
                
                // Convert string to array of notes (chars)
                return cleanedBar.split('');
            });

            const loop = detectLoop(bars);
            parsedCourses[courseName] = { bars, loop };
        }
    }

    return parsedCourses;
}

function detectLoop(bars: string[][]): LoopInfo | undefined {
    // 1. Identify start (first non-empty bar)
    let firstNonEmpty = -1;
    for (let i = 0; i < bars.length; i++) {
        if (!isBarEmpty(bars[i])) {
            firstNonEmpty = i;
            break;
        }
    }

    // If completely empty or no bars
    if (firstNonEmpty === -1) return undefined;

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
            } else {
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

function isBarEmpty(bar: string[]): boolean {
    if (bar.length === 0) return true;
    return bar.every(c => c === '0');
}

function areBarsEqual(b1: string[], b2: string[]): boolean {
    if (b1.length !== b2.length) return false;
    for (let i = 0; i < b1.length; i++) {
        if (b1[i] !== b2[i]) return false;
    }
    return true;
}