import * as fs from "node:fs";
import * as path from "node:path";
import * as Renderer from "tja-renderer";
import { type DecodedChart, DecodeError, decodeChartImage, renderTja } from "./chart-image-decoder.js";

const { parseTJA } = Renderer.Private;

const HELP = `Converts a rendered chart image back into a TJA file.

Usage:
  node --loader ts-node/esm offline-analysis/chart-image-to-tja.ts <image.png> [options]

Options:
  --out <file>      Write the TJA here instead of stdout.
  --title <text>    TITLE header. Defaults to the image file name.
  --course <name>   COURSE header. Defaults to Oni.
  --level <n>       LEVEL header. Defaults to 0.
  --help           Show this help and exit.

The image carries no audio timing. OFFSET is 0 and WAVE is blank.
Title, course and level use the options or their defaults because this tool
does not read the proportional font used for those headings.`;

/**
 * Reads the emitted file back with the project's own parser and checks that
 * every measure survived, which catches emission bugs such as a command inside
 * a measure splitting its note row in the wrong place.
 */
function verifyRoundTrip(chart: DecodedChart, tja: string) {
  const courses = parseTJA(tja);
  const parsed = Object.values(courses)[0];
  if (!parsed) throw new DecodeError("the emitted TJA has no readable course");
  if (parsed.bars.length !== chart.measures.length) {
    throw new DecodeError(`round trip changed the measure count: ${chart.measures.length} to ${parsed.bars.length}`);
  }
  for (let i = 0; i < chart.measures.length; i++) {
    const expected = chart.measures[i].notes.join("");
    const actual = parsed.bars[i].join("");
    if (expected === actual) continue;
    throw new DecodeError(
      `round trip changed measure ${chart.measures[i].measureNumber}: "${expected}" became "${actual}"`,
    );
  }
}

function report(chart: DecodedChart, out: string | undefined) {
  const notes = chart.measures.reduce((sum, m) => sum + m.notes.filter((n) => "1234".includes(n)).length, 0);
  const longs = chart.measures.reduce((sum, m) => sum + m.notes.filter((n) => "567".includes(n)).length, 0);
  console.error(
    `decoded ${chart.measures.length} measures, ${notes} notes, ${longs} long notes, ` +
      `${chart.balloonHitCounts.length} balloons, ${chart.pixelsPerBeat}px per beat, round trip verified`,
  );
  const tight = chart.measures.filter((m) => (m.beats * chart.pixelsPerBeat) / m.subdivisionCount < 4);
  if (tight.length) {
    console.error(
      `warning: ${tight.length} measure(s) resolve to under 4px per slot, where the pixel grid barely ` +
        `separates subdivisions: ${tight.map((m) => m.measureNumber).join(", ")}`,
    );
  }
  console.error(
    "not carried by the image: OFFSET, WAVE, branch conditions, and any BPM or HS decimals beyond those drawn",
  );
  if (out) console.error(`wrote ${path.resolve(out)}`);
}

const OPTIONS = ["out", "title", "course", "level"];

class UsageError extends Error {}

/** Accepts pairs of option names and values. */
function parseOptions(args: string[]): Map<string, string> {
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const arg = args[i];
    if (!arg.startsWith("--")) throw new UsageError(`unexpected argument "${arg}"`);
    const name = arg.slice(2);
    if (!OPTIONS.includes(name)) throw new UsageError(`unknown option "--${name}"`);
    if (options.has(name)) throw new UsageError(`--${name} given more than once`);
    const value = args[i + 1];
    if (value === undefined || value.startsWith("--")) throw new UsageError(`--${name} needs a value`);
    options.set(name, value);
  }
  return options;
}

async function main() {
  if (process.argv.slice(2).includes("--help")) {
    console.log(HELP);
    return;
  }
  const input = process.argv[2];
  if (!input || input.startsWith("--")) throw new UsageError("an input image is required");
  if (!fs.existsSync(input)) throw new UsageError(`no such file: ${input}`);
  const options = parseOptions(process.argv.slice(3));

  const level = Number(options.get("level") ?? 0);
  if (!Number.isInteger(level) || level < 0)
    throw new UsageError(`--level must be a whole number, got "${options.get("level")}"`);

  const chart = await decodeChartImage(input);
  const tja = renderTja(chart, {
    title: options.get("title") ?? path.basename(input, path.extname(input)),
    course: options.get("course") ?? "Oni",
    level,
  });
  verifyRoundTrip(chart, tja);

  const out = options.get("out");
  if (out) {
    fs.mkdirSync(path.dirname(path.resolve(out)), { recursive: true });
    fs.writeFileSync(out, tja, "utf8");
  } else {
    process.stdout.write(tja);
  }

  report(chart, out);
}

main().catch((err) => {
  if (err instanceof UsageError) {
    console.error(`error: ${err.message}`);
    console.error(HELP);
    process.exit(1);
  }
  if (err instanceof DecodeError) {
    console.error(`decode failed: ${err.message}`);
    process.exit(2);
  }
  console.error(err);
  process.exit(1);
});
