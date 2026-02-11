// Parser for fumen-database HTML content

export enum Crown {
  None,
  Clear,
  FullCombo,
  Perfect,
}

export enum ScoreRank {
  None,
  White,
  Bronze,
  Silver,
  Gold,
  Pink,
  Purple,
  Rainbow,
}

export interface FumenDatabaseEntry {
  title: string; // Song title from fumen-database
  difficulty: number; // 1=easy, 2=normal, 3=hard, 4=oni, 5=ura
  score: number;
  great: number;
  good: number;
  bad: number;
  combo: number;
  drumroll: number;
  songId: number;
  crown: Crown;
  scoreRank: ScoreRank;
}

export interface FumenDatabasePlaydata {
  entries: FumenDatabaseEntry[];
  updatedAt: string;
  source: "fumen-database";
}

export interface PlaydataEntry {
  songId: string;
  difficulty: number;
  score: number;
  great: number;
  good: number;
  bad: number;
  combo: number;
  drumroll: number;
  crown: Crown;
  scoreRank: ScoreRank;
}

export interface Playdata {
  version: 2;
  entries: PlaydataEntry[];
  updatedAt: string;
  source: "fumen-database";
}

const DIFFICULTY_MAPPING: Record<string, number> = {
  difficulty_easy_color: 1,
  difficulty_normal_color: 2,
  difficulty_hard_color: 3,
  difficulty_extreme_color: 4,
  difficulty_hidden_color: 5,
};

const CROWN_MAPPING: Record<string, Crown> = {
  crown_clear: Crown.Clear,
  crown_full: Crown.FullCombo, // This is for Full Combo
  crown_preDonderfull: Crown.FullCombo, // Full Combo, another variant
  crown_donderfull: Crown.Perfect, // This is for Perfect
};

const SCORE_RANK_MAPPING: Record<string, ScoreRank> = {
  scoreRank_white: ScoreRank.White,
  scoreRank_bronze: ScoreRank.Bronze,
  scoreRank_silver: ScoreRank.Silver,
  scoreRank_gold: ScoreRank.Gold,
  scoreRank_pink: ScoreRank.Pink,
  scoreRank_purple: ScoreRank.Purple,
  scoreRank_rainbow: ScoreRank.Rainbow,
};

/**
 * Normalize title strings to handle common unicode variations.
 */
function normalizeTitle(title: string): string {
  return title.replace(/\u2010/g, "-").replace(/\uff01/g, "!");
}

/**
 * Parse fumen-database HTML content and extract playdata.
 * This runs client-side in the browser.
 */
export function parseFumenDatabaseHtml(html: string): FumenDatabasePlaydata {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Extract updated time
  let updatedAt = "";
  const updateElements = Array.from(doc.querySelectorAll("p"));
  for (const p of updateElements) {
    const text = p.textContent?.trim() || "";
    if (text.includes("最終更新：")) {
      updatedAt = text.replace("最終更新：", "").trim();
      break;
    }
  }

  const entries: FumenDatabaseEntry[] = [];

  // Find all song rows - they have class 'filter_selector'
  const rows = Array.from(doc.querySelectorAll("div.filter_selector"));

  for (const row of rows) {
    try {
      // Title - from the anchor text inside table_song_name
      const titleDiv = row.querySelector(".table_song_name a");
      const title = titleDiv?.textContent?.trim();

      if (!title) {
        continue;
      }

      let songId = 0;
      let difficulty = 0;
      if (titleDiv) {
        const href = titleDiv.getAttribute("href");
        if (href) {
          const match = href.match(/\/song\/(\d+)-(\d+)\//);
          if (match) {
            songId = parseInt(match[1], 10);
            difficulty = parseInt(match[2], 10);
          }
        }
      }

      // If difficulty was not found from href, try reading from text
      if (difficulty === 0) {
        const diffDiv = row.querySelector(".table_difficulty");
        if (diffDiv) {
          const classes = diffDiv.className.split(" ");
          for (const c of classes) {
            if (DIFFICULTY_MAPPING[c] !== undefined) {
              difficulty = DIFFICULTY_MAPPING[c];
              break;
            }
          }
        }
      }

      let crown = Crown.None;
      const crownImg = row.querySelector(".table_crown img");
      if (crownImg) {
        const src = crownImg.getAttribute("src") || "";
        for (const key in CROWN_MAPPING) {
          if (src.includes(key)) {
            crown = CROWN_MAPPING[key];
            break;
          }
        }
      }

      let scoreRank = ScoreRank.None;
      const scoreRankImg = row.querySelector(".table_scorerank img");
      if (scoreRankImg) {
        const src = scoreRankImg.getAttribute("src") || "";
        for (const key in SCORE_RANK_MAPPING) {
          if (src.includes(key)) {
            scoreRank = SCORE_RANK_MAPPING[key];
            break;
          }
        }
      }

      let score = 0;
      const scoreDiv = row.querySelector(".table_totalscore");
      if (scoreDiv) {
        // Score text might have "点" suffix, need to extract just the number
        const scoreText = scoreDiv.textContent?.trim().replace(/[,点]/g, "") || "";
        const parsed = Number.parseInt(scoreText, 10);
        if (!Number.isNaN(parsed)) {
          score = parsed;
        }
      }

      // Stats
      const getIntFromDiv = (className: string): number => {
        const d = row.querySelector(`.${className}`);
        if (d) {
          const t = d.textContent?.trim().replace(/,/g, "") || "";
          const parsed = Number.parseInt(t, 10);
          if (!Number.isNaN(parsed)) {
            return parsed;
          }
        }
        return 0;
      };

      const great = getIntFromDiv("table_good");
      const good = getIntFromDiv("table_ok");
      const bad = getIntFromDiv("table_bad");
      const combo = getIntFromDiv("table_combo");
      const drumroll = getIntFromDiv("table_roll");

      entries.push({
        title: normalizeTitle(title),
        difficulty,
        score,
        great,
        good,
        bad,
        combo,
        drumroll,
        songId,
        crown,
        scoreRank,
      });
    } catch (e) {
      console.error("Error parsing row:", e);
    }
  }

  return {
    entries,
    updatedAt,
    source: "fumen-database",
  };
}

/**
 * Map difficulty number to i18n key
 */
const DIFFICULTY_I18N_KEYS: Record<number, string> = {
  1: "ui.difficulty.easy",
  2: "ui.difficulty.normal",
  3: "ui.difficulty.hard",
  4: "ui.difficulty.oni",
  5: "ui.difficulty.edit",
};

/**
 * Generate summary statistics from playdata
 * Returns difficulty counts keyed by i18n translation keys
 */
export function getPlaydataStats(playdata: Playdata | null): {
  totalSongs: number;
  byDifficulty: Record<string, number>;
} {
  if (!playdata || !playdata.entries) {
    return { totalSongs: 0, byDifficulty: {} };
  }

  const byDifficulty: Record<string, number> = {};

  for (const entry of playdata.entries) {
    const diffKey = DIFFICULTY_I18N_KEYS[entry.difficulty] || `Level ${entry.difficulty}`;
    byDifficulty[diffKey] = (byDifficulty[diffKey] || 0) + 1;
  }

  return {
    totalSongs: playdata.entries.length,
    byDifficulty,
  };
}

/**
 * Song mapping entry from song_mapping.json
 */
interface SongMappingEntry {
  esePath: string;
  title: string;
  candidates: string[];
  matchType: string;
  titlecn?: string;
  titleko?: string;
  artist?: string;
}

type SongMapping = Record<string, SongMappingEntry>;

export interface UnmatchedEntry {
  entry: FumenDatabaseEntry;
  originalIndex: number;
}

export interface ResolutionResult {
  matched: PlaydataEntry[];
  unmatched: UnmatchedEntry[];
}

/**
 * Verify playdata against song mapping and identify unmatched entries
 */
export function verifyPlaydata(playdata: FumenDatabasePlaydata, songMapping: SongMapping): ResolutionResult {
  const matched: PlaydataEntry[] = [];
  const unmatched: UnmatchedEntry[] = [];

  playdata.entries.forEach((entry, index) => {
    // songId from parser is number, keys in JSON are strings
    const songIdStr = entry.songId.toString();

    if (entry.songId !== 0 && songMapping[songIdStr]) {
      const { title, ...rest } = entry;
      matched.push({
        ...rest,
        songId: songIdStr,
      });
    } else {
      unmatched.push({
        entry,
        originalIndex: index,
      });
    }
  });

  return { matched, unmatched };
}


/**
 * Taiko-rating-analyzer format:
 * [id, level, score, scoreRank, great, good, bad, drumroll, combo, playCount, clearCount, fullcomboCount, perfectCount, updatedAt]
 */
export type TaikoRatingAnalyzerEntry = [
  number, // id (songno)
  number, // level (difficulty)
  number, // score
  number, // scoreRank (always 0)
  number, // great
  number, // good
  number, // bad
  number, // drumroll
  number, // combo
  number, // playCount (always 0)
  number, // clearCount (always 0)
  number, // fullcomboCount (always 0)
  number, // perfectCount (always 0)
  string, // updatedAt
];

export interface ExportResult {
  data: TaikoRatingAnalyzerEntry[];
  exportedCount: number;
  skippedCount: number;
}

/**
 * Convert playdata to taiko-rating-analyzer format
 */
export async function convertToTaikoRatingAnalyzerFormat(playdata: Playdata): Promise<ExportResult> {
  const result: TaikoRatingAnalyzerEntry[] = [];
  let skippedCount = 0;

  for (const entry of playdata.entries) {
    if (!entry.songId) {
      console.warn(`Song ID not found for an entry`);
      skippedCount++;
      continue;
    }

    const songIdNum = Number.parseInt(entry.songId, 10);
    if (Number.isNaN(songIdNum)) {
      console.warn(`Invalid song ID (not an integer): "${entry.songId}"`);
      skippedCount++;
      continue;
    }

    result.push([
      songIdNum, // id
      entry.difficulty, // level
      entry.score, // score
      0, // scoreRank (always 0)
      entry.great, // great
      entry.good, // good
      entry.bad, // bad
      entry.drumroll, // drumroll
      entry.combo, // combo
      0, // playCount
      0, // clearCount
      0, // fullcomboCount
      0, // perfectCount
      playdata.updatedAt, // updatedAt
    ]);
  }

  return {
    data: result,
    exportedCount: result.length,
    skippedCount,
  };
}
