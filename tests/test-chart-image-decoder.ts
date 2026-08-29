import { fileURLToPath } from "node:url";
import type { DecodedMeasure } from "../offline-analysis/chart-image-decoder.js";
import {
  decodeChartImage,
  fitSubdivisions,
  subdivisionOffsets,
  timeSignature,
  verifyLongNotes,
} from "../offline-analysis/chart-image-decoder.js";

function expect(actual: unknown, wanted: unknown, what: string) {
  const a = JSON.stringify(actual);
  const b = JSON.stringify(wanted);
  if (a !== b) throw new Error(`${what}: expected ${b}, got ${a}`);
}

function refuse(run: () => unknown, what: string) {
  try {
    run();
  } catch {
    return;
  }
  throw new Error(`expected ${what} to raise`);
}

try {
  console.log("Testing chart image decoder...");

  // The renderer rounds each slot to a whole pixel, so an uneven division
  // produces uneven pixel steps that the decoder has to reproduce exactly.
  expect(subdivisionOffsets(192, 4), [0, 48, 96, 144], "even slots");
  expect(subdivisionOffsets(96, 7), [0, 14, 27, 41, 55, 69, 82], "uneven slots");

  // Sixteenths over four beats, taken back to the coarsest grid that explains them.
  expect(fitSubdivisions([0, 48, 96, 144], 192, "quarters").subdivisionCount, 4, "quarter fit");
  expect(fitSubdivisions([0, 12, 24, 84], 192, "sixteenths").subdivisionCount, 16, "sixteenth fit");

  // A measure mixing triplets and 32nds needs the grid that covers both.
  expect(fitSubdivisions([0, 16, 24, 32], 240, "mixed").subdivisionCount, 30, "mixed fit");

  expect(fitSubdivisions([2], 512, "wide measure").subdivisionCount, 205, "dense subdivision in a wide measure");

  // Offsets that no grid explains must be refused rather than snapped.
  refuse(() => fitSubdivisions([0, 1], 192, "impossible"), "an unfittable measure");

  // A long note tail often reaches past its own measure, so the terminator has
  // to be filed against the measure that actually contains it.
  const bar = (measureNumber: number, notes: string): DecodedMeasure => ({
    measureNumber,
    beats: 4,
    subdivisionCount: notes.length,
    notes: notes.split(""),
    commands: [],
  });
  verifyLongNotes([bar(1, "7000"), bar(2, "0080")], [12]);
  refuse(() => verifyLongNotes([bar(1, "7000"), bar(2, "0000")], [12]), "an unterminated balloon");
  refuse(() => verifyLongNotes([bar(1, "7050"), bar(2, "0080")], [12]), "a long note opening twice");
  refuse(() => verifyLongNotes([bar(1, "0080")], []), "a terminator with no long note");
  refuse(() => verifyLongNotes([bar(1, "7008")], []), "a balloon with no count");

  expect(timeSignature(4), "4/4", "four four");
  expect(timeSignature(4.5), "9/8", "nine eight");
  expect(timeSignature(3), "3/4", "three four");
  expect(timeSignature(2), "2/4", "two four");
  expect(timeSignature(6), "6/4", "six four");

  const wrapped = await decodeChartImage(
    fileURLToPath(new URL("./data/chart-images/wrapped_drumrolls.png", import.meta.url)),
  );
  expect(wrapped.measures.length, 107, "wrapped chart measures");
  expect(wrapped.balloonHitCounts, [6, 10], "wrapped chart balloons");
  const notesAt = (measureNumber: number) => wrapped.measures[measureNumber - 1].notes.join("");
  for (const offset of [0, 51]) {
    expect(notesAt(42 + offset), "1102201110222050", "wrapped drumroll head");
    expect(notesAt(43 + offset), "00000825", "wrapped drumroll tail");
    expect(notesAt(46 + offset), "00000846", "wrapped big drumroll head");
    expect(notesAt(47 + offset), "00000846", "wrapped big drumroll tail");
    expect(notesAt(48 + offset), "00000008", "last drumroll tail");
  }
  const count = (chars: string) =>
    wrapped.measures.reduce((total, measure) => total + measure.notes.filter((note) => chars.includes(note)).length, 0);
  expect(count("567"), 28, "long note heads");
  expect(count("8"), 28, "long note tails");

  console.log("Chart image decoder test passed.");
} catch (e: unknown) {
  console.error("Chart image decoder test failed:", e);
  process.exit(1);
}
