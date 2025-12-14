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
    
    // The parser behavior is that changes at the start of the bar are recorded in bpmChanges/scrollChanges
    // while the base 'bpm'/'scroll' property reflects the state at the end of the previous bar.
    // The renderer handles this by checking changes at index 0.
    
    if (params4.bpm !== 125) throw new Error(`Expected Bar 4 Base BPM to be 125, got ${params4.bpm}`);
    
    const bpmChange = params4.bpmChanges?.find(c => c.index === 0);
    if (!bpmChange || bpmChange.bpm !== 250) {
        throw new Error(`Expected Bar 4 to have BPM Change to 250 at index 0, got ${JSON.stringify(params4.bpmChanges)}`);
    }

    if (params4.scroll !== 1) throw new Error(`Expected Bar 4 Base Scroll to be 1, got ${params4.scroll}`);

    const scrollChange = params4.scrollChanges?.find(c => c.index === 0);
    if (!scrollChange || scrollChange.scroll !== 0.75) {
        throw new Error(`Expected Bar 4 to have Scroll Change to 0.75 at index 0, got ${JSON.stringify(params4.scrollChanges)}`);
    }

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
