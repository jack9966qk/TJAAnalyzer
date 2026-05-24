import * as fs from "node:fs";

export interface TaikoRatingAnalyzerSong {
  id: number;
  title: string;
  title_cn?: string;
  is_cn?: boolean;
  [key: string]: unknown;
}

export interface TaikoRatingAnalyzerFumenDataConstants {
  constant?: number;
  totalNotes?: number;
  composite?: number;
  avgDensity?: number;
  instDensity?: number;
  separation?: number;
  bpmChange?: number;
  hsChange?: number;
}

export interface TaikoRatingAnalyzerFumenDataItem {
  id: number;
  title: string;
  constants?: {
    oni?: TaikoRatingAnalyzerFumenDataConstants;
    ura?: TaikoRatingAnalyzerFumenDataConstants;
  };
}

export interface TaikoRatingAnalyzerSongsCNItem {
  id: number;
  song_name_jp: string;
  song_name: string;
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

export interface TaikoWikiDfcSong {
  songNo: string;
  title: string;
  difficulty: string; // "oni" | "ura"
  order: number;
}

export interface TaikoWikiDfcSection {
  order: number;
  name: string; // e.g. "SS", "iS+", "pA"
  songs: TaikoWikiDfcSong[];
}

export interface TaikoWikiDfcResponse {
  name: string;
  level: number;
  type: string;
  data: {
    name: string;
    sections: TaikoWikiDfcSection[];
  };
}

const TAIKO_RATING_ANALYZER_URL = "https://cdn.ourtaiko.org/api/fumendb_constants";
const CNSONGS_URL = "https://cdn.ourtaiko.org/api/cnsongs";
const TAIKO_WIKI_DB_URL = "https://taiko.wiki/api/v1/song/all";
const DONDER_HELPER_URL =
  "https://raw.githubusercontent.com/Donder-Helper/DonderHelper/a9853d0684877e5ca6c6a3d24fe0d7adcd067b29/Data/songs.json";
const TAIKO_WIKI_DFC_URL = "https://taiko.wiki/api/v1/diffchart?type=dfc&level=10";

import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EXTERNAL_DATA_DIR = path.join(__dirname, "data", "external");

export interface ExternalSongData {
  taikoRatingAnalyzerSongs: TaikoRatingAnalyzerSong[];
  taikoWikiSongs: TaikoWikiSong[];
  donderHelperData: DonderHelperData;
  dfcSections: TaikoWikiDfcSection[];
}

async function fetchOrLoadJson<T>(url: string, filename: string, forceFetchAndSave: boolean): Promise<T> {
  const filePath = path.join(EXTERNAL_DATA_DIR, filename);

  if (!forceFetchAndSave && fs.existsSync(filePath)) {
    console.log(`Loading ${filename} from local cache...`);
    const data = fs.readFileSync(filePath, "utf8");
    return JSON.parse(data) as T;
  }

  console.log(`Fetching from ${url}...`);
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Failed to fetch ${url}: ${resp.statusText}`);
  const data = (await resp.json()) as T;

  if (forceFetchAndSave) {
    if (!fs.existsSync(EXTERNAL_DATA_DIR)) {
      fs.mkdirSync(EXTERNAL_DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    console.log(`Saved ${filename} to local cache.`);
  }

  return data;
}

export async function fetchExternalSongData(forceFetchAndSave = false): Promise<ExternalSongData> {
  const [fumenData, songsCNData] = await Promise.all([
    fetchOrLoadJson<TaikoRatingAnalyzerFumenDataItem[]>(
      TAIKO_RATING_ANALYZER_URL,
      "taiko_rating_analyzer.json",
      forceFetchAndSave,
    ),
    fetchOrLoadJson<TaikoRatingAnalyzerSongsCNItem[]>(CNSONGS_URL, "songs_cn.json", forceFetchAndSave),
  ]);

  const songsCNMap = new Map<number, TaikoRatingAnalyzerSongsCNItem>();
  for (const song of songsCNData) {
    if (!songsCNMap.has(song.id)) songsCNMap.set(song.id, song);
  }

  const taikoRatingAnalyzerSongs: TaikoRatingAnalyzerSong[] = fumenData.map((fumenSong) => {
    const cnSong = songsCNMap.get(fumenSong.id);
    return {
      id: fumenSong.id,
      title: fumenSong.title,
      ...(cnSong ? { title_cn: cnSong.song_name, is_cn: true } : {}),
    };
  });

  const taikoWikiSongs = await fetchOrLoadJson<TaikoWikiSong[]>(
    TAIKO_WIKI_DB_URL,
    "taiko_wiki.json",
    forceFetchAndSave,
  );

  // Supplement taikoRatingAnalyzerSongs with taiko_wiki songs that are missing from fumendb_constants.
  // This ensures songs in the game database but not rated by the analyzer are still mappable.
  const traIds = new Set(taikoRatingAnalyzerSongs.map((s) => s.id));
  for (const wikiSong of taikoWikiSongs) {
    const id = Number(wikiSong.songNo);
    if (!Number.isNaN(id) && !traIds.has(id) && wikiSong.title) {
      taikoRatingAnalyzerSongs.push({ id, title: wikiSong.title });
    }
  }

  const donderHelperData = await fetchOrLoadJson<DonderHelperData>(
    DONDER_HELPER_URL,
    "donder_helper.json",
    forceFetchAndSave,
  );

  let dfcSections: TaikoWikiDfcSection[] = [];
  try {
    const filePath = path.join(EXTERNAL_DATA_DIR, "diffchart.json");
    if (!forceFetchAndSave && fs.existsSync(filePath)) {
      console.log(`Loading diffchart.json from local cache...`);
      const cached = fs.readFileSync(filePath, "utf8");
      const dfcData = JSON.parse(cached) as TaikoWikiDfcResponse;
      dfcSections = dfcData.data.sections;
    } else {
      console.log(`Fetching DFC diffchart from taiko.wiki...`);
      const dfcResp = await fetch(TAIKO_WIKI_DFC_URL);
      if (dfcResp.ok) {
        const dfcData = (await dfcResp.json()) as TaikoWikiDfcResponse;
        dfcSections = dfcData.data.sections;
        console.log(`Fetched ${dfcSections.length} DFC sections.`);
        if (forceFetchAndSave) {
          if (!fs.existsSync(EXTERNAL_DATA_DIR)) fs.mkdirSync(EXTERNAL_DATA_DIR, { recursive: true });
          fs.writeFileSync(filePath, JSON.stringify(dfcData, null, 2));
          console.log(`Saved diffchart.json to local cache.`);
        }
      } else {
        console.warn(`Failed to fetch DFC data: ${dfcResp.statusText}`);
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`Failed to fetch/load DFC data: ${msg}`);
  }

  return { taikoRatingAnalyzerSongs, taikoWikiSongs, donderHelperData, dfcSections };
}

/** Build lookup maps from the fetched data, keyed by song ID string. */
export function buildLookupMaps(data: ExternalSongData) {
  const taikoWikiMap = new Map<string, TaikoWikiSong>();
  for (const dbSong of data.taikoWikiSongs) {
    taikoWikiMap.set(dbSong.songNo, dbSong);
  }

  const donderHelperValues = Object.values(data.donderHelperData);

  // Build DFC lookup: "songNo:difficulty" -> section name
  const dfcMap = new Map<string, string>();
  for (const section of data.dfcSections) {
    for (const song of section.songs) {
      dfcMap.set(`${song.songNo}:${song.difficulty}`, section.name);
    }
  }

  return { taikoWikiMap, donderHelperValues, dfcMap };
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
