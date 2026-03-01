// Parser for rating.taiko.wiki HTML content

import {
  Crown,
  type FumenDatabaseEntry,
  type FumenDatabasePlaydata,
  normalizeTitle,
  ScoreRank,
} from "./playdata-types.js";

export interface TaikoWikiDifficultyData {
  crown?: string;
  badge?: string;
  score: number;
  ranking: number;
  good: number;
  ok: number;
  bad: number;
  maxCombo: number;
  roll: number;
  count: {
    donderfullcombo: number;
    fullcombo: number;
    clear: number;
    play: number;
  };
}

export interface TaikoWikiSongData {
  title: string;
  songNo: string;
  difficulty: Record<string, TaikoWikiDifficultyData>;
}

export type TaikoWikiScoreData = Record<string, TaikoWikiSongData>;

const TAIKO_WIKI_DIFF_TO_NUM: Record<string, number> = {
  easy: 1,
  normal: 2,
  hard: 3,
  oni: 4,
  ura: 5,
};

const TAIKO_WIKI_CROWN_MAPPING: Record<string, Crown> = {
  silver: Crown.Clear,
  gold: Crown.FullCombo,
  donderfull: Crown.Perfect,
};

const TAIKO_WIKI_BADGE_MAPPING: Record<string, ScoreRank> = {
  white: ScoreRank.White,
  bronze: ScoreRank.Bronze,
  silver: ScoreRank.Silver,
  gold: ScoreRank.Gold,
  pink: ScoreRank.Pink,
  purple: ScoreRank.Purple,
  rainbow: ScoreRank.Rainbow,
};

/**
 * Extract a complete JSON object starting at `startIdx` in `str` by counting braces.
 */
function extractJsonObject(str: string, startIdx: number): string | null {
  let depth = 0;
  for (let i = startIdx; i < str.length; i++) {
    if (str[i] === "{") depth++;
    else if (str[i] === "}") {
      depth--;
      if (depth === 0) return str.slice(startIdx, i + 1);
    }
  }
  return null;
}

/**
 * Parse rating.taiko.wiki HTML content and extract playdata.
 * The page embeds all data as a JSON argument to `kit.start(...)` in a script tag.
 */
export function parseTaikoWikiRatingHtml(html: string): FumenDatabasePlaydata {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Find the script tag containing kit.start
  let scriptContent = "";
  for (const script of Array.from(doc.querySelectorAll("script"))) {
    if (script.textContent?.includes("kit.start")) {
      scriptContent = script.textContent;
      break;
    }
  }

  if (!scriptContent) {
    return { entries: [], updatedAt: "", source: "taiko-wiki-rating" };
  }

  // Extract lastUpload timestamp for updatedAt
  let updatedAt = "";
  const lastUploadMatch = scriptContent.match(/lastUpload:new Date\((\d+)\)/);
  if (lastUploadMatch) {
    updatedAt = new Date(parseInt(lastUploadMatch[1], 10)).toISOString();
  }

  // Extract scoreData JSON object via brace counting
  const scoreDataKey = "scoreData:";
  const scoreDataIdx = scriptContent.indexOf(scoreDataKey);
  if (scoreDataIdx === -1) {
    return { entries: [], updatedAt, source: "taiko-wiki-rating" };
  }

  const braceStart = scriptContent.indexOf("{", scoreDataIdx + scoreDataKey.length);
  if (braceStart === -1) {
    return { entries: [], updatedAt, source: "taiko-wiki-rating" };
  }

  const scoreDataJson = extractJsonObject(scriptContent, braceStart);
  if (!scoreDataJson) {
    return { entries: [], updatedAt, source: "taiko-wiki-rating" };
  }

  // The scoreData uses JS object literal syntax (unquoted keys), not strict JSON.
  // Use Function() to evaluate it safely — the data comes from the user's own pasted page.
  let scoreData: TaikoWikiScoreData;
  try {
    scoreData = new Function(`return ${scoreDataJson}`)() as TaikoWikiScoreData;
  } catch (e) {
    console.error("Failed to evaluate taiko.wiki scoreData:", e);
    return { entries: [], updatedAt, source: "taiko-wiki-rating" };
  }

  const entries: FumenDatabaseEntry[] = [];

  for (const [songNo, songData] of Object.entries(scoreData)) {
    const songId = parseInt(songNo, 10);
    if (Number.isNaN(songId)) continue;

    for (const [diffName, diffData] of Object.entries(songData.difficulty)) {
      const difficulty = TAIKO_WIKI_DIFF_TO_NUM[diffName];
      if (!difficulty) continue;

      const crown = diffData.crown ? (TAIKO_WIKI_CROWN_MAPPING[diffData.crown] ?? Crown.None) : Crown.None;
      const scoreRank = diffData.badge ? (TAIKO_WIKI_BADGE_MAPPING[diffData.badge] ?? ScoreRank.None) : ScoreRank.None;

      entries.push({
        title: normalizeTitle(songData.title),
        difficulty,
        score: diffData.score,
        great: diffData.good,
        good: diffData.ok,
        bad: diffData.bad,
        combo: diffData.maxCombo,
        drumroll: diffData.roll,
        songId,
        crown,
        scoreRank,
      });
    }
  }

  return { entries, updatedAt, source: "taiko-wiki-rating" };
}
