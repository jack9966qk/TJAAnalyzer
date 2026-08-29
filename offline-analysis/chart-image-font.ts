/**
 * Bitmap font used by the chart renderer for measure numbers, balloon counts
 * and the BPM/HS annotations. Every glyph is 5 rows tall with a proportional
 * width, and is drawn without antialiasing, so a thresholded mask matches the
 * atlas exactly.
 *
 * Each string is one bitmap row.
 */
// biome-ignore format: keep bitmap rows vertically aligned
export const GLYPHS: Record<string, string[]> = {
  "0": [
    "####",
    "#..#",
    "#..#",
    "#..#",
    "####",
  ],
  "1": [
    ".#.",
    "##.",
    ".#.",
    ".#.",
    "###",
  ],
  "2": [
    "####",
    "...#",
    "####",
    "#...",
    "####",
  ],
  "3": [
    "####",
    "...#",
    ".###",
    "...#",
    "####",
  ],
  "4": [
    "..#.",
    "#.#.",
    "#.#.",
    "####",
    "..#.",
  ],
  "5": [
    "####",
    "#...",
    "####",
    "...#",
    "####",
  ],
  "6": [
    "###.",
    "#...",
    "####",
    "#..#",
    "####",
  ],
  "7": [
    "####",
    "#..#",
    "...#",
    "...#",
    "...#",
  ],
  "8": [
    "####",
    "#..#",
    "####",
    "#..#",
    "####",
  ],
  "9": [
    "####",
    "#..#",
    "####",
    "...#",
    ".###",
  ],
  ".": [
    ".",
    ".",
    ".",
    ".",
    "#",
  ],
  B: [
    "###.",
    "#..#",
    "###.",
    "#..#",
    "###.",
  ],
  P: [
    "###.",
    "#..#",
    "###.",
    "#...",
    "#...",
  ],
  M: [
    "#...#",
    "##.##",
    "#.#.#",
    "#...#",
    "#...#",
  ],
  H: [
    "#..#",
    "#..#",
    "####",
    "#..#",
    "#..#",
  ],
  S: [
    ".###",
    "#...",
    ".##.",
    "...#",
    "###.",
  ],
};

export const GLYPH_HEIGHT = 5;

/** Glyphs keyed by their rendered pattern, for exact lookup. */
const BY_PATTERN = new Map<string, string>(Object.entries(GLYPHS).map(([char, rows]) => [rows.join("/"), char]));

export function lookupGlyph(rows: string[]): string | undefined {
  return BY_PATTERN.get(rows.join("/"));
}
