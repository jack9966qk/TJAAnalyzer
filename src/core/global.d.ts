import type { ViewOptions, JudgementKey, JudgementValue } from "./renderer.ts";

declare global {
  interface Window {
    // biome-ignore lint/suspicious/noExplicitAny: Neutralino global
    Neutralino: any;
    loadChart: (tjaContent: string, difficulty?: string) => void;
    setOptions: (options: Partial<ViewOptions>) => void;
    autoAnnotate: () => void;
    setJudgements: (newJudgements: Map<JudgementKey, JudgementValue>) => void;
    createJudgementKey: (char: string, ordinal: number) => JudgementKey;
    loadTJAContent: (content: string) => void;
    setViewOptions: (opts: Partial<ViewOptions>) => void;
  }
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // biome-ignore lint/suspicious/noExplicitAny: Custom element
      "save-image-button": any;
      // biome-ignore lint/suspicious/noExplicitAny: Custom element
      "export-button": any;
    }
  }
}
