import type { ViewOptions } from "./src/renderer.js";
import { generateTJAFromSelection } from "./src/tja-exporter.js";
import { parseTJA } from "./src/tja-parser.js";

function runTest(name: string, fn: () => void) {
  try {
    console.log(`\n--- ${name} ---`);
    fn();
    console.log("PASS");
  } catch (e) {
    if (e instanceof Error) {
      console.error(`FAIL: ${e.message}`);
    } else {
      console.error(`FAIL: ${e}`);
    }
    process.exit(1);
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(text: string, search: string) {
  if (!text.includes(search)) {
    throw new Error(`Expected output to include "${search}". Output:\n${text}`);
  }
}

function assertNotIncludes(text: string, search: string) {
  if (text.includes(search)) {
    throw new Error(`Expected output NOT to include "${search}". Output:\n${text}`);
  }
}

try {
  console.log("Testing TJA Exporter...");

  const tjaContent = `
TITLE:Test
BPM:120
BALLOON:5,10,15
COURSE:Oni
LEVEL:10
#START
70000000,
70000000,
10007000,
90000000,
#END
`;
  const parsed = parseTJA(tjaContent).oni;

  runTest("Test 1: Full selection with Balloon (Middle)", () => {
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 1, charIndex: 0 },
      end: { originalBarIndex: 1, charIndex: 7 },
    };
    const output = generateTJAFromSelection(parsed, selection, "Oni");
    assertIncludes(output, "BALLOON:10");
    assertNotIncludes(output, "BALLOON:5");
    assertNotIncludes(output, "BALLOON:15");
  });

  runTest("Test 2: Partial selection (Offset Balloon)", () => {
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 2, charIndex: 0 },
      end: { originalBarIndex: 2, charIndex: 7 },
    };
    const output = generateTJAFromSelection(parsed, selection, "Oni");
    assertIncludes(output, "BALLOON:15");
  });

  runTest("Test 3: Partial selection cutting off Balloon", () => {
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 1, charIndex: 2 },
      end: { originalBarIndex: 1, charIndex: 7 },
    };
    const output = generateTJAFromSelection(parsed, selection, "Oni");
    assertNotIncludes(output, "BALLOON");
  });

  runTest("Test 4: Verify BPM/SCROLL commands preservation", () => {
    const tjaContent2 = `
TITLE:Test2
BPM:100
COURSE:Oni
#START
#SCROLL 2.0
10001000,
#BPMCHANGE 200
10001000,
#END
`;
    const parsed2 = parseTJA(tjaContent2).oni;
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 1, charIndex: 0 },
      end: { originalBarIndex: 1, charIndex: 7 },
    };
    const output = generateTJAFromSelection(parsed2, selection, "Oni");

    // Context at Start of Bar 1 (Index 0) includes the BPMCHANGE 200 at index 0.
    // So Header BPM should be 200.
    assertIncludes(output, "BPM:200");
    assertIncludes(output, "#SCROLL 2");
    assertIncludes(output, "#BPMCHANGE 200");
  });

  runTest("Test 5: Verify LEVEL preservation", () => {
    const tjaContent3 = `
TITLE:LevelTest
BPM:140
COURSE:Hard
LEVEL:8
#START
10000000,
#END
`;
    const parsed3 = parseTJA(tjaContent3).hard;
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 0, charIndex: 0 },
      end: { originalBarIndex: 0, charIndex: 7 },
    };
    const output = generateTJAFromSelection(parsed3, selection, "Hard");
    assertIncludes(output, "LEVEL:8");
  });

  runTest("Test 6: Looping structure and Context Reset", () => {
    const tjaLoop = `
TITLE:LoopTest
BPM:100
COURSE:Oni
#START
#SCROLL 2.0
#MEASURE 4/4
10001000,
#BPMCHANGE 200
#SCROLL 1.5
20002000,
#END
`;
    const parsedLoop = parseTJA(tjaLoop).oni;
    // Select Bar 0
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 0, charIndex: 0 },
      end: { originalBarIndex: 0, charIndex: 7 },
    };
    const output = generateTJAFromSelection(parsedLoop, selection, "Oni", 2);

    const loopCount = output.split("// Loop").length - 1;
    assert(loopCount === 2, `Expected 2 loops, found ${loopCount}`);
    assertIncludes(output, "BPM:100");

    // Check Loop 1 Context Reset
    const loops = output.split("// Loop");
    const loop1 = loops[1];
    assertIncludes(loop1, "#BPMCHANGE 100");
    assertIncludes(loop1, "#SCROLL 2");

    // Check End Padding
    assertIncludes(output, "// End Padding");
    const endPad = output.split("// End Padding")[1];
    // End context of Bar 0 (ignoring Bar 1's BPMCHANGE 200 which is at start of Bar 1)
    // Actually Bar 1 starts with BPMCHANGE 200.
    // Bar 0 has no changes inside.
    // So state at end of Bar 0 is BPM 100, Scroll 2.
    assertIncludes(endPad, "#BPMCHANGE 100");
    assertIncludes(endPad, "#SCROLL 2");
  });

  runTest("Test 7: Looping with Balloons", () => {
    const tjaBalloonLoop = `
TITLE:BalloonLoop
COURSE:Oni
BALLOON:10
#START
70000000,
#END
`;
    const parsedBalloonLoop = parseTJA(tjaBalloonLoop).oni;
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 0, charIndex: 0 },
      end: { originalBarIndex: 0, charIndex: 7 },
    };
    const output = generateTJAFromSelection(parsedBalloonLoop, selection, "Oni", 3);
    assertIncludes(output, "BALLOON:10,10,10");
  });

  runTest("Test 8: End Context Specificity (End of Bar)", () => {
    const tjaMidBar = `
TITLE:MidBar
COURSE:Oni
BPM:100
#START
#BPMCHANGE 200
10
#BPMCHANGE 300
00,
#END
`;
    // Bar 0 Structure:
    // Index 0: '1'
    // Index 1: '0'
    // Index 2: #BPMCHANGE 300 (before '0')
    // Index 2: '0'
    // Index 3: '0'

    const parsedMidBar = parseTJA(tjaMidBar).oni;

    // Select just the first note (Index 0)
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 0, charIndex: 0 },
      end: { originalBarIndex: 0, charIndex: 0 },
    };
    const output = generateTJAFromSelection(parsedMidBar, selection, "Oni", 1);

    assertIncludes(output, "// End Padding");
    const endPart = output.split("// End Padding")[1];

    // We expect the End Padding to reflect the state at the END OF THE BAR
    // even though we only selected the start.
    // The End Padding follows the empty bars which follow the loop.
    // Wait, logically:
    // Loop 1: Empty Bar (Start Ctx) -> Selection -> Rest of Bar (Implicitly skipped) -> Next Loop
    // Actually my implementation does NOT output the "rest of bar".
    // It outputs: Empty Bar -> Selection -> (End of selection loop).
    // Then End Padding.
    // The End Padding is supposed to transition us back to the "Rest of the chart" or simply be a safe ending?
    // If we only export a selection, the "End Padding" bars are just 3 empty bars.
    // Their context should probably match the state where the selection ENDED?
    // Or where the selection WOULD have ended if we continued?
    // In my implementation step 12, I set it to `getContextAt(chart, endBar, 999999)`.
    // This effectively means "State at the end of the endBar".
    // So yes, it should include the #BPMCHANGE 300 which happened later in that bar.

    assertIncludes(endPart, "#BPMCHANGE 300");
  });

  runTest("Test 9: Export -> Parse Cycle", () => {
    const tjaCycle = `
TITLE:CycleTest
COURSE:Oni
BPM:150
BALLOON:3
#START
10700000,
#END
`;
    const parsedCycle = parseTJA(tjaCycle).oni;
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 0, charIndex: 0 },
      end: { originalBarIndex: 0, charIndex: 7 },
    };
    // Export with 2 loops
    const exportedTja = generateTJAFromSelection(parsedCycle, selection, "Oni", 2);

    // Parse it back
    const reParsedMap = parseTJA(exportedTja);
    const reParsed = reParsedMap.oni;

    assert(!!reParsed, "Re-parsed chart should contain 'Oni' course");

    // Check Header BPM
    assert(reParsed.barParams[0].bpm === 150, `Expected BPM 150, got ${reParsed.barParams[0].bpm}`);

    // Check Structure:
    // Loop 1: Empty Bar (0,) -> Selection (10700000,)
    // Loop 2: Empty Bar (0,) -> Selection (10700000,)
    // End Padding: 0, 0, 0,
    // Total Bars: (1+1) + (1+1) + 3 = 7 bars?
    // Let's check the content of the bars that correspond to selection.
    // Bar 0: Empty (generated context reset)
    // Bar 1: Selection
    const bar1 = reParsed.bars[1];
    assert(bar1.join("") === "10700000", `Expected bar 1 to be '10700000', got '${bar1.join("")}'`);

    // Check Balloons
    // Original has 1 balloon (value 3). We loop 2 times.
    // So expected balloons: 3, 3.
    assert(reParsed.balloonCounts.length === 2, `Expected 2 balloons, got ${reParsed.balloonCounts.length}`);
    assert(reParsed.balloonCounts[0] === 3, `Expected first balloon to be 3`);
    assert(reParsed.balloonCounts[1] === 3, `Expected second balloon to be 3`);
  });

  runTest("Test 10: Verify Custom Chart Name", () => {
    const tjaContent4 = `
TITLE:Test4
BPM:120
COURSE:Oni
#START
10000000,
#END
`;
    const parsed4 = parseTJA(tjaContent4).oni;
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 0, charIndex: 0 },
      end: { originalBarIndex: 0, charIndex: 7 },
    };
    const output = generateTJAFromSelection(parsed4, selection, "Oni", 1, "My Custom Chart");
    assertIncludes(output, "TITLE:My Custom Chart");
  });

  runTest("Test 11: Verify Variable Gap Count", () => {
    const tjaContent5 = `
TITLE:Test5
BPM:120
COURSE:Oni
#START
10000000,
#END
`;
    const parsed5 = parseTJA(tjaContent5).oni;
    const selection: ViewOptions["selection"] = {
      start: { originalBarIndex: 0, charIndex: 0 },
      end: { originalBarIndex: 0, charIndex: 7 },
    };
    // Export with gapCount = 2, loopCount = 1
    // Expected Structure:
    // Loop 1
    // [Gap Bar 1]
    // [Gap Bar 2]
    // [Selection]
    // End Padding
    // ...
    const output = generateTJAFromSelection(parsed5, selection, "Oni", 1, "Gap Test", 2);

    // We expect:
    // MEASURE/BPM/SCROLL commands
    // GOGO state
    // 0, (Gap 1)
    // 0, (Gap 2)
    // [Possible Gogo state correction]
    // 10000000, (Selection)

    // Count occurrences of "0," BEFORE the selection "10000000,"
    // Since "0," is on a new line usually

    // A simple check is to look for consecutive "0,\n"
    // Note: the implementation outputs `0,\n` for each gap.

    // Let's verify by parsing
    const reParsed = parseTJA(output).oni;

    // Expected Bars:
    // 1. Gap
    // 2. Gap
    // 3. Selection
    // 4. End Padding (3 bars)

    // Total bars before end padding should be 3.
    // Total bars including end padding should be 6.

    assert(
      reParsed.bars.length === 6,
      `Expected 6 bars (2 gaps + 1 selection + 3 padding), got ${reParsed.bars.length}`,
    );

    // Bar 0 and 1 should be empty
    assert(
      reParsed.bars[0].every((c) => c === "0"),
      "Bar 0 should be empty (Gap)",
    );
    assert(
      reParsed.bars[1].every((c) => c === "0"),
      "Bar 1 should be empty (Gap)",
    );

    // Bar 2 should be selection
    assert(reParsed.bars[2].join("") === "10000000", "Bar 2 should be selection");
  });

  console.log("\nAll TJA Exporter tests passed.");
} catch (e) {
  console.error("Test suite failed:", e);
  process.exit(1);
}
