export interface SongMappingEntry {
  esePath: string;
  defaultTitle: string;
  candidates: string[];
  matchType: string;
  titleList?: Record<string, string>;
  subtitleList?: Record<string, string>;
  artist?: string;
}

export type SongMapping = Record<string, SongMappingEntry>;

/**
 * Gets the localized title from a SongMappingEntry.
 *
 * @param entry The song mapping entry
 * @param lang The language code (e.g. "ja", "en", "zh", "ko")
 * @returns The best matching localized title, or the defaultTitle
 */
export function getLocalizedTitle(entry: SongMappingEntry, lang: string): string {
  if (!entry.titleList) return entry.defaultTitle;

  // Exact match
  if (entry.titleList[lang]) {
    return entry.titleList[lang];
  }

  // Fallbacks for specific languages
  if (lang.startsWith("zh")) {
    if (entry.titleList["zh-CN"]) return entry.titleList["zh-CN"];
    if (entry.titleList["zh-TW"]) return entry.titleList["zh-TW"];
  }

  if (lang.startsWith("en")) {
    if (entry.titleList["en-US"]) return entry.titleList["en-US"];
    if (entry.titleList["ALIAS-en"]) return entry.titleList["ALIAS-en"];
  }

  if (lang.startsWith("ko")) {
    if (entry.titleList["ALIAS-ko"]) return entry.titleList["ALIAS-ko"];
  }

  // Fallback to ja if available
  if (entry.titleList["ja"]) {
    return entry.titleList["ja"];
  }

  return entry.defaultTitle;
}

/**
 * Gets the localized subtitle from a SongMappingEntry.
 *
 * @param entry The song mapping entry
 * @param lang The language code (e.g. "ja", "en", "zh", "ko")
 * @returns The best matching localized subtitle, or undefined if none exists
 */
export function getLocalizedSubtitle(entry: SongMappingEntry, lang: string): string | undefined {
  if (!entry.subtitleList) return undefined;

  // Exact match
  if (entry.subtitleList[lang]) {
    return entry.subtitleList[lang];
  }

  // Fallbacks for specific languages
  if (lang.startsWith("zh")) {
    if (entry.subtitleList["zh-CN"]) return entry.subtitleList["zh-CN"];
    if (entry.subtitleList["zh-TW"]) return entry.subtitleList["zh-TW"];
  }

  if (lang.startsWith("en")) {
    if (entry.subtitleList["en-US"]) return entry.subtitleList["en-US"];
    if (entry.subtitleList["ALIAS-en"]) return entry.subtitleList["ALIAS-en"];
  }

  if (lang.startsWith("ko")) {
    if (entry.subtitleList["ALIAS-ko"]) return entry.subtitleList["ALIAS-ko"];
  }

  // Fallback to ja if available
  if (entry.subtitleList["ja"]) {
    return entry.subtitleList["ja"];
  }

  return undefined;
}
