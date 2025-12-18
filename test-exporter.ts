import { parseTJA } from './src/tja-parser.js';
import { generateTJAFromSelection } from './src/tja-exporter.js';
import { ViewOptions } from './src/renderer.js';

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

const parsed = parseTJA(tjaContent)['oni'];

// Test 1: Full selection of bar 1 (contains balloon #2 which is 10)
// Bar 0 has balloon #1 (5).
// Bar 1 has balloon #2 (10).
// Bar 2 has balloon #3 (15).

const selection1: ViewOptions['selection'] = {
    start: { originalBarIndex: 1, charIndex: 0 },
    end: { originalBarIndex: 1, charIndex: 7 }
};

const output1 = generateTJAFromSelection(parsed, selection1, 'Oni');
console.log("--- Output 1 ---");
console.log(output1);

if (output1.includes('BALLOON:10')) {
    console.log("PASS: Balloon value 10 found.");
} else {
    console.error("FAIL: Balloon value 10 not found.");
    process.exit(1);
}

if (!output1.includes('BALLOON:5') && !output1.includes('BALLOON:15')) {
    console.log("PASS: Balloon values 5 and 15 excluded.");
} else {
    console.error("FAIL: Unexpected balloon values found.");
    process.exit(1);
}

// Test 2: Partial selection of bar 0 and 1
// Select from bar 0 char 4 to bar 1 char 3.
// Bar 0: 1000 [0000] -> balloon at 0 is excluded? No, balloon is '7'.
// Bar 0: 10000000. Wait, bar 0 is just '1'. No balloon.
// Wait, my tja:
// Bar 0: 10000000
// Bar 1: 70000000 (balloon at start)
// Bar 2: 10007000 (balloon at 4)
// Bar 3: 90000000 (kusudama at start)

// Correction:
// Bar 0: 1...
// Bar 1: 7... (Value 5)
// Bar 2: ...7... (Value 10)
// Bar 3: 9... (Value 15)

// Let's re-test selection of Bar 2 (index 2).
const selection2: ViewOptions['selection'] = {
    start: { originalBarIndex: 2, charIndex: 0 },
    end: { originalBarIndex: 2, charIndex: 7 }
};

const output2 = generateTJAFromSelection(parsed, selection2, 'Oni');
console.log("--- Output 2 ---");
console.log(output2);
if (output2.includes('BALLOON:15')) {
    console.log("PASS: Balloon value 15 found.");
} else {
    console.error("FAIL: Balloon value 15 not found.");
    process.exit(1);
}

// Test 3: Partial selection cutting off a balloon.
// Bar 1: 70000000.
// Select Bar 1 char 2 to 7. (00700000 -> 000000)
// The '7' is at index 0. So it becomes '0'.
// Expect NO balloon header.

const selection3: ViewOptions['selection'] = {
    start: { originalBarIndex: 1, charIndex: 2 },
    end: { originalBarIndex: 1, charIndex: 7 }
};

const output3 = generateTJAFromSelection(parsed, selection3, 'Oni');
console.log("--- Output 3 ---");
console.log(output3);
if (!output3.includes('BALLOON')) {
    console.log("PASS: No BALLOON header.");
} else {
    console.error("FAIL: BALLOON header present.");
    process.exit(1);
}

// Test 4: Verify BPM/SCROLL commands
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
const parsed2 = parseTJA(tjaContent2)['oni'];

// Export bar 1 (index 1), which has BPMCHANGE 200 at start.
// Bar 0 has SCROLL 2.0.
// Export bar 1. We expect BPM:100 in header (start of bar 0? No, header).
// But Bar 1 starts. State at Bar 1 start: BPM 100 (until change), Scroll 2.0.
// Wait, BPMCHANGE 200 is at index 0 of Bar 1.
// So Bar 1 start state is BPM 100. Then immediately changes to 200.
// We expect:
// Header BPM: 100
// #SCROLL 2 (inherited)
// #MEASURE ...
// #BPMCHANGE 200 (in body)

const selection4: ViewOptions['selection'] = {
    start: { originalBarIndex: 1, charIndex: 0 },
    end: { originalBarIndex: 1, charIndex: 7 }
};

const output4 = generateTJAFromSelection(parsed2, selection4, 'Oni');
console.log("--- Output 4 ---");
console.log(output4);

if (output4.includes('BPM:100')) console.log("PASS: Header BPM 100");
if (output4.includes('#SCROLL 2')) console.log("PASS: Initial SCROLL 2");
if (output4.includes('#BPMCHANGE 200')) console.log("PASS: BPMCHANGE 200 preserved");

// Test 5: Verify LEVEL preservation
const tjaContent3 = `
TITLE:LevelTest
BPM:140
COURSE:Hard
LEVEL:8
#START
10000000,
#END
`;
const parsed3 = parseTJA(tjaContent3)['hard'];
const selection5: ViewOptions['selection'] = {
    start: { originalBarIndex: 0, charIndex: 0 },
    end: { originalBarIndex: 0, charIndex: 7 }
};
const output5 = generateTJAFromSelection(parsed3, selection5, 'Hard');
console.log("--- Output 5 ---");
console.log(output5);

if (output5.includes('LEVEL:8')) {
    console.log("PASS: LEVEL 8 preserved.");
} else {
    console.error("FAIL: LEVEL 8 not found.");
    process.exit(1);
}

console.log("All tests passed");