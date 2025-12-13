
import { parseTJA } from './tja-parser.js';
import { renderChart } from './renderer.js';
import { exampleTJA } from './example-data.js';

const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement | null;

function init(): void {
    if (!canvas) {
        console.error("Canvas element with ID 'chart-canvas' not found.");
        return;
    }

    try {
        console.log("Starting TJA Analyzer...");
        const bars: string[][] = parseTJA(exampleTJA);
        console.log(`Parsed ${bars.length} bars.`);
        renderChart(bars, canvas);
    } catch (e: unknown) {
        console.error("Error:", e);
        const container = document.getElementById('app');
        if (container) {
            if (e instanceof Error) {
                container.innerHTML += `<div class="error">Error: ${e.message}</div>`;
            } else {
                container.innerHTML += `<div class="error">An unknown error occurred.</div>`;
            }
        }
    }
}

// Handle resizing roughly
window.addEventListener('resize', () => {
   // Re-render if needed, but simple version maybe just refresh
   // init(); 
   // Actually, we should store bars and re-render.
});

init();
