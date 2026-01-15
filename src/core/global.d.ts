import type { ViewOptions } from "./renderer.ts";

declare global {
  interface Window {
    // biome-ignore lint/suspicious/noExplicitAny: Neutralino global
    Neutralino: any;
    loadChart: (tjaContent: string, difficulty?: string) => void;
    setOptions: (options: Partial<ViewOptions>) => void;
    autoAnnotate: () => void;
    setJudgements: (judgements: string[], deltas: (number | undefined)[]) => void;
    // biome-ignore lint/suspicious/noExplicitAny: Test helper
    testOptions: any;
    loadTJAContent: (content: string) => void;
    // biome-ignore lint/suspicious/noExplicitAny: Test helper
    setViewOptions: (opts: any) => void;
    // biome-ignore lint/suspicious/noExplicitAny: Test helper for note stats
    setStats: (hit: any, chart: any, viewOptions: any, judgements?: any[], judgementDeltas?: any[]) => void;
  }
}
