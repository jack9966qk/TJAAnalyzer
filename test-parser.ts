import { parseTJA } from './src/tja-parser.js';
import { exampleTJA } from './src/example-data.js';

try {
    console.log("Testing TJA Parser...");
    const charts: Record<string, string[][]> = parseTJA(exampleTJA);
    const difficulties = Object.keys(charts);
    console.log(`Successfully parsed ${difficulties.length} difficulties: ${difficulties.join(', ')}`);

    if (difficulties.length === 0) {
        throw new Error("Parsed 0 difficulties. Something is wrong.");
    }

    const bars = charts['edit'];
    if (!bars) {
        throw new Error("'edit' difficulty not found in parsed charts.");
    }

    console.log(`'edit' difficulty has ${bars.length} bars.`);

    if (bars.length === 0) {
        throw new Error("Parsed 0 bars for 'edit' difficulty. Something is wrong.");
    }

    const firstBar: string[] = bars[0];
    console.log("First bar of 'edit' difficulty:", firstBar);
    
    // Check if notes are valid characters
    const validNotes: string[] = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    const invalidNote: string | undefined = firstBar.find((n: string) => !validNotes.includes(n));
    if (invalidNote) {
        console.warn(`Warning: Found unexpected note char '${invalidNote}' in first bar.`);
    }

    console.log("Parser test passed.");
} catch (e: unknown) {
    console.error("Parser test failed:", e);
    process.exit(1);
}
