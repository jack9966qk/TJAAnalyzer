import { EseClient } from "../clients/ese-client.js";
import { JudgementClient } from "../clients/judgement-client.js";
import { exampleTJA } from "../core/example-data.js";
import { JudgementMap, LocationMap } from "../core/renderer.js";
export const appState = {
    parsedTJACharts: null,
    currentChart: null,
    viewOptions: {
        viewMode: "original",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        selectedLoopIteration: undefined,
        beatsPerLine: 16,
        selection: null,
        annotations: new LocationMap(),
    },
    loadedTJAContent: exampleTJA,
    activeDataSourceMode: "list",
    isSimulating: false,
    isStreamConnected: false,
    hasReceivedGameStart: false,
    selectedNoteHitInfo: null,
    annotations: new LocationMap(),
    eseClient: new EseClient(),
    eseTree: null,
    judgementClient: new JudgementClient(),
    judgements: new JudgementMap(),
    currentEsePath: null,
    currentStatusKey: "status.initializing",
    currentStatusParams: undefined,
};
