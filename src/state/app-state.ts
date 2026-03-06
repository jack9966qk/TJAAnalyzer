import * as Renderer from "tja-renderer";
import { EseClient, type EseIndexEntry } from "../clients/ese-client.js";
import { JudgementClient } from "../clients/judgement-client.js";
import { exampleTJA } from "../core/example-data.js";
import { loadUserProfile } from "../utils/user-profile.js";

const { JudgementMap, LocationMap } = Renderer.Private;

type HitInfo = Renderer.Private.HitInfo;
type JudgementMap<T> = Renderer.Private.JudgementMap<T>;
type JudgementValue = Renderer.Private.JudgementValue;
type LocationMap<V> = Renderer.Private.LocationMap<V>;
type ParsedChart = Renderer.Private.ParsedChart;
type ViewOptions = Renderer.Private.ViewOptions;

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
  selectedBranchHitInfo: HitInfo | null;
  annotations: LocationMap<string>;
  eseClient: EseClient;
  eseTree: EseIndexEntry[] | null;
  judgementClient: JudgementClient;
  judgements: JudgementMap<JudgementValue>;
  currentEsePath: string | null;
  currentStatusKey: string;
  currentStatusParams: Record<string, string | number> | undefined;
  isTesterMode: boolean;
  isNeutralinoConnected: boolean;
  swRegistrationError: string | null;
  displayOnlySelected: boolean;
  isHorizontalLayout: boolean;
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
    autoAnnotateMode: "partial",
    annotationToolType: "hand",
    autoZoom: false,
    hideUnreachableBranches: true,
  },
  loadedTJAContent: exampleTJA,
  activeDataSourceMode: "list",
  isSimulating: false,
  isStreamConnected: false,
  hasReceivedGameStart: false,
  selectedNoteHitInfo: null,
  selectedBranchHitInfo: null,
  annotations: new LocationMap(),
  eseClient: new EseClient(),
  eseTree: null,
  judgementClient: new JudgementClient(),
  judgements: new JudgementMap(),
  currentEsePath: null,
  currentStatusKey: "status.initializing",
  currentStatusParams: undefined,
  isTesterMode: loadUserProfile().isTesterMode,
  isNeutralinoConnected: false,
  swRegistrationError: null,
  displayOnlySelected: false,
  isHorizontalLayout: false,
};
