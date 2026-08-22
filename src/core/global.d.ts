import type * as NeutralinoLib from "@neutralinojs/lib";
import type {
  HitInfo,
  JudgementKey,
  JudgementMap,
  JudgementValue,
  NoteLocationMap,
  ParsedChart,
  RenderOptions,
} from "./renderer.ts";
import type { ExportButtonProps } from "../components/export-button.tsx";
import type { SaveImageButtonProps } from "../components/save-image-button.tsx";
import type { ActionButtonProps } from "../components/action-button.tsx";
import type { StepperControlProps } from "../components/stepper-control.tsx";
import type { FumenDatabasePlaydata } from "../utils/playdata-types.ts";
import type { AppState } from "../state/app-state.ts";

declare global {
  interface Window {
    Neutralino: typeof NeutralinoLib;
    loadChart: (tjaContent: string, difficulty?: string) => void;
    setOptions: (options: Partial<RenderOptions>) => void;
    autoAnnotate: () => void;
    setJudgements: (newJudgements: JudgementMap<JudgementValue>) => void;
    getLayoutInfo: () => {
      offsetY: number;
      headerHeight: number;
      insets: { top: number; bottom: number; left: number; right: number };
      constants: { statusFontSize: number; barNumberOffsetY: number };
    } | null;
    createJudgementKey: (char: string, ordinal: number) => JudgementKey;
    NoteLocationMap: typeof NoteLocationMap;
    JudgementMap: typeof JudgementMap;
    loadTJAContent: (content: string) => void;
    setRenderOptions: (opts: Partial<RenderOptions>) => void;
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    parseFumenDatabaseHtml: (html: string) => FumenDatabasePlaydata;
    parseTaikoWikiRatingHtml: (html: string) => FumenDatabasePlaydata;
    // Exposed by the component/note-stats test harnesses (component-test-main.ts,
    // note-stats-test-main.ts) for Playwright specs to drive components directly.
    // Declared non-optional to match the other test-harness globals above.
    appState: AppState;
    i18n: typeof import("../utils/i18n.js").i18n;
    setStats: (
      hit: HitInfo | null,
      chart: ParsedChart | null,
      renderOptions: RenderOptions | null,
      judgements?: string[],
      judgementDeltas?: (number | undefined)[],
    ) => void;
    // Scratch slot a few annotation specs use to carry render options across
    // separate page.evaluate() calls.
    testOptions: RenderOptions;
  }
}

declare global {
  namespace JSX {
    interface HtmlTag {
      // biome-ignore lint/suspicious/noExplicitAny: Standard HTML attributes
      [key: string]: any;
    }

    interface IntrinsicElements {
      "save-image-button": HtmlTag & SaveImageButtonProps;
      "export-button": HtmlTag & ExportButtonProps;
      "action-button": HtmlTag & ActionButtonProps;
      "stepper-control": HtmlTag & StepperControlProps;
      "advanced-search-modal": HtmlTag;
      "difficulty-chart-modal": HtmlTag;
      "modal-page": HtmlTag & {
        open?: boolean | null;
        heading?: string;
        "max-width"?: string;
        onclose?: () => void;
      };
    }
  }
}
