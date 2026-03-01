// Parser for fumen-database HTML content

import {
  Crown,
  type FumenDatabaseEntry,
  type FumenDatabasePlaydata,
  normalizeTitle,
  ScoreRank,
} from "./playdata-types.js";

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
