// Utility functions for determining playdata status for chart list items

import { Crown, type Playdata, type PlaydataEntry, ScoreRank } from "./playdata-parser.js";

export enum PlaydataDisplayMode {
  None = "none",
  Crown = "crown",
  CrownWithScoreRank = "crownWithScoreRank",
  DnStyle = "dnStyle",
  DnStyleWithCounts = "dnStyleWithCounts",
}

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

// Cache for song mapping data
let cachedSongMapping: SongMapping | null = null;
let cachedEsePathToId: Map<string, string> | null = null;

/**
 * Load and cache the song mapping data
 */
async function loadSongMapping(): Promise<SongMapping> {
  if (cachedSongMapping) {
    return cachedSongMapping;
  }

  try {
    const response = await fetch("./data/song_mapping.json");
    if (!response.ok) {
      console.error("Failed to load song mapping:", response.status);
      return {};
    }
    cachedSongMapping = await response.json();
    return cachedSongMapping || {};
  } catch (e) {
    console.error("Error loading song mapping:", e);
    return {};
  }
}

/**
 * Build reverse lookup from esePath to song ID
 */
async function getEsePathToIdMap(): Promise<Map<string, string>> {
  if (cachedEsePathToId) {
    return cachedEsePathToId;
  }

  const mapping = await loadSongMapping();
  const esePathToId = new Map<string, string>();

  for (const [songId, entry] of Object.entries(mapping)) {
    if (entry.esePath) {
      esePathToId.set(entry.esePath, songId);
    }
  }

  cachedEsePathToId = esePathToId;
  return esePathToId;
}

export function getCrownCssClass(crown: Crown): string {
  switch (crown) {
    case Crown.Perfect:
      return "status-perfect";
    case Crown.FullCombo:
      return "status-fullcombo";
    case Crown.Clear:
      return "status-played";
    default:
      return "";
  }
}

export function getScoreRankChar(rank: ScoreRank): string {
  switch (rank) {
    case ScoreRank.White:
    case ScoreRank.Bronze:
    case ScoreRank.Silver:
      return "粋";
    case ScoreRank.Gold:
    case ScoreRank.Pink:
    case ScoreRank.Purple:
      return "雅";
    case ScoreRank.Rainbow:
      return "極";
    default:
      return "";
  }
}

export function getScoreRankCssClass(rank: ScoreRank): string {
  switch (rank) {
    case ScoreRank.White:
      return "scorerank-white";
    case ScoreRank.Bronze:
      return "scorerank-bronze";
    case ScoreRank.Silver:
      return "scorerank-silver";
    case ScoreRank.Gold:
      return "scorerank-gold";
    case ScoreRank.Pink:
      return "scorerank-pink";
    case ScoreRank.Purple:
      return "scorerank-purple";
    case ScoreRank.Rainbow:
      return "scorerank-rainbow";
    default:
      return "scorerank-none";
  }
}

export function getDnStyleCssClass(entry: PlaydataEntry): string {
  if (entry.good === 0 && entry.bad === 0 && entry.great > 0) {
    return "dn-cyan";
  }
  if (entry.bad === 0 && entry.good < 10) {
    return "dn-green";
  }
  if (entry.crown >= Crown.FullCombo) {
    return "dn-gold";
  }
  if (entry.crown >= Crown.Clear) {
    return "dn-grey";
  }
  return "dn-white";
}

function resolveBestEntry(entries: PlaydataEntry[]): PlaydataEntry | null {
  if (!entries || entries.length === 0) {
    return null;
  }

  // Filter out entries with Crown.None (0)
  const clearedEntries = entries.filter((e) => e.crown >= Crown.Clear);

  if (clearedEntries.length === 0) {
    return null;
  }

  // Find the entry with the highest difficulty among cleared entries
  let bestEntry = clearedEntries[0];

  for (let i = 1; i < clearedEntries.length; i++) {
    const entry = clearedEntries[i];
    if (entry.difficulty > bestEntry.difficulty) {
      bestEntry = entry;
    } else if (entry.difficulty === bestEntry.difficulty) {
      // Tie-breaker: higher crown
      if (entry.crown > bestEntry.crown) {
        bestEntry = entry;
      }
    }
  }

  return bestEntry;
}

function resolveStatus(entries: PlaydataEntry[]): Crown {
  const best = resolveBestEntry(entries);
  return best ? best.crown : Crown.None;
}

/**
 * Build a songId-based lookup map from playdata
 */
function buildPlaydataSongIdMap(playdata: Playdata): Map<string, PlaydataEntry[]> {
  const songIdToEntries = new Map<string, PlaydataEntry[]>();

  for (const entry of playdata.entries) {
    if (entry.songId) {
      const existing = songIdToEntries.get(entry.songId) || [];
      existing.push(entry);
      songIdToEntries.set(entry.songId, existing);
    }
  }

  return songIdToEntries;
}

/**
 * Get the play status for a given ESE path
 * Returns the status of the highest difficulty played
 */
export async function getPlayStatusForEsePath(esePath: string, playdata: Playdata | null | undefined): Promise<Crown> {
  if (!playdata?.entries?.length) {
    return Crown.None;
  }

  // Get song ID from esePath
  const esePathToId = await getEsePathToIdMap();
  const songId = esePathToId.get(esePath);

  if (!songId) {
    return Crown.None;
  }

  // Build title lookup if needed
  const songIdToEntries = buildPlaydataSongIdMap(playdata);
  const entries = songIdToEntries.get(songId);

  if (!entries || entries.length === 0) {
    return Crown.None;
  }

  return resolveStatus(entries);
}

/**
 * Preload song mapping in the background
 * Call this early to avoid delay when rendering list items
 */
export async function preloadSongMapping(): Promise<SongMapping> {
  const mapping = await loadSongMapping();
  // Also build the esePath to ID cache
  await getEsePathToIdMap();
  return mapping;
}

/**
 * Get cached song mapping (returns null if not loaded)
 */
export function getCachedSongMapping(): SongMapping | null {
  return cachedSongMapping;
}

/**
 * Synchronous version for use in render loop
 * Returns the status of the highest difficulty played for a given ESE path using cached data
 */
export function getPlayStatusSync(
  esePath: string,
  playdata: Playdata | null | undefined,
  songIdToEntriesCache: Map<string, PlaydataEntry[]> | null,
): Crown {
  const entry = getPlayEntrySync(esePath, playdata, songIdToEntriesCache);
  return entry ? entry.crown : Crown.None;
}

export function getPlayEntrySync(
  esePath: string,
  playdata: Playdata | null | undefined,
  songIdToEntriesCache: Map<string, PlaydataEntry[]> | null,
): PlaydataEntry | null {
  if (!playdata?.entries?.length || !cachedEsePathToId || !songIdToEntriesCache) {
    return null;
  }

  // Get song ID from esePath
  const songId = cachedEsePathToId.get(esePath);
  if (!songId) {
    return null;
  }

  // Use cached title lookup
  const entries = songIdToEntriesCache.get(songId);

  if (!entries || entries.length === 0) {
    return null;
  }

  return resolveBestEntry(entries);
}

/**
 * Build a songId-to-entries cache from playdata (call once per render cycle)
 */
export function buildSongIdToEntriesCache(playdata: Playdata | null | undefined): Map<string, PlaydataEntry[]> | null {
  if (!playdata?.entries?.length) {
    return null;
  }
  return buildPlaydataSongIdMap(playdata);
}
