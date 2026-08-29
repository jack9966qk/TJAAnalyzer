import sharp from "sharp";
import { GLYPH_HEIGHT, lookupGlyph } from "./chart-image-font.js";

/**
 * Decodes a rendered chart image into TJA note characters and commands.
 *
 * Each measure uses the coarsest equally spaced subdivisions whose rounded
 * pixel positions match the visible notes and annotations. subdivisionCount
 * is the number of TJA character positions, including rests. Command indexes
 * refer to those character positions rather than only the visible notes.
 */
export class DecodeError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DecodeError";
  }
}

type Rgb = readonly [number, number, number];

const COLORS = {
  border: [0, 0, 0],
  white: [255, 255, 255],
  gogo: [255, 192, 192],
  drumroll: [255, 239, 67],
  balloon: [255, 191, 67],
} as const;

const DON_FILL: Rgb[] = [
  [255, 66, 66],
  [255, 67, 67],
];
const KA_FILL: Rgb[] = [[67, 200, 255]];

/** Vertical offsets of the annotation bands, relative to the lane top. */
const BAND_SCROLL = -18;
const BAND_BPM = -12;
const BAND_MEASURE_NUMBER = -6;

/** A label sits this many pixels right of the position it annotates. */
const LABEL_INSET = 2;

/** Largest horizontal gap that still belongs to one label, in pixels. */
const LABEL_GLYPH_GAP = 6;

/** Scan limit in pixels to the right of a measure line for its number label. */
const MEASURE_NUMBER_SCAN_WIDTH = 30;

/** Search this far left of a long note body for a short note covering its head. */
const COVERING_NOTE_SEARCH_WIDTH = 24;

/** Largest gap in pixels between a covering note fill and the long note body. */
const COVERING_NOTE_MAX_GAP = 12;

/** Diameter of the coloured fill inside a small and a big note, in pixels. */
const SMALL_NOTE_FILL_DIAMETER = 12;
const BIG_NOTE_FILL_DIAMETER = 16;

/**
 * Decoder limit in pixels per subdivision. Denser subdivisions are rejected.
 */
const MIN_SUBDIVISION_PIXELS = 2;

export type NoteKind = "don" | "ka" | "donBig" | "kaBig";
export type LongKind = "drumroll" | "drumrollBig" | "balloon";

interface Lane {
  index: number;
  yMin: number;
  xMin: number;
  xMax: number;
}

interface ShortNote {
  kind: NoteKind;
  /** Leftmost pixel of the complete coloured fill, including an occluded head. */
  xMin: number;
  fillDiameter: number;
}

/**
 * One drawn drumroll or balloon body. A body that reaches a lane edge is only
 * part of a long note: the renderer wraps the rest onto the next lane row, and
 * collectMeasures stitches the pieces back together. The head is read from the
 * piece that starts it and the tail from the piece that finishes it, so each
 * lands in the measure that its own lane row places it in.
 */
interface LongNote {
  kind: LongKind;
  xMin: number;
  xMax: number;
  /** Body reaches the left lane edge, so it continues a note from the row above. */
  continuesLeft: boolean;
  /** Body reaches the right lane edge, so it carries on into the row below. */
  continuesRight: boolean;
  /** Leftmost body pixel on the body's topmost row, an upper bound on the start. */
  xTopLeft: number;
  /** True when a preceding note draws over the head, leaving the grid to place it. */
  headCovered: boolean;
  /** Position of the covering note, when headCovered. */
  xCover: number;
  hitCount?: number;
}

interface Label {
  kind: "bpm" | "scroll";
  value: number;
  xPosition: number;
}

interface RawMeasure {
  measureNumber: number;
  lane: Lane;
  xMin: number;
  xMax: number;
  shortNotes: ShortNote[];
  longNotes: LongNote[];
  labels: Label[];
  gogoSpans: { xMin: number; xMax: number }[];
  /** Drumroll and balloon end positions, measured in pixels from this measure's xMin. */
  longNoteEndOffsets: number[];
}

interface RawLane {
  lane: Lane;
  measureLineXs: number[];
  measureNumbers: (number | undefined)[];
  firstMeasureNumber: number;
  trailingPadding: number;
  shortNotes: ShortNote[];
  longNotes: LongNote[];
  labels: Label[];
  gogoSpans: { xMin: number; xMax: number }[];
}

/** TJA command inserted before notes[noteIndex] in a decoded measure. */
export interface DecodedCommand {
  /** Index starting at zero, including rest characters. */
  noteIndex: number;
  text: string;
}

/** One image measure encoded as TJA note characters and commands. */
export interface DecodedMeasure {
  /** Measure label in the image, starting at one. */
  measureNumber: number;
  /** Duration in quarter notes. */
  beats: number;
  subdivisionCount: number;
  /** TJA characters in time order, including rests and long note ends. */
  notes: string[];
  commands: DecodedCommand[];
}

export interface DecodedChart {
  bpm: number;
  measures: DecodedMeasure[];
  balloonHitCounts: number[];
  pixelsPerBeat: number;
}

class Pixels {
  constructor(
    readonly width: number,
    readonly height: number,
    private readonly data: Buffer,
    private readonly channels: number,
  ) {}

  at(x: number, y: number): Rgb {
    const byteOffset = (y * this.width + x) * this.channels;
    return [this.data[byteOffset], this.data[byteOffset + 1], this.data[byteOffset + 2]];
  }

  is(x: number, y: number, color: Rgb): boolean {
    const [r, g, b] = this.at(x, y);
    return r === color[0] && g === color[1] && b === color[2];
  }

  isAny(x: number, y: number, colors: readonly Rgb[]): boolean {
    return colors.some((c) => this.is(x, y, c));
  }

  isDark(x: number, y: number): boolean {
    const [r, g, b] = this.at(x, y);
    return r < 80 && g < 80 && b < 80;
  }

  isRedText(x: number, y: number): boolean {
    const [r, g, b] = this.at(x, y);
    return r > 140 && g < 110 && b < 110;
  }

  isBlueText(x: number, y: number): boolean {
    const [r, g, b] = this.at(x, y);
    return b > 140 && r < 110 && g < 110;
  }
}

async function loadPixels(file: string): Promise<Pixels> {
  const { data, info } = await sharp(file).raw().toBuffer({ resolveWithObject: true });
  return new Pixels(info.width, info.height, data, info.channels);
}

/** Groups sorted values into runs, splitting where the step exceeds maxGap. */
function cluster(values: number[], maxGap: number): number[][] {
  const groups: number[][] = [];
  for (const value of values) {
    const last = groups[groups.length - 1];
    if (last && value - last[last.length - 1] <= maxGap) {
      last.push(value);
      continue;
    }
    groups.push([value]);
  }
  return groups;
}

/** Returns the first value of each consecutive run in a sorted list. */
function findConsecutiveRunStarts(values: number[]): number[] {
  return cluster(values, 1).map((run) => run[0]);
}

function findLanes(pixels: Pixels): Lane[] {
  const blackBorderYs: number[] = [];
  for (let y = 0; y < pixels.height; y++) {
    let blackPixelCount = 0;
    for (let x = 0; x < pixels.width; x++) if (pixels.is(x, y, COLORS.border)) blackPixelCount++;
    if (blackPixelCount > pixels.width / 4) blackBorderYs.push(y);
  }
  const laneBorderYs = findConsecutiveRunStarts(blackBorderYs);
  const lanes: Lane[] = [];
  for (let borderIndex = 0; borderIndex + 1 < laneBorderYs.length; borderIndex += 2) {
    const yMin = laneBorderYs[borderIndex];
    let xMin = -1;
    let xMax = -1;
    for (let x = 0; x < pixels.width; x++) {
      if (!pixels.is(x, yMin, COLORS.border)) continue;
      if (xMin < 0) xMin = x;
      xMax = x;
    }
    if (xMin < 0) throw new DecodeError(`lane at y=${yMin} has no horizontal extent`);
    lanes.push({ index: lanes.length, yMin, xMin, xMax });
  }
  if (!lanes.length) throw new DecodeError("no chart lanes found in the image");
  return lanes;
}

/** Measure separators are drawn above the lane, where notes never cover them. */
function findMeasureLines(pixels: Pixels, lane: Lane): number[] {
  const columns: number[] = [];
  for (let x = lane.xMin; x <= lane.xMax; x++) {
    let whitePixelCount = 0;
    for (let y = lane.yMin - 8; y < lane.yMin; y++) if (pixels.is(x, y, COLORS.white)) whitePixelCount++;
    if (whitePixelCount >= 6) columns.push(x);
  }
  return findConsecutiveRunStarts(columns);
}

interface GlyphRun {
  xMin: number;
  xMax: number;
  rows: string[];
}

function readGlyphRuns(
  yTop: number,
  xFrom: number,
  xTo: number,
  matchesPixel: (x: number, y: number) => boolean,
): GlyphRun[] {
  const columns: number[] = [];
  for (let x = xFrom; x <= xTo; x++) {
    for (let y = yTop; y < yTop + GLYPH_HEIGHT; y++) {
      if (!matchesPixel(x, y)) continue;
      columns.push(x);
      break;
    }
  }
  return cluster(columns, 1).map((group) => {
    const xMin = group[0];
    const xMax = group[group.length - 1];
    const rows: string[] = [];
    for (let y = yTop; y < yTop + GLYPH_HEIGHT; y++) {
      let row = "";
      for (let x = xMin; x <= xMax; x++) row += matchesPixel(x, y) ? "#" : ".";
      rows.push(row);
    }
    return { xMin, xMax, rows };
  });
}

function readText(runs: GlyphRun[], where: string): string {
  let text = "";
  for (const run of runs) {
    const glyph = lookupGlyph(run.rows);
    if (!glyph) throw new DecodeError(`unreadable glyph at x=${run.xMin} (${where}): ${run.rows.join(" ")}`);
    text += glyph;
  }
  return text;
}

function readMeasureNumber(pixels: Pixels, lane: Lane, tick: number): number | undefined {
  const runs = readGlyphRuns(lane.yMin + BAND_MEASURE_NUMBER, tick + 1, tick + MEASURE_NUMBER_SCAN_WIDTH, (x, y) =>
    pixels.isDark(x, y),
  );
  if (!runs.length) return undefined;
  const text = readText(runs, `measure number at lane ${lane.index}`);
  const value = Number(text);
  if (!Number.isInteger(value)) throw new DecodeError(`measure number "${text}" at x=${tick} is not an integer`);
  return value;
}

function readLabels(pixels: Pixels, lane: Lane): Label[] {
  const labels: Label[] = [];
  const annotationBands = [
    {
      kind: "scroll" as const,
      y: lane.yMin + BAND_SCROLL,
      prefix: "HS",
      test: (x: number, y: number) => pixels.isRedText(x, y),
    },
    {
      kind: "bpm" as const,
      y: lane.yMin + BAND_BPM,
      prefix: "BPM",
      test: (x: number, y: number) => pixels.isBlueText(x, y),
    },
  ];
  for (const annotationBand of annotationBands) {
    const runs = readGlyphRuns(annotationBand.y, lane.xMin, lane.xMax, annotationBand.test);
    const groups = cluster(
      runs.map((run) => run.xMin),
      LABEL_GLYPH_GAP + 4,
    );
    let cursor = 0;
    for (const group of groups) {
      const labelGlyphs = runs.slice(cursor, cursor + group.length);
      cursor += group.length;
      const text = readText(labelGlyphs, `${annotationBand.prefix} label at lane ${lane.index}`);
      if (!text.startsWith(annotationBand.prefix)) {
        throw new DecodeError(
          `${annotationBand.prefix} label at lane ${lane.index} x=${labelGlyphs[0].xMin} reads "${text}". ` +
            "Labels are most likely overlapping, which this tool refuses to guess through.",
        );
      }
      const value = Number(text.slice(annotationBand.prefix.length));
      if (!Number.isFinite(value)) {
        throw new DecodeError(
          `${annotationBand.prefix} label at lane ${lane.index} x=${labelGlyphs[0].xMin} reads "${text}"`,
        );
      }
      labels.push({ kind: annotationBand.kind, value, xPosition: labelGlyphs[0].xMin - LABEL_INSET });
    }
  }
  return labels;
}

/** Gogo time is drawn as a pink band filling the strip above the lane. */
function findGogoSpans(pixels: Pixels, lane: Lane): { xMin: number; xMax: number }[] {
  const columns: number[] = [];
  for (let x = lane.xMin; x <= lane.xMax; x++) {
    for (let y = lane.yMin + BAND_SCROLL; y < lane.yMin; y++) {
      if (!pixels.is(x, y, COLORS.gogo)) continue;
      columns.push(x);
      break;
    }
  }
  // Measure separators are drawn over the band, so bridge their width.
  return cluster(columns, 3).map((group) => ({ xMin: group[0], xMax: group[group.length - 1] }));
}

interface ColorRun {
  xMin: number;
  xMax: number;
  colors: readonly Rgb[];
}

function scanRuns(pixels: Pixels, y: number, xMin: number, xMax: number, colors: readonly Rgb[]): ColorRun[] {
  const runs: ColorRun[] = [];
  let current: ColorRun | undefined;
  for (let x = xMin; x <= xMax; x++) {
    if (pixels.isAny(x, y, colors)) {
      if (current) current.xMax = x;
      else current = { xMin: x, xMax: x, colors };
      continue;
    }
    if (current) runs.push(current);
    current = undefined;
  }
  if (current) runs.push(current);
  return runs;
}

function fillHeight(pixels: Pixels, lane: Lane, x: number, colors: readonly Rgb[]): number {
  let fillPixelCount = 0;
  for (let y = lane.yMin + 2; y < lane.yMin + 30; y++) if (pixels.isAny(x, y, colors)) fillPixelCount++;
  return fillPixelCount;
}

function maximumFillHeight(pixels: Pixels, lane: Lane, run: ColorRun): number {
  let height = 0;
  for (let x = run.xMin; x <= run.xMax; x++) height = Math.max(height, fillHeight(pixels, lane, x, run.colors));
  return height;
}

/**
 * Earlier notes can hide the left side of a circle. If its centre is visible,
 * the tallest column is the full diameter. Otherwise that column is a chord
 * whose distance from the centre is the radius minus the remaining width.
 */
function expectedVisibleFillHeight(fillDiameter: number, visibleWidth: number): number {
  const radius = fillDiameter / 2;
  if (visibleWidth >= radius) return fillDiameter;
  const distanceFromCentre = radius - visibleWidth;
  const halfChordHeight = Math.sqrt(Math.max(0, radius * radius - distanceFromCentre * distanceFromCentre));
  return 2 * halfChordHeight;
}

/** Chooses the small or big fill whose visible height best matches the pixels. */
function classifyFillDiameter(pixels: Pixels, lane: Lane, run: ColorRun): number {
  const visibleFillWidth = run.xMax - run.xMin + 1;
  const observedFillHeight = maximumFillHeight(pixels, lane, run);
  const smallHeightError = Math.abs(
    observedFillHeight - expectedVisibleFillHeight(SMALL_NOTE_FILL_DIAMETER, visibleFillWidth),
  );
  const bigHeightError = Math.abs(
    observedFillHeight - expectedVisibleFillHeight(BIG_NOTE_FILL_DIAMETER, visibleFillWidth),
  );
  if (Math.abs(smallHeightError - bigHeightError) < 1) {
    throw new DecodeError(
      `note ending at x=${run.xMax} on lane ${lane.index} is too clipped to size (height ${observedFillHeight}px)`,
    );
  }
  return smallHeightError < bigHeightError ? SMALL_NOTE_FILL_DIAMETER : BIG_NOTE_FILL_DIAMETER;
}

function findShortNotes(pixels: Pixels, lane: Lane): ShortNote[] {
  const y = lane.yMin + 15;
  const notes: ShortNote[] = [];
  for (const colors of [DON_FILL, KA_FILL]) {
    for (const run of scanRuns(pixels, y, lane.xMin, lane.xMax, colors)) {
      const fillDiameter = classifyFillDiameter(pixels, lane, run);
      const isBig = fillDiameter === BIG_NOTE_FILL_DIAMETER;
      const isDon = colors === DON_FILL;
      notes.push({
        kind: isDon ? (isBig ? "donBig" : "don") : isBig ? "kaBig" : "ka",
        xMin: run.xMax - fillDiameter + 1,
        fillDiameter,
      });
    }
  }
  return notes.sort((a, b) => shortNotePositionX(a) - shortNotePositionX(b));
}

/** The measure position uses the left of the two middle fill pixels. */
function shortNotePositionX(note: ShortNote): number {
  return note.xMin + note.fillDiameter / 2 - 1;
}

/**
 * Long note bodies are measured on the lane centre line, where the head disc
 * and the tail cap reach their widest. A head that a preceding note draws over
 * shows as full body height in its leftmost column instead of a rising arc.
 */
function findLongNotes(pixels: Pixels, lane: Lane, xContentMin: number, xContentMax: number): LongNote[] {
  const y = lane.yMin + 15;
  const results: LongNote[] = [];
  for (const [color, baseKind] of [
    [COLORS.drumroll, "drumroll"],
    [COLORS.balloon, "balloon"],
  ] as const) {
    const colors = [color];
    for (const run of scanRuns(pixels, y, lane.xMin, lane.xMax, colors)) {
      if (run.xMax - run.xMin < 8) continue;
      const continuesLeft = run.xMin >= xContentMin && run.xMin <= xContentMin + 1;
      const continuesRight = run.xMax >= xContentMax - 1;
      const bodyHeight = fillHeight(pixels, lane, Math.round((run.xMin + run.xMax) / 2), colors);
      const kind: LongKind = baseKind === "balloon" ? "balloon" : bodyHeight > 14 ? "drumrollBig" : "drumroll";
      // A wrapped tail has no head to read, so the head measurements are only
      // taken from the piece that actually starts the note.
      const headCovered =
        !continuesLeft && baseKind === "drumroll" && fillHeight(pixels, lane, run.xMin, colors) > bodyHeight / 2;
      results.push({
        kind,
        xMin: run.xMin,
        xMax: run.xMax,
        continuesLeft,
        continuesRight,
        xTopLeft: continuesLeft ? run.xMin : bodyTopLeftX(pixels, lane, run),
        headCovered,
        xCover: headCovered ? coveringNoteX(pixels, lane, run.xMin) : Number.NEGATIVE_INFINITY,
        hitCount: continuesLeft || baseKind !== "balloon" ? undefined : readBalloonHitCount(pixels, lane, run.xMin),
      });
    }
  }
  return results.sort((a, b) => a.xMin - b.xMin);
}

/**
 * Leftmost body pixel on the body's topmost row. The round head does not reach
 * that row, so this is the start position itself, or an upper bound on it when
 * a preceding note covers the head.
 */
function bodyTopLeftX(pixels: Pixels, lane: Lane, run: ColorRun): number {
  for (let y = lane.yMin + 2; y < lane.yMin + 30; y++) {
    for (let x = Math.max(lane.xMin, run.xMin - 16); x <= run.xMax; x++) {
      if (!pixels.isAny(x, y, run.colors)) continue;
      return x;
    }
  }
  throw new DecodeError(`long note body at x=${run.xMin} on lane ${lane.index} vanished while measuring its head`);
}

/** Time position of the note whose ring reaches into a long note head. */
function coveringNoteX(pixels: Pixels, lane: Lane, xStart: number): number {
  const y = lane.yMin + 15;
  let xCover = Number.NEGATIVE_INFINITY;
  for (const colors of [DON_FILL, KA_FILL]) {
    for (const run of scanRuns(
      pixels,
      y,
      Math.max(lane.xMin, xStart - COVERING_NOTE_SEARCH_WIDTH),
      Math.min(lane.xMax, xStart),
      colors,
    )) {
      if (run.xMax < xStart - COVERING_NOTE_MAX_GAP) continue;
      xCover = Math.max(xCover, run.xMax - classifyFillDiameter(pixels, lane, run) / 2);
    }
  }
  if (xCover === Number.NEGATIVE_INFINITY) {
    throw new DecodeError(`long note head at x=${xStart} on lane ${lane.index} looks clipped but nothing covers it`);
  }
  return xCover;
}

function readBalloonHitCount(pixels: Pixels, lane: Lane, xBodyStart: number): number {
  const runs = readGlyphRuns(lane.yMin + 13, Math.max(lane.xMin, xBodyStart - 30), xBodyStart, (x, y) =>
    pixels.isDark(x, y),
  );
  const digits = runs.filter((run) => run.rows.some((row) => row.includes("#")) && run.xMax - run.xMin >= 2);
  if (!digits.length) throw new DecodeError(`balloon at x=${xBodyStart} on lane ${lane.index} has no readable count`);
  const text = readText(digits, `balloon count at lane ${lane.index}`);
  const hitCount = Number(text);
  if (!Number.isInteger(hitCount) || hitCount <= 0) {
    throw new DecodeError(`balloon count "${text}" at x=${xBodyStart} is not a positive integer`);
  }
  return hitCount;
}

function readLane(pixels: Pixels, lane: Lane, previousTrailingPadding: number): RawLane {
  const measureLineXs = findMeasureLines(pixels, lane);
  if (!measureLineXs.length) throw new DecodeError(`lane ${lane.index} has no measure lines`);
  const trailingPadding = lane.xMax - measureLineXs[measureLineXs.length - 1];
  const measureNumbers = measureLineXs.map((xMeasureLine) => readMeasureNumber(pixels, lane, xMeasureLine));
  const firstMeasureNumber = measureNumbers[0];
  if (firstMeasureNumber === undefined) throw new DecodeError(`lane ${lane.index} does not label its first measure`);
  measureNumbers.forEach((value, index) => {
    if (value === undefined || value === firstMeasureNumber + index) return;
    throw new DecodeError(`lane ${lane.index} labels measure ${firstMeasureNumber + index} as ${value}`);
  });
  return {
    lane,
    measureLineXs,
    measureNumbers,
    firstMeasureNumber,
    trailingPadding,
    shortNotes: findShortNotes(pixels, lane),
    longNotes: findLongNotes(
      pixels,
      lane,
      measureLineXs[0],
      lane.xMax - Math.min(previousTrailingPadding, trailingPadding),
    ),
    labels: readLabels(pixels, lane),
    gogoSpans: findGogoSpans(pixels, lane),
  };
}

/** Validates the incoming wrapped body and returns the body continuing below. */
function validateLongNoteContinuation(rawLane: RawLane, continuedLongNote: LongNote | undefined): LongNote | undefined {
  const { lane, longNotes } = rawLane;
  const incomingLongNotes = longNotes.filter((note) => note.continuesLeft);
  const outgoingLongNotes = longNotes.filter((note) => note.continuesRight);
  if (incomingLongNotes.length > 1 || outgoingLongNotes.length > 1) {
    throw new DecodeError(`lane ${lane.index} touches a lane edge with more than one long note body`);
  }
  if (incomingLongNotes.length && !continuedLongNote) {
    throw new DecodeError(
      `a ${incomingLongNotes[0].kind} continues into lane ${lane.index} but no note was left open above it`,
    );
  }
  if (continuedLongNote && !incomingLongNotes.length) {
    throw new DecodeError(
      `a ${continuedLongNote.kind} was left open above lane ${lane.index} but nothing continues it`,
    );
  }
  if (incomingLongNotes.length && continuedLongNote && incomingLongNotes[0].kind !== continuedLongNote.kind) {
    throw new DecodeError(
      `a ${continuedLongNote.kind} left open above lane ${lane.index} is continued by a ${incomingLongNotes[0].kind}`,
    );
  }
  return outgoingLongNotes[0];
}

/** Records ends against measure numbers, including ends on a later lane row. */
function collectLongNoteEnds(rawLane: RawLane, endOffsetsByMeasure: Map<number, number[]>) {
  const { lane, longNotes, measureLineXs, firstMeasureNumber } = rawLane;
  for (const note of longNotes) {
    if (note.continuesRight) continue;
    const xEnd = note.xMax + LONG_NOTE_INSETS[note.kind].end;
    let index = measureLineXs.length - 1;
    while (index > 0 && measureLineXs[index] > xEnd) index--;
    if (xEnd < measureLineXs[0]) {
      throw new DecodeError(`a ${note.kind} on lane ${lane.index} ends before the lane's first measure line`);
    }
    const measureNumber = firstMeasureNumber + index;
    const endOffsets = endOffsetsByMeasure.get(measureNumber) ?? [];
    endOffsets.push(xEnd - measureLineXs[index]);
    endOffsetsByMeasure.set(measureNumber, endOffsets);
  }
}

function splitLaneMeasures(rawLane: RawLane): RawMeasure[] {
  const { lane, measureLineXs, measureNumbers, shortNotes, longNotes, labels, gogoSpans } = rawLane;
  const measures: RawMeasure[] = [];
  for (let measureIndex = 0; measureIndex < measureLineXs.length; measureIndex++) {
    const measureNumber = measureNumbers[measureIndex];
    if (measureNumber === undefined) continue;
    const xMin = measureLineXs[measureIndex];
    const xMax = measureLineXs[measureIndex + 1];
    const xMeasureEnd = xMax ?? lane.xMax;
    measures.push({
      measureNumber,
      lane,
      xMin,
      xMax: xMax ?? -1,
      shortNotes: shortNotes.filter((note) => {
        const x = shortNotePositionX(note);
        return x >= xMin && x < xMeasureEnd;
      }),
      // Only the piece carrying the head starts a note in this measure.
      longNotes: longNotes.filter(
        (note) => !note.continuesLeft && longNoteHeadX(note) >= xMin && longNoteHeadX(note) < xMeasureEnd,
      ),
      labels: labels.filter((label) => label.xPosition >= xMin && label.xPosition < xMeasureEnd),
      gogoSpans: gogoSpans
        .map((span) => ({ xMin: Math.max(span.xMin, xMin), xMax: Math.min(span.xMax, xMeasureEnd - 1) }))
        .filter((span) => span.xMin <= span.xMax),
      longNoteEndOffsets: [],
    });
  }
  return measures;
}

function validateLanePaddings(laneTrailingPaddings: number[]): number {
  // Every lane pads the same amount past its last measure line. Only the final
  // lane differs, because its last measure has no closing line to pad from.
  const trailingPadding = Math.min(...laneTrailingPaddings);
  const differentPaddingLanes = laneTrailingPaddings
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value !== trailingPadding);
  if (
    differentPaddingLanes.length > 1 ||
    (differentPaddingLanes.length === 1 && differentPaddingLanes[0].index !== laneTrailingPaddings.length - 1)
  ) {
    throw new DecodeError(`inconsistent lane padding after the last measure line: ${laneTrailingPaddings.join(", ")}`);
  }
  return trailingPadding;
}

function finalizeMeasures(measures: RawMeasure[], trailingPadding: number, endOffsetsByMeasure: Map<number, number[]>) {
  for (const measure of measures) {
    if (measure.xMax < 0) measure.xMax = measure.lane.xMax - trailingPadding;
  }
  for (const measure of measures) measure.longNoteEndOffsets = endOffsetsByMeasure.get(measure.measureNumber) ?? [];
  const missingEndMeasures = [...endOffsetsByMeasure.keys()].filter(
    (measureNumber) => !measures.some((m) => m.measureNumber === measureNumber),
  );
  if (missingEndMeasures.length) {
    throw new DecodeError(`long notes end in measures that are never drawn in full: ${missingEndMeasures.join(", ")}`);
  }
  measures.sort((a, b) => a.measureNumber - b.measureNumber);
  for (let measureIndex = 0; measureIndex < measures.length; measureIndex++) {
    if (measures[measureIndex].measureNumber === measureIndex + 1) continue;
    throw new DecodeError(
      `measure numbers are not contiguous: expected ${measureIndex + 1}, found ${measures[measureIndex].measureNumber}`,
    );
  }
}

function collectMeasures(pixels: Pixels, lanes: Lane[]): RawMeasure[] {
  const laneTrailingPaddings: number[] = [];
  const measures: RawMeasure[] = [];
  const endOffsetsByMeasure = new Map<number, number[]>();
  let continuedLongNote: LongNote | undefined;
  for (const lane of lanes) {
    const rawLane = readLane(pixels, lane, Math.min(...laneTrailingPaddings));
    laneTrailingPaddings.push(rawLane.trailingPadding);
    continuedLongNote = validateLongNoteContinuation(rawLane, continuedLongNote);
    collectLongNoteEnds(rawLane, endOffsetsByMeasure);
    measures.push(...splitLaneMeasures(rawLane));
  }
  if (continuedLongNote) {
    throw new DecodeError(`a ${continuedLongNote.kind} runs off the last lane row with nothing to continue it`);
  }
  const trailingPadding = validateLanePaddings(laneTrailingPaddings);
  finalizeMeasures(measures, trailingPadding, endOffsetsByMeasure);
  return measures;
}

/** Beat gridlines are the brightest lines drawn inside the lane. */
function findPixelsPerBeat(pixels: Pixels, lanes: Lane[]): number {
  const beatSpacingCounts = new Map<number, number>();
  for (const lane of lanes) {
    const y = lane.yMin + 15;
    const columns: number[] = [];
    for (let x = lane.xMin; x <= lane.xMax; x++) {
      const [r, g, b] = pixels.at(x, y);
      if (r === g && g === b && r === 191) columns.push(x);
    }
    const beatLineXs = findConsecutiveRunStarts(columns);
    for (let i = 1; i < beatLineXs.length; i++) {
      const beatSpacing = beatLineXs[i] - beatLineXs[i - 1];
      beatSpacingCounts.set(beatSpacing, (beatSpacingCounts.get(beatSpacing) ?? 0) + 1);
    }
  }
  if (!beatSpacingCounts.size) throw new DecodeError("no beat gridlines found, cannot establish the metric scale");
  const pixelsPerBeat = [...beatSpacingCounts].sort((a, b) => b[1] - a[1])[0][0];
  return pixelsPerBeat;
}

function subdivisionOffsets(width: number, subdivisionCount: number): number[] {
  const offsets: number[] = [];
  for (let noteIndex = 0; noteIndex < subdivisionCount; noteIndex++) {
    offsets.push(Math.round((noteIndex * width) / subdivisionCount));
  }
  return offsets;
}

interface SubdivisionFit {
  subdivisionCount: number;
  noteIndexByPixelOffset: Map<number, number>;
}

/** Finds the coarsest grid that reproduces every offset under the renderer's rounding. */
function fitSubdivisions(offsets: number[], width: number, label: string): SubdivisionFit {
  for (let subdivisionCount = 1; width / subdivisionCount >= MIN_SUBDIVISION_PIXELS; subdivisionCount++) {
    const positions = subdivisionOffsets(width, subdivisionCount);
    const noteIndexByPixelOffset = new Map<number, number>();
    positions.forEach((offset, noteIndex) => {
      if (!noteIndexByPixelOffset.has(offset)) noteIndexByPixelOffset.set(offset, noteIndex);
    });
    if (!offsets.every((offset) => noteIndexByPixelOffset.has(offset))) continue;
    return { subdivisionCount, noteIndexByPixelOffset };
  }
  throw new DecodeError(
    `${label}: note offsets [${offsets.join(", ")}] over ${width}px do not fall on any grid down to ` +
      `${MIN_SUBDIVISION_PIXELS}px per subdivision`,
  );
}

/**
 * Pixels between the flat body colour and the positions a long note stands for.
 * The values differ per kind because the shapes do: a balloon head is a wide
 * disc drawn before its body, and a taller body carries a deeper tail cap.
 * Each one is asserted against the fitted grid, so a renderer change surfaces
 * as a decode error rather than as silently shifted notes.
 */
const LONG_NOTE_INSETS: Record<LongKind, { start: number; end: number }> = {
  drumroll: { start: 5, end: -1 },
  drumrollBig: { start: 7, end: -4 },
  balloon: { start: -13, end: -1 },
};

/** The head position, which decides the measure a long note belongs to. */
function longNoteHeadX(note: LongNote): number {
  if (note.headCovered) return note.xTopLeft;
  return note.xMin + LONG_NOTE_INSETS[note.kind].start;
}

const NOTE_CHARS: Record<NoteKind, string> = { don: "1", ka: "2", donBig: "3", kaBig: "4" };
const LONG_START_CHARS: Record<LongKind, string> = { drumroll: "5", drumrollBig: "6", balloon: "7" };

interface MeasureEvent {
  pixelOffset: number;
  text: string;
  isCommand: boolean;
}

function beatsOf(width: number, pixelsPerBeat: number, measureNumber: number): number {
  const beats = width / pixelsPerBeat;
  if (Math.abs(beats * 2 - Math.round(beats * 2)) > 1e-9) {
    throw new DecodeError(`measure ${measureNumber} is ${width}px wide, which is not a whole or half beat`);
  }
  return Math.round(beats * 2) / 2;
}

/** Renders a beat count as a TJA time signature, reducing no further than quarters. */
function timeSignature(beats: number): string {
  let numerator = Math.round(beats * 2);
  let denominator = 8;
  while (denominator > 4 && numerator % 2 === 0) {
    numerator /= 2;
    denominator /= 2;
  }
  return `${numerator}/${denominator}`;
}

function longNoteStartOffset(note: LongNote, measure: RawMeasure): number {
  return note.xMin + LONG_NOTE_INSETS[note.kind].start - measure.xMin;
}

/** Resolves a head that a preceding note draws over, using the grid as the constraint. */
function resolveCoveredStartOffset(note: LongNote, measure: RawMeasure, subdivisionPositions: number[]): number {
  const headOffsetMax = note.xTopLeft - measure.xMin;
  const coveringNoteOffset = note.xCover - measure.xMin;
  const candidates = subdivisionPositions.filter((offset) => offset <= headOffsetMax && offset > coveringNoteOffset);
  if (candidates.length === 1) return candidates[0];
  throw new DecodeError(
    `measure ${measure.measureNumber}: a note covers the head of a ${note.kind} and the grid allows ` +
      `${candidates.length} positions for it. Refusing to guess.`,
  );
}

/** Turns the pink gogo band into transitions, relative to the running state. */
function gogoTransitions(measure: RawMeasure, gogoWasActive: boolean): { pixelOffset: number; on: boolean }[] {
  const transitions: { pixelOffset: number; on: boolean }[] = [];
  const spans = [...measure.gogoSpans].sort((a, b) => a.xMin - b.xMin);
  let on = gogoWasActive;
  let xCursor = measure.xMin;
  for (const span of spans) {
    if (on && span.xMin > xCursor) {
      transitions.push({ pixelOffset: xCursor - measure.xMin, on: false });
      on = false;
    }
    if (!on) {
      transitions.push({ pixelOffset: span.xMin - measure.xMin, on: true });
      on = true;
    }
    xCursor = span.xMax + 1;
  }
  if (on && xCursor < measure.xMax) transitions.push({ pixelOffset: xCursor - measure.xMin, on: false });
  return transitions;
}

function assembleMeasure(measure: RawMeasure, pixelsPerBeat: number, state: ChartState): DecodedMeasure {
  const width = measure.xMax - measure.xMin;
  const beats = beatsOf(width, pixelsPerBeat, measure.measureNumber);
  const eventOffsets: number[] = [];
  for (const note of measure.shortNotes) eventOffsets.push(shortNotePositionX(note) - measure.xMin);
  for (const note of measure.longNotes) {
    if (note.headCovered) continue;
    eventOffsets.push(longNoteStartOffset(note, measure));
  }
  for (const endOffset of measure.longNoteEndOffsets) eventOffsets.push(endOffset);
  for (const label of measure.labels) eventOffsets.push(label.xPosition - measure.xMin);
  const gogoChanges = gogoTransitions(measure, state.gogoActive);
  for (const gogoChange of gogoChanges) eventOffsets.push(gogoChange.pixelOffset);
  const measureOffsets = eventOffsets.filter((offset) => offset >= 0 && offset < width);
  const fit = fitSubdivisions(measureOffsets, width, `measure ${measure.measureNumber}`);
  const subdivisionPositions = subdivisionOffsets(width, fit.subdivisionCount);

  const events: MeasureEvent[] = [];
  for (const note of measure.shortNotes) {
    events.push({
      pixelOffset: shortNotePositionX(note) - measure.xMin,
      text: NOTE_CHARS[note.kind],
      isCommand: false,
    });
  }
  for (const note of measure.longNotes) {
    const startOffset = note.headCovered
      ? resolveCoveredStartOffset(note, measure, subdivisionPositions)
      : longNoteStartOffset(note, measure);
    events.push({ pixelOffset: startOffset, text: LONG_START_CHARS[note.kind], isCommand: false });
    if (note.kind === "balloon" && note.hitCount !== undefined) state.balloonHitCounts.push(note.hitCount);
  }
  for (const endOffset of measure.longNoteEndOffsets)
    events.push({ pixelOffset: endOffset, text: "8", isCommand: false });
  for (const label of measure.labels) {
    if (label.kind === "bpm") {
      if (state.bpm === undefined) {
        state.bpm = label.value;
        state.initialBpm = label.value;
      } else if (label.value !== state.bpm) {
        events.push({
          pixelOffset: label.xPosition - measure.xMin,
          text: `#BPMCHANGE ${label.value}`,
          isCommand: true,
        });
        state.bpm = label.value;
      }
      continue;
    }
    if (label.value === state.scroll) continue;
    events.push({ pixelOffset: label.xPosition - measure.xMin, text: `#SCROLL ${label.value}`, isCommand: true });
    state.scroll = label.value;
  }
  for (const gogoChange of gogoChanges) {
    events.push({
      pixelOffset: gogoChange.pixelOffset,
      text: gogoChange.on ? "#GOGOSTART" : "#GOGOEND",
      isCommand: true,
    });
    state.gogoActive = gogoChange.on;
  }

  const notes = new Array<string>(fit.subdivisionCount).fill("0");
  const commands: DecodedCommand[] = [];
  for (const event of events) {
    if (event.pixelOffset < 0 || event.pixelOffset >= width) continue;
    const noteIndex = fit.noteIndexByPixelOffset.get(event.pixelOffset);
    if (noteIndex === undefined) {
      throw new DecodeError(
        `measure ${measure.measureNumber}: "${event.text}" sits ${event.pixelOffset}px in, which is not on the ` +
          `1/${fit.subdivisionCount} grid the notes establish`,
      );
    }
    if (event.isCommand) {
      commands.push({ noteIndex, text: event.text });
      continue;
    }
    if (notes[noteIndex] !== "0") {
      throw new DecodeError(
        `measure ${measure.measureNumber}: two notes land on index ${noteIndex} of ${fit.subdivisionCount}`,
      );
    }
    notes[noteIndex] = event.text;
  }
  return { measureNumber: measure.measureNumber, beats, subdivisionCount: fit.subdivisionCount, notes, commands };
}

interface ChartState {
  bpm?: number;
  initialBpm?: number;
  scroll: number;
  gogoActive: boolean;
  balloonHitCounts: number[];
}

/**
 * Checks that every drumroll and balloon opens and closes exactly once. A tail
 * can reach past its own measure, so this catches a terminator filed against
 * the wrong measure as well as one dropped entirely.
 */
export function verifyLongNotes(measures: DecodedMeasure[], balloonHitCounts: number[]) {
  let openLongNoteChar: string | undefined;
  let openLongNoteMeasureNumber = 0;
  let balloonCount = 0;
  for (const measure of measures) {
    for (const note of measure.notes) {
      if ("567".includes(note)) {
        if (openLongNoteChar) {
          throw new DecodeError(
            `measure ${measure.measureNumber}: a "${note}" opens while measure ${openLongNoteMeasureNumber} is unclosed`,
          );
        }
        openLongNoteChar = note;
        openLongNoteMeasureNumber = measure.measureNumber;
        if (note === "7") balloonCount++;
        continue;
      }
      if (note !== "8") continue;
      if (!openLongNoteChar)
        throw new DecodeError(`measure ${measure.measureNumber}: an "8" closes a long note that never opened`);
      openLongNoteChar = undefined;
    }
  }
  if (openLongNoteChar)
    throw new DecodeError(`measure ${openLongNoteMeasureNumber}: a "${openLongNoteChar}" is never closed`);
  if (balloonCount !== balloonHitCounts.length) {
    throw new DecodeError(`${balloonCount} balloons in the chart but ${balloonHitCounts.length} counts were read`);
  }
}

export async function decodeChartImage(file: string): Promise<DecodedChart> {
  const pixels = await loadPixels(file);
  const lanes = findLanes(pixels);
  const pixelsPerBeat = findPixelsPerBeat(pixels, lanes);
  const rawMeasures = collectMeasures(pixels, lanes);
  const state: ChartState = { scroll: 1, gogoActive: false, balloonHitCounts: [] };
  const measures = rawMeasures.map((measure) => assembleMeasure(measure, pixelsPerBeat, state));
  if (state.initialBpm === undefined) throw new DecodeError("no BPM annotation found in the image");
  verifyLongNotes(measures, state.balloonHitCounts);
  return {
    bpm: state.initialBpm,
    measures,
    balloonHitCounts: state.balloonHitCounts,
    pixelsPerBeat,
  };
}

export interface TjaHeader {
  title: string;
  course: string;
  level: number;
}

export function renderTja(chart: DecodedChart, header: TjaHeader): string {
  const lines: string[] = [];
  lines.push(`TITLE:${header.title}`);
  lines.push("SUBTITLE:");
  lines.push(`BPM:${chart.bpm}`);
  lines.push("WAVE:");
  lines.push("OFFSET:0");
  if (chart.balloonHitCounts.length) lines.push(`BALLOON:${chart.balloonHitCounts.join(",")}`);
  lines.push("");
  lines.push(`COURSE:${header.course}`);
  lines.push(`LEVEL:${header.level}`);
  lines.push("");
  lines.push("#START");
  let currentTimeSignature = "4/4";
  for (const measure of chart.measures) {
    const nextTimeSignature = timeSignature(measure.beats);
    if (nextTimeSignature !== currentTimeSignature) {
      lines.push(`#MEASURE ${nextTimeSignature}`);
      currentTimeSignature = nextTimeSignature;
    }
    let writtenNoteCount = 0;
    for (const command of [...measure.commands].sort((a, b) => a.noteIndex - b.noteIndex)) {
      if (command.noteIndex > writtenNoteCount) {
        lines.push(measure.notes.slice(writtenNoteCount, command.noteIndex).join(""));
        writtenNoteCount = command.noteIndex;
      }
      lines.push(command.text);
    }
    lines.push(`${measure.notes.slice(writtenNoteCount).join("")},`);
  }
  lines.push("#END");
  lines.push("");
  return lines.join("\n");
}

export { fitSubdivisions, subdivisionOffsets, timeSignature };
