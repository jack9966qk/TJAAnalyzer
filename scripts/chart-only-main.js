import { TJAChart } from './tja-chart.js';
import { parseTJA } from './tja-parser.js';
import { exampleTJA } from './example-data.js';
// Ensure side-effects
console.log('TJAChart module loaded', TJAChart);
console.log('Chart Only Main Loaded');
const tjaChart = document.getElementById('chart-component');
// Expose API for Playwright
window.loadChart = (tjaContent, difficulty = 'oni') => {
    try {
        const parsed = parseTJA(tjaContent);
        const chart = parsed[difficulty] || Object.values(parsed)[0];
        if (chart) {
            tjaChart.chart = chart;
            // Also update difficulty display if we had one, but here we just render
        }
        else {
            console.error('Difficulty not found');
        }
    }
    catch (e) {
        console.error('Failed to parse TJA', e);
    }
};
window.setOptions = (options) => {
    tjaChart.viewOptions = options;
};
// Listen for annotation changes from the component
tjaChart.addEventListener('annotations-change', (e) => {
    const newAnnotations = e.detail;
    // Update options with new annotations
    if (tjaChart.viewOptions) {
        tjaChart.viewOptions = {
            ...tjaChart.viewOptions,
            annotations: newAnnotations
        };
    }
});
window.autoAnnotate = () => {
    tjaChart.autoAnnotate();
};
window.setJudgements = (judgements, deltas) => {
    tjaChart.judgements = judgements;
    tjaChart.judgementDeltas = deltas || [];
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
    window.loadChart(exampleTJA, 'oni');
    console.log('Example chart loaded.');
}
catch (e) {
    console.error('Error loading example chart:', e);
}
