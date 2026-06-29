import { analyzeTJA, type GapUnit, LongNoteHandling } from "../offline-analysis/tja-gaps.js";

// Cloudflare Worker: POST a TJA string, get back the full analysis as JSON.
//
//   curl -X POST --data-binary @chart.tja "https://<worker>/?unit=ms&longNoteHandling=skip"
//
// Response shape (always flat, no nested player-side):
//   {
//     "courses": { "<course>": { "<branch>": [[gap, ...], ...] } },
//     "noteTypes": { "<course>": { "<branch>": [1, 2, 1, 2, ...] } }
//   }
// STYLE:Double courses are flattened: e.g. "3" → "oni_p1", "oni_p2", "oni_single".
// Gaps are per-bar arrays of gap values (in ms or measures) for judgeable notes only.
// noteTypes are flat arrays: 1 = Don/DonBig, 2 = Ka/KaBig.

const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

const LONG_NOTE_HANDLINGS = Object.values(LongNoteHandling) as string[];

const USAGE =
  "POST the TJA chart as the request body. Optional query: ?unit=measures|ms (default measures) " +
  `and ?longNoteHandling=${LONG_NOTE_HANDLINGS.join("|")} (default strict). ` +
  "Returns { courses, noteTypes } with gap arrays and simplified note types (1=Don, 2=Ka) for each branch. " +
  'Example: curl -X POST --data-binary @chart.tja "https://<worker>/?unit=ms&longNoteHandling=skip"';

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...CORS_HEADERS },
  });
}

// Error responses always include `usage` so callers see how to call the API correctly.
function error(message: string, status: number): Response {
  return json({ error: message, usage: USAGE }, status);
}

function parseUnit(url: URL): GapUnit | null {
  const value = url.searchParams.get("unit");
  if (value === null || value === "measures") return "measures";
  if (value === "ms") return "ms";
  return null;
}

function parseLongNoteHandling(url: URL): LongNoteHandling | null {
  const value = url.searchParams.get("longNoteHandling");
  if (value === null) return LongNoteHandling.Strict;
  if (LONG_NOTE_HANDLINGS.includes(value)) return value as LongNoteHandling;
  return null;
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "POST") {
      return error("only POST is supported", 405);
    }

    const url = new URL(request.url);

    const unit = parseUnit(url);
    if (unit === null) {
      return error('unknown unit; expected "measures" or "ms"', 400);
    }

    const longNoteHandling = parseLongNoteHandling(url);
    if (longNoteHandling === null) {
      return error(`unknown longNoteHandling; expected one of ${LONG_NOTE_HANDLINGS.join(", ")}`, 400);
    }

    const tja = await request.text();
    if (!tja.trim()) {
      return error("empty request body", 400);
    }

    try {
      return json(analyzeTJA(tja, unit, longNoteHandling));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return error(`failed to analyze TJA: ${message}`, 400);
    }
  },
};
