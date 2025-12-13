
import { parseTJA } from './tja-parser.js';
import { renderChart } from './renderer.js';
import { exampleTJA } from './example-data.js';

const canvas = document.getElementById('chart-canvas');

function init() {
    try {
        console.log("Starting TJA Analyzer...");
        const bars = parseTJA(exampleTJA);
        console.log(`Parsed ${bars.length} bars.`);
        renderChart(bars, canvas);
    } catch (e) {
        console.error("Error:", e);
        const container = document.getElementById('app');
        container.innerHTML += `<div class="error">Error: ${e.message}</div>`;
    }
}

// Handle resizing roughly
window.addEventListener('resize', () => {
   // Re-render if needed, but simple version maybe just refresh
   // init(); 
   // Actually, we should store bars and re-render.
});

init();
