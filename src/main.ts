
import { parseTJA } from './tja-parser.js';
import { renderChart } from './renderer.js';
import { exampleTJA } from './example-data.js';

const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement | null;
let parsedBars: string[][] | null = null;

function init(): void {
    if (!canvas) {
        console.error("Canvas element with ID 'chart-canvas' not found.");
        return;
    }

    try {
        console.log("Starting TJA Analyzer...");
        parsedBars = parseTJA(exampleTJA);
        console.log(`Parsed ${parsedBars.length} bars.`);
        renderChart(parsedBars, canvas);
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

// Handle resizing
let resizeTimeout: number | undefined;
window.addEventListener('resize', () => {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
        if (canvas && parsedBars) {
             renderChart(parsedBars, canvas);
        }
    }, 100);
});

init();
