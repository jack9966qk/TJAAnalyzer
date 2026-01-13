import { calculateInferredHands } from "./renderer.js";
import type { ParsedChart } from "./tja-parser.js";

interface NoteTiming {
  id: string;
  beat: number;
  hand: string;
  type: string;
}

interface Segment {
  notes: NoteTiming[];
  gap: number;
}

export function generateAutoAnnotations(
  chart: ParsedChart,
  existingAnnotations: Record<string, string>,
): Record<string, string> {
  // Clone existing annotations to avoid side-effects if not desired,
  // though the caller can handle that. We'll return a new object with updates.
  const annotations = { ...existingAnnotations };
  const inferred = calculateInferredHands(chart.bars, annotations);

  const notes: NoteTiming[] = [];
  let currentBeat = 0;

  for (let i = 0; i < chart.bars.length; i++) {
    const bar = chart.bars[i];
    const params = chart.barParams[i];
    // Default measure ratio is 1.0 (4/4)
    const measureRatio = params ? params.measureRatio : 1.0;
    const barLengthBeats = 4 * measureRatio;

    if (bar && bar.length > 0) {
      const step = barLengthBeats / bar.length;
      for (let j = 0; j < bar.length; j++) {
        const char = bar[j];
        // Only Don/Ka (Small/Large) are annotatable
        if (["1", "2", "3", "4"].includes(char)) {
          const id = `${i}_${j}`;
          const hand = inferred.get(id);
          if (hand) {
            notes.push({ id, beat: currentBeat + j * step, hand, type: char });
          }
        }
      }
    }
    currentBeat += barLengthBeats;
  }

  // Identify notes to annotate
  const toAnnotate = new Set<string>();

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
      // End of chart
      currentSegment.push(note);
      segments.push({ notes: [...currentSegment], gap: gapBefore });
      currentSegment = [];
      continue;
    }

    const gapAfter = next.beat - note.beat;
    const epsilon = 0.0001;

    if (Math.abs(gapBefore - gapAfter) < epsilon) {
      // Consistent gap
      currentSegment.push(note);
    } else if (gapBefore < gapAfter - epsilon) {
      // Gap before < gap after (Slowing down: 0.25 -> 0.5)
      // Pivot belongs to faster stream (Before)
      // Include in current, then end
      currentSegment.push(note);
      segments.push({ notes: [...currentSegment], gap: gapBefore });
      currentSegment = [];
    } else if (gapBefore > gapAfter + epsilon) {
      // Gap before > gap after (Speeding up: 0.5 -> 0.25)
      // Pivot belongs to faster stream (After)
      // End current (without pivot), Start new with pivot
      segments.push({ notes: [...currentSegment], gap: gapBefore });
      currentSegment = [note];
    }
  }

  // Process segments to find annotation targets
  for (const seg of segments) {
    if (seg.notes.length === 0) continue;

    const first = seg.notes[0];
    const [barIdxStr] = first.id.split("_");
    const barIdx = parseInt(barIdxStr, 10);
    const params = chart.barParams[barIdx];
    const measureRatio = params ? params.measureRatio : 1.0;
    const quarterNote = measureRatio;

    if (seg.gap < quarterNote - 0.0001) {
      toAnnotate.add(first.id);

      // Check for 3 opposite color notes before
      const getColor = (c: string) => (c === "1" || c === "3" ? "d" : "k");

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
          toAnnotate.add(current.id);
        }
      }
    }
  }

  // Update annotations
  toAnnotate.forEach((id) => {
    const hand = inferred.get(id);
    if (hand) {
      annotations[id] = hand;
    }
  });

  return annotations;
}
