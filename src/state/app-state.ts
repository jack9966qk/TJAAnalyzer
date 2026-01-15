import { EseClient, type GitNode } from "../clients/ese-client.js";
import { exampleTJA } from "../core/example-data.js";
import { JudgementClient } from "../clients/judgement-client.js";
import type { HitInfo, ViewOptions } from "../core/renderer.js";
import type { ParsedChart } from "../core/tja-parser.js";

interface AppState {
  parsedTJACharts: Record<string, ParsedChart> | null;
  currentChart: ParsedChart | null;
  viewOptions: ViewOptions;
  loadedTJAContent: string;
  activeDataSourceMode: string;
  isSimulating: boolean;
  isStreamConnected: boolean;
  hasReceivedGameStart: boolean;
  selectedNoteHitInfo: HitInfo | null;
  annotations: Record<string, string>;
  eseClient: EseClient;
  eseTree: GitNode[] | null;
  judgementClient: JudgementClient;
  judgements: string[];
  judgementDeltas: (number | undefined)[];
  currentEsePath: string | null;
  currentStatusKey: string;
  currentStatusParams: Record<string, string | number> | undefined;
}

export const appState: AppState = {
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
    annotations: {},
  },
  loadedTJAContent: exampleTJA,
  activeDataSourceMode: "list",
  isSimulating: false,
  isStreamConnected: false,
  hasReceivedGameStart: false,
  selectedNoteHitInfo: null,
  annotations: {},
  eseClient: new EseClient(),
  eseTree: null,
  judgementClient: new JudgementClient(),
  judgements: [],
  judgementDeltas: [],
  currentEsePath: null,
  currentStatusKey: "status.initializing",
  currentStatusParams: undefined,
};
