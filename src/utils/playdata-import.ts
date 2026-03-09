import type { SongMapping } from "../models/song-mapping.js";
import { parseFumenDatabaseHtml } from "./fumen-database-parser.js";
import type { FumenDatabasePlaydata, Playdata, ResolutionResult } from "./playdata-types.js";
import { verifyPlaydata } from "./playdata-types.js";
import { parseTaikoWikiRatingHtml } from "./taiko-wiki-parser.js";

export type ImportResult =
  | { type: "invalid" }
  | { type: "unmatched"; result: ResolutionResult; rawPlaydata: FumenDatabasePlaydata }
  | { type: "success"; playdata: Playdata; parsedCount: number };

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

      if (result.unmatched.length > 0) {
        return { type: "unmatched", result, rawPlaydata };
      }

      return {
        type: "success",
        playdata: {
          version: 2,
          entries: result.matched,
          updatedAt: rawPlaydata.updatedAt,
          source: rawPlaydata.source,
        },
        parsedCount: rawPlaydata.entries.length,
      };
    }
  } catch (e) {
    console.warn("Failed to load song mapping for verification, skipping.", e);
  }

  // Fallback: mapping unavailable, return empty playdata
  return {
    type: "success",
    playdata: {
      version: 2,
      entries: [],
      updatedAt: rawPlaydata.updatedAt,
      source: rawPlaydata.source,
    },
    parsedCount: rawPlaydata.entries.length,
  };
}
