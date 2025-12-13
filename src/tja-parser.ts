export function parseTJA(content: string): Record<string, string[][]> {
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

    const parsedCourses: Record<string, string[][]> = {};

    for (const courseName in courses) {
        if (Object.prototype.hasOwnProperty.call(courses, courseName)) {
            const courseData = courses[courseName];
            // Combine lines into one string
            const fullString: string = courseData.join('');
            
            // Split by comma to get bars
            // Note: The last bar might have a trailing comma, resulting in an empty string at the end.
            const rawBars: string[] = fullString.split(',');

            const bars: string[][] = rawBars.map((rawBar: string) => {
                const cleanedBar: string = rawBar.trim();
                // A bar containing only '0's is a rest bar, but still a bar.
                // An empty string might be an artifact of splitting.
                // However, standard TJA ends with a comma, so the last element is empty.
                // We should filter out empty strings if they are truly empty (length 0).
                if (cleanedBar.length === 0) return null;
                
                // Convert string to array of notes (chars)
                return cleanedBar.split('');
            }).filter((bar): bar is string[] => bar !== null);

            parsedCourses[courseName] = bars;
        }
    }

    return parsedCourses;
}
