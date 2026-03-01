// Shared types, enums, and utilities for playdata

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
  source: "fumen-database" | "taiko-wiki-rating";
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
  source: "fumen-database" | "taiko-wiki-rating";
}

/**
 * Normalize title strings to handle common unicode variations.
 */
export function normalizeTitle(title: string): string {
  return title.replace(/\u2010/g, "-").replace(/\uff01/g, "!");
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

import type { SongMapping } from "../models/song-mapping.js";

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
