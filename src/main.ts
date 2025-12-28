import { parseTJA, ParsedChart } from './tja-parser.js';
import { generateTJAFromSelection } from './tja-exporter.js';
import { shareFile } from './file-share.js';
import { HitInfo, getGradientColor, ViewOptions, RenderTexts, PALETTE } from './renderer.js';
import { exampleTJA } from './example-data.js';
import { JudgementClient, ServerEvent } from './judgement-client.js';
import { i18n } from './i18n.js';
import { EseClient, GitNode } from './ese-client.js';
import { TJAChart, ChartClickEventDetail } from './tja-chart.js';
import { NoteStatsDisplay } from './note-stats.js';

// Ensure TJAChart is imported for side-effects (custom element registration)
console.log('TJAChart module loaded', TJAChart);
// Ensure NoteStatsDisplay is imported for side-effects
console.log('NoteStatsDisplay module loaded', NoteStatsDisplay);

const tjaChart = document.getElementById('chart-component') as TJAChart;
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
let activeDataSourceMode: string = 'list';
let isSimulating: boolean = false;
let isStreamConnected: boolean = false;
let hasReceivedGameStart: boolean = false;
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
const noteStatsDisplay = document.getElementById('note-stats-display') as NoteStatsDisplay;
const languageSelector = document.getElementById('language-selector') as HTMLSelectElement;

const judgementWarning = document.getElementById('judgement-warning') as HTMLDivElement;
const judgementControls = document.getElementById('judgement-controls') as HTMLDivElement;
const judgementSubcontrols = document.getElementById('judgement-subcontrols') as HTMLDivElement;
const judgementStyleRadios = document.querySelectorAll('input[name="judgementStyle"]');
const judgementColoringRadios = document.querySelectorAll('input[name="judgementColoring"]');
const showPerfectCheckbox = document.getElementById('show-perfect-checkbox') as HTMLInputElement;
const showGoodCheckbox = document.getElementById('show-good-checkbox') as HTMLInputElement;
const showPoorCheckbox = document.getElementById('show-poor-checkbox') as HTMLInputElement;

const difficultySelectorContainer = document.getElementById('difficulty-selector-container') as HTMLDivElement;
const difficultySelector = document.getElementById('difficulty-selector') as HTMLSelectElement;
const branchSelectorContainer = document.getElementById('branch-selector-container') as HTMLSpanElement;
const branchSelector = document.getElementById('branch-selector') as HTMLSelectElement;

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

// Footer & Changelog
const appFooter = document.querySelector('.app-footer') as HTMLDivElement;
const changelogBtn = document.getElementById('changelog-btn') as HTMLButtonElement;
const changelogModal = document.getElementById('changelog-modal') as HTMLDivElement;
const changelogCloseBtn = changelogModal ? changelogModal.querySelector('.close-btn') as HTMLElement : null;
const changelogList = document.getElementById('changelog-list') as HTMLDivElement;

// Layout Elements
const controlsContainer = document.getElementById('controls-container') as HTMLDivElement;
const chartContainer = document.getElementById('chart-container') as HTMLDivElement;
const layoutToggleBtn = document.getElementById('layout-toggle-btn') as HTMLButtonElement;
const CONTROLS_WIDTH = 390; // Estimated width for 3 stats columns + padding

// Display Options Tabs
const doTabs = document.querySelectorAll('#chart-options-panel .panel-tab');
const doPanes = document.querySelectorAll('#chart-options-panel .panel-pane');
const clearSelectionBtn = document.getElementById('clear-selection-btn') as HTMLButtonElement;
const exportSelectionBtn = document.getElementById('export-selection-btn') as HTMLButtonElement;

const clearAnnotationsBtn = document.getElementById('clear-annotations-btn') as HTMLButtonElement;
const autoAnnotateBtn = document.getElementById('auto-annotate-btn') as HTMLButtonElement;
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
const eseShareBtn = document.getElementById('ese-share-btn') as HTMLButtonElement;

let currentEsePath: string | null = null;
let currentStatusKey = 'status.initializing';
let currentStatusParams: Record<string, string | number> | undefined;

function updateStatus(key: string, params?: Record<string, string | number>) {
    currentStatusKey = key;
    currentStatusParams = params;
    if (statusDisplay) {
        statusDisplay.innerText = i18n.t(key, params);
    }
}

function resetExampleButton() {
    if (loadExampleBtn) {
        loadExampleBtn.disabled = false;
        loadExampleBtn.setAttribute('data-i18n', 'ui.example.load');
        loadExampleBtn.innerText = i18n.t('ui.example.load');
        loadExampleBtn.classList.remove('disabled');
    }
}

function updateStatsComponent(hit: HitInfo | null) {
    if (noteStatsDisplay) {
        noteStatsDisplay.chart = currentChart;
        noteStatsDisplay.viewOptions = viewOptions;
        noteStatsDisplay.judgements = judgements;
        noteStatsDisplay.judgementDeltas = judgementDeltas;
        noteStatsDisplay.hit = hit;
    }
}

function updateModeStatus(mode: string) {
    if (chartModeStatus) {
        if (mode === 'view') chartModeStatus.innerText = i18n.t('mode.view');
        else if (mode === 'judgements') chartModeStatus.innerText = i18n.t('mode.judgements');
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
            // Restore flex for view, block for selection/annotation/judgements
            if (mode === 'view') (p as HTMLElement).style.display = 'flex';
            else (p as HTMLElement).style.display = 'block';
        } else {
             (p as HTMLElement).style.display = 'none';
        }
    });

    updateModeStatus(mode);
    updateDisplayState();
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
    const results = query ? eseTree.filter(node => {
        const q = query.toLowerCase();
        return node.path.toLowerCase().includes(q) ||
               (node.title && node.title.toLowerCase().includes(q)) ||
               (node.titleJp && node.titleJp.toLowerCase().includes(q));
    }) : eseTree;
    
    if (results.length === 0) {
         eseResults.innerHTML = `<div style="padding: 10px; color: #888; font-style: italic;">${i18n.t('ui.ese.noResults')}</div>`;
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

        // Highlight if matches current path
        if (currentEsePath && node.path === currentEsePath) {
            div.style.background = '#e0e0ff';
        }
        
        div.addEventListener('click', async () => {
             try {
                 updateStatus('status.loadingChart');
                 // Highlight selection
                 document.querySelectorAll('.ese-result-item').forEach(el => (el as HTMLElement).style.background = 'transparent');
                 div.style.background = '#e0e0ff';

                 const content = await eseClient.getFileContent(node.path);
                 loadedTJAContent = content;
                 currentEsePath = node.path; // Update current ESE path
                 if (eseShareBtn) eseShareBtn.disabled = false;
                 
                 updateParsedCharts(content);
                 updateStatus('status.chartLoaded');
                 resetExampleButton();
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

    if (results.length > 100) {
        const truncationMsg = document.createElement('div');
        truncationMsg.style.padding = '10px';
        truncationMsg.style.fontStyle = 'italic';
        truncationMsg.style.color = '#888';
        truncationMsg.innerText = i18n.t('ui.ese.truncated');
        eseResults.appendChild(truncationMsg);
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

    // Logic: Disconnect if moving away from stream and currently connected
    if (mode !== 'stream') {
        // Check if connected
        if (connectBtn && (connectBtn.innerText === 'Disconnect' || isSimulating)) {
            judgementClient.disconnect();
        }
    }

    // List (Example + ESE) Logic
    if (mode === 'list') {
        if (!eseTree) {
             updateStatus('status.loadingEse');
             // Show loading indicator in results
             if(eseResults) eseResults.innerHTML = '<div style="padding:10px;">Loading song list...</div>';
             
             eseClient.getTjaFiles().then(tree => {
                 eseTree = tree;
                 updateStatus('status.eseReady');
                 filterEseResults('');
                 
                 // Check pending load from URL
                 if (pendingEseLoad) {
                     loadEseFromUrl(pendingEseLoad.path, pendingEseLoad.diff);
                     pendingEseLoad = null;
                 }
             }).catch(e => {
                 const errMsg = (e as any).message || String(e);
                 updateStatus('status.eseError', { error: errMsg });
                 if(eseResults) eseResults.innerHTML = `<div style="padding:10px; color:red">Error loading tree: ${errMsg}</div>`;
             });
        } else if (pendingEseLoad) {
             // Tree already loaded, just load the file
             loadEseFromUrl(pendingEseLoad.path, pendingEseLoad.diff);
             pendingEseLoad = null;
        }
    }
    
    // Disable share button if not in List mode or no chart loaded (ESE specific)
    if (eseShareBtn) {
        if (mode === 'list' && currentEsePath) {
            eseShareBtn.disabled = false;
        } else {
            eseShareBtn.disabled = true;
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

let pendingEseLoad: { path: string, diff: string } | null = null;

async function loadEseFromUrl(path: string, diff: string) {
    try {
         updateStatus('status.loadingChart');
         
         const content = await eseClient.getFileContent(path);
         loadedTJAContent = content;
         currentEsePath = path;
         if (eseShareBtn) eseShareBtn.disabled = false;

         // Update Search UI
         if (eseSearchInput) eseSearchInput.value = path;
         filterEseResults(path);

         updateParsedCharts(content);
         
         if (parsedTJACharts) {
             // Fallback if requested diff not found
             const targetDiff = parsedTJACharts[diff] ? diff : Object.keys(parsedTJACharts)[0];
             
             if (parsedTJACharts[targetDiff]) {
                 difficultySelector.value = targetDiff;
                 currentChart = parsedTJACharts[targetDiff];
                 refreshChart();
                 updateCollapseLoopState();
             }
         }
         
         updateStatus('status.chartLoaded');
         resetExampleButton();
    } catch (e) {
         console.error("Error in loadEseFromUrl", e);
         const errMsg = (e as any).message || String(e);
         alert(`Failed to load chart from URL: ${errMsg}`);
         updateStatus('status.eseError', { error: errMsg });
    }
}

// ... rest of the file ...

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
                 (el as HTMLElement).innerHTML = i18n.t(key);
            }
        }
    });

    if (eseSearchInput) {
        eseSearchInput.placeholder = i18n.t('ui.ese.searchPlaceholder');
    }

    // Dynamic Elements
    updateStatus(currentStatusKey);
    
    // Update difficulty selector options
    if (difficultySelector) {
        for (let i = 0; i < difficultySelector.options.length; i++) {
            const opt = difficultySelector.options[i];
            const diff = opt.value;
            const key = `ui.difficulty.${diff.toLowerCase()}`;
            const translated = i18n.t(key);
            opt.innerText = (translated !== key) ? translated : (diff.charAt(0).toUpperCase() + diff.slice(1));
        }
    }
    
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
        updateStatsComponent(selectedNoteHitInfo);
    }
}

function updateDisplayState() {
    const activeTab = document.querySelector('#chart-options-panel .panel-tab.active');
    const mode = activeTab ? activeTab.getAttribute('data-do-tab') : 'view';
    const isStreamActive = isStreamConnected || isSimulating;

    if (mode === 'judgements') {
        // Determine sub-mode from radios
        const style = document.querySelector('input[name="judgementStyle"]:checked') as HTMLInputElement;
        if (style && style.value === 'underline') {
            viewOptions.viewMode = 'judgements-underline';
        } else if (style && style.value === 'text') {
            viewOptions.viewMode = 'judgements-text';
        } else {
            viewOptions.viewMode = 'judgements';
        }

        // Handle Warning/Controls visibility
        if (judgementWarning) judgementWarning.style.display = isStreamActive ? 'none' : 'block';
        if (judgementControls) {
             judgementControls.style.display = 'flex';
             if (isStreamActive) {
                 judgementControls.classList.remove('disabled');
                 judgementControls.style.opacity = '1';
                 judgementControls.style.pointerEvents = 'auto';
             } else {
                 judgementControls.classList.add('disabled');
                 judgementControls.style.opacity = '0.5';
                 judgementControls.style.pointerEvents = 'none';
             }
        }
    } else {
        viewOptions.viewMode = 'original';
    }

    // Determine Coloring Mode
    const coloring = document.querySelector('input[name="judgementColoring"]:checked') as HTMLInputElement;
    viewOptions.coloringMode = (coloring && coloring.value === 'gradient') ? 'gradient' : 'categorical';

    // Determine Judgement Visibility
    if (showPerfectCheckbox && showGoodCheckbox && showPoorCheckbox) {
        viewOptions.visibility = {
            perfect: showPerfectCheckbox.checked,
            good: showGoodCheckbox.checked,
            poor: showPoorCheckbox.checked
        };
    }

    refreshChart();
}

function updateBranchSelectorState(resetBranch: boolean = false) {
    if (!parsedTJACharts) return;
    
    const selectedDiff = difficultySelector.value;
    const rootChart = parsedTJACharts[selectedDiff];
    
    if (!rootChart) return;

    if (rootChart.branches) {
        branchSelectorContainer.hidden = false;
        if (resetBranch) {
            branchSelector.value = 'all';
        }
        
        const branchType = branchSelector.value;
        
        if (branchType === 'all') {
            viewOptions.showAllBranches = true;
            currentChart = rootChart;
        } else {
            viewOptions.showAllBranches = false;
            // Note: rootChart.branches.normal is the rootChart itself usually
            const target = rootChart.branches[branchType as 'normal' | 'expert' | 'master'];
            if (target) {
                currentChart = target;
            } else {
                // Fallback
                currentChart = rootChart;
            }
        }
    } else {
        branchSelectorContainer.hidden = true;
        viewOptions.showAllBranches = false;
        currentChart = rootChart;
    }
    
    updateCollapseLoopState();
    refreshChart();
}

function updateCollapseLoopState() {
    if (!collapseLoopCheckbox) return;
    const hasLoop = currentChart && currentChart.loop;
    const optionSection = collapseLoopCheckbox.closest('.option-section') as HTMLElement;
    if (hasLoop) {
        collapseLoopCheckbox.disabled = false;
        if (collapseLoopCheckbox.parentElement) {
            collapseLoopCheckbox.parentElement.classList.remove('disabled-text');
        }
        if (optionSection) {
            optionSection.style.display = '';
        }
    } else {
        collapseLoopCheckbox.disabled = true;
        collapseLoopCheckbox.checked = false;
        viewOptions.collapsedLoop = false;
        if (collapseLoopCheckbox.parentElement) {
            collapseLoopCheckbox.parentElement.classList.add('disabled-text');
       }
       if (optionSection) {
           optionSection.style.display = 'none';
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

function updateLayout() {
    if (!controlsContainer || !layoutToggleBtn) return;
    
    const windowWidth = window.innerWidth;
    // If controls width is less than 40% of window width, use horizontal layout
    const shouldUseHorizontal = CONTROLS_WIDTH < (windowWidth * 0.4);
    
    if (shouldUseHorizontal) {
        document.body.classList.add('horizontal-layout');
        
        // Move footer to controls container
        if (appFooter && appFooter.parentElement !== controlsContainer) {
            controlsContainer.appendChild(appFooter);
        }

        // Update state based on collapse status
        if (!document.body.classList.contains('controls-collapsed')) {
            controlsContainer.style.width = `${CONTROLS_WIDTH}px`;
            layoutToggleBtn.style.left = `${CONTROLS_WIDTH}px`;
            layoutToggleBtn.innerHTML = '<span class="icon">&lt;</span>';
            layoutToggleBtn.title = i18n.t('ui.collapse');
        } else {
             controlsContainer.style.width = '0px';
             layoutToggleBtn.style.left = '0px';
             layoutToggleBtn.innerHTML = '<span class="icon">&gt;</span>';
             layoutToggleBtn.title = i18n.t('ui.expand');
        }
    } else {
        document.body.classList.remove('horizontal-layout');

        // Move footer back to chart container
        if (appFooter && appFooter.parentElement !== chartContainer) {
            chartContainer.appendChild(appFooter);
        }

        // Reset styles for vertical layout
        controlsContainer.style.width = '';
        layoutToggleBtn.style.left = '';
    }
}

function handleLayoutToggle() {
    if (!controlsContainer || !layoutToggleBtn) return;

    document.body.classList.toggle('controls-collapsed');
    const isCollapsed = document.body.classList.contains('controls-collapsed');
    
    if (isCollapsed) {
        controlsContainer.style.width = '0px';
        layoutToggleBtn.style.left = '0px';
        layoutToggleBtn.innerHTML = '<span class="icon">&gt;</span>';
        layoutToggleBtn.title = i18n.t('ui.expand');
    } else {
        controlsContainer.style.width = `${CONTROLS_WIDTH}px`;
        layoutToggleBtn.style.left = `${CONTROLS_WIDTH}px`;
        layoutToggleBtn.innerHTML = '<span class="icon">&lt;</span>';
        layoutToggleBtn.title = i18n.t('ui.collapse');
    }
    
    // Refresh chart after transition to ensure correct width
    setTimeout(() => {
        refreshChart();
    }, 350);
}

function init(): void {
    // Layout Init
    if (layoutToggleBtn) {
        layoutToggleBtn.addEventListener('click', handleLayoutToggle);
    }
    window.addEventListener('resize', () => {
        updateLayout();
        refreshChart();
    });
    
    // Initial call
    updateLayout();

    if (!tjaChart) {
        console.error("tja-chart element not found.");
        return;
    }



    // Initial State

    // Ensure subcontrols are disabled initially
    if (judgementSubcontrols) {
        // judgementSubcontrols.classList.add('disabled'); // Class no longer used for disabled state, controlled by display
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

        const optionSection = collapseLoopCheckbox.closest('.option-section') as HTMLElement;
        if (optionSection) {
            optionSection.style.display = 'none';
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
                
                await shareFile('exported.tja', tjaContent, 'text/plain', 'Export TJA');
                updateStatus('status.exportSuccess');
            } catch (e) {
                console.error("Export failed:", e);
                updateStatus('status.exportFailed');
            }
        });
    }

    const exportImageBtns = document.querySelectorAll('.export-image-trigger');
    exportImageBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!currentChart) return;
            
            try {
                // Determine annotation mode state for rendering
                // We should respect the current state
                const activeTab = document.querySelector('#chart-options-panel .panel-tab.active');
                const mode = activeTab ? activeTab.getAttribute('data-do-tab') : 'view';
                const optionsForExport = { ...viewOptions, isAnnotationMode: (mode === 'annotation') };

                const dataURL = tjaChart.exportImage(optionsForExport);
                
                // Convert DataURL to Uint8Array
                const base64Data = dataURL.split(',')[1];
                const binaryString = window.atob(base64Data);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                
                await shareFile('chart.png', bytes, 'image/png', 'Save Chart Image');
                updateStatus('status.exportImageSuccess');
            } catch (e) {
                console.error("Export image failed:", e);
                updateStatus('status.exportImageFailed');
            }
        });
    });
    
    if (clearAnnotationsBtn) {
        clearAnnotationsBtn.addEventListener('click', () => {
            annotations = {};
            refreshChart();
        });
    }

    if (autoAnnotateBtn) {
        autoAnnotateBtn.addEventListener('click', () => {
            tjaChart.autoAnnotate();
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
            
            // Clear hover effect if hidden
            if (!showStatsCheckbox.checked) {
                if (viewOptions.hoveredNote) {
                    viewOptions.hoveredNote = null;
                    refreshChart();
                }
            }

        });

    }

    // Setup Load Example Button

    if (loadExampleBtn) {

        loadExampleBtn.addEventListener('click', () => {

            loadedTJAContent = exampleTJA;

            // Disable button
            loadExampleBtn.disabled = true;
            loadExampleBtn.setAttribute('data-i18n', 'ui.example.loaded');
            loadExampleBtn.innerText = i18n.t('ui.example.loaded');

            // Clear ESE state
            currentEsePath = null;
            if (eseShareBtn) eseShareBtn.disabled = true;
            if (eseResults) {
                // Clear highlights
                document.querySelectorAll('.ese-result-item').forEach(el => (el as HTMLElement).style.background = 'transparent');
            }
            if (eseSearchInput) eseSearchInput.value = '';

            try {
                updateParsedCharts(loadedTJAContent);
                updateStatus('status.exampleLoaded');
            } catch (e) {
                console.error("Error loading example:", e);
                const msg = i18n.t('status.parseError', { error: (e as Error).message });
                alert(msg);
                if (statusDisplay) statusDisplay.innerText = msg;
                resetExampleButton(); // Reset on error
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
                    
                    resetExampleButton();

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

            if (isStreamConnected) {
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
            updateDisplayState();

            // Use currently loaded content and selected difficulty

            judgementClient.startSimulation(loadedTJAContent, difficultySelector.value);

        });

    }

    if (collapseLoopCheckbox) {

        collapseLoopCheckbox.addEventListener('change', (event) => {

            viewOptions.collapsedLoop = (event.target as HTMLInputElement).checked;

            refreshChart();

            updateStatsComponent(null);

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

    // Changelog Logic
    if (changelogBtn && changelogModal && changelogList) {
        changelogBtn.addEventListener('click', async () => {
            changelogModal.style.display = 'block';
            
            if (changelogList.children.length === 0) {
                changelogList.innerHTML = '<div style="padding:10px; color:#666;">Loading...</div>';
                try {
                    const res = await fetch('changelog.json');
                    if (!res.ok) throw new Error(`HTTP ${res.status}`);
                    const data = await res.json();
                    
                    changelogList.innerHTML = '';
                    if (Array.isArray(data) && data.length > 0) {
                        data.forEach((item: any) => {
                            const div = document.createElement('div');
                            div.className = 'changelog-item';
                            div.innerHTML = `
                                <div class="changelog-header">
                                    <span>${item.date}</span>
                                    <span style="font-family:monospace;">${item.hash}</span>
                                </div>
                                <div class="changelog-msg">${item.message}</div>
                            `;
                            changelogList.appendChild(div);
                        });
                    } else {
                         changelogList.innerHTML = '<div style="padding:10px;">No changelog available.</div>';
                    }
                } catch (e) {
                    console.error("Failed to load changelog:", e);
                    changelogList.innerHTML = '<div style="padding:10px; color:red;">Failed to load changelog.</div>';
                }
            }
        });

        if (changelogCloseBtn) {
            changelogCloseBtn.addEventListener('click', () => {
                changelogModal.style.display = 'none';
            });
        }

        window.addEventListener('click', (event) => {
            if (event.target === changelogModal) {
                changelogModal.style.display = 'none';
            }
        });
    }

    // Load Version
    const appVersionEl = document.getElementById('app-version');
    if (appVersionEl) {
        fetch('version.json')
            .then(res => {
                if (!res.ok) throw new Error('Version file not found');
                return res.json();
            })
            .then(data => {
                if (data && data.version) {
                    appVersionEl.innerText = `v${data.version}`;
                }
            })
            .catch(e => {
                console.warn('Failed to load version:', e);
            });
    }

    // Canvas Interaction
    
    // Listen to custom events
    tjaChart.addEventListener('annotations-change', (e: Event) => {
         const newAnnotations = (e as CustomEvent).detail;
         annotations = newAnnotations;
         refreshChart();
    });

    tjaChart.addEventListener('chart-hover', (e: Event) => {
         const detail = (e as CustomEvent).detail;
         const hit = detail.hit as HitInfo | null;
         
         // Render stats
         const statsHit = selectedNoteHitInfo || hit;
         updateStatsComponent(statsHit);

         // Update Hover Style
         const isStatsVisible = showStatsCheckbox ? showStatsCheckbox.checked : false;
         const newHoveredNote = (isStatsVisible && hit) ? { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex } : null;
         
         const currentHovered = viewOptions.hoveredNote;
         let changed = false;
         
         if (!currentHovered && !newHoveredNote) {
             changed = false;
         } else if (!currentHovered || !newHoveredNote) {
             changed = true;
         } else {
             changed = (currentHovered.originalBarIndex !== newHoveredNote.originalBarIndex || currentHovered.charIndex !== newHoveredNote.charIndex);
         }
         
         if (changed) {
             viewOptions.hoveredNote = newHoveredNote;
             refreshChart();
         }
    });
    
    tjaChart.addEventListener('chart-click', (e: Event) => {
         const detail = (e as CustomEvent).detail;
         const hit = detail.hit as HitInfo | null;
         
         if (!currentChart) return;
         const activeTab = document.querySelector('#chart-options-panel .panel-tab.active');
         const mode = activeTab ? activeTab.getAttribute('data-do-tab') : 'view';

         if (viewOptions.showAllBranches && (mode === 'annotation' || mode === 'selection')) return;

         // Annotation logic moved to component (annotations-change event)
         if (mode === 'annotation') return;

         if (mode !== 'selection') return;
         
         // Selection Logic (same as before)
         if (hit) {
             if (!viewOptions.selection) {
                 viewOptions.selection = { start: { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex }, end: null };
                 selectedNoteHitInfo = hit;
             } else if (viewOptions.selection.start && !viewOptions.selection.end) {
                 if (viewOptions.selection.start.originalBarIndex === hit.originalBarIndex && viewOptions.selection.start.charIndex === hit.charIndex) {
                     viewOptions.selection = null;
                     selectedNoteHitInfo = null;
                 } else {
                     viewOptions.selection.end = { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex };
                     selectedNoteHitInfo = hit; 
                 }
             } else {
                 viewOptions.selection = { start: { originalBarIndex: hit.originalBarIndex, charIndex: hit.charIndex }, end: null };
                 selectedNoteHitInfo = hit;
             }
         } else {
             viewOptions.selection = null;
             selectedNoteHitInfo = null;
         }
         refreshChart();
         updateSelectionUI();
         updateStatsComponent(selectedNoteHitInfo);
    });

    difficultySelector.addEventListener('change', () => {
        updateBranchSelectorState(true);
    });

    if (branchSelector) {
        branchSelector.addEventListener('change', () => {
            updateBranchSelectorState(false);
        });
    }

    // Judgement Client Callbacks

    judgementClient.onMessage(async (event: ServerEvent) => {

        if (event.type === 'gameplay_start') {

            console.log("Gameplay Start Event Received");

            judgements = [];

            judgementDeltas = [];

            currentChart = null;
            
            hasReceivedGameStart = true;

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
            
            resetExampleButton();

        } else if (event.type === 'judgement') {

            judgements.push(event.judgement);

            judgementDeltas.push(event.msDelta);

            refreshChart();

        }

    });

    judgementClient.onStatusChange((status: string) => {

                    if (connectBtn) {
                        if (status === 'Connected') {
                            isStreamConnected = true;
                            connectBtn.innerText = i18n.t('ui.stream.disconnect');
                        } else {
                            // Only set to connect if disconnected or connecting...
                             if (status !== 'Connecting...') {
                                 connectBtn.innerText = i18n.t('ui.stream.connect');
                             }
                        }
                    }

                    if (status === 'Connected') {
                        isStreamConnected = true;
                        
                        // Reset for new connection session
                        hasReceivedGameStart = false; 
                        
                        if (isSimulating) {
                            updateStatus('status.simConnected');
                        } else {
                            updateStatus('status.connected');
                            if (testStreamBtn) testStreamBtn.disabled = true;
                        }
                        
                        // Clear chart to force waiting screen
                        if (!isSimulating) { // Simulation sends start event immediately usually, but good to be safe
                             currentChart = null; 
                             refreshChart();
                        }

                    } else if (status === 'Connecting...') {
                        updateStatus('status.connecting');
                        hasReceivedGameStart = false; 
                        if (testStreamBtn) testStreamBtn.disabled = true;
                        if (connectBtn) connectBtn.disabled = true;
                    } else { // Disconnected
                        isStreamConnected = false;
                        hasReceivedGameStart = false;
                        
                        // Re-enable controls if we were in test mode
                         if (testStreamBtn) testStreamBtn.disabled = false;
                         if (connectBtn) connectBtn.disabled = false;
                        
                        updateStatus(isSimulating ? 'status.simStopped' : 'status.disconnected');
                        isSimulating = false;
                    }
                    updateDisplayState();
                });



    // ESE Share Button
    if (eseShareBtn) {
        eseShareBtn.addEventListener('click', async () => {
             if (!currentEsePath) return;
             
             const url = new URL(window.location.href);
             url.searchParams.set('ese', currentEsePath);
             url.searchParams.set('diff', difficultySelector.value);
             
             try {
                 await navigator.clipboard.writeText(url.toString());
                 alert('Link copied to clipboard!');
             } catch (e) {
                 console.error('Failed to copy link:', e);
                 alert('Failed to copy link.');
             }
        });
    }

    // Initial Load
    updateStatus('status.ready');
    updateUIText(); // Initialize text

    // Check URL Params
    const urlParams = new URLSearchParams(window.location.search);
    const eseParam = urlParams.get('ese');
    const diffParam = urlParams.get('diff');

    if (eseParam) {
        pendingEseLoad = { path: eseParam, diff: diffParam || 'oni' };
        switchDataSourceMode('list');
    } else {
        switchDataSourceMode('list');
        if (loadExampleBtn) loadExampleBtn.click();
    }

    initializePanelVisibility();
}

function initializePanelVisibility() {
    if (!dsBody || !optionsBody) return;

    // Temporarily expand to measure
    dsBody.classList.remove('collapsed');
    optionsBody.classList.remove('collapsed');
    
    const dsHeight = dsBody.offsetHeight;
    const optionsHeight = optionsBody.offsetHeight;
    const viewportHeight = window.innerHeight;

    const totalExpandedHeight = dsHeight + optionsHeight;

    if (totalExpandedHeight < viewportHeight / 2) {
        // Expand
        dsBody.classList.remove('collapsed');
        optionsBody.classList.remove('collapsed');
        if (dsCollapseBtn) dsCollapseBtn.innerText = i18n.t('ui.collapse');
        if (optionsCollapseBtn) optionsCollapseBtn.innerText = i18n.t('ui.collapse');
    } else {
        // Collapse
        dsBody.classList.add('collapsed');
        optionsBody.classList.add('collapsed');
        if (dsCollapseBtn) dsCollapseBtn.innerText = i18n.t('ui.expand');
        if (optionsCollapseBtn) optionsCollapseBtn.innerText = i18n.t('ui.expand');
    }
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
        const key = `ui.difficulty.${diff.toLowerCase()}`;
        const translated = i18n.t(key);
        option.innerText = (translated !== key) ? translated : (diff.charAt(0).toUpperCase() + diff.slice(1));
        difficultySelector.appendChild(option);
    });

    let defaultDifficulty = 'edit';
    if (!parsedTJACharts[defaultDifficulty]) defaultDifficulty = 'oni';
    if (!parsedTJACharts[defaultDifficulty]) defaultDifficulty = difficulties[0];
    
    difficultySelector.value = defaultDifficulty;
    updateBranchSelectorState(true);
    
    if (activeDataSourceMode === 'stream') {
        difficultySelectorContainer.hidden = true;
    } else {
        difficultySelectorContainer.hidden = false;
    }

    updateStatsComponent(null);
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
    if (!tjaChart) return;

    // 1. Check for Stream Waiting State
    if ((isStreamConnected || isSimulating) && !hasReceivedGameStart) {
        tjaChart.showMessage(i18n.t('ui.stream.waitingStart'), 'info');
        updateLoopControls();
        return;
    }

    if (currentChart) {
        // Determine mode for checks
        const activeTab = document.querySelector('#chart-options-panel .panel-tab.active');
        const mode = activeTab ? activeTab.getAttribute('data-do-tab') : 'view';

        // 1. Check for All Branches + Selection/Annotation Mode
        if (viewOptions.showAllBranches && (mode === 'selection' || mode === 'annotation')) {
             tjaChart.showMessage(i18n.t('ui.error.branchAllMode'), 'warning');
             updateLoopControls();
             return;
        }

        // 2. Check for Branching + Judgement Mode
        const isJudgementMode = viewOptions.viewMode.startsWith('judgements');
        // Check if branching UI is active/visible as a proxy for "chart has branching"
        const branchSelectorVisible = branchSelectorContainer && !branchSelectorContainer.hidden;

        if (isJudgementMode && branchSelectorVisible) {
            tjaChart.showMessage(i18n.t('ui.judgement.branchingNotSupported'), 'warning');
            updateLoopControls();
            return;
        }

        tjaChart.clearMessage();

        const texts: RenderTexts = {
            loopPattern: i18n.t('renderer.loop'),
            judgement: {
                perfect: i18n.t('renderer.judge.perfect'),
                good: i18n.t('renderer.judge.good'),
                poor: i18n.t('renderer.judge.poor')
            },
            course: {
                'easy': i18n.t('ui.difficulty.easy'),
                'normal': i18n.t('ui.difficulty.normal'),
                'hard': i18n.t('ui.difficulty.hard'),
                'oni': i18n.t('ui.difficulty.oni'),
                'edit': i18n.t('ui.difficulty.edit'),
                'ura': i18n.t('ui.difficulty.edit')
            }
        };
        
        // Update viewOptions annotations
        viewOptions.annotations = annotations;
        viewOptions.isAnnotationMode = (mode === 'annotation');

        tjaChart.chart = currentChart;
        tjaChart.viewOptions = viewOptions;
        tjaChart.judgements = judgements;
        tjaChart.judgementDeltas = judgementDeltas;
        tjaChart.texts = texts;

        updateLoopControls();
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

// Expose for testing
(window as any).setJudgements = (newJudgements: string[], newDeltas?: (number | undefined)[]) => {
    judgements = newJudgements;
    judgementDeltas = newDeltas || [];
    refreshChart();
    updateStatsComponent(null);
};

(window as any).loadTJAContent = (content: string) => {
    loadedTJAContent = content;
    updateParsedCharts(content);
    updateStatus('status.fileLoaded');
};

(window as any).setViewOptions = (opts: any) => {
    viewOptions = { ...viewOptions, ...opts };
    refreshChart();
};

init();
