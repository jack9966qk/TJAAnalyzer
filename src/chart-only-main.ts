import { TJAChart } from './tja-chart.js';
import { parseTJA } from './tja-parser.js';
import { ViewOptions } from './renderer.js';
import { exampleTJA } from './example-data.js';

console.log('Chart Only Main Loaded');

const tjaChart = document.getElementById('chart-component') as TJAChart;

// Expose API for Playwright
(window as any).loadChart = (tjaContent: string, difficulty: string = 'oni') => {
    try {
        const parsed = parseTJA(tjaContent);
        const chart = parsed[difficulty] || Object.values(parsed)[0];
        
        if (chart) {
            tjaChart.chart = chart;
            // Also update difficulty display if we had one, but here we just render
        } else {
            console.error('Difficulty not found');
        }
    } catch (e) {
        console.error('Failed to parse TJA', e);
    }
};

(window as any).setOptions = (options: ViewOptions) => {
    tjaChart.viewOptions = options;
};

// Initial Setup
// Ensure tja-chart is defined (imported above)

// Default Options
tjaChart.viewOptions = {
    viewMode: 'original',
    coloringMode: 'categorical',
    visibility: { perfect: true, good: true, poor: true },
    collapsedLoop: false,
    selectedLoopIteration: undefined,
    beatsPerLine: 16,
    selection: null,
    annotations: {},
    isAnnotationMode: false,
    showAllBranches: false
};

// Load Example by Default
try {
    console.log('Loading example chart...');
    (window as any).loadChart(exampleTJA, 'oni');
    console.log('Example chart loaded.');
} catch (e) {
    console.error('Error loading example chart:', e);
}
