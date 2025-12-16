import { parseTJA, ParsedChart } from './tja-parser.js';
import { renderChart, getNoteAt, HitInfo, getGradientColor, JudgementVisibility } from './renderer.js';
import { exampleTJA } from './example-data.js';
import { JudgementClient, ServerEvent } from './judgement-client.js';

const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement | null;
let parsedTJACharts: Record<string, ParsedChart> | null = null;
let currentChart: ParsedChart | null = null;
let currentViewMode: 'original' | 'judgements' | 'judgements-underline' | 'judgements-text' = 'original';
let judgementColoringMode: 'categorical' | 'gradient' = 'categorical';
let judgementVisibility: JudgementVisibility = { perfect: true, good: true, poor: true };
let collapsedLoop: boolean = false;
let selectedLoopIteration: number | undefined = undefined;
let beatsPerLine: number = 16; // Zoom State
let loadedTJAContent: string = exampleTJA;

// Application State
let activeDataSourceMode: string = 'example';
let isSimulating: boolean = false;

// Judgement State
const judgementClient = new JudgementClient();
let judgements: string[] = [];
let judgementDeltas: (number | undefined)[] = []; // Store deltas

// UI Elements
const statusDisplay = document.getElementById('status-display') as HTMLElement;
const noteStatsDisplay = document.getElementById('note-stats-display') as HTMLDivElement;

const showJudgementsCheckbox = document.getElementById('show-judgements-checkbox') as HTMLInputElement;
const judgementSubcontrols = document.getElementById('judgement-subcontrols') as HTMLDivElement;
const judgementStyleRadios = document.querySelectorAll('input[name="judgementStyle"]');
const judgementColoringRadios = document.querySelectorAll('input[name="judgementColoring"]');
const showPerfectCheckbox = document.getElementById('show-perfect-checkbox') as HTMLInputElement;
const showGoodCheckbox = document.getElementById('show-good-checkbox') as HTMLInputElement;
const showPoorCheckbox = document.getElementById('show-poor-checkbox') as HTMLInputElement;

const difficultySelectorContainer = document.getElementById('difficulty-selector-container') as HTMLDivElement;
const difficultySelector = document.getElementById('difficulty-selector') as HTMLSelectElement;
const collapseLoopCheckbox = document.getElementById('collapse-loop-checkbox') as HTMLInputElement;

const optionsCollapseBtn = document.getElementById('options-collapse-btn') as HTMLButtonElement;
const optionsBody = document.getElementById('options-body') as HTMLDivElement;
const showStatsCheckbox = document.getElementById('show-stats-checkbox') as HTMLInputElement;

const loopControls = document.getElementById('loop-controls') as HTMLDivElement; // Changed to Div in HTML
const loopAutoCheckbox = document.getElementById('loop-auto') as HTMLInputElement;
const loopPrevBtn = document.getElementById('loop-prev') as HTMLButtonElement;
const loopNextBtn = document.getElementById('loop-next') as HTMLButtonElement;
const loopCounter = document.getElementById('loop-counter') as HTMLSpanElement;

const zoomOutBtn = document.getElementById('zoom-out-btn') as HTMLButtonElement;
const zoomInBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
const zoomResetBtn = document.getElementById('zoom-reset-btn') as HTMLButtonElement;

// Data Source UI
const dsTabs = document.querySelectorAll('.ds-tab');
const dsPanes = document.querySelectorAll('.ds-pane');
const dsCollapseBtn = document.getElementById('ds-collapse-btn') as HTMLButtonElement;
const dsBody = document.getElementById('ds-body') as HTMLDivElement;
const loadExampleBtn = document.getElementById('load-example-btn') as HTMLButtonElement;

const tjaFilePicker = document.getElementById('tja-file-picker') as HTMLInputElement;
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

function switchDataSourceMode(mode: string) {
    activeDataSourceMode = mode;
    console.log(`Switching data source mode to: ${mode}`);

    // Update Tabs
    dsTabs.forEach(t => {
        if (t.getAttribute('data-mode') === mode) t.classList.add('active');
        else t.classList.remove('active');
    });

    // Update Panes
    dsPanes.forEach(p => {
        if (p.id === `tab-${mode}`) {
             (p as HTMLElement).style.display = 'block';
        } else {
             (p as HTMLElement).style.display = 'none';
        }
    });

    // Logic: Disconnect if moving away from stream/test and currently connected
    if (mode !== 'stream' && mode !== 'test') {
        // Check if connected
        if (connectBtn && (connectBtn.innerText === 'Disconnect' || isSimulating)) {
            judgementClient.disconnect();
        }
    }

    // Difficulty Selector Visibility
    if (difficultySelectorContainer) {
        if (mode === 'stream') {
            difficultySelectorContainer.hidden = true;
        } else {
            // Show only if charts are parsed
            difficultySelectorContainer.hidden = !parsedTJACharts;
        }
    }
    
    // Clear picker if leaving file mode? Optional.
    if (mode !== 'file' && tjaFilePicker) {
        // tjaFilePicker.value = ''; // Maybe keep it for convenience
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

function renderStats(hit: HitInfo | null, chart: ParsedChart | null, collapsed: boolean, viewMode: string, judgements: string[], coloringMode: 'categorical' | 'gradient', judgementVisibility: JudgementVisibility = { perfect: true, good: true, poor: true }) {
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
    
    if (hit && (viewMode === 'judgements' || viewMode === 'judgements-underline' || viewMode === 'judgements-text') && hit.judgeableNoteIndex !== null && chart) {
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

                // Determine current iteration index for bolding
                let currentIterationIdx = -1;
                
                // If manual selection, use it. Else calculate like renderer
                if (selectedLoopIteration !== undefined) {
                    currentIterationIdx = selectedLoopIteration;
                } else {
                     let preLoopNotes = 0;
                     for(let i=0; i<loop.startBarIndex; i++) {
                         const bar = chart.bars[i];
                         if(bar) for(const c of bar) if(['1','2','3','4'].includes(c)) preLoopNotes++;
                     }
                     const lastJudgedIndex = judgements.length - 1;
                     if (lastJudgedIndex >= preLoopNotes && notesPerLoop > 0) {
                         const relativeIndex = lastJudgedIndex - preLoopNotes;
                         currentIterationIdx = Math.floor(relativeIndex / notesPerLoop);
                     }
                }
                if (currentIterationIdx < 0) currentIterationIdx = 0;
                
                let deltasStrings: string[] = [];
                for (let iter = 0; iter < loop.iterations; iter++) {
                    const globalIdx = noteIndexInFirstIter + (iter * notesPerLoop);
                    if (globalIdx < judgementDeltas.length) {
                        const delta = judgementDeltas[globalIdx];
                        const judge = judgements[globalIdx];

                        // Check visibility
                        let isVisible = true;
                        if (judge === 'Perfect' && !judgementVisibility.perfect) isVisible = false;
                        else if (judge === 'Good' && !judgementVisibility.good) isVisible = false;
                        else if (judge === 'Poor' && !judgementVisibility.poor) isVisible = false;

                        if (!isVisible) continue;

                        if (delta !== undefined) deltas.push(delta);
                        
                        let s = delta !== undefined ? delta.toString() : '?';

                        let color = '';
                        if (coloringMode === 'gradient') {
                            if ((judge === 'Perfect' || judge === 'Good' || judge === 'Poor') && delta !== undefined) {
                                color = getGradientColor(delta);
                            } else {
                                color = '#555'; // Dark Grey for non-standard
                            }
                        } else {
                            if (judge === 'Perfect') color = '#ffa500';
                            else if (judge === 'Good') color = '#fff';
                            else if (judge === 'Poor') color = '#00f';
                        }

                        if (color) {
                            s = `<span style="color: ${color}">${s}</span>`;
                        }

                        if (iter === currentIterationIdx) {
                            s = `<b>${s}</b>`;
                        }
                        deltasStrings.push(s);
                    }
                }
                
                if (deltas.length > 0) {
                    const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
                    avgDeltaVal = `${avg.toFixed(1)}ms`;
                    
                    if (coloringMode === 'gradient') {
                        const avgColor = getGradientColor(avg);
                        avgDeltaVal = `<span style="color: ${avgColor}">${avgDeltaVal}</span>`;
                    }
                    
                    allDeltasStr = deltasStrings.join(', ');
                }
                
            } else {
                 if (hit.judgeableNoteIndex < judgementDeltas.length) {
                     const delta = judgementDeltas[hit.judgeableNoteIndex];
                     const judge = judgements[hit.judgeableNoteIndex];

                     // Check visibility
                     let isVisible = true;
                     if (judge === 'Perfect' && !judgementVisibility.perfect) isVisible = false;
                     else if (judge === 'Good' && !judgementVisibility.good) isVisible = false;
                     else if (judge === 'Poor' && !judgementVisibility.poor) isVisible = false;

                     if (isVisible && delta !== undefined) {
                         avgDeltaVal = `${delta}ms`;
                         
                         let s = delta.toString();
                         let color = '';
                         
                         if (coloringMode === 'gradient') {
                             if (judge === 'Perfect' || judge === 'Good' || judge === 'Poor') {
                                 color = getGradientColor(delta);
                             } else {
                                 color = '#555';
                             }
                         } else {
                             if (judge === 'Perfect') color = '#ffa500';
                             else if (judge === 'Good') color = '#fff';
                             else if (judge === 'Poor') color = '#00f';
                         }

                         if (color) s = `<span style="color: ${color}">${s}</span>`;
                         if (coloringMode === 'gradient' && color) {
                             avgDeltaVal = `<span style="color: ${color}">${avgDeltaVal}</span>`;
                         }

                         allDeltasStr = s;
                     }
                 }
            }
        } else {
                // Standard Mode
                if (hit.judgeableNoteIndex < judgementDeltas.length) {
                    const delta = judgementDeltas[hit.judgeableNoteIndex];
                    const judge = judgements[hit.judgeableNoteIndex];
                    
                    // Check visibility
                    let isVisible = true;
                    if (judge === 'Perfect' && !judgementVisibility.perfect) isVisible = false;
                    else if (judge === 'Good' && !judgementVisibility.good) isVisible = false;
                    else if (judge === 'Poor' && !judgementVisibility.poor) isVisible = false;

                    if (isVisible && delta !== undefined) {
                         deltaVal = `${delta}ms`;

                         let color = '';
                         if (coloringMode === 'gradient') {
                             if (judge === 'Perfect' || judge === 'Good' || judge === 'Poor') {
                                 color = getGradientColor(delta);
                             } else {
                                 color = '#555';
                             }
                         } else {
                             if (judge === 'Perfect') color = '#ffa500';
                             else if (judge === 'Good') color = '#fff';
                             else if (judge === 'Poor') color = '#00f';
                         }

                         if (color) deltaVal = `<span style="color: ${color}">${deltaVal}</span>`;
                    }
                }
        }
    }

    if (collapsed) {
        html += createStatBox('Avg Delta', avgDeltaVal); 
        html += `<div class="stat-full-line">Deltas: ${allDeltasStr}</div>`;
    } else {
        html += createStatBox('Delta', deltaVal);
    }

    updateNoteStats(html);
}

function updateDisplayState() {

    // 1. Determine base View Mode

    if (showJudgementsCheckbox && showJudgementsCheckbox.checked && !showJudgementsCheckbox.disabled) {

        // Look at style radios

        const style = document.querySelector('input[name="judgementStyle"]:checked') as HTMLInputElement;

                if (style && style.value === 'underline') {

                    currentViewMode = 'judgements-underline';

                } else if (style && style.value === 'text') {

                    currentViewMode = 'judgements-text';

                } else {

                    currentViewMode = 'judgements';

                }



        // Enable subcontrols

        if (judgementSubcontrols) {

            judgementSubcontrols.classList.remove('disabled');

        }



    } else {

        currentViewMode = 'original';

        // Disable subcontrols (visually)

        if (judgementSubcontrols) {

            judgementSubcontrols.classList.add('disabled');

        }

    }



    // 2. Determine Coloring Mode

    const coloring = document.querySelector('input[name="judgementColoring"]:checked') as HTMLInputElement;

    if (coloring && coloring.value === 'gradient') {

        judgementColoringMode = 'gradient';

    } else {

        judgementColoringMode = 'categorical';

    }

    // 3. Determine Judgement Visibility
    if (showPerfectCheckbox && showGoodCheckbox && showPoorCheckbox) {
        judgementVisibility = {
            perfect: showPerfectCheckbox.checked,
            good: showGoodCheckbox.checked,
            poor: showPoorCheckbox.checked
        };
    }

    refreshChart();

}



function updateCollapseLoopState() {

    if (!collapseLoopCheckbox) return;



    const hasLoop = currentChart && currentChart.loop;

    

    if (hasLoop) {

        collapseLoopCheckbox.disabled = false;

        if (collapseLoopCheckbox.parentElement) {

            collapseLoopCheckbox.parentElement.classList.remove('disabled-text');

        }

    } else {

        collapseLoopCheckbox.disabled = true;

        collapseLoopCheckbox.checked = false;

        collapsedLoop = false;

        if (collapseLoopCheckbox.parentElement) {

            collapseLoopCheckbox.parentElement.classList.add('disabled-text');

        }

    }

    // Note: refreshChart() is usually called after this or before this in the flow. 

    // If we changed 'collapsedLoop' state here, we might need to ensure refresh happens.

}

function updateZoomDisplay() {
    if (zoomResetBtn) {
        const percent = Math.round((16 / beatsPerLine) * 100);
        zoomResetBtn.innerText = `${percent}%`;
    }
}

function init(): void {

    if (!canvas) {

        console.error("Canvas element with ID 'chart-canvas' not found.");

        return;

    }



    // Initial State

    if (showJudgementsCheckbox) {

        showJudgementsCheckbox.disabled = true;

        showJudgementsCheckbox.checked = false;

        if (showJudgementsCheckbox.parentElement) {

            showJudgementsCheckbox.parentElement.classList.add('disabled-text');

        }

        showJudgementsCheckbox.addEventListener('change', updateDisplayState);

    }

    

    // Ensure subcontrols are disabled initially

    if (judgementSubcontrols) {

        judgementSubcontrols.classList.add('disabled');

    }
    
    // Listeners for new checkboxes
    if (showPerfectCheckbox) showPerfectCheckbox.addEventListener('change', updateDisplayState);
    if (showGoodCheckbox) showGoodCheckbox.addEventListener('change', updateDisplayState);
    if (showPoorCheckbox) showPoorCheckbox.addEventListener('change', updateDisplayState);

    
    // Initial Loop State

    if (collapseLoopCheckbox) {

        collapseLoopCheckbox.disabled = true;

        if (collapseLoopCheckbox.parentElement) {

            collapseLoopCheckbox.parentElement.classList.add('disabled-text');

        }

    }



    judgementStyleRadios.forEach(r => r.addEventListener('change', updateDisplayState));

    judgementColoringRadios.forEach(r => r.addEventListener('change', updateDisplayState));

    

    // Setup Data Source Tabs

    dsTabs.forEach(tab => {

        tab.addEventListener('click', () => {

            const mode = tab.getAttribute('data-mode');

            if (mode) switchDataSourceMode(mode);

        });

    });



            // Setup Collapse Button



            if (dsCollapseBtn && dsBody) {



                dsCollapseBtn.addEventListener('click', () => {



                    if (dsBody.classList.contains('collapsed')) {



                        dsBody.classList.remove('collapsed');



                        dsCollapseBtn.innerText = "Collapse";



                    } else {



                        dsBody.classList.add('collapsed');



                        dsCollapseBtn.innerText = "Expand";



                    }



                });



            }



        



            // Setup Display Options Collapse Button



            if (optionsCollapseBtn && optionsBody) {



                optionsCollapseBtn.addEventListener('click', () => {



                    if (optionsBody.classList.contains('collapsed')) {



                        optionsBody.classList.remove('collapsed');



                        optionsCollapseBtn.innerText = "Collapse";



                    } else {



                        optionsBody.classList.add('collapsed');



                        optionsCollapseBtn.innerText = "Expand";



                    }



                });



            }



    



        // Setup Stats Toggle



        if (showStatsCheckbox && noteStatsDisplay) {



            showStatsCheckbox.addEventListener('change', () => {



                noteStatsDisplay.style.display = showStatsCheckbox.checked ? '' : 'none';



            });



        }



    // Setup Load Example Button

    if (loadExampleBtn) {

        loadExampleBtn.addEventListener('click', () => {

            loadedTJAContent = exampleTJA;

            updateParsedCharts(loadedTJAContent);

            updateStatus('Example chart loaded');

        });

    }



    // Setup File Picker

    if (tjaFilePicker) {

        tjaFilePicker.addEventListener('change', async (event) => {

            const files = (event.target as HTMLInputElement).files;

            if (files && files.length > 0) {

                const file = files[0];

                try {

                    const content = await file.text();

                    loadedTJAContent = content;

                    updateParsedCharts(content);

                    updateStatus('Loaded local TJA file');

                } catch (e) {

                    console.error("Error parsing TJA file:", e);

                    alert("Failed to parse TJA file. See console for details.");

                }

            }

        });

    }



    // Setup Stream Controls

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

            // Use currently loaded content and selected difficulty

            judgementClient.startSimulation(loadedTJAContent, difficultySelector.value);

        });

    }



        if (collapseLoopCheckbox) {



            collapseLoopCheckbox.addEventListener('change', (event) => {



                collapsedLoop = (event.target as HTMLInputElement).checked;



                refreshChart();



                renderStats(null, currentChart, collapsedLoop, currentViewMode, judgements, judgementColoringMode, judgementVisibility);



            });



        }



    // Loop Controls

    if (loopAutoCheckbox) {

        loopAutoCheckbox.addEventListener('change', (e) => {

            if (loopAutoCheckbox.checked) {

                selectedLoopIteration = undefined;

            } else {

                const matches = loopCounter.innerText.match(/(\d+) \/ (\d+)/);

                if (matches) {

                     selectedLoopIteration = parseInt(matches[1]) - 1;

                } else {

                     selectedLoopIteration = 0;

                }

            }

            refreshChart();

        });

    }

    

    if (loopPrevBtn) {

        loopPrevBtn.addEventListener('click', () => {

             if (selectedLoopIteration !== undefined && selectedLoopIteration > 0) {

                 selectedLoopIteration--;

                 refreshChart();

             }

        });

    }



    if (loopNextBtn) {

        loopNextBtn.addEventListener('click', () => {

             if (currentChart && currentChart.loop && selectedLoopIteration !== undefined && selectedLoopIteration < currentChart.loop.iterations - 1) {

                 selectedLoopIteration++;

                 refreshChart();

             }

        });

    }
    
    // Zoom Controls
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
             // Increase beats per line (Zoom Out)
             if (beatsPerLine < 32) {
                 beatsPerLine += 2;
                 updateZoomDisplay();
                 refreshChart();
             }
        });
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
             // Decrease beats per line (Zoom In)
             if (beatsPerLine > 4) {
                 beatsPerLine -= 2;
                 updateZoomDisplay();
                 refreshChart();
             }
        });
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            if (beatsPerLine !== 16) {
                beatsPerLine = 16;
                updateZoomDisplay();
                refreshChart();
            }
        });
    }

    // Canvas Interaction

        const handleCanvasInteraction = (event: MouseEvent) => {

            if (!currentChart) return;

            

            const rect = canvas.getBoundingClientRect();

            const x = event.clientX - rect.left;

            const y = event.clientY - rect.top;

            

            const hit = getNoteAt(x, y, currentChart, canvas, collapsedLoop, currentViewMode, judgements, selectedLoopIteration, judgementColoringMode, judgementVisibility, beatsPerLine);

            

            if (hit) {

                renderStats(hit, currentChart, collapsedLoop, currentViewMode, judgements, judgementColoringMode, judgementVisibility);

                canvas.style.cursor = 'pointer';

            } else {

                renderStats(null, currentChart, collapsedLoop, currentViewMode, judgements, judgementColoringMode, judgementVisibility);

                canvas.style.cursor = 'default';

            }

        };



    canvas.addEventListener('mousemove', handleCanvasInteraction);

    canvas.addEventListener('click', handleCanvasInteraction);



    difficultySelector.addEventListener('change', () => {

        if (parsedTJACharts) {

            const selectedDifficulty = difficultySelector.value;

            currentChart = parsedTJACharts[selectedDifficulty];

            updateCollapseLoopState(); // Check if new difficulty has loops

            refreshChart();

        }

    });



    // Judgement Client Callbacks

    judgementClient.onMessage(async (event: ServerEvent) => {

        if (event.type === 'gameplay_start') {

            console.log("Gameplay Start Event Received");

            judgements = [];

            judgementDeltas = [];

            currentChart = null;

            updateStatus('Receiving data...');



            if (event.tjaSummaries && event.tjaSummaries.length > 0) {

                const sortedSummaries = [...event.tjaSummaries].sort((a, b) => a.player - b.player);

                const firstSummary = sortedSummaries[0];



                if (firstSummary.tjaContent) {

                    try {

                        const charts = parseTJA(firstSummary.tjaContent);

                        const difficulty = firstSummary.difficulty.toLowerCase();

                        if (charts[difficulty]) {

                            currentChart = charts[difficulty];

                            parsedTJACharts = charts; // Update global parsed for reference

                        } else {

                            console.error(`Difficulty '${difficulty}' not found.`);

                        }

                    } catch (e) {

                        console.error("Error parsing TJA content:", e);

                    }

                }

            }

            updateCollapseLoopState();

            refreshChart();

        } else if (event.type === 'judgement') {

            judgements.push(event.judgement);

            judgementDeltas.push(event.msDelta);

            refreshChart();

        }

    });



    judgementClient.onStatusChange((status: string) => {

        if (connectBtn) {

            connectBtn.innerText = status === 'Connected' ? 'Disconnect' : 'Connect';

        }



        if (status === 'Connected') {

            if (showJudgementsCheckbox) {

                showJudgementsCheckbox.disabled = false;

                if (showJudgementsCheckbox.parentElement) {

                    showJudgementsCheckbox.parentElement.classList.remove('disabled-text');

                }

                // Auto-enable judgements on connect for convenience, but only if not explicitly unchecked?

                // The requirements say "judgement view mode is only available when the connection is active".

                // Let's just enable the control.

            }

            

            if (isSimulating) {

                updateStatus('Simulating Stream: Connected');

            } else {

                updateStatus('Stream: Connected');

                if (testStreamBtn) testStreamBtn.disabled = true;

            }

        } else if (status === 'Connecting...') {

            updateStatus('Connecting...');

            if (testStreamBtn) testStreamBtn.disabled = true;

            if (connectBtn) connectBtn.disabled = true;

        } else { // Disconnected

            if (showJudgementsCheckbox) {

                showJudgementsCheckbox.disabled = true;

                showJudgementsCheckbox.checked = false;

                if (showJudgementsCheckbox.parentElement) {

                    showJudgementsCheckbox.parentElement.classList.add('disabled-text');

                }

            }

            updateDisplayState(); // Will reset to 'original'



            // Re-enable controls if we were in test mode

             if (testStreamBtn) testStreamBtn.disabled = false;

             if (connectBtn) connectBtn.disabled = false;

            

            updateStatus(isSimulating ? 'Simulation Stopped' : 'Disconnected');

            isSimulating = false;

        }

    });



    // Initial Load

    switchDataSourceMode('example');

    // Load example by default

    updateStatus('Ready');

    // We don't auto-click load-example, but maybe we should to show something?

    // The previous code loaded example on start.

    loadExampleBtn.click();

}



function updateParsedCharts(content: string) {

    parsedTJACharts = parseTJA(content);

    

    difficultySelector.innerHTML = '';

    const difficulties = Object.keys(parsedTJACharts);

    difficulties.forEach(diff => {

        const option = document.createElement('option');

        option.value = diff;

        option.innerText = diff.charAt(0).toUpperCase() + diff.slice(1);

        difficultySelector.appendChild(option);

    });



    if (difficulties.length > 0) {

        let defaultDifficulty = 'edit';

        if (!parsedTJACharts[defaultDifficulty]) defaultDifficulty = 'oni';

        if (!parsedTJACharts[defaultDifficulty]) defaultDifficulty = difficulties[0];

        

        difficultySelector.value = defaultDifficulty;

        currentChart = parsedTJACharts[defaultDifficulty];

        difficultySelectorContainer.hidden = false;

    } else {

        difficultySelectorContainer.hidden = true;

    }



        updateCollapseLoopState();



        refreshChart();



        renderStats(null, currentChart, collapsedLoop, currentViewMode, judgements, judgementColoringMode, judgementVisibility);



    }



    



    function updateLoopControls() {
    if (!loopControls || !currentChart) return;

    // Use .style.display for loop controls as they are dynamic and shouldn't take space if irrelevant
    if (collapsedLoop && currentChart.loop) {
        loopControls.style.display = 'flex'; // Changed to flex to match CSS
        
        const loop = currentChart.loop;
        let displayedIter = 0;

        if (selectedLoopIteration === undefined) {
             loopAutoCheckbox.checked = true;
             loopPrevBtn.disabled = true;
             loopNextBtn.disabled = true;

             if ((currentViewMode === 'judgements' || currentViewMode === 'judgements-underline' || currentViewMode === 'judgements-text') && judgements.length > 0) {
                let notesPerLoop = 0;
                let preLoopNotes = 0;
                for(let i=0; i<loop.startBarIndex; i++) {
                     const bar = currentChart.bars[i];
                     if(bar) for(const c of bar) if(['1','2','3','4'].includes(c)) preLoopNotes++;
                }
                for(let k=0; k<loop.period; k++) {
                     const bar = currentChart.bars[loop.startBarIndex+k];
                     if(bar) for(const c of bar) if(['1','2','3','4'].includes(c)) notesPerLoop++;
                }

                const lastJudgedIndex = judgements.length - 1;
                if (lastJudgedIndex >= preLoopNotes && notesPerLoop > 0) {
                     const relativeIndex = lastJudgedIndex - preLoopNotes;
                     displayedIter = Math.floor(relativeIndex / notesPerLoop);
                }
             }
        } else {
             loopAutoCheckbox.checked = false;
             displayedIter = selectedLoopIteration;
             loopPrevBtn.disabled = (displayedIter <= 0);
             loopNextBtn.disabled = (displayedIter >= loop.iterations - 1);
        }

        if (displayedIter < 0) displayedIter = 0;
        if (displayedIter >= loop.iterations) displayedIter = loop.iterations - 1;

        loopCounter.innerText = `${displayedIter + 1} / ${loop.iterations}`;
    } else {
        loopControls.style.display = 'none';
    }
}

function refreshChart() {
    if (currentChart && canvas) {
        renderChart(currentChart, canvas, currentViewMode, judgements, collapsedLoop, selectedLoopIteration, judgementDeltas, judgementColoringMode, judgementVisibility, beatsPerLine);
        updateLoopControls();
    }
}

function getGapInfo(chart: ParsedChart, currentBarIdx: number, currentCharIdx: number): string | null {
    const currentBar = chart.bars[currentBarIdx];
    const currentTotal = currentBar.length;
    
    for (let i = currentCharIdx - 1; i >= 0; i--) {
        if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(currentBar[i])) {
            const prevPos = i / currentTotal;
            const curPos = currentCharIdx / currentTotal;
            const diff = curPos - prevPos;
            return formatGap(diff);
        }
    }
    
    for (let b = currentBarIdx - 1; b >= 0; b--) {
        const prevBar = chart.bars[b];
        if (!prevBar || prevBar.length === 0) {
            const minGap = (currentCharIdx / currentTotal) + (currentBarIdx - b); 
            if (minGap > 1.0 + 0.001) return null;
            continue;
        }
        
        const prevTotal = prevBar.length;
        
        for (let i = prevTotal - 1; i >= 0; i--) {
            if (['1', '2', '3', '4', '5', '6', '7', '8', '9'].includes(prevBar[i])) {
                const distInCurrent = currentCharIdx / currentTotal;
                const distBetween = (currentBarIdx - b - 1) * 1.0; 
                const distInPrev = (prevTotal - i) / prevTotal; 
                
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

// Expose for testing
(window as any).setJudgements = (newJudgements: string[], newDeltas?: (number | undefined)[]) => {
    judgements = newJudgements;
    judgementDeltas = newDeltas || [];
    refreshChart();
    renderStats(null, currentChart, collapsedLoop, currentViewMode, judgements, judgementColoringMode, judgementVisibility);
};

init();
