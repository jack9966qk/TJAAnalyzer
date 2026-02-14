import { type NoteType, parseTJA } from "../renderer-package/src/index.js";
import { exampleTJA } from "../src/core/example-data.js";

try {
  console.log("Testing TJA Parser...");
  const charts = parseTJA(exampleTJA);
  const difficulties = Object.keys(charts);
  console.log(`Successfully parsed ${difficulties.length} difficulties: ${difficulties.join(", ")}`);

  if (difficulties.length === 0) {
    throw new Error("Parsed 0 difficulties. Something is wrong.");
  }

  const chart = charts.edit;
  if (!chart || !chart.bars) {
    throw new Error("'edit' difficulty not found in parsed charts.");
  }
  const bars = chart.bars;

  console.log(`'edit' difficulty has ${bars.length} bars.`);

  if (bars.length === 0) {
    throw new Error("Parsed 0 bars for 'edit' difficulty. Something is wrong.");
  }

  const firstBar: NoteType[] = bars[0];
  console.log("First bar of 'edit' difficulty:", firstBar);

  // Check BPM/Scroll
  const params0 = chart.barParams[0];
  console.log(`Bar 0 Params: BPM=${params0.bpm}, Scroll=${params0.scroll}`);
  if (params0.bpm !== 125) throw new Error(`Expected Bar 0 BPM to be 125, got ${params0.bpm}`);

  // Check Bar 4 (after BPMCHANGE 250 and SCROLL 0.75)
  // Counting bars in exampleTJA:
  // Bar 0: 2200...
  // Bar 1: 2200...
  // Bar 2: 5000...
  // Bar 3: 0 (measure 2/4)
  // Bar 4: 3000... (measure 4/4, after change)
  const params4 = chart.barParams[4];
  console.log(`Bar 4 Params: BPM=${params4.bpm}, Scroll=${params4.scroll}`);

  // The parser behavior is that changes at the start of the bar are recorded in bpmChanges/scrollChanges
  // while the base 'bpm'/'scroll' property reflects the state at the end of the previous bar.
  // The renderer handles this by checking changes at index 0.

  if (params4.bpm !== 125) throw new Error(`Expected Bar 4 Base BPM to be 125, got ${params4.bpm}`);

  const bpmChange = params4.bpmChanges?.find((c) => c.index === 0);
  if (!bpmChange || bpmChange.bpm !== 250) {
    throw new Error(`Expected Bar 4 to have BPM Change to 250 at index 0, got ${JSON.stringify(params4.bpmChanges)}`);
  }

  if (params4.scroll !== 1) throw new Error(`Expected Bar 4 Base Scroll to be 1, got ${params4.scroll}`);

  const scrollChange = params4.scrollChanges?.find((c) => c.index === 0);
  if (!scrollChange || scrollChange.scroll !== 0.75) {
    throw new Error(
      `Expected Bar 4 to have Scroll Change to 0.75 at index 0, got ${JSON.stringify(params4.scrollChanges)}`,
    );
  }

  // Check Measure Ratio
  const params3 = chart.barParams[3];
  console.log(`Bar 3 Params: Measure=${params3.measureRatio}`);
  if (Math.abs(params3.measureRatio - 0.5) > 0.001) {
    throw new Error(`Expected Bar 3 Measure Ratio to be 0.5 (2/4), got ${params3.measureRatio}`);
  }

  console.log(`Bar 4 Params: Measure=${params4.measureRatio}`);
  if (Math.abs(params4.measureRatio - 1.0) > 0.001) {
    throw new Error(`Expected Bar 4 Measure Ratio to be 1.0 (4/4), got ${params4.measureRatio}`);
  }

  // Check if notes are valid characters
  const validNotes: string[] = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const invalidNote: string | undefined = firstBar.find((n: string) => !validNotes.includes(n));
  if (invalidNote) {
    console.warn(`Warning: Found unexpected note char '${invalidNote}' in first bar.`);
  }

  // --- Gogo Time Tests ---
  console.log("Testing Gogo Time Parser...");
  const gogoTJA = `
TITLE:Gogo Test
BPM:120
COURSE:Oni
LEVEL:8

#START
1000,
#GOGOSTART
2000,
2000,
#GOGOEND
1000,
#END
`;
  const gogoCharts = parseTJA(gogoTJA);
  const gogoChart = gogoCharts.oni;

  if (!gogoChart) throw new Error("Gogo Test Chart not parsed");

  const gogoParams = gogoChart.barParams;

  // Bar 0: Normal
  if (gogoParams[0].gogoTime) throw new Error("Bar 0 should NOT be Gogo Time");

  // Bar 1: Gogo Start
  // Since #GOGOSTART is before the bar data, it should be active for this bar.
  if (!gogoParams[1].gogoTime) throw new Error("Bar 1 SHOULD be Gogo Time");

  // Bar 2: Gogo Continues
  if (!gogoParams[2].gogoTime) throw new Error("Bar 2 SHOULD be Gogo Time");

  // Bar 3: Gogo Ends
  // #GOGOEND is before bar 3 data.
  if (gogoParams[3].gogoTime) throw new Error("Bar 3 should NOT be Gogo Time");

  console.log("Gogo Time parser test passed.");

  // --- Branching Tests ---
  console.log("Testing Branching Parser...");
  const branchingTJA = `
TITLE:Angel Dream
BPM:180
COURSE:Edit
LEVEL:9

#START
1,
1,
1,
1, // 4 bars common

#BRANCHSTART p,60,80
#N
1111,
#E
2222,
#M
3333,
#BRANCHEND

1, // Common again
#END
`;
  const branchCharts = parseTJA(branchingTJA);
  const branchChart = branchCharts.edit;

  if (!branchChart) throw new Error("Branch Test Chart not parsed");
  if (!branchChart.branches) throw new Error("Branch Test Chart should have branches");

  // Check Branch Structure
  if (!branchChart.branches.normal) throw new Error("Missing Normal branch");
  if (!branchChart.branches.expert) throw new Error("Missing Expert branch");
  if (!branchChart.branches.master) throw new Error("Missing Master branch");

  // Check Bar Counts
  // 4 common + 1 branched + 1 common = 6 bars
  if (branchChart.branches.normal.bars.length !== 6)
    throw new Error(`Normal branch should have 6 bars, got ${branchChart.branches.normal.bars.length}`);

  // Check Bar Content (0-indexed)
  // Bar 4 is the branched bar
  const bar4N = branchChart.branches.normal.bars[4];
  const bar4E = branchChart.branches.expert.bars[4];
  const bar4M = branchChart.branches.master.bars[4];

  if (bar4N.join("") !== "1111") throw new Error(`Normal Bar 4 content mismatch: ${bar4N.join("")}`);
  if (bar4E.join("") !== "2222") throw new Error(`Expert Bar 4 content mismatch: ${bar4E.join("")}`);
  if (bar4M.join("") !== "3333") throw new Error(`Master Bar 4 content mismatch: ${bar4M.join("")}`);

  // Check isBranched flag
  if (!branchChart.branches.normal.barParams[4].isBranched)
    throw new Error("Normal Bar 4 should be flagged as branched");
  if (branchChart.branches.normal.barParams[3].isBranched)
    throw new Error("Normal Bar 3 (Common) should NOT be flagged as branched");

  // --- Sequential Branches Test ---
  console.log("Testing Sequential Branches Parser...");
  const seqBranchTJA = `
TITLE:Sequential Branch Test
BPM:180
COURSE:Oni
LEVEL:9

#START
1, // Common Bar 0

#BRANCHSTART p,60,80
#N
11,
#E
22,
#M
33,

#BRANCHSTART p,60,80
#N
1111,
#E
2222,
#M
3333,
#BRANCHEND

1, // Common Bar 3
#END
`;
  const seqCharts = parseTJA(seqBranchTJA);
  const seqChart = seqCharts.oni;

  if (!seqChart || !seqChart.branches || !seqChart.branches.normal)
    throw new Error("Sequential Branch Chart not parsed correctly");

  const seqBarsN = seqChart.branches.normal.bars;
  // Expected:
  // Bar 0: Common (1)
  // Bar 1: Branch 1 N (11)
  // Bar 2: Branch 2 N (1111)
  // Bar 3: Common (1)
  // Total 4 bars.

  console.log(`Sequential Branch Chart has ${seqBarsN.length} bars.`);
  if (seqBarsN.length !== 4) {
    // If it fails currently, it might have 3 bars (overwriting Branch 1) or other weirdness.
    throw new Error(`Expected 4 bars, got ${seqBarsN.length}`);
  }

  if (seqBarsN[1].join("") !== "11") throw new Error(`Bar 1 content mismatch: ${seqBarsN[1].join("")}`);
  if (seqBarsN[2].join("") !== "1111") throw new Error(`Bar 2 content mismatch: ${seqBarsN[2].join("")}`);

  // Check isBranchStart
  const seqParams = seqChart.branches.normal.barParams;
  if (!seqParams[1].isBranchStart) throw new Error("Bar 1 should be Branch Start (1st branch)");
  if (!seqParams[2].isBranchStart) throw new Error("Bar 2 should be Branch Start (2nd branch)");
  if (seqParams[0].isBranchStart) throw new Error("Bar 0 should NOT be Branch Start");
  if (seqParams[3].isBranchStart) throw new Error("Bar 3 should NOT be Branch Start");

  console.log("Sequential Branching parser test passed.");

  // --- Branch Reachability Tests ---
  console.log("Testing Branch Reachability Unit Cases...");

  // Case 1: p, 101, 102 (Impossible percentage)
  // Expected: Normal only
  const case1 = `
TITLE:Case 1
COURSE:Oni
#START
#BRANCHSTART p, 101, 102
#N
1,
#E
2,
#M
3,
#BRANCHEND
#END
`;
  const chart1 = parseTJA(case1).oni;
  if (!chart1) throw new Error("Case 1 chart not parsed");
  const reach1 = chart1.barParams[0].reachableBranches;
  if (!reach1) throw new Error("Case 1: No reachableBranches found");

  console.log("Case 1 (101, 102):", reach1);
  if (reach1.normal !== true) throw new Error("Case 1: Normal should be reachable");
  if (reach1.expert !== false) throw new Error("Case 1: Expert should NOT be reachable");
  if (reach1.master !== false) throw new Error("Case 1: Master should NOT be reachable");

  // Case 2: p, 85, 85 (Empty Expert range)
  // Expected: Normal and Master reachable. Expert not reachable.
  const case2 = `
TITLE:Case 2
COURSE:Oni
#START
#BRANCHSTART p, 85, 85
#N
1,
#E
2,
#M
3,
#BRANCHEND
#END
`;
  const chart2 = parseTJA(case2).oni;
  if (!chart2) throw new Error("Case 2 chart not parsed");
  const reach2 = chart2.barParams[0].reachableBranches;
  if (!reach2) throw new Error("Case 2: No reachableBranches found");

  console.log("Case 2 (85, 85):", reach2);
  if (reach2.normal !== true) throw new Error("Case 2: Normal should be reachable");
  if (reach2.expert !== false) throw new Error("Case 2: Expert should NOT be reachable");
  if (reach2.master !== true) throw new Error("Case 2: Master should be reachable");

  // Case 3: p, 70, 90 (Normal range)
  // Expected: All reachable
  const case3 = `
TITLE:Case 3
COURSE:Oni
#START
#BRANCHSTART p, 70, 90
#N
1,
#E
2,
#M
3,
#BRANCHEND
#END
`;
  const chart3 = parseTJA(case3).oni;
  if (!chart3) throw new Error("Case 3 chart not parsed");
  const reach3 = chart3.barParams[0].reachableBranches;
  if (!reach3) throw new Error("Case 3: No reachableBranches found");

  console.log("Case 3 (70, 90):", reach3);
  if (reach3.normal !== true) throw new Error("Case 3: Normal should be reachable");
  if (reach3.expert !== true) throw new Error("Case 3: Expert should be reachable");
  if (reach3.master !== true) throw new Error("Case 3: Master should be reachable");

  console.log("All Reachability Tests Passed.");

  console.log("Parser test passed.");
} catch (e: unknown) {
  console.error("Parser test failed:", e);
  process.exit(1);
}
