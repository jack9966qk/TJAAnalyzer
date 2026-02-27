import type { Playdata } from "./playdata-parser.js";
import { PlaydataLeadingMode, PlaydataStripMode, PlaydataTrailingMode } from "./playdata-status.js";

export enum ChartLanguage {
  Auto = "auto",
  En = "en",
  Ja = "ja",
  Zh = "zh",
  Ko = "ko",
}

export interface DefaultViewOptions {
  /** Beats per line value, or 'auto' for auto-zoom */
  zoom: number | "auto";
  /** Whether note stats panel is visible */
  showNoteStats: boolean;
}

export interface UserProfile {
  isTesterMode: boolean;
  playdata?: Playdata | null;
  /** Saved default view options (zoom and note stats visibility) */
  defaultViewOptions?: DefaultViewOptions | null;
  /** Whether to auto-annotate and switch to annotation tab on chart load */
  autoAnnotateOnLoad?: boolean;
  /** Whether to always show full file path in chart list instead of title */
  showFullPathInChartList?: boolean;
  /** Left strip mode in chart list */
  chartListStripMode?: PlaydataStripMode;
  /** Leading element mode in chart list */
  chartListLeadingMode?: PlaydataLeadingMode;
  /** Trailing element mode in chart list */
  chartListTrailingMode?: PlaydataTrailingMode;
  /** Preferred language for chart title/subtitle/artist info */
  preferredChartLanguage?: ChartLanguage;
}

const STORAGE_KEY = "tja_analyzer_profile";
const PLAYDATA_STORAGE_KEY = "tja_analyzer_playdata";
const CURRENT_PLAYDATA_VERSION = 2;

const DEFAULT_PROFILE: UserProfile = {
  isTesterMode: false,
  playdata: null,
  defaultViewOptions: null,
  autoAnnotateOnLoad: false,
  showFullPathInChartList: false,
  chartListStripMode: PlaydataStripMode.Crown,
  chartListLeadingMode: PlaydataLeadingMode.None,
  chartListTrailingMode: PlaydataTrailingMode.None,
  preferredChartLanguage: ChartLanguage.Auto,
};

export function loadUserProfile(): UserProfile {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    const playdataStr = localStorage.getItem(PLAYDATA_STORAGE_KEY);
    let playdata: Playdata | null = null;

    if (playdataStr) {
      try {
        const parsed = JSON.parse(playdataStr);
        if (parsed.version === CURRENT_PLAYDATA_VERSION) {
          playdata = parsed;
        } else {
          console.warn("Playdata version mismatch, discarding old data.");
        }
      } catch (e) {
        console.error("Failed to parse playdata", e);
      }
    }

    if (data) {
      const profile = JSON.parse(data);
      // Migrate old chartListDisplayMode to new fields
      if (profile.chartListDisplayMode && !profile.chartListStripMode) {
        const mode = profile.chartListDisplayMode as string;
        if (mode === "none") {
          profile.chartListStripMode = PlaydataStripMode.None;
        } else if (mode === "crown") {
          profile.chartListStripMode = PlaydataStripMode.Crown;
        } else if (mode === "crownWithScoreRank") {
          profile.chartListStripMode = PlaydataStripMode.Crown;
          profile.chartListLeadingMode = PlaydataLeadingMode.ScoreRank;
        } else if (mode === "dnStyle") {
          profile.chartListStripMode = PlaydataStripMode.DnCategory;
        } else if (mode === "dnStyleWithCounts") {
          profile.chartListStripMode = PlaydataStripMode.DnCategory;
          profile.chartListTrailingMode = PlaydataTrailingMode.Counts;
        }
        delete profile.chartListDisplayMode;
      }
      return { ...DEFAULT_PROFILE, ...profile, playdata };
    }
    return { ...DEFAULT_PROFILE, playdata };
  } catch (e) {
    console.error("Failed to load user profile", e);
  }
  return { ...DEFAULT_PROFILE };
}

export function saveUserProfile(changes: Partial<UserProfile>): void {
  const current = loadUserProfile();
  const { playdata, ...profileWithoutPlaydata } = { ...current, ...changes };

  try {
    // Save profile (without playdata to keep it small)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profileWithoutPlaydata));

    // Save playdata separately (can be large)
    if (playdata !== undefined) {
      if (playdata === null) {
        localStorage.removeItem(PLAYDATA_STORAGE_KEY);
      } else {
        localStorage.setItem(PLAYDATA_STORAGE_KEY, JSON.stringify(playdata));
      }
    }
  } catch (e) {
    console.error("Failed to save user profile", e);
  }
}

export function clearPlaydata(): void {
  try {
    localStorage.removeItem(PLAYDATA_STORAGE_KEY);
  } catch (e) {
    console.error("Failed to clear playdata", e);
  }
}
