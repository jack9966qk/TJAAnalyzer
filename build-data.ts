import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { buildLookupMaps, fetchExternalSongData } from "./fetch-external-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EXTERNAL_DIR = path.join(__dirname, "data", "external");
const TJA_CACHE_FILE = path.join(EXTERNAL_DIR, "tja_cache.json");
const MAPPING_FILE = path.join(__dirname, "data", "song_mapping.json");
const INDEX_FILE = path.join(__dirname, "public", "ese_index.json");

interface CourseInfo {
  level: number;
  maxCombo?: number;
}

interface MergedSong {
  id: number;
  defaultTitle: string;
  titleList: Record<string, string>;
  subtitleList?: Record<string, string>;
  artist?: string;
  courses?: Partial<Record<"easy" | "normal" | "hard" | "oni" | "ura", CourseInfo>>;
  bpm?: { min: number; max: number };
  platforms?: string[];
  region?: Record<string, number>;
  dfcDifficulty?: Record<string, string>;
}

interface TjaFile {
  relativePath: string;
  sha: string;
  titleJa: string | null;
  title: string | null;
  subtitleJa: string | null;
  subtitle: string | null;
}

export interface SongMappingEntry {
  esePath: string;
  defaultTitle: string;
  candidates?: string[];
  matchType?: string;
}

async function main() {
  console.log("Loading metadata caches...");

  if (!fs.existsSync(TJA_CACHE_FILE)) {
    console.error("error: missing tja_cache.json! Please run `npm run prepare-data` first.");
    process.exit(1);
  }

  const tjaCacheRaw = fs.readFileSync(TJA_CACHE_FILE, "utf8");
  const tjaCache: Record<string, TjaFile> = JSON.parse(tjaCacheRaw);

  let commitInfo = { sha: null, date: null };
  const commitFile = path.join(EXTERNAL_DIR, "ese_commit.json");
  if (fs.existsSync(commitFile)) {
    try {
      commitInfo = JSON.parse(fs.readFileSync(commitFile, "utf8"));
    } catch (_e) {}
  }

  // Retrieve local databases
  const externalData = await fetchExternalSongData(false);
  const { taikoRatingAnalyzerSongs, donderHelperData } = externalData;
  const { taikoWikiMap, donderHelperValues, dfcMap } = buildLookupMaps(externalData);

  const dhDiffMap: Record<string, "easy" | "normal" | "hard" | "oni" | "ura"> = {
    Easy: "easy",
    Normal: "normal",
    Hard: "hard",
    Extreme: "oni",
    Hidden: "ura",
  };

  // Build temporary mapping details
  const mergedSongs: MergedSong[] = taikoRatingAnalyzerSongs.map((src) => {
    const idStr = String(src.id);
    const dbSong = taikoWikiMap.get(idStr);
    const dhSong = donderHelperData[src.title] || donderHelperValues.find((d) => d.TitleList?.ja === src.title);

    const defaultTitle = dbSong?.title || src.title;
    const artist = dbSong?.artists?.join(", ");

    const titleList: Record<string, string> = {};
    if (src.title) titleList.ja = src.title;
    if (src.title_cn) titleList["zh-CN"] = src.title_cn;

    if (dbSong?.title) titleList.ja = dbSong.title;
    if (typeof dbSong?.titleKo === "string") titleList.ko = dbSong.titleKo;
    if (typeof dbSong?.aliasKo === "string") titleList["ALIAS-ko"] = dbSong.aliasKo;
    if (typeof dbSong?.titleEn === "string") titleList["en-US"] = dbSong.titleEn;
    if (typeof dbSong?.aliasEn === "string") titleList["ALIAS-en"] = dbSong.aliasEn;

    if (dhSong?.TitleList) {
      Object.assign(titleList, dhSong.TitleList);
    }

    let subtitleList: Record<string, string> | undefined;
    const dhSubtitles = dhSong?.SubtitleList as Record<string, string> | undefined;
    if (dhSubtitles && Object.keys(dhSubtitles).length > 0) {
      subtitleList = dhSubtitles;
    }

    const courses: MergedSong["courses"] = {};
    const diffNames = ["easy", "normal", "hard", "oni", "ura"] as const;
    for (const diff of diffNames) {
      const wikiCourse = dbSong?.courses?.[diff];
      if (wikiCourse && wikiCourse.level > 0) {
        courses[diff] = { level: wikiCourse.level };
        if (wikiCourse.maxCombo && wikiCourse.maxCombo > 0) {
          courses[diff].maxCombo = wikiCourse.maxCombo;
        }
      }
    }
    if (dhSong?.Difficulties) {
      for (const [dhName, stdName] of Object.entries(dhDiffMap)) {
        if (courses[stdName]) continue;
        const dhDiff = dhSong.Difficulties[dhName as keyof typeof dhSong.Difficulties];
        if (dhDiff && dhDiff.Level > 0) {
          courses[stdName] = { level: dhDiff.Level };
          const noteCount = dhDiff.NoteCount?.Single?.Normal;
          if (noteCount && noteCount > 0) {
            courses[stdName].maxCombo = noteCount;
          }
        }
      }
    }

    const bpm = dbSong?.bpm?.min && dbSong?.bpm?.max ? { min: dbSong.bpm.min, max: dbSong.bpm.max } : undefined;
    const platforms = dbSong?.version && dbSong.version.length > 0 ? dbSong.version : undefined;
    const region = dhSong?.Region;

    const dfcDifficulty: Record<string, string> = {};
    for (const diff of ["oni", "ura"] as const) {
      const dfcRank = dfcMap.get(`${idStr}:${diff}`);
      if (dfcRank) dfcDifficulty[diff] = dfcRank;
    }

    return {
      id: src.id,
      defaultTitle,
      titleList,
      subtitleList,
      artist,
      courses: Object.keys(courses).length > 0 ? courses : undefined,
      bpm,
      platforms,
      region,
      dfcDifficulty: Object.keys(dfcDifficulty).length > 0 ? dfcDifficulty : undefined,
    };
  });

  const songMappingByPath: Record<string, MergedSong> = {};
  if (fs.existsSync(MAPPING_FILE)) {
    const rawMapping = fs.readFileSync(MAPPING_FILE, "utf8");
    const jsonMapping = JSON.parse(rawMapping);
    for (const idStr of Object.keys(jsonMapping)) {
      const id = parseInt(idStr, 10);
      const entry = jsonMapping[idStr] as SongMappingEntry;
      if (entry.esePath) {
        const fullSong = mergedSongs.find((s) => s.id === id);
        if (fullSong) {
          // Include defaultTitle from mapping if it differs from the ID lookup
          if (entry.defaultTitle && entry.defaultTitle !== fullSong.defaultTitle) {
            fullSong.defaultTitle = entry.defaultTitle;
          }
          songMappingByPath[entry.esePath] = fullSong;
        }
      }
    }
  }

  console.log("Building ESE Index...");
  const newIndex: Record<string, unknown>[] = [];

  for (const nodePath of Object.keys(tjaCache)) {
    const node = tjaCache[nodePath];

    const entry: Record<string, unknown> = {
      path: node.relativePath,
      type: "blob",
      sha: node.sha,
      url: `ese/${node.relativePath}`,
    };
    if (node.title) entry.title = node.title;
    if (node.titleJa) entry.titleJp = node.titleJa;
    if (node.subtitle) entry.subtitle = node.subtitle;
    if (node.subtitleJa) entry.subtitleJp = node.subtitleJa;

    const fullSong = songMappingByPath[node.relativePath];
    if (fullSong) {
      if (fullSong.defaultTitle && fullSong.defaultTitle !== node.titleJa) {
        entry.titleOfficial = fullSong.defaultTitle;
      }
      if (fullSong.titleList) {
        if (fullSong.titleList["zh-CN"]) entry.titleCn = fullSong.titleList["zh-CN"];
        if (fullSong.titleList.ko) entry.titleKo = fullSong.titleList.ko;
      }
      if (fullSong.artist) entry.artist = fullSong.artist;
      if (fullSong.courses) entry.courses = fullSong.courses;
      if (fullSong.bpm) entry.bpm = fullSong.bpm;
      if (fullSong.platforms) entry.platforms = fullSong.platforms;
      if (fullSong.region) entry.region = fullSong.region;
      if (fullSong.dfcDifficulty) entry.dfcDifficulty = fullSong.dfcDifficulty;
    }

    newIndex.push(entry);
  }

  const output = {
    commit: commitInfo,
    files: newIndex,
  };

  fs.writeFileSync(INDEX_FILE, JSON.stringify(output, null, 2));
  console.log(
    `ESE build complete. Wrote ${newIndex.length} entries. (Commit timestamp: ${commitInfo.date || "unknown"})`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
