import type { SongMapping } from "../models/song-mapping.js";
import { parseFumenDatabaseHtml } from "./fumen-database-parser.js";
import type { Playdata } from "./playdata-types.js";
import { fumenEntryToPlaydataEntry, verifyPlaydata } from "./playdata-types.js";
import { parseTaikoWikiRatingHtml } from "./taiko-wiki-parser.js";

export interface UnmatchedInfo {
  songId: string;
  title: string;
}

export type ImportResult = { type: "invalid" } | { type: "parsed"; playdata: Playdata; unmatched: UnmatchedInfo[] };

export async function processImport(text: string): Promise<ImportResult> {
  if (!text || text.length < 100) return { type: "invalid" };
  if (!text.includes("<html") && !text.includes("<div")) return { type: "invalid" };

  const isTaikoWiki = text.includes("kit.start") && text.includes("scoreData");
  const rawPlaydata = isTaikoWiki ? parseTaikoWikiRatingHtml(text) : parseFumenDatabaseHtml(text);

  if (rawPlaydata.entries.length === 0) return { type: "invalid" };

  try {
    const response = await fetch("./data/song_mapping.json");
    if (response.ok) {
      const songMapping: SongMapping = await response.json();
      const result = verifyPlaydata(rawPlaydata, songMapping);
      const unmatched: UnmatchedInfo[] = result.unmatched.map((u) => ({
        songId: u.entry.songId.toString(),
        title: u.entry.title,
      }));
      return {
        type: "parsed",
        playdata: {
          version: 2,
          entries: [...result.matched, ...result.unmatched.map((u) => fumenEntryToPlaydataEntry(u.entry))],
          updatedAt: rawPlaydata.updatedAt,
          source: rawPlaydata.source,
        },
        unmatched,
      };
    }
  } catch (e) {
    console.warn("Failed to load song mapping for verification, skipping.", e);
  }

  // Fallback: mapping unavailable, store all entries with their original song IDs
  return {
    type: "parsed",
    playdata: {
      version: 2,
      entries: rawPlaydata.entries.map(fumenEntryToPlaydataEntry),
      updatedAt: rawPlaydata.updatedAt,
      source: rawPlaydata.source,
    },
    unmatched: [],
  };
}
