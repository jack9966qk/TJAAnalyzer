import type * as NeutralinoLib from "@neutralinojs/lib";
import type { ViewOptions, JudgementMap, JudgementValue, JudgementKey, LocationMap } from "./renderer.ts";
import type { ExportButtonProps } from "../components/export-button.tsx";
import type { SaveImageButtonProps } from "../components/save-image-button.tsx";
import type { ActionButtonProps } from "../components/action-button.tsx";
import type { StepperControlProps } from "../components/stepper-control.tsx";
import type { FumenDatabasePlaydata } from "../utils/playdata-types.ts";

declare global {
  interface Window {
    Neutralino: typeof NeutralinoLib;
    loadChart: (tjaContent: string, difficulty?: string) => void;
    setOptions: (options: Partial<ViewOptions>) => void;
    autoAnnotate: () => void;
    setJudgements: (newJudgements: JudgementMap<JudgementValue>) => void;
    getLayoutInfo: () => {
      offsetY: number;
      headerHeight: number;
      insets: { top: number; bottom: number; left: number; right: number };
      constants: { statusFontSize: number; barNumberOffsetY: number };
    } | null;
    createJudgementKey: (char: string, ordinal: number) => JudgementKey;
    LocationMap: typeof LocationMap;
    JudgementMap: typeof JudgementMap;
    loadTJAContent: (content: string) => void;
    setViewOptions: (opts: Partial<ViewOptions>) => void;
    showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle>;
    parseFumenDatabaseHtml: (html: string) => FumenDatabasePlaydata;
    parseTaikoWikiRatingHtml: (html: string) => FumenDatabasePlaydata;
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
      "modal-page": HtmlTag & {
        open?: boolean | null;
        title?: string;
        "max-width"?: string;
        onclose?: () => void;
      };
    }
  }
}
