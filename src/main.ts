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
    judgementClient.onMessage(async (event: ServerEvent) => {
        if (event.type === 'gameplay_start') {
            console.log("Gameplay Start Event Received - Resetting Judgements");
            judgements = [];
            parsedBars = null;

            if (event.tjaSummaries && event.tjaSummaries.length > 0) {
                // Sort summaries by player number to find the lowest
                const sortedSummaries = [...event.tjaSummaries].sort((a, b) => a.player - b.player);
                const firstSummary = sortedSummaries[0];

                if (firstSummary.tjaContent) {
                    try {
                        parsedBars = parseTJA(firstSummary.tjaContent);
                    } catch (e) {
                        console.error("Error parsing TJA content:", e);
                        alert("Failed to parse TJA content. See console for details.");
                    }
                }
            }
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

    // Setup file pickers
    const tjaFilePicker = document.getElementById('tja-file-picker') as HTMLInputElement;
    if (tjaFilePicker) {
        tjaFilePicker.addEventListener('change', async (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (files && files.length > 0) {
                const file = files[0];
                try {
                    const content = await file.text();
                    parsedBars = parseTJA(content);
                    refreshChart();
                } catch (e) {
                    console.error("Error parsing TJA file:", e);
                    alert("Failed to parse TJA file. See console for details.");
                }
            }
        });
    }

    // Expose for testing
    (window as any).setJudgements = (newJudgements: string[]) => {
        judgements = newJudgements;
        refreshChart();
    };

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