import { JUDGEABLE_NOTES, LocationMap, type NoteLocation, NoteType } from "./primitives.js";
import type { ParsedChart } from "./tja-parser.js";

export interface NoteTiming {
  id: NoteLocation;
  beat: number;
  type: string;
}

export interface Segment {
  notes: NoteTiming[];
  gap: number;
}

export function extractNotesAndSegments(chart: ParsedChart): { notes: NoteTiming[]; segments: Segment[] } {
  const notes: NoteTiming[] = [];
  let currentBeat = 0;

  for (let i = 0; i < chart.bars.length; i++) {
    const bar = chart.bars[i];
    const params = chart.barParams[i];
    const measureRatio = params ? params.measureRatio : 1.0;
    const barLengthBeats = 4 * measureRatio;

    if (bar && bar.length > 0) {
      const step = barLengthBeats / bar.length;
      for (let j = 0; j < bar.length; j++) {
        const char = bar[j];
        if (JUDGEABLE_NOTES.includes(char)) {
          const id = { barIndex: i, charIndex: j };
          notes.push({ id, beat: currentBeat + j * step, type: char });
        }
      }
    }
    currentBeat += barLengthBeats;
  }

  const segments: Segment[] = [];
  let currentSegment: NoteTiming[] = [];

  for (let k = 0; k < notes.length; k++) {
    const note = notes[k];

    if (currentSegment.length === 0) {
      currentSegment.push(note);
      continue;
    }

    const prev = notes[k - 1];
    const next = notes[k + 1];
    const gapBefore = note.beat - prev.beat;

    if (!next) {
      currentSegment.push(note);
      segments.push({ notes: [...currentSegment], gap: gapBefore });
      currentSegment = [];
      continue;
    }

    const gapAfter = next.beat - note.beat;
    const epsilon = 0.0001;

    if (Math.abs(gapBefore - gapAfter) < epsilon) {
      currentSegment.push(note);
    } else if (gapBefore < gapAfter - epsilon) {
      currentSegment.push(note);
      segments.push({ notes: [...currentSegment], gap: gapBefore });
      currentSegment = [];
    } else if (gapBefore > gapAfter + epsilon) {
      segments.push({ notes: [...currentSegment], gap: gapBefore });
      currentSegment = [note];
    }
  }

  if (currentSegment.length > 0) {
    segments.push({ notes: [...currentSegment], gap: Infinity });
  }

  return { notes, segments };
}

export function calculateInferredHands(
  chart: ParsedChart,
  annotations: LocationMap<string> | undefined,
  alternationThresholdMeasure: number = Infinity,
  resetThresholdMeasure: number = 0,
): LocationMap<string> {
  const inferred = new LocationMap<string>();

  const alternationThreshold = alternationThresholdMeasure * 4;
  const resetThreshold = resetThresholdMeasure === 0 ? Infinity : resetThresholdMeasure * 4;

  const { segments } = extractNotesAndSegments(chart);

  let lastHand = "L"; // Ensure first note gets R
  let currentEndSearchBar = 0;
  let currentEndSearchChar = 0;
  let previousNoteBeat = -Infinity;

  for (const seg of segments) {
    if (seg.notes.length === 0) continue;

    const gapInternal = seg.gap;
    const firstNoteBeat = seg.notes[0].beat;
    const gapBeforeSegment = firstNoteBeat - previousNoteBeat;

    // Check if we passed a NoteType.End before this segment
    let passedEnd = false;
    const firstNoteId = seg.notes[0].id;
    for (let i = currentEndSearchBar; i <= firstNoteId.barIndex; i++) {
      const bar = chart.bars[i];
      if (!bar) continue;
      const startJ = i === currentEndSearchBar ? currentEndSearchChar : 0;
      const endJ = i === firstNoteId.barIndex ? firstNoteId.charIndex : bar.length;
      for (let j = startJ; j < endJ; j++) {
        if (bar[j] === NoteType.End) {
          passedEnd = true;
        }
      }
    }
    currentEndSearchBar = seg.notes[seg.notes.length - 1].id.barIndex;
    currentEndSearchChar = seg.notes[seg.notes.length - 1].id.charIndex;

    const shouldReset = gapBeforeSegment >= resetThreshold - 0.0001 || passedEnd;

    if (gapInternal > alternationThreshold + 0.0001) {
      for (const note of seg.notes) {
        const currentInferred = "R";
        inferred.set(note.id, currentInferred);
        const annotation = annotations?.get(note.id);
        lastHand = annotation ? annotation : currentInferred;
      }
    } else if (shouldReset) {
      let currentInferred = "R";
      inferred.set(seg.notes[0].id, currentInferred);
      let annotation = annotations?.get(seg.notes[0].id);
      lastHand = annotation ? annotation : currentInferred;

      for (let i = 1; i < seg.notes.length; i++) {
        const note = seg.notes[i];
        currentInferred = lastHand === "R" ? "L" : "R";
        inferred.set(note.id, currentInferred);
        annotation = annotations?.get(note.id);
        lastHand = annotation ? annotation : currentInferred;
      }
    } else {
      for (const note of seg.notes) {
        const currentInferred = lastHand === "R" ? "L" : "R";
        inferred.set(note.id, currentInferred);

        const annotation = annotations?.get(note.id);
        lastHand = annotation ? annotation : currentInferred;
      }
    }

    previousNoteBeat = seg.notes[seg.notes.length - 1].beat;
  }

  return inferred;
}

export function generateAutoAnnotations(
  chart: ParsedChart,
  existingAnnotations: LocationMap<string>,
  alternationThresholdMeasure: number = Infinity,
  resetThresholdMeasure: number = 0,
): LocationMap<string> {
  const annotations = new LocationMap(existingAnnotations);
  // Auto-annotation explicit placement follows user configuration
  const inferred = calculateInferredHands(chart, annotations, alternationThresholdMeasure, resetThresholdMeasure);
  const { segments } = extractNotesAndSegments(chart);

  const toAnnotate = new LocationMap<boolean>();

  for (const seg of segments) {
    if (seg.notes.length === 0) continue;

    const first = seg.notes[0];
    const params = chart.barParams[first.id.barIndex];
    const measureRatio = params ? params.measureRatio : 1.0;
    const quarterNote = measureRatio;

    if (seg.gap < quarterNote - 0.0001) {
      toAnnotate.set(first.id, true);

      const getColor = (c: string) => (c === NoteType.Don || c === NoteType.DonBig ? "d" : "k");

      for (let i = 3; i < seg.notes.length; i++) {
        const current = seg.notes[i];
        const prev1 = seg.notes[i - 1];
        const prev2 = seg.notes[i - 2];
        const prev3 = seg.notes[i - 3];

        const cCurr = getColor(current.type);
        const c1 = getColor(prev1.type);
        const c2 = getColor(prev2.type);
        const c3 = getColor(prev3.type);

        if (c1 === c2 && c2 === c3 && c1 !== cCurr) {
          toAnnotate.set(current.id, true);
        }
      }
    }
  }

  for (const [id] of toAnnotate) {
    const hand = inferred.get(id);
    if (hand) {
      annotations.set(id, hand);
    }
  }

  return annotations;
}
