import { parseTJA } from './src/tja-parser.js';
import { exampleTJA } from './src/example-data.js';

try {
    console.log("Testing TJA Parser...");
    const bars = parseTJA(exampleTJA);
    console.log(`Successfully parsed ${bars.length} bars.`);
    
    if (bars.length === 0) {
        throw new Error("Parsed 0 bars. Something is wrong.");
    }

    const firstBar = bars[0];
    console.log("First bar:", firstBar);
    
    // Check if notes are valid characters
    const validNotes = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const invalidNote = firstBar.find(n => !validNotes.includes(n));
    if (invalidNote) {
        console.warn(`Warning: Found unexpected note char '${invalidNote}' in first bar.`);
    }

    console.log("Parser test passed.");
} catch (e) {
    console.error("Parser test failed:", e);
    process.exit(1);
}
