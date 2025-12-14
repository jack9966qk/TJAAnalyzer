import { parseTJA } from './src/tja-parser.js';
import { exampleTJA } from './src/example-data.js';

try {
    console.log("Testing TJA Parser...");
    const charts = parseTJA(exampleTJA);
    const difficulties = Object.keys(charts);
    console.log(`Successfully parsed ${difficulties.length} difficulties: ${difficulties.join(', ')}`);

    if (difficulties.length === 0) {
        throw new Error("Parsed 0 difficulties. Something is wrong.");
    }

    const chart = charts['edit'];
    if (!chart || !chart.bars) {
        throw new Error("'edit' difficulty not found in parsed charts.");
    }
    const bars = chart.bars;

    console.log(`'edit' difficulty has ${bars.length} bars.`);

    if (bars.length === 0) {
        throw new Error("Parsed 0 bars for 'edit' difficulty. Something is wrong.");
    }

    const firstBar: string[] = bars[0];
    console.log("First bar of 'edit' difficulty:", firstBar);
    
    // Check BPM/Scroll
    const params0 = chart.barParams[0];
    console.log(`Bar 0 Params: BPM=${params0.bpm}, Scroll=${params0.scroll}`);
    if (params0.bpm !== 125) throw new Error(`Expected Bar 0 BPM to be 125, got ${params0.bpm}`);
    
    // Check Bar 4 (after BPMCHANGE 250 and SCROLL 0.75)
    // Counting bars in exampleTJA:
    // Bar 0: 2200...
    // Bar 1: 2200...
    // Bar 2: 5000...
    // Bar 3: 0 (measure 2/4)
    // Bar 4: 3000... (measure 4/4, after change)
    const params4 = chart.barParams[4];
    console.log(`Bar 4 Params: BPM=${params4.bpm}, Scroll=${params4.scroll}`);
    if (params4.bpm !== 250) throw new Error(`Expected Bar 4 BPM to be 250, got ${params4.bpm}`);
    if (params4.scroll !== 0.75) throw new Error(`Expected Bar 4 Scroll to be 0.75, got ${params4.scroll}`);

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
