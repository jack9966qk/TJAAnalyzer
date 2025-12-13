import { parseTJA } from './tja-parser.js';
import { renderChart } from './renderer.js';
import { exampleTJA } from './example-data.js';
import { JudgementClient, ServerEvent } from './judgement-client.js';

const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement | null;
let parsedBars: string[][] | null = null;
let currentViewMode: 'original' | 'judgements' = 'original';

// Judgement State
const judgementClient = new JudgementClient();
let judgements: string[] = [];

function init(): void {
    if (!canvas) {
        console.error("Canvas element with ID 'chart-canvas' not found.");
        return;
    }

    // Setup view mode controls
    const viewModeRadios = document.querySelectorAll('input[name="viewMode"]');
    viewModeRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const target = event.target as HTMLInputElement;
            if (target.checked) {
                currentViewMode = target.value as 'original' | 'judgements';
                refreshChart();
            }
        });
    });

    // Setup Judgement Connection Controls
    const hostInput = document.getElementById('host-input') as HTMLInputElement;
    const portInput = document.getElementById('port-input') as HTMLInputElement;
    const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
    const testStreamBtn = document.getElementById('test-stream-btn') as HTMLButtonElement;

    if (connectBtn && hostInput && portInput) {
        connectBtn.addEventListener('click', () => {
            const host = hostInput.value;
            const port = parseInt(portInput.value, 10);
            if (host && port) {
                judgementClient.connect(host, port);
            } else {
                alert("Please enter valid Host and Port.");
            }
        });
    }

    if (testStreamBtn) {
        testStreamBtn.addEventListener('click', () => {
            judgementClient.startSimulation();
        });
    }

    // Setup Judgement Client Callbacks
    judgementClient.onMessage((event: ServerEvent) => {
        if (event.type === 'gameplay_start') {
            console.log("Gameplay Start Event Received - Resetting Judgements");
            judgements = [];
            refreshChart();
        } else if (event.type === 'judgement') {
            // console.log("Judgement Received:", event.judgement);
            judgements.push(event.judgement);
            refreshChart();
        }
    });

    judgementClient.onStatusChange((status: string) => {
        console.log("Judgement Client Status:", status);
        if (connectBtn) {
            connectBtn.innerText = status === 'Connected' ? 'Connected' : 'Connect';
        }
    });

    try {
        console.log("Starting TJA Analyzer...");
        parsedBars = parseTJA(exampleTJA);
        console.log(`Parsed ${parsedBars.length} bars.`);
        refreshChart();
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

function refreshChart() {
    if (parsedBars && canvas) {
        renderChart(parsedBars, canvas, currentViewMode, judgements);
    }
}

// Handle resizing
let resizeTimeout: number | undefined;
window.addEventListener('resize', () => {
    if (resizeTimeout) {
        clearTimeout(resizeTimeout);
    }
    resizeTimeout = window.setTimeout(() => {
        refreshChart();
    }, 100);
});

init();