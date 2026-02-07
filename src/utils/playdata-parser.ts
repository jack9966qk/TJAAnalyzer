// Parser for fumen-database HTML content
// This mirrors the logic from dev_instructions/fumen_database_converter/convert_fumen.py

export interface PlaydataEntry {
  title: string; // Song title from fumen-database
  difficulty: number; // 1=easy, 2=normal, 3=hard, 4=extreme, 5=hidden
  score: number;
  great: number;
  good: number;
  bad: number;
  combo: number;
  drumroll: number;
}

export interface Playdata {
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

/**
 * Normalize title strings to handle common unicode variations.
 * Mirrors the Python script's normalize_title function.
 */
function normalizeTitle(title: string): string {
  return title.replace(/\u2010/g, "-").replace(/\uff01/g, "!");
}

/**
 * Parse fumen-database HTML content and extract playdata.
 * This runs client-side in the browser.
 */
export function parseFumenDatabaseHtml(html: string): Playdata {
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

  const entries: PlaydataEntry[] = [];

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

      // Difficulty - from the difficulty class on table_difficulty div
      let difficulty = 0;
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

      // Score
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
