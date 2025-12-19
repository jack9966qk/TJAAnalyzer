import { parseTJA, ParsedChart } from './tja-parser.js';
import { generateTJAFromSelection } from './tja-exporter.js';
import { renderChart, getNoteAt, HitInfo, getGradientColor, JudgementVisibility, ViewOptions, RenderTexts } from './renderer.js';
import { exampleTJA } from './example-data.js';
import { JudgementClient, ServerEvent } from './judgement-client.js';
import { i18n } from './i18n.js';
import { EseClient, GitNode } from './ese-client.js';

const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement | null;
let parsedTJACharts: Record<string, ParsedChart> | null = null;
let currentChart: ParsedChart | null = null;

let viewOptions: ViewOptions = {
    viewMode: 'original',
    coloringMode: 'categorical',
    visibility: { perfect: true, good: true, poor: true },
    collapsedLoop: false,
    selectedLoopIteration: undefined,
    beatsPerLine: 16,
    selection: null,
    annotations: {}
};

let loadedTJAContent: string = exampleTJA;

// Application State
let activeDataSourceMode: string = 'example';
let isSimulating: boolean = false;
let selectedNoteHitInfo: HitInfo | null = null;
let annotations: Record<string, string> = {};

// ESE Client
const eseClient = new EseClient();
let eseTree: GitNode[] | null = null;

// Judgement State
const judgementClient = new JudgementClient();
let judgements: string[] = [];
let judgementDeltas: (number | undefined)[] = []; // Store deltas

// UI Elements
const statusDisplay = document.getElementById('status-display') as HTMLElement;
const noteStatsDisplay = document.getElementById('note-stats-display') as HTMLDivElement;
const languageSelector = document.getElementById('language-selector') as HTMLSelectElement;

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

const loopControls = document.getElementById('loop-controls') as HTMLDivElement;
const loopAutoCheckbox = document.getElementById('loop-auto') as HTMLInputElement;
const loopPrevBtn = document.getElementById('loop-prev') as HTMLButtonElement;
const loopNextBtn = document.getElementById('loop-next') as HTMLButtonElement;
const loopCounter = document.getElementById('loop-counter') as HTMLSpanElement;

const zoomOutBtn = document.getElementById('zoom-out-btn') as HTMLButtonElement;
const zoomInBtn = document.getElementById('zoom-in-btn') as HTMLButtonElement;
const zoomResetBtn = document.getElementById('zoom-reset-btn') as HTMLButtonElement;

// Display Options Tabs
const doTabs = document.querySelectorAll('#chart-options-panel .panel-tab');
const doPanes = document.querySelectorAll('#chart-options-panel .panel-pane');
const clearSelectionBtn = document.getElementById('clear-selection-btn') as HTMLButtonElement;
const exportSelectionBtn = document.getElementById('export-selection-btn') as HTMLButtonElement;

const clearAnnotationsBtn = document.getElementById('clear-annotations-btn') as HTMLButtonElement;
const chartModeStatus = document.getElementById('chart-mode-status') as HTMLSpanElement;

// Data Source UI
const dsTabs = document.querySelectorAll('#data-source-panel .panel-tab');
const dsPanes = document.querySelectorAll('#data-source-panel .panel-pane');
const dsCollapseBtn = document.getElementById('ds-collapse-btn') as HTMLButtonElement;
const dsBody = document.getElementById('ds-body') as HTMLDivElement;
const loadExampleBtn = document.getElementById('load-example-btn') as HTMLButtonElement;

const tjaFilePicker = document.getElementById('tja-file-picker') as HTMLInputElement;
const hostInput = document.getElementById('host-input') as HTMLInputElement;
const portInput = document.getElementById('port-input') as HTMLInputElement;
const connectBtn = document.getElementById('connect-btn') as HTMLButtonElement;
const testStreamBtn = document.getElementById('test-stream-btn') as HTMLButtonElement;

const eseSearchInput = document.getElementById('ese-search-input') as HTMLInputElement;
const eseResults = document.getElementById('ese-results') as HTMLDivElement;

let currentStatusKey = 'status.initializing';
let currentStatusParams: Record<string, string | number> | undefined;

function updateStatus(key: string, params?: Record<string, string | number>) {
    currentStatusKey = key;
    currentStatusParams = params;
    if (statusDisplay) {
        statusDisplay.innerText = i18n.t(key, params);
    }
}

function updateNoteStats(html: string) {
    if (noteStatsDisplay) {
        noteStatsDisplay.innerHTML = html;
    }
}

function updateModeStatus(mode: string) {
    if (chartModeStatus) {
        if (mode === 'view') chartModeStatus.innerText = i18n.t('mode.view');
        else if (mode === 'selection') chartModeStatus.innerText = i18n.t('mode.selection');
        else if (mode === 'annotation') chartModeStatus.innerText = i18n.t('mode.annotation');
    }
}

function switchDisplayOptionTab(mode: string) {
    doTabs.forEach(t => {
        if (t.getAttribute('data-do-tab') === mode) t.classList.add('active');
        else t.classList.remove('active');
    });

    doPanes.forEach(p => {
        const isTarget = p.id === `do-tab-${mode}`;
        if (isTarget) {
            // Restore flex for view, block for selection/annotation
            if (mode === 'view') (p as HTMLElement).style.display = 'flex';
            else (p as HTMLElement).style.display = 'block';
        } else {
             (p as HTMLElement).style.display = 'none';
        }
    });

    updateModeStatus(mode);
    refreshChart();
}

function updateSelectionUI() {
    if (clearSelectionBtn) {
        clearSelectionBtn.disabled = !viewOptions.selection;
    }
    if (exportSelectionBtn) {
        exportSelectionBtn.disabled = !viewOptions.selection;
    }
}

function filterEseResults(query: string) {
    if (!eseTree || !eseResults) return;
    const results = query ? eseTree.filter(node => node.path.toLowerCase().includes(query)) : [];
    
    if (results.length === 0 && !query) {
         eseResults.innerHTML = `<div style="padding: 10px; color: #888; font-style: italic;">Search for songs...</div>`;
         return;
    } else if (results.length === 0) {
         eseResults.innerHTML = `<div style="padding: 10px; color: #888; font-style: italic;">No results found.</div>`;
         return;
    }

    // Limit results for performance
    const displayResults = results.slice(0, 100); 

    eseResults.innerHTML = '';
    displayResults.forEach(node => {
        const div = document.createElement('div');
        div.className = 'ese-result-item';
        div.style.padding = '5px 10px';
        div.style.cursor = 'pointer';
        div.style.borderBottom = '1px solid #eee';
        
        // Simple highlighting or just text
        div.innerText = node.path;
        
        div.addEventListener('click', async () => {
             try {
                 updateStatus('status.loadingChart');
                 // Highlight selection
                 document.querySelectorAll('.ese-result-item').forEach(el => (el as HTMLElement).style.background = 'transparent');
                 div.style.background = '#e0e0ff';

                 const content = await eseClient.getFileContent(node.path);
                 loadedTJAContent = content;
                 updateParsedCharts(content);
                 updateStatus('status.chartLoaded');
             } catch (e) {
                 console.error(e);
                 const errMsg = (e as any).message || String(e);
                 alert(`Failed to load chart: ${errMsg}`);
                 updateStatus('status.eseError', { error: errMsg });
             }
        });
        
        div.addEventListener('mouseover', () => { 
            if (div.style.background !== 'rgb(224, 224, 255)' && div.style.background !== '#e0e0ff') {
                div.style.backgroundColor = '#f0f0f0'; 
            }
        });
        div.addEventListener('mouseout', () => { 
            if (div.style.background !== 'rgb(224, 224, 255)' && div.style.background !== '#e0e0ff') {
                div.style.backgroundColor = 'transparent'; 
            }
        });
        
        eseResults.appendChild(div);
    });
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

    // ESE Logic
    if (mode === 'ese') {
        if (!eseTree) {
             updateStatus('status.loadingEse');
             // Show loading indicator in results
             if(eseResults) eseResults.innerHTML = '<div style="padding:10px;">Loading song list...</div>';
             
             eseClient.getTjaFiles().then(tree => {
                 eseTree = tree;
                 updateStatus('status.eseReady');
                 filterEseResults('');
             }).catch(e => {
                 const errMsg = (e as any).message || String(e);
                 updateStatus('status.eseError', { error: errMsg });
                 if(eseResults) eseResults.innerHTML = `<div style="padding:10px; color:red">Error loading tree: ${errMsg}</div>`;
             });
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

function updateUIText() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (key) {
            if (el.tagName === 'INPUT' && (el as HTMLInputElement).placeholder) {
                 // Handle placeholder if needed, currently none
            } else {
                 // For text nodes, we might have replaced content. 
                 // If the element has children (e.g. checkbox label wrapping span), we should target the span.
                 // In index.html I put data-i18n on the specific text container elements (spans, h2, buttons).
                 // So innerText is safe.
                 (el as HTMLElement).innerText = i18n.t(key);
            }
        }
    });

    // Dynamic Elements
    updateStatus(currentStatusKey);
    
    // Update Mode Status
    const activeTab = document.querySelector('#chart-options-panel .panel-tab.active');
    if (activeTab) {
        updateModeStatus(activeTab.getAttribute('data-do-tab') || 'view');
    }
    
    // Update collapsible buttons text based on state
    if (dsCollapseBtn && dsBody) {
        dsCollapseBtn.innerText = dsBody.classList.contains('collapsed') ? i18n.t('ui.expand') : i18n.t('ui.collapse');
    }
    if (optionsCollapseBtn && optionsBody) {
        optionsCollapseBtn.innerText = optionsBody.classList.contains('collapsed') ? i18n.t('ui.expand') : i18n.t('ui.collapse');
    }

    // Refresh chart (redraws text on canvas) and stats
    refreshChart();
    // Re-render stats if a note is selected
    const statsHit = selectedNoteHitInfo; // || hit (but we don't have hit here)
    // We can't easily re-render hover stats without a mouse event, but selected note stats persist.
    // If nothing selected, stats box is usually empty or showing last hover?
    // Actually renderStats is called on mousemove.
    if (selectedNoteHitInfo) {
        renderStats(selectedNoteHitInfo, currentChart, viewOptions, judgements);
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

function renderStats(hit: HitInfo | null, chart: ParsedChart | null, options: ViewOptions, judgements: string[]) {
    let html = '';
    const def = '-';
    const { collapsedLoop: collapsed, viewMode, coloringMode, visibility: judgementVisibility } = options;

    // 1. Type
    html += createStatBox(i18n.t('stats.type'), hit ? getNoteName(hit.type) : def);
    
    // 2. Gap
    let gap = def;
    if (hit && chart) {
        const g = getGapInfo(chart, hit.originalBarIndex, hit.charIndex);
        if (g) gap = g;
    }
    html += createStatBox(i18n.t('stats.gap'), gap);
    
    // 3. BPM
    html += createStatBox(i18n.t('stats.bpm'), hit ? formatBPM(hit.bpm) : def);
    
    // 4. HS
    html += createStatBox(i18n.t('stats.hs'), hit ? formatHS(hit.scroll) : def);
    
    // 5. Perceived BPM
    html += createStatBox(i18n.t('stats.seenBpm'), hit ? formatBPM(hit.bpm * hit.scroll) : def);

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
                if (options.selectedLoopIteration !== undefined) {
                    currentIterationIdx = options.selectedLoopIteration;
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
        html += createStatBox(i18n.t('stats.avgDelta'), avgDeltaVal); 
        html += `<div class="stat-full-line">Deltas: ${allDeltasStr}</div>`;
    } else {
        html += createStatBox(i18n.t('stats.delta'), deltaVal);
    }

    updateNoteStats(html);
}

function updateDisplayState() {

    // 1. Determine base View Mode

    if (showJudgementsCheckbox && showJudgementsCheckbox.checked && !showJudgementsCheckbox.disabled) {

        // Look at style radios

        const style = document.querySelector('input[name="judgementStyle"]:checked') as HTMLInputElement;

                if (style && style.value === 'underline') {

                    viewOptions.viewMode = 'judgements-underline';

                } else if (style && style.value === 'text') {

                    viewOptions.viewMode = 'judgements-text';

                } else {

                    viewOptions.viewMode = 'judgements';

                }



        // Enable subcontrols

        if (judgementSubcontrols) {

            judgementSubcontrols.classList.remove('disabled');

        }



    } else {

        viewOptions.viewMode = 'original';

        // Disable subcontrols (visually)

        if (judgementSubcontrols) {

            judgementSubcontrols.classList.add('disabled');

        }

    }



    // 2. Determine Coloring Mode

    const coloring = document.querySelector('input[name="judgementColoring"]:checked') as HTMLInputElement;

    if (coloring && coloring.value === 'gradient') {

        viewOptions.coloringMode = 'gradient';

    } else {

        viewOptions.coloringMode = 'categorical';

    }

    // 3. Determine Judgement Visibility
    if (showPerfectCheckbox && showGoodCheckbox && showPoorCheckbox) {
        viewOptions.visibility = {
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

        viewOptions.collapsedLoop = false;

        if (collapseLoopCheckbox.parentElement) {

            collapseLoopCheckbox.parentElement.classList.add('disabled-text');

        }

    }

    // Note: refreshChart() is usually called after this or before this in the flow. 

    // If we changed 'collapsedLoop' state here, we might need to ensure refresh happens.

}

function updateZoomDisplay() {
    if (zoomResetBtn) {
        const percent = Math.round((16 / viewOptions.beatsPerLine) * 100);
        zoomResetBtn.innerText = `${percent}%`;
    }
}

// Helper to read file as text (compatibility wrapper)
function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        if (typeof file.text === 'function') {
            file.text().then(resolve).catch(reject);
        } else {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = () => reject(reader.error);
            reader.readAsText(file);
        }
    });
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

    // Setup Display Options Tabs
    doTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const mode = tab.getAttribute('data-do-tab');
            if (mode) switchDisplayOptionTab(mode);
        });
    });

    if (clearSelectionBtn) {
        clearSelectionBtn.addEventListener('click', () => {
            viewOptions.selection = null;
            selectedNoteHitInfo = null;
            refreshChart();
            updateSelectionUI();
        });
    }

    if (exportSelectionBtn) {
        exportSelectionBtn.addEventListener('click', async () => {
            if (!currentChart || !viewOptions.selection) {
                // Should not be clickable if disabled, but just in case
                return;
            }

            const loopCountInput = document.getElementById('export-loop-count') as HTMLInputElement;
            const loopCount = loopCountInput ? parseInt(loopCountInput.value, 10) : 10;

            try {
                const tjaContent = generateTJAFromSelection(currentChart, viewOptions.selection, difficultySelector.value, loopCount);
                const N = (window as any).Neutralino;

                if (N && N.os && N.os.showSaveDialog) {
                    const entry = await N.os.showSaveDialog('Export TJA', {
                        defaultPath: 'exported.tja',
                        filters: [{ name: 'TJA Files', extensions: ['tja'] }]
                    });
                    if (entry) {
                        await N.filesystem.writeFile(entry, tjaContent);
                        updateStatus('status.exportSuccess');
                    }
                } else {
                    // Web Fallback
                    const blob = new Blob([tjaContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'exported.tja';
                    a.click();
                    URL.revokeObjectURL(url);
                    updateStatus('status.exportSuccess');
                }
            } catch (e) {
                console.error("Export failed:", e);
                updateStatus('status.exportFailed');
            }
        });
    }
    
    if (clearAnnotationsBtn) {
        clearAnnotationsBtn.addEventListener('click', () => {
            annotations = {};
            refreshChart();
        });
    }

    // Setup Collapse Button

            if (dsCollapseBtn && dsBody) {

                dsCollapseBtn.addEventListener('click', () => {

                    if (dsBody.classList.contains('collapsed')) {

                        dsBody.classList.remove('collapsed');

                        dsCollapseBtn.innerText = i18n.t('ui.collapse');

                    } else {

                        dsBody.classList.add('collapsed');

                        dsCollapseBtn.innerText = i18n.t('ui.expand');

                    }

                });

            }



        



            // Setup Display Options Collapse Button



            if (optionsCollapseBtn && optionsBody) {



                optionsCollapseBtn.addEventListener('click', () => {



                    if (optionsBody.classList.contains('collapsed')) {



                        optionsBody.classList.remove('collapsed');



                        optionsCollapseBtn.innerText = i18n.t('ui.collapse');



                    } else {



                        optionsBody.classList.add('collapsed');



                        optionsCollapseBtn.innerText = i18n.t('ui.expand');



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

            try {
                updateParsedCharts(loadedTJAContent);
                updateStatus('status.exampleLoaded');
            } catch (e) {
                console.error("Error loading example:", e);
                const msg = i18n.t('status.parseError', { error: (e as Error).message });
                alert(msg);
                if (statusDisplay) statusDisplay.innerText = msg;
            }

        });

    }



    // Setup File Picker

    if (tjaFilePicker) {

        tjaFilePicker.addEventListener('change', async (event) => {

            const files = (event.target as HTMLInputElement).files;

            if (files && files.length > 0) {

                const file = files[0];

                try {

                    const content = await readFileAsText(file);

                    loadedTJAContent = content;

                    updateParsedCharts(content);

                    updateStatus('status.fileLoaded');

                } catch (e) {

                    console.error("Error parsing TJA file:", e);
                    const msg = i18n.t('status.parseError', { error: (e as any).message || String(e) });
                    alert(msg);
                    if (statusDisplay) statusDisplay.innerText = msg;

                }

            }

        });

    }
    
    // Setup ESE Search
    if (eseSearchInput) {
        eseSearchInput.addEventListener('input', () => {
             const query = eseSearchInput.value.toLowerCase();
             filterEseResults(query);
        });
    }

    // Setup Stream Controls

    if (connectBtn && hostInput && portInput) {

        connectBtn.addEventListener('click', () => {

            if (connectBtn.innerText === 'Disconnect' || connectBtn.innerText === 'Connected') {
                 
                 const tConnect = i18n.t('ui.stream.connect');
                 const currentText = connectBtn.innerText;
                 
                 if (currentText === tConnect) {
                      const host = hostInput.value;
                      const port = parseInt(portInput.value, 10);
                      if (host && port) {
                          judgementClient.connect(host, port);
                      } else {
                          alert("Please enter valid Host and Port.");
                      }
                 } else {
                      judgementClient.disconnect();
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



                viewOptions.collapsedLoop = (event.target as HTMLInputElement).checked;



                refreshChart();



                renderStats(null, currentChart, viewOptions, judgements);



            });



        }



    // Loop Controls

    if (loopAutoCheckbox) {

        loopAutoCheckbox.addEventListener('change', (e) => {

            if (loopAutoCheckbox.checked) {

                viewOptions.selectedLoopIteration = undefined;

            } else {

                const matches = loopCounter.innerText.match(/(\d+) \/ (\d+)/);

                if (matches) {

                     viewOptions.selectedLoopIteration = parseInt(matches[1]) - 1;

                } else {

                     viewOptions.selectedLoopIteration = 0;

                }

            }

            refreshChart();

        });

    }

    

    if (loopPrevBtn) {

        loopPrevBtn.addEventListener('click', () => {

             if (viewOptions.selectedLoopIteration !== undefined && viewOptions.selectedLoopIteration > 0) {

                 viewOptions.selectedLoopIteration--;

                 refreshChart();

             }

        });

    }



    if (loopNextBtn) {

        loopNextBtn.addEventListener('click', () => {

             if (currentChart && currentChart.loop && viewOptions.selectedLoopIteration !== undefined && viewOptions.selectedLoopIteration < currentChart.loop.iterations - 1) {

                 viewOptions.selectedLoopIteration++;

                 refreshChart();

             }

        });

    }
    
    // Zoom Controls
    if (zoomOutBtn) {
        zoomOutBtn.addEventListener('click', () => {
             // Increase beats per line (Zoom Out)
             if (viewOptions.beatsPerLine < 32) {
                 viewOptions.beatsPerLine += 2;
                 updateZoomDisplay();
                 refreshChart();
             }
        });
    }

    if (zoomInBtn) {
        zoomInBtn.addEventListener('click', () => {
             // Decrease beats per line (Zoom In)
             if (viewOptions.beatsPerLine > 4) {
                 viewOptions.beatsPerLine -= 2;
                 updateZoomDisplay();
                 refreshChart();
             }
        });
    }

    if (zoomResetBtn) {
        zoomResetBtn.addEventListener('click', () => {
            if (viewOptions.beatsPerLine !== 16) {
                viewOptions.beatsPerLine = 16;
                updateZoomDisplay();
                refreshChart();
            }
        });
    }

    // Language Selector
    if (languageSelector) {
        languageSelector.value = i18n.language;
        languageSelector.addEventListener('change', () => {
            i18n.language = languageSelector.value;
        });
    }

    i18n.onLanguageChange(() => {
        updateUIText();
    });

    // Canvas Interaction
    
        const handleCanvasInteraction = (event: MouseEvent) => {

            if (!currentChart) return;

            

            const rect = canvas.getBoundingClientRect();

            const x = event.clientX - rect.left;

            const y = event.clientY - rect.top;

            

            const hit = getNoteAt(x, y, currentChart, canvas, judgements, viewOptions);

            
            if (event.type === 'click') {
                 // Check active tab
                 const activeTab = document.querySelector('#chart-options-panel .panel-tab.active');
                 const mode = activeTab ? activeTab.getAttribute('data-do-tab') : 'view';

                 if (mode === 'annotation') {
                      if (hit && ['1', '2', '3', '4'].includes(hit.type)) {
                           const noteId = `${hit.originalBarIndex}_${hit.charIndex}`;
                           const current = annotations[noteId];
                           if (!current) annotations[noteId] = 'L';
                           else if (current === 'L') annotations[noteId] = 'R';
                           else delete annotations[noteId];
                           
                           refreshChart();
                      }
                      return; // Don't trigger selection logic if in annotation mode
                 }

                 if (mode !== 'selection') return;

                 if (hit) {
                     // Check existing selection state
                     if (!viewOptions.selection) {
                         // Case 1: Initial Selection
                         viewOptions.selection = { start: { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex }, end: null };
                         selectedNoteHitInfo = hit;
                     } else if (viewOptions.selection.start && !viewOptions.selection.end) {
                         // Case 2: Range Selection (End)
                         if (viewOptions.selection.start.originalBarIndex === hit.originalBarIndex && viewOptions.selection.start.charIndex === hit.charIndex) {
                             viewOptions.selection = null;
                             selectedNoteHitInfo = null;
                         } else {
                             viewOptions.selection.end = { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex };
                             selectedNoteHitInfo = hit; 
                         }
                     } else {
                         // Case 3: Restart selection (Range already exists)
                         viewOptions.selection = { start: { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex }, end: null };
                         selectedNoteHitInfo = hit;
                     }
                 } else {
                     // Click on empty space - Deselect
                     viewOptions.selection = null;
                     selectedNoteHitInfo = null;
                 }
                 refreshChart();
                 updateSelectionUI();
            }

            if (hit) {
                canvas.style.cursor = 'pointer';
            } else {
                canvas.style.cursor = 'default';
            }
            
            // Render Stats: Use selected note if active, otherwise hover hit
            // If range selected, we probably want to show stats for the last clicked note (captured in selectedNoteHitInfo)
            const statsHit = selectedNoteHitInfo || hit;
            renderStats(statsHit, currentChart, viewOptions, judgements);

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

            // Clear selection
            viewOptions.selection = null;
            selectedNoteHitInfo = null;
            updateSelectionUI();

                        updateStatus('status.receiving');

            if (event.tjaSummaries && event.tjaSummaries.length > 0) {
                // Sort by player to ensure we get Player 1
                const sortedSummaries = [...event.tjaSummaries].sort((a, b) => a.player - b.player);
                const summary = sortedSummaries[0];
                
                updateParsedCharts(summary.tjaContent);
                
                const diff = summary.difficulty.toLowerCase();
                if (parsedTJACharts && parsedTJACharts[diff]) {
                    difficultySelector.value = diff;
                    currentChart = parsedTJACharts[diff];
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
                        
                        if (status === 'Connected') {

                            connectBtn.innerText = i18n.t('ui.stream.disconnect');

                        } else {

                            connectBtn.innerText = i18n.t('ui.stream.connect');

                        }

                    }

            

            

            

                    if (status === 'Connected') {

            

                        if (showJudgementsCheckbox) {

            

                            showJudgementsCheckbox.disabled = false;

            

                            if (showJudgementsCheckbox.parentElement) {

            

                                showJudgementsCheckbox.parentElement.classList.remove('disabled-text');

            

                            }

                        }

            

                        

                        if (isSimulating) {

            

                            updateStatus('status.simConnected');

            

                        } else {

            

                            updateStatus('status.connected');

            

                            if (testStreamBtn) testStreamBtn.disabled = true;

            

                        }

            

                    } else if (status === 'Connecting...') {

            

                        updateStatus('status.connecting');

            

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

            

                        

                        updateStatus(isSimulating ? 'status.simStopped' : 'status.disconnected');

            

                        isSimulating = false;

            

                    }

            

                });



    // Initial Load

    switchDataSourceMode('example');

    // Load example by default

    updateStatus('status.ready');
    updateUIText(); // Initialize text

    // We don't auto-click load-example, but maybe we should to show something?

    // The previous code loaded example on start.

    loadExampleBtn.click();

}



function updateParsedCharts(content: string) {







    parsedTJACharts = parseTJA(content);

    
        // Clear selection
        viewOptions.selection = null;
        selectedNoteHitInfo = null;
        updateSelectionUI();

        // Clear Annotations
        annotations = {};



    



    



    



        



    



    



    



    



    



    



    



        difficultySelector.innerHTML = '';

    const difficulties = Object.keys(parsedTJACharts);

    if (difficulties.length === 0) {
        difficultySelectorContainer.hidden = true;
        throw new Error(i18n.t('status.noCourses'));
    }

    difficulties.forEach(diff => {
        const option = document.createElement('option');
        option.value = diff;
        option.innerText = diff.charAt(0).toUpperCase() + diff.slice(1);
        difficultySelector.appendChild(option);
    });

    let defaultDifficulty = 'edit';
    if (!parsedTJACharts[defaultDifficulty]) defaultDifficulty = 'oni';
    if (!parsedTJACharts[defaultDifficulty]) defaultDifficulty = difficulties[0];
    
    difficultySelector.value = defaultDifficulty;
    currentChart = parsedTJACharts[defaultDifficulty];
    difficultySelectorContainer.hidden = false;

        updateCollapseLoopState();



        refreshChart();



        renderStats(null, currentChart, viewOptions, judgements);



    }



    



    function updateLoopControls() {
    if (!loopControls || !currentChart) return;

    // Use .style.display for loop controls as they are dynamic and shouldn't take space if irrelevant
    if (viewOptions.collapsedLoop && currentChart.loop) {
        loopControls.style.display = 'flex'; // Changed to flex to match CSS
        
        const loop = currentChart.loop;
        let displayedIter = 0;

        if (viewOptions.selectedLoopIteration === undefined) {
             loopAutoCheckbox.checked = true;
             loopPrevBtn.disabled = true;
             loopNextBtn.disabled = true;

             if ((viewOptions.viewMode === 'judgements' || viewOptions.viewMode === 'judgements-underline' || viewOptions.viewMode === 'judgements-text') && judgements.length > 0) {
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
             displayedIter = viewOptions.selectedLoopIteration;
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
        const texts: RenderTexts = {
            loopPattern: i18n.t('renderer.loop'),
            judgement: {
                perfect: i18n.t('renderer.judge.perfect'),
                good: i18n.t('renderer.judge.good'),
                poor: i18n.t('renderer.judge.poor')
            }
        };
        // Update viewOptions annotations
        viewOptions.annotations = annotations;
        
        // Determine annotation mode state
        const activeTab = document.querySelector('#chart-options-panel .panel-tab.active');
        const mode = activeTab ? activeTab.getAttribute('data-do-tab') : 'view';
        viewOptions.isAnnotationMode = (mode === 'annotation');

        renderChart(currentChart, canvas, judgements, judgementDeltas, viewOptions, texts);
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
    renderStats(null, currentChart, viewOptions, judgements);
};

init();
