export interface NoteLocation {
  barIndex: number;
  charIndex: number;
}

export enum NoteType {
  None = "0",
  Don = "1",
  Ka = "2",
  DonBig = "3",
  KaBig = "4",
  Drumroll = "5",
  DrumrollBig = "6",
  Balloon = "7",
  End = "8",
  Kusudama = "9",
}

export enum BranchName {
  Normal = "normal",
  Expert = "expert",
  Master = "master",
}

export const JUDGEABLE_NOTES = [NoteType.Don, NoteType.Ka, NoteType.DonBig, NoteType.KaBig];

export const BIG_NOTES = [NoteType.DonBig, NoteType.KaBig, NoteType.DrumrollBig, NoteType.Kusudama];

export const RENDERABLE_NOTES = [
  NoteType.Don,
  NoteType.Ka,
  NoteType.DonBig,
  NoteType.KaBig,
  NoteType.Drumroll,
  NoteType.DrumrollBig,
  NoteType.Balloon,
  NoteType.End,
  NoteType.Kusudama,
];

export function isJudgeable(note: NoteType): boolean {
  return JUDGEABLE_NOTES.includes(note);
}

export function isBig(note: NoteType): boolean {
  return BIG_NOTES.includes(note);
}

export function isRenderable(note: NoteType): boolean {
  return RENDERABLE_NOTES.includes(note);
}

export interface JudgementKey {
  char: string;
  ordinal: number;
}

function serializeJudgementKey(key: JudgementKey): string {
  return `${key.char}_${key.ordinal}`;
}

function deserializeJudgementKey(key: string): JudgementKey {
  const [char, ordinalStr] = key.split("_");
  return { char, ordinal: parseInt(ordinalStr, 10) };
}

function serializeLocationKey(location: NoteLocation): string {
  return `${location.barIndex}_${location.charIndex}`;
}

function deserializeLocationKey(key: string): NoteLocation {
  const [barIndexStr, charIndexStr] = key.split("_");
  return {
    barIndex: parseInt(barIndexStr, 10),
    charIndex: parseInt(charIndexStr, 10),
  };
}

export class JudgementMap<V> {
  private _map = new Map<string, V>();

  constructor(entries?: readonly (readonly [JudgementKey, V])[] | null | JudgementMap<V>) {
    if (entries) {
      if (entries instanceof JudgementMap) {
        entries.forEach((v, k) => {
          this.set(k, v);
        });
      } else {
        for (const [key, value] of entries) {
          this.set(key, value);
        }
      }
    }
  }

  set(key: JudgementKey, value: V): this {
    this._map.set(serializeJudgementKey(key), value);
    return this;
  }

  get(key: JudgementKey): V | undefined {
    return this._map.get(serializeJudgementKey(key));
  }

  has(key: JudgementKey): boolean {
    return this._map.has(serializeJudgementKey(key));
  }

  delete(key: JudgementKey): boolean {
    return this._map.delete(serializeJudgementKey(key));
  }

  clear(): void {
    this._map.clear();
  }

  get size(): number {
    return this._map.size;
  }

  keys(): IterableIterator<JudgementKey> {
    const internalKeys = this._map.keys();
    const generator = function* () {
      for (const k of internalKeys) {
        yield deserializeJudgementKey(k);
      }
    };
    return generator();
  }

  values(): IterableIterator<V> {
    return this._map.values();
  }

  entries(): IterableIterator<[JudgementKey, V]> {
    const internalEntries = this._map.entries();
    const generator = function* () {
      for (const [k, v] of internalEntries) {
        yield [deserializeJudgementKey(k), v] as [JudgementKey, V];
      }
    };
    return generator();
  }

  forEach(callbackfn: (value: V, key: JudgementKey, map: JudgementMap<V>) => void, thisArg?: unknown): void {
    this._map.forEach((value, key) => {
      callbackfn.call(thisArg, value, deserializeJudgementKey(key), this);
    });
  }

  [Symbol.iterator](): IterableIterator<[JudgementKey, V]> {
    return this.entries();
  }
}

export class LocationMap<V> {
  private _map = new Map<string, V>();

  constructor(entries?: readonly (readonly [NoteLocation, V])[] | null | LocationMap<V>) {
    if (entries) {
      if (entries instanceof LocationMap) {
        entries.forEach((v, k) => {
          this.set(k, v);
        });
      } else {
        for (const [key, value] of entries) {
          this.set(key, value);
        }
      }
    }
  }

  set(key: NoteLocation, value: V): this {
    this._map.set(serializeLocationKey(key), value);
    return this;
  }

  get(key: NoteLocation): V | undefined {
    return this._map.get(serializeLocationKey(key));
  }

  has(key: NoteLocation): boolean {
    return this._map.has(serializeLocationKey(key));
  }

  delete(key: NoteLocation): boolean {
    return this._map.delete(serializeLocationKey(key));
  }

  clear(): void {
    this._map.clear();
  }

  get size(): number {
    return this._map.size;
  }

  keys(): IterableIterator<NoteLocation> {
    const internalKeys = this._map.keys();
    const generator = function* () {
      for (const k of internalKeys) {
        yield deserializeLocationKey(k);
      }
    };
    return generator();
  }

  values(): IterableIterator<V> {
    return this._map.values();
  }

  entries(): IterableIterator<[NoteLocation, V]> {
    const internalEntries = this._map.entries();
    const generator = function* () {
      for (const [k, v] of internalEntries) {
        yield [deserializeLocationKey(k), v] as [NoteLocation, V];
      }
    };
    return generator();
  }

  forEach(callbackfn: (value: V, key: NoteLocation, map: LocationMap<V>) => void, thisArg?: unknown): void {
    this._map.forEach((value, key) => {
      callbackfn.call(thisArg, value, deserializeLocationKey(key), this);
    });
  }

  [Symbol.iterator](): IterableIterator<[NoteLocation, V]> {
    return this.entries();
  }
}

export const createJudgementKey = (char: string, ordinal: number): JudgementKey => ({ char, ordinal });
export const createNoteLocation = (barIndex: number, charIndex: number): NoteLocation => ({ barIndex, charIndex });

export type ViewMode = "original" | "judgements" | "judgements-underline" | "judgements-text";

export function toNoteType(char: string): NoteType {
  switch (char) {
    case "1":
      return NoteType.Don;
    case "2":
      return NoteType.Ka;
    case "3":
      return NoteType.DonBig;
    case "4":
      return NoteType.KaBig;
    case "5":
      return NoteType.Drumroll;
    case "6":
      return NoteType.DrumrollBig;
    case "7":
      return NoteType.Balloon;
    case "8":
      return NoteType.End;
    case "9":
      return NoteType.Kusudama;
    default:
      return NoteType.None;
  }
}

export enum JudgementType {
  Perfect = "perfect",
  Great = "great",
  Good = "good",
  Poor = "poor",
  Miss = "miss",
  Bad = "bad",
  Auto = "auto",
  Adlib = "adlib",
  Mine = "mine",
}

export interface JudgementValue {
  judgement: string;
  delta: number;
}

export interface JudgementVisibility {
  perfect: boolean;
  good: boolean;
  poor: boolean;
}

export interface ViewOptions {
  titleOverride?: string;
  subtitleOverride?: string;
  viewMode: "original" | "judgements" | "judgements-underline" | "judgements-text";
  coloringMode: "categorical" | "gradient";
  visibility: JudgementVisibility;
  collapsedLoop: boolean;
  selectedLoopIteration?: number;
  beatsPerLine: number;
  showAllBranches?: boolean;
  hideUnreachableBranches?: boolean;
  selection: {
    start: NoteLocation;
    end: NoteLocation | null;
  } | null;
  hoveredNote?: (NoteLocation & { branch?: BranchName }) | null;
  annotations?: LocationMap<string>;
  isAnnotationMode?: boolean;
  showTextInAnnotationMode?: boolean;
  alwaysShowAnnotations?: boolean;
  handAlternationThreshold?: number;
  handResetThreshold?: number;
  showAttribution?: boolean;
  range?: {
    start: NoteLocation;
    end: NoteLocation;
  };
  tjaSourceName?: string;
}

export interface RenderTexts {
  loopPattern: string; // e.g. "Loop x{n}"
  judgement: {
    perfect: string;
    good: string;
    poor: string;
  };
  course?: Record<string, string>;
}

export const DEFAULT_TEXTS: RenderTexts = {
  loopPattern: "Loop x{n}",
  judgement: {
    perfect: "良",
    good: "可",
    poor: "不可",
  },
  course: {
    easy: "Easy",
    normal: "Normal",
    hard: "Hard",
    oni: "Oni",
    edit: "Oni (Ura)",
  },
};

export const DEFAULT_VIEW_OPTIONS: ViewOptions = {
  viewMode: "original",
  coloringMode: "categorical",
  visibility: {
    perfect: true,
    good: true,
    poor: true,
  },
  collapsedLoop: false,
  beatsPerLine: 16,
  hideUnreachableBranches: true,
  selection: null,
  showAttribution: true,
};
