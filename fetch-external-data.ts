import * as fs from "node:fs";
import * as path from "node:path";

export interface TaikoRatingAnalyzerSong {
  id: number;
  title: string;
  title_cn?: string;
  level?: Record<
    string,
    {
      constant?: number;
      totalNotes?: number;
      [key: string]: unknown;
    }
  >;
  is_cn?: boolean;
  [key: string]: unknown;
}

export interface TaikoWikiCourse {
  level: number;
  isBranched?: number;
  maxCombo?: number;
  playTime?: number;
  balloon?: number[];
  rollTime?: number[];
  maxDensity?: number;
  daniUsed?: number;
  dani?: unknown[];
  images?: string[];
}

export interface TaikoWikiSong {
  songNo: string;
  title: string;
  titleKo?: string | null;
  aliasKo?: string | null;
  titleEn?: string | null;
  aliasEn?: string | null;
  romaji?: string | null;
  artists?: string[];
  bpm?: { min: number; max: number };
  version?: string[];
  genre?: string[];
  courses?: {
    easy?: TaikoWikiCourse | null;
    normal?: TaikoWikiCourse | null;
    hard?: TaikoWikiCourse | null;
    oni?: TaikoWikiCourse | null;
    ura?: TaikoWikiCourse | null;
  };
  isDeleted?: number;
  [key: string]: unknown;
}

export interface DonderHelperDifficulty {
  Level: number;
  NoteCount?: {
    Single?: { Normal?: number; Expert?: number; Tatsujin?: number };
    Double1P?: { Normal?: number; Expert?: number; Tatsujin?: number };
    Double2P?: { Normal?: number; Expert?: number; Tatsujin?: number };
  };
  Url?: string;
  UrlKo?: string;
  ImageUrl?: string;
}

export interface DonderHelperSong {
  TitleList?: Record<string, string>;
  SubtitleList?: Record<string, string>;
  Region?: Record<string, number>;
  Difficulties?: {
    Easy?: DonderHelperDifficulty;
    Normal?: DonderHelperDifficulty;
    Hard?: DonderHelperDifficulty;
    Extreme?: DonderHelperDifficulty;
    Hidden?: DonderHelperDifficulty;
  };
  GenreList?: number[];
  [key: string]: unknown;
}

export type DonderHelperData = Record<string, DonderHelperSong>;

const TAIKO_RATING_ANALYZER_URL =
  "https://raw.githubusercontent.com/KirisameVanilla/taiko-rating-analyzer/refs/heads/main/public/songs.json";
const TAIKO_WIKI_DB_URL =
  "https://raw.githubusercontent.com/taikowiki/taiko-song-database/refs/heads/main/database.json";
const DONDER_HELPER_URL =
  "https://raw.githubusercontent.com/Donder-Helper/DonderHelper/refs/heads/main/Data/songs.json";

export interface ExternalSongData {
  taikoRatingAnalyzerSongs: TaikoRatingAnalyzerSong[];
  taikoWikiSongs: TaikoWikiSong[];
  donderHelperData: DonderHelperData;
}

export async function fetchExternalSongData(): Promise<ExternalSongData> {
  console.log(`Fetching songs from taiko-rating-analyzer...`);
  const songsResp = await fetch(TAIKO_RATING_ANALYZER_URL);
  if (!songsResp.ok) throw new Error(`Failed to fetch songs: ${songsResp.statusText}`);
  const taikoRatingAnalyzerSongs = (await songsResp.json()) as TaikoRatingAnalyzerSong[];

  console.log(`Fetching database from taiko-wiki...`);
  const dbResp = await fetch(TAIKO_WIKI_DB_URL);
  if (!dbResp.ok) throw new Error(`Failed to fetch database: ${dbResp.statusText}`);
  const taikoWikiSongs = (await dbResp.json()) as TaikoWikiSong[];

  console.log(`Fetching DonderHelper data...`);
  const dhResp = await fetch(DONDER_HELPER_URL);
  if (!dhResp.ok) throw new Error(`Failed to fetch DonderHelper data: ${dhResp.statusText}`);
  const donderHelperData = (await dhResp.json()) as DonderHelperData;

  return { taikoRatingAnalyzerSongs, taikoWikiSongs, donderHelperData };
}

/** Build lookup maps from the fetched data, keyed by song ID string. */
export function buildLookupMaps(data: ExternalSongData) {
  const taikoWikiMap = new Map<string, TaikoWikiSong>();
  for (const dbSong of data.taikoWikiSongs) {
    taikoWikiMap.set(dbSong.songNo, dbSong);
  }

  const donderHelperValues = Object.values(data.donderHelperData);

  return { taikoWikiMap, donderHelperValues };
}

/**
 * Load song mapping from a JSON file and build a lookup by esePath.
 */
export function loadSongMappingByPath(songMappingFile: string): Record<string, Record<string, unknown>> {
  const songMappingByPath: Record<string, Record<string, unknown>> = {};
  if (fs.existsSync(songMappingFile)) {
    try {
      const songMappingData = JSON.parse(fs.readFileSync(songMappingFile, "utf8"));
      for (const [_songNo, songInfo] of Object.entries(songMappingData)) {
        const info = songInfo as Record<string, unknown>;
        if (info.esePath) {
          songMappingByPath[info.esePath as string] = info;
        }
      }
      console.log(`Loaded ${Object.keys(songMappingByPath).length} song mappings.`);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("Failed to load song_mapping.json:", msg);
    }
  }
  return songMappingByPath;
}
