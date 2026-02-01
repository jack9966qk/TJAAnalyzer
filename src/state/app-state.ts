import {
  type HitInfo,
  JudgementMap,
  type JudgementValue,
  LocationMap,
  type ParsedChart,
  type ViewOptions,
} from "../../renderer-package/src/index.js";
import { EseClient, type GitNode } from "../clients/ese-client.js";
import { JudgementClient } from "../clients/judgement-client.js";
import { exampleTJA } from "../core/example-data.js";

interface AppState {
  parsedTJACharts: Record<string, ParsedChart> | null;
  currentChart: ParsedChart | null;
  viewOptions: ViewOptions & { autoZoom?: boolean };
  loadedTJAContent: string;
  activeDataSourceMode: string;
  isSimulating: boolean;
  isStreamConnected: boolean;
  hasReceivedGameStart: boolean;
  selectedNoteHitInfo: HitInfo | null;
  annotations: LocationMap<string>;
  eseClient: EseClient;
  eseTree: GitNode[] | null;
  judgementClient: JudgementClient;
  judgements: JudgementMap<JudgementValue>;
  currentEsePath: string | null;
  currentStatusKey: string;
  currentStatusParams: Record<string, string | number> | undefined;
  isTesterMode: boolean;
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
    annotations: new LocationMap(),
    showTextInAnnotationMode: false,
    alwaysShowAnnotations: false,
    autoZoom: false,
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
  isTesterMode: false,
};
