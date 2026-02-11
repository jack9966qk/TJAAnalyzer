// Utility functions for determining playdata status for chart list items

import { Crown, type Playdata, type PlaydataEntry } from "./playdata-parser.js";

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

function resolveStatus(entries: PlaydataEntry[]): Crown {
  if (!entries || entries.length === 0) {
    return Crown.None;
  }

  // Filter out entries with Crown.None (0)
  const clearedEntries = entries.filter((e) => e.crown >= Crown.Clear);

  if (clearedEntries.length === 0) {
    return Crown.None;
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

  return bestEntry.crown;
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
  if (!playdata?.entries?.length || !cachedEsePathToId || !songIdToEntriesCache) {
    return Crown.None;
  }

  // Get song ID from esePath
  const songId = cachedEsePathToId.get(esePath);
  if (!songId) {
    return Crown.None;
  }

  // Use cached title lookup
  const entries = songIdToEntriesCache.get(songId);

  if (!entries || entries.length === 0) {
    return Crown.None;
  }

  return resolveStatus(entries);
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
