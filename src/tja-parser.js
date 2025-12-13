export function parseTJA(content) {
    const lines = content.split(/\r?\n/);
    const courses = {};
    let currentCourse = null;
    let isParsingChart = false;

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
            const commentIndex = line.indexOf('//');
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

    // Select course: Edit > Oni > others (not required but good fallback)
    let selectedData = courses['edit'];
    if (!selectedData) {
        selectedData = courses['oni'];
    }

    if (!selectedData) {
        throw new Error("No 'Edit' or 'Oni' course found in TJA file.");
    }

    // Combine lines into one string
    const fullString = selectedData.join('');
    
    // Split by comma to get bars
    // Note: The last bar might have a trailing comma, resulting in an empty string at the end.
    const rawBars = fullString.split(',');

    const bars = rawBars.map(rawBar => {
        const cleanedBar = rawBar.trim();
        // A bar containing only '0's is a rest bar, but still a bar.
        // An empty string might be an artifact of splitting.
        // However, standard TJA ends with a comma, so the last element is empty.
        // We should filter out empty strings if they are truly empty (length 0).
        if (cleanedBar.length === 0) return null;
        
        // Convert string to array of notes (chars)
        return cleanedBar.split('');
    }).filter(bar => bar !== null);

    return bars;
}
