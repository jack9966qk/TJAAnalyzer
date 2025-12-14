import { parseTJA, ParsedChart } from './tja-parser.js';
import { renderChart, getNoteAt, HitInfo } from './renderer.js';
import { exampleTJA } from './example-data.js';
import { JudgementClient, ServerEvent } from './judgement-client.js';

const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement | null;
let parsedTJACharts: Record<string, ParsedChart> | null = null;
let currentChart: ParsedChart | null = null;
let currentViewMode: 'original' | 'judgements' = 'original';
let collapsedLoop: boolean = false;
let loadedTJAContent: string = exampleTJA;

// Application State
let appMode: 'manual' | 'stream' | 'none' = 'none';
let isSimulating: boolean = false;

// Judgement State
const judgementClient = new JudgementClient();
let judgements: string[] = [];
let judgementDeltas: (number | undefined)[] = []; // Store deltas

// UI Elements
const statusDisplay = document.getElementById('status-display') as HTMLDivElement;
const noteStatsDisplay = document.getElementById('note-stats-display') as HTMLDivElement;
const judgementsRadio = document.getElementById('judgements-radio') as HTMLInputElement;
const originalRadio = document.querySelector('input[name="viewMode"][value="original"]') as HTMLInputElement;
const difficultySelectorContainer = document.getElementById('difficulty-selector-container') as HTMLDivElement;
const difficultySelector = document.getElementById('difficulty-selector') as HTMLSelectElement;
const collapseLoopCheckbox = document.getElementById('collapse-loop-checkbox') as HTMLInputElement;

const manualLoadFieldset = document.getElementById('manual-load-fieldset') as HTMLFieldSetElement;
const eventStreamFieldset = document.getElementById('event-stream-fieldset') as HTMLFieldSetElement;
const clearManualBtn = document.getElementById('clear-manual-btn') as HTMLButtonElement;
const hostInput = document.getElementById('host-input') as HTMLInputElement;
const portInput = document.getElementById('port-input') as HTMLInputElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const testStreamBtn = document.getElementById('test-stream-btn') as HTMLButtonElement;

function updateStatus(message: string) {
    if (statusDisplay) {
        statusDisplay.innerText = message;
    }
}

function updateNoteStats(html: string) {
    if (noteStatsDisplay) {
        noteStatsDisplay.innerHTML = html;
    }
}

function updateMode(newMode: 'manual' | 'stream' | 'none') {
    appMode = newMode;
    console.log(`Switching mode to: ${appMode}`);

    if (appMode === 'manual') {
        manualLoadFieldset.classList.remove('disabled');
        eventStreamFieldset.classList.add('disabled');
        if (clearManualBtn) clearManualBtn.disabled = false;
        
        if (connectBtn) connectBtn.disabled = true;
        if (testStreamBtn) testStreamBtn.disabled = true;
    } else if (appMode === 'stream') {
        manualLoadFieldset.classList.add('disabled');
        eventStreamFieldset.classList.remove('disabled');
        if (clearManualBtn) clearManualBtn.disabled = true;

        if (connectBtn) connectBtn.disabled = false;
        // testStreamBtn logic handled separately based on connection type
    } else { // none
        manualLoadFieldset.classList.remove('disabled');
        eventStreamFieldset.classList.remove('disabled');
        if (clearManualBtn) clearManualBtn.disabled = true;
        
        if (connectBtn) connectBtn.disabled = false;
        if (testStreamBtn) testStreamBtn.disabled = false;
    }
}

function createStatBox(label: string, value: string, highlight: boolean = false): string {
    return `
        <div class="stat-box">
            <div class="stat-label">${label}</div>
            <div class="stat-value ${highlight ? 'stat-value-highlight' : ''}">${value}</div>
        </div>
    `;
}

function formatBPM(val: number): string {
    return val % 1 === 0 ? val.toFixed(0) : val.toFixed(2);
}

function formatHS(val: number): string {
    return val % 1 === 0 ? val.toFixed(1) : val.toFixed(2);
}

function renderStats(hit: HitInfo | null, chart: ParsedChart | null, collapsed: boolean, viewMode: string, judgements: string[]) {
    let html = '';
    const def = '-';

    // 1. Type
    html += createStatBox('Type', hit ? getNoteName(hit.type) : def);
    
    // 2. Gap
    let gap = def;
    if (hit && chart) {
        const g = getGapInfo(chart, hit.originalBarIndex, hit.charIndex);
        if (g) gap = g;
    }
    html += createStatBox('Gap', gap);
    
    // 3. BPM
    html += createStatBox('BPM', hit ? formatBPM(hit.bpm) : def);
    
    // 4. HS
    html += createStatBox('HS', hit ? formatHS(hit.scroll) : def);
    
    // 5. Perceived BPM
    html += createStatBox('Seen BPM', hit ? formatBPM(hit.bpm * hit.scroll) : def);

    // 6. Judgements (Deltas)
    let deltaVal = def;
    let avgDeltaVal = def;
    let allDeltasStr = '';
    
    if (hit && viewMode === 'judgements' && hit.judgeableNoteIndex !== null && chart) {
        const deltas: number[] = [];
        
        if (collapsed && chart.loop) {
            const loop = chart.loop;
            if (hit.originalBarIndex >= loop.startBarIndex && hit.originalBarIndex < loop.startBarIndex + loop.period) {
                // Loop Logic
                let baseIndex = 0;
                for (let b = 0; b < hit.originalBarIndex; b++) {
                    const bar = chart.bars[b];
                    if (bar) {
                        for(const c of bar) if (['1', '2', '3', '4'].includes(c)) baseIndex++;
                    }
                }
                let offsetInBar = 0;
                const targetBar = chart.bars[hit.originalBarIndex];
                for(let c = 0; c < hit.charIndex; c++) {
                        if (['1', '2', '3', '4'].includes(targetBar[c])) offsetInBar++;
                }
                const noteIndexInFirstIter = baseIndex + offsetInBar;
                
                let notesPerLoop = 0;
                for (let k = 0; k < loop.period; k++) {
                    const bar = chart.bars[loop.startBarIndex + k];
                    if (bar) {
                        for (const c of bar) if (['1', '2', '3', '4'].includes(c)) notesPerLoop++;
                    }
                }
                
                for (let iter = 0; iter < loop.iterations; iter++) {
                    const globalIdx = noteIndexInFirstIter + (iter * notesPerLoop);
                    if (globalIdx < judgementDeltas.length) {
                        const delta = judgementDeltas[globalIdx];
                        if (delta !== undefined) deltas.push(delta);
                    }
                }
                
                if (deltas.length > 0) {
                    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
                    avgDeltaVal = `${avg.toFixed(1)}ms`;
                    allDeltasStr = deltas.join(', ');
                }
                
            } else {
                 if (hit.judgeableNoteIndex < judgementDeltas.length) {
                     const delta = judgementDeltas[hit.judgeableNoteIndex];
                     if (delta !== undefined) {
                         avgDeltaVal = `${delta}ms`;
                         allDeltasStr = delta.toString();
                     }
                 }
            }
        } else {
                // Standard Mode
                if (hit.judgeableNoteIndex < judgementDeltas.length) {
                    const delta = judgementDeltas[hit.judgeableNoteIndex];
                    if (delta !== undefined) {
                         deltaVal = `${delta}ms`;
                    }
                }
        }
    }

    if (collapsed) {
        html += createStatBox('Avg Delta', avgDeltaVal); // No highlight
        html += `<div class="stat-full-line">Deltas: ${allDeltasStr}</div>`;
    } else {
        html += createStatBox('Delta', deltaVal);
    }

    updateNoteStats(html);
}

function init(): void {
    if (!canvas) {
        console.error("Canvas element with ID 'chart-canvas' not found.");
        return;
    }

    // Initial UI State
    judgementsRadio.disabled = true;
    updateStatus('Using placeholder chart');
    renderStats(null, null, false, 'original', []);
    updateMode('none');

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

    if (collapseLoopCheckbox) {
        collapseLoopCheckbox.addEventListener('change', (event) => {
            collapsedLoop = (event.target as HTMLInputElement).checked;
            refreshChart();
            renderStats(null, currentChart, collapsedLoop, currentViewMode, judgements);
        });
    }
    
    // Canvas Interaction
    const handleCanvasInteraction = (event: MouseEvent) => {
        if (!currentChart) return;
        
        const rect = canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const hit = getNoteAt(x, y, currentChart, canvas, collapsedLoop, currentViewMode, judgements);
        
        if (hit) {
            renderStats(hit, currentChart, collapsedLoop, currentViewMode, judgements);
            canvas.style.cursor = 'pointer';
        } else {
            renderStats(null, currentChart, collapsedLoop, currentViewMode, judgements);
            canvas.style.cursor = 'default';
        }
    };

    canvas.addEventListener('mousemove', handleCanvasInteraction);
    canvas.addEventListener('click', handleCanvasInteraction);

    if (connectBtn && hostInput && portInput) {
        connectBtn.addEventListener('click', () => {
            if (connectBtn.innerText === 'Disconnect' || connectBtn.innerText === 'Connected') {
                judgementClient.disconnect();
            } else {
                const host = hostInput.value;
                const port = parseInt(portInput.value, 10);
                if (host && port) {
                    judgementClient.connect(host, port);
                } else {
                    alert("Please enter valid Host and Port.");
                }
            }
        });
    }

    if (testStreamBtn) {
        testStreamBtn.addEventListener('click', () => {
            isSimulating = true;
            // When simulation starts, it will trigger status change to Connected
            judgementClient.startSimulation(loadedTJAContent, difficultySelector.value);
        });
    }
    
    // Setup Clear Button
    if (clearManualBtn) {
        clearManualBtn.addEventListener('click', () => {
            const tjaFilePicker = document.getElementById('tja-file-picker') as HTMLInputElement;
            if (tjaFilePicker) tjaFilePicker.value = '';
            updateMode('none');
            updateStatus('Manual load cleared. Select a file or connect to stream.');
        });
    }

    // Setup Judgement Client Callbacks
    judgementClient.onMessage(async (event: ServerEvent) => {
        if (event.type === 'gameplay_start') {
            console.log("Gameplay Start Event Received - Resetting Judgements");
            judgements = [];
            judgementDeltas = []; // Reset deltas
            currentChart = null;

            updateStatus('Receiving data from event stream');

            if (event.tjaSummaries && event.tjaSummaries.length > 0) {
                const sortedSummaries = [...event.tjaSummaries].sort((a, b) => a.player - b.player);
                const firstSummary = sortedSummaries[0];

                if (firstSummary.tjaContent) {
                    try {
                        const charts = parseTJA(firstSummary.tjaContent);
                        const difficulty = firstSummary.difficulty.toLowerCase();
                        if (charts[difficulty]) {
                            currentChart = charts[difficulty];
                        } else {
                            console.error(`Difficulty '${difficulty}' not found in TJA content.`);
                            // Don't alert in loop
                        }
                    } catch (e) {
                        console.error("Error parsing TJA content:", e);
                    }
                }
            }
            refreshChart();
        } else if (event.type === 'judgement') {
            judgements.push(event.judgement);
            judgementDeltas.push(event.msDelta); // Store delta
            refreshChart();
        }
    });

    judgementClient.onStatusChange((status: string) => {
        console.log("Judgement Client Status:", status);
        if (connectBtn) {
            connectBtn.innerText = status === 'Connected' ? 'Disconnect' : 'Connect';
        }

        if (status === 'Connected') {
            judgementsRadio.disabled = false;
            updateMode('stream');
            
            if (isSimulating) {
                updateStatus('Simulating event stream...');
            } else {
                updateStatus('Connected to event stream. Waiting for data...');
                if (testStreamBtn) testStreamBtn.disabled = true;
            }
        } else if (status === 'Connecting...') {
            updateStatus('Connecting to event stream...');
            if (testStreamBtn) testStreamBtn.disabled = true;
            if (connectBtn) connectBtn.disabled = true;
        } else { // Disconnected
            judgementsRadio.disabled = true;
            
            // Only switch to 'none' if we were in stream mode, to avoid resetting manual logic if called unexpectedly
            if (appMode === 'stream') {
                updateMode('none');
            }
            
            if (currentViewMode === 'judgements') {
                originalRadio.checked = true;
                currentViewMode = 'original';
                refreshChart();
            }
            updateStatus('Disconnected from event stream');
            isSimulating = false;
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
                    loadedTJAContent = content;
                    parsedTJACharts = parseTJA(content);

                    difficultySelector.innerHTML = ''; // Clear previous options
                    const difficulties = Object.keys(parsedTJACharts);
                    difficulties.forEach(diff => {
                        const option = document.createElement('option');
                        option.value = diff;
                        option.innerText = diff.charAt(0).toUpperCase() + diff.slice(1);
                        difficultySelector.appendChild(option);
                    });

                    difficultySelectorContainer.hidden = false;

                    let defaultDifficulty = 'edit';
                    if (!parsedTJACharts[defaultDifficulty]) {
                        defaultDifficulty = 'oni';
                    }
                    if (!parsedTJACharts[defaultDifficulty]) {
                        defaultDifficulty = difficulties[0];
                    }

                    difficultySelector.value = defaultDifficulty;
                    currentChart = parsedTJACharts[defaultDifficulty];

                    updateStatus('Displaying manually loaded TJA file');
                    updateMode('manual'); // Switch to manual mode
                    refreshChart();
                } catch (e) {
                    console.error("Error parsing TJA file:", e);
                    alert("Failed to parse TJA file. See console for details.");
                }
            }
        });
    }

    difficultySelector.addEventListener('change', () => {
        if (parsedTJACharts) {
            const selectedDifficulty = difficultySelector.value;
            currentChart = parsedTJACharts[selectedDifficulty];
            refreshChart();
        }
    });

    // Expose for testing
    (window as any).setJudgements = (newJudgements: string[]) => {
        judgements = newJudgements;
        refreshChart();
    };

    try {
        console.log("Starting TJA Analyzer...");
        parsedTJACharts = parseTJA(exampleTJA);
        
        let defaultDifficulty = 'edit';
        if (!parsedTJACharts[defaultDifficulty]) {
            defaultDifficulty = 'oni';
        }
        if (!parsedTJACharts[defaultDifficulty]) {
            defaultDifficulty = Object.keys(parsedTJACharts)[0];
        }
        currentChart = parsedTJACharts[defaultDifficulty];

        console.log(`Parsed ${Object.keys(parsedTJACharts).length} difficulties.`);

        // Populate and show difficulty selector
        difficultySelector.innerHTML = '';
        const difficulties = Object.keys(parsedTJACharts);
        difficulties.forEach(diff => {
            const option = document.createElement('option');
            option.value = diff;
            option.innerText = diff.charAt(0).toUpperCase() + diff.slice(1);
            difficultySelector.appendChild(option);
        });
        if (difficulties.length > 0) {
            difficultySelector.value = defaultDifficulty;
            difficultySelectorContainer.hidden = false;
        }

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
    if (currentChart && canvas) {
        renderChart(currentChart, canvas, currentViewMode, judgements, collapsedLoop);
    }
}

function getGapInfo(chart: ParsedChart, currentBarIdx: number, currentCharIdx: number): string | null {
    const currentBar = chart.bars[currentBarIdx];
    const currentTotal = currentBar.length;
    
    // Look backwards in current bar
    for (let i = currentCharIdx - 1; i >= 0; i--) {
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(currentBar[i])) {
            const prevPos = i / currentTotal;
            const curPos = currentCharIdx / currentTotal;
            const diff = curPos - prevPos;
            return formatGap(diff);
        }
    }
    
    // Look in previous bars
    for (let b = currentBarIdx - 1; b >= 0; b--) {
        const prevBar = chart.bars[b];
        if (!prevBar || prevBar.length === 0) {
            // Check if accumulated gap > 1.0 (approximated)
            // Just counting empty bars for now, but really need to track total time.
            // Since we iterate, we can calculate precisely.
            
            // Distance = (Pos in Current) + (Empty Bars) + (1 - Pos in Prev)?
            const minGap = (currentCharIdx / currentTotal) + (currentBarIdx - b); 
            // If prevBar is empty, we effectively added 1.0. 
            // If minGap > 1.0, stop.
            // Actually, if prevBar is empty, we continue to check the one before it.
            if (minGap > 1.0 + 0.001) return null;
            continue;
        }
        
        const prevTotal = prevBar.length;
        
        for (let i = prevTotal - 1; i >= 0; i--) {
            if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(prevBar[i])) {
                const distInCurrent = currentCharIdx / currentTotal;
                const distBetween = (currentBarIdx - b - 1) * 1.0; 
                const distInPrev = (prevTotal - i) / prevTotal; // Remaining part
                
                const totalGap = distInCurrent + distBetween + distInPrev;
                
                if (totalGap <= 1.0 + 0.0001) { 
                     return formatGap(totalGap);
                } else {
                    return null; 
                }
            }
        }
        
        const minGap = (currentCharIdx / currentTotal) + (currentBarIdx - b);
        if (minGap > 1.0) return null;
    }
    
    return null;
}

function formatGap(gap: number): string {
    const commonDenominators = [4, 8, 12, 16, 24, 32, 48, 64];
    for (const d of commonDenominators) {
        const val = gap * d;
        if (Math.abs(val - Math.round(val)) < 0.001) {
             const num = Math.round(val);
             const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
             const divisor = gcd(num, d);
             return `${num/divisor}/${d/divisor}`;
        }
    }
    return gap.toFixed(3);
}

function getNoteName(char: string): string {
    const map: Record<string, string> = {
        '1': 'don', '2': 'ka', '3': 'DON', '4': 'KA',
        '5': 'roll', '6': 'ROLL', '7': 'balloon', '9': 'Kusudama'
    };
    return map[char] || 'unknown';
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