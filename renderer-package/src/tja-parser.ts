import { BranchName, NoteType, toNoteType } from "./primitives.js";

export interface LoopInfo {
  startBarIndex: number;
  period: number;
  iterations: number;
}

export interface BPMChange {
  index: number;
  bpm: number;
}

export interface ScrollChange {
  index: number;
  scroll: number;
}

export interface GogoChange {
  index: number;
  isGogo: boolean;
}

export interface NextSong {
  title: string;
  subtitle: string;
  genre: string;
  wave: string;
  scoreInit: number;
  scoreDiff: number;
  level?: number;
  course?: string;
  hideTitle?: boolean;
}

export interface NextSongChange {
  index: number;
  nextSong: NextSong;
}

export interface BarParams {
  bpm: number;
  scroll: number;
  measureRatio: number;
  gogoTime: boolean;
  isBranched: boolean;
  isBranchStart?: boolean;
  branchStartParams?: {
    type: string;
    p1: number;
    p2: number;
  };
  reachableBranches?: {
    normal: boolean;
    expert: boolean;
    master: boolean;
  };
  bpmChanges?: BPMChange[];
  scrollChanges?: ScrollChange[];
  gogoChanges?: GogoChange[];
  nextSongChanges?: NextSongChange[];
}

export interface ParsedChart {
  bars: NoteType[][];
  barParams: BarParams[];
  loop?: LoopInfo;
  balloonCounts: number[];
  headers: Record<string, string>;

  // Metadata
  title: string;
  subtitle: string;
  bpm: number;
  level: number;
  course: string;

  // Branching
  branchType?: BranchName;
  branches?: {
    [key in BranchName]?: ParsedChart;
  };

  // Player sides (for STYLE:Double)
  playerSides?: {
    [key: string]: ParsedChart;
  };
}

interface ParserState {
  bpm: number;
  scroll: number;
  measureRatio: number;
  gogoTime: boolean;

  currentBarBuffer: string;
  currentBarBpmChanges: BPMChange[];
  currentBarScrollChanges: ScrollChange[];
  currentBarGogoChanges: GogoChange[];
  currentBarNextSongChanges: NextSongChange[];
}

function createInitialState(bpm: number): ParserState {
  return {
    bpm: bpm,
    scroll: 1.0,
    measureRatio: 1.0,
    gogoTime: false,
    currentBarBuffer: "",
    currentBarBpmChanges: [],
    currentBarScrollChanges: [],
    currentBarGogoChanges: [],
    currentBarNextSongChanges: [],
  };
}

function calculateReachability(params?: { type: string; p1: number; p2: number }) {
  if (!params) {
    return { normal: true, expert: true, master: true };
  }

  const { type, p1, p2 } = params;
  const isPercent = ["p", "d", "pp", "jb"].includes(type);

  // We check if it is *possible* to satisfy these conditions.
  // Range:
  // p: [0, 100]
  // r, s, others: [0, Infinity]
  const maxVal = isPercent ? 100 : Infinity;
  const minVal = 0;

  // Master reachable if [p2, Infinity] overlaps with [minVal, maxVal]
  // i.e. maxVal >= p2
  const master = maxVal >= p2;

  // Expert reachable if [p1, p2) overlaps with [minVal, maxVal]
  // i.e. max(p1, minVal) < min(p2, maxVal + epsilon)
  // Simply: p1 < p2 AND p1 <= maxVal
  const expert = p1 < p2 && p1 <= maxVal;

  // Normal reachable if (-Infinity, min(p1, p2)) overlaps with [minVal, maxVal]
  // i.e. min(p1, p2) > minVal
  const normal = Math.min(p1, p2) > minVal;

  return { normal, expert, master };
}

export function parseTJA(content: string): Record<string, ParsedChart> {
  const lines: string[] = content.split(/\r?\n/);
  const courses: Record<string, string[]> = {};
  const courseHeaders: Record<string, Record<string, string>> = {};

  let currentCourse: string | null = null;
  let currentPlayerSide: string | null = null;
  let isParsingChart: boolean = false;
  const globalHeader: Record<string, string> = {};
  const courseStyleMap: Record<string, number> = {};

  // First pass: extract raw chart data for each course and headers
  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    if (line.startsWith("COURSE:")) {
      currentCourse = line.substring(7).trim();
      const courseKey = currentCourse.toLowerCase();
      if (!courses[courseKey]) {
        courses[courseKey] = [];
        courseHeaders[courseKey] = {};
      }
      isParsingChart = false;
      currentPlayerSide = null;
    } else if (line.startsWith("#START")) {
      isParsingChart = true;
      // Check for player-side suffix (e.g., #START P1, #START P2)
      const suffix = line.substring(6).trim().toUpperCase();
      if (suffix && currentCourse) {
        currentPlayerSide = suffix.toLowerCase();
        const courseKey = currentCourse.toLowerCase();
        const sideKey = `${courseKey}__${currentPlayerSide}`;
        if (!courses[sideKey]) {
          courses[sideKey] = [];
          courseHeaders[sideKey] = { ...courseHeaders[courseKey], COURSE: currentCourse };
        }
      } else {
        currentPlayerSide = null;
      }
    } else if (line.startsWith("#END")) {
      isParsingChart = false;
      // Keep currentCourse if we were in a player-side block (P2 follows P1 under the same course)
      if (!currentPlayerSide) {
        currentCourse = null;
      }
      currentPlayerSide = null;
    } else if (isParsingChart && currentCourse) {
      // Remove comments
      const commentIndex: number = line.indexOf("//");
      if (commentIndex !== -1) {
        line = line.substring(0, commentIndex).trim();
      }

      if (line) {
        if (currentPlayerSide) {
          const sideKey = `${currentCourse.toLowerCase()}__${currentPlayerSide}`;
          courses[sideKey].push(line);
        } else {
          courses[currentCourse.toLowerCase()].push(line);
        }
      }
    } else if (!isParsingChart) {
      // Header parsing
      const parts = line.split(":");
      if (parts.length >= 2) {
        const key = parts[0].trim().toUpperCase();
        const val = parts.slice(1).join(":").trim(); // Handle colons in value

        // Track STYLE header for player-side detection
        if (key === "STYLE" && currentCourse) {
          const styleVal = val.toLowerCase();
          let styleNum = 1;
          if (styleVal === "2" || styleVal === "double" || styleVal === "couple") {
            styleNum = 2;
          } else if (!Number.isNaN(parseInt(styleVal, 10))) {
            styleNum = parseInt(styleVal, 10);
          }
          courseStyleMap[currentCourse.toLowerCase()] = styleNum;
        }

        if (currentCourse) {
          courseHeaders[currentCourse.toLowerCase()][key] = val;
        } else {
          globalHeader[key] = val;
        }
      }
    }
  }

  const parsedCourses: Record<string, ParsedChart> = {};

  for (const courseName in courses) {
    if (Object.hasOwn(courses, courseName)) {
      const courseData = courses[courseName];
      const headers = { ...globalHeader, ...courseHeaders[courseName] };

      // Metadata Extraction
      const title = headers.TITLEJA || headers.TITLE || "";
      const subtitle = headers.SUBTITLEJA || headers.SUBTITLE || "";
      const bpm = parseFloat(headers.BPM) || 120;
      const level = parseInt(headers.LEVEL, 10) || 0;
      const course = headers.COURSE || courseName;

      // Parse BALLOON counts
      let balloonCounts: number[] = [];
      const balloonStr = headers.BALLOON;
      if (balloonStr) {
        balloonCounts = balloonStr
          .split(/[,]+/)
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => !Number.isNaN(n));
      }

      // Buffers for parsing
      const normalBars: NoteType[][] = [];
      const normalParams: BarParams[] = [];
      const expertBars: NoteType[][] = [];
      const expertParams: BarParams[] = [];
      const masterBars: NoteType[][] = [];
      const masterParams: BarParams[] = [];

      const stateN = createInitialState(bpm);
      const stateE = createInitialState(bpm);
      const stateM = createInitialState(bpm);

      // Parsing helper
      const parseLines = (
        linesToParse: string[],
        bars: NoteType[][],
        params: BarParams[],
        state: ParserState,
        isBranched: boolean,
        markFirstAsBranchStart: boolean = false,
        branchStartParams?: BarParams["branchStartParams"],
      ) => {
        let barStartBpm = state.bpm;
        let barStartScroll = state.scroll;
        let barStartGogoTime = state.gogoTime;
        // Note: Measure ratio logic in TJA is tricky. Usually #MEASURE applies to the NEXT bar.
        // We use state.measureRatio as the ratio for the CURRENT accumulating bar.

        let isFirstBar = true;
        const reachable = isBranched ? calculateReachability(branchStartParams) : undefined;

        for (const line of linesToParse) {
          if (line.startsWith("#") || line.trim().toUpperCase().startsWith("EXAM")) {
            const upperLine = line.toUpperCase();
            if (upperLine.startsWith("#BPMCHANGE")) {
              const parts = line.split(/[:\s]+/);
              if (parts.length >= 2) {
                const val = parseFloat(parts[1]);
                if (!Number.isNaN(val)) {
                  state.bpm = val;
                  state.currentBarBpmChanges.push({ index: state.currentBarBuffer.length, bpm: val });
                }
              }
            } else if (upperLine.startsWith("#BPM:")) {
              // Handle incorrect usage
              const val = parseFloat(line.substring(5));
              if (!Number.isNaN(val)) {
                state.bpm = val;
                state.currentBarBpmChanges.push({ index: state.currentBarBuffer.length, bpm: val });
              }
            } else if (upperLine.startsWith("#SCROLL")) {
              const parts = line.split(/[:\s]+/);
              if (parts.length >= 2) {
                const val = parseFloat(parts[1]);
                if (!Number.isNaN(val)) {
                  state.scroll = val;
                  state.currentBarScrollChanges.push({ index: state.currentBarBuffer.length, scroll: val });
                }
              }
            } else if (upperLine.startsWith("#MEASURE")) {
              const parts = line.split(/[:\s]+/);
              if (parts.length >= 2) {
                const fraction = parts[1].split("/");
                if (fraction.length === 2) {
                  const num = parseFloat(fraction[0]);
                  const den = parseFloat(fraction[1]);
                  if (!Number.isNaN(num) && !Number.isNaN(den) && den !== 0) {
                    state.measureRatio = num / den;
                  }
                }
              }
            } else if (upperLine.startsWith("#GOGOSTART")) {
              state.gogoTime = true;
              state.currentBarGogoChanges.push({ index: state.currentBarBuffer.length, isGogo: true });
              if (state.currentBarBuffer.length === 0) barStartGogoTime = true;
            } else if (upperLine.startsWith("#GOGOEND")) {
              state.gogoTime = false;
              state.currentBarGogoChanges.push({ index: state.currentBarBuffer.length, isGogo: false });
              if (state.currentBarBuffer.length === 0) barStartGogoTime = false;
            } else if (upperLine.startsWith("#NEXTSONG")) {
              const argsStr = line.substring(9).trim();
              const args = splitArgs(argsStr);
              if (args.length >= 6) {
                const nextSong: NextSong = {
                  title: args[0],
                  subtitle: args[1],
                  genre: args[2],
                  wave: args[3],
                  scoreInit: parseInt(args[4], 10) || 0,
                  scoreDiff: parseInt(args[5], 10) || 0,
                };
                if (args.length > 6 && args[6]) nextSong.level = parseFloat(args[6]);
                if (args.length > 7 && args[7]) nextSong.course = args[7];
                if (args.length > 8 && args[8]) nextSong.hideTitle = args[8].toLowerCase() === "true";

                state.currentBarNextSongChanges.push({
                  index: state.currentBarBuffer.length,
                  nextSong: nextSong,
                });
              }
            }
            // Ignore other commands
            continue;
          }

          let tempLine = line;
          while (true) {
            const commaIdx = tempLine.indexOf(",");
            if (commaIdx === -1) {
              state.currentBarBuffer += tempLine;
              break;
            } else {
              const segment = tempLine.substring(0, commaIdx);
              state.currentBarBuffer += segment;

              const cleanedBar = state.currentBarBuffer.trim();
              if (cleanedBar.length === 0) {
                bars.push([]);
              } else {
                bars.push(cleanedBar.split("").map(toNoteType));
              }

              params.push({
                bpm: barStartBpm,
                scroll: barStartScroll,
                measureRatio: state.measureRatio,
                gogoTime: barStartGogoTime,
                isBranched: isBranched,
                isBranchStart: isBranched && markFirstAsBranchStart && isFirstBar,
                branchStartParams: isBranched && markFirstAsBranchStart && isFirstBar ? branchStartParams : undefined,
                reachableBranches: reachable,
                bpmChanges: state.currentBarBpmChanges.length > 0 ? [...state.currentBarBpmChanges] : undefined,
                scrollChanges:
                  state.currentBarScrollChanges.length > 0 ? [...state.currentBarScrollChanges] : undefined,
                gogoChanges: state.currentBarGogoChanges.length > 0 ? [...state.currentBarGogoChanges] : undefined,
                nextSongChanges:
                  state.currentBarNextSongChanges.length > 0 ? [...state.currentBarNextSongChanges] : undefined,
              });

              isFirstBar = false;

              barStartBpm = state.bpm;
              barStartScroll = state.scroll;
              barStartGogoTime = state.gogoTime;

              state.currentBarBpmChanges = [];
              state.currentBarScrollChanges = [];
              state.currentBarGogoChanges = [];
              state.currentBarNextSongChanges = [];
              state.currentBarBuffer = "";
              tempLine = tempLine.substring(commaIdx + 1);
            }
          }
        }
      };

      // Main Parse Loop
      let bufferCommon: string[] = [];
      let bufferN: string[] = [];
      let bufferE: string[] = [];
      let bufferM: string[] = [];
      let inBranch = false;
      let currentBranchTarget: "n" | "e" | "m" = "n";
      let hasSeenBranchStart = false; // To track if we should even create branch objects
      let lastBranchStartParams: BarParams["branchStartParams"];

      // Process line by line
      for (const line of courseData) {
        const upper = line.toUpperCase().trim();

        if (upper.startsWith("#BRANCHSTART")) {
          hasSeenBranchStart = true;

          // Flush Common to all
          if (bufferCommon.length > 0) {
            parseLines(bufferCommon, normalBars, normalParams, stateN, false);
            parseLines(bufferCommon, expertBars, expertParams, stateE, false);
            parseLines(bufferCommon, masterBars, masterParams, stateM, false);
            bufferCommon = [];
          }

          // Flush previous branch if implicitly ended
          if (inBranch) {
            const srcN = bufferN;
            const srcE = bufferE.length > 0 ? bufferE : srcN; // Fallback N
            const srcM = bufferM.length > 0 ? bufferM : srcE; // Fallback E

            parseLines(srcN, normalBars, normalParams, stateN, true, true, lastBranchStartParams);
            parseLines(srcE, expertBars, expertParams, stateE, true, true, lastBranchStartParams);
            parseLines(srcM, masterBars, masterParams, stateM, true, true, lastBranchStartParams);
          }

          // Parse params: #BRANCHSTART p, 65, 80
          const parts = line.split(/[, \s]+/);
          if (parts.length >= 4) {
            lastBranchStartParams = {
              type: parts[1].toLowerCase(),
              p1: parseFloat(parts[2]),
              p2: parseFloat(parts[3]),
            };
          } else {
            lastBranchStartParams = undefined;
          }

          inBranch = true;
          currentBranchTarget = "n";
          bufferN = [];
          bufferE = [];
          bufferM = [];
        } else if (upper.startsWith("#BRANCHEND")) {
          // Flush Branches
          const srcN = bufferN;
          const srcE = bufferE.length > 0 ? bufferE : srcN; // Fallback N
          const srcM = bufferM.length > 0 ? bufferM : srcE; // Fallback E

          parseLines(srcN, normalBars, normalParams, stateN, true, true, lastBranchStartParams);
          parseLines(srcE, expertBars, expertParams, stateE, true, true, lastBranchStartParams);
          parseLines(srcM, masterBars, masterParams, stateM, true, true, lastBranchStartParams);

          inBranch = false;
          bufferN = [];
          bufferE = [];
          bufferM = [];
        } else if (inBranch && upper === "#N") {
          currentBranchTarget = "n";
        } else if (inBranch && upper === "#E") {
          currentBranchTarget = "e";
        } else if (inBranch && upper === "#M") {
          currentBranchTarget = "m";
        } else {
          if (inBranch) {
            if (currentBranchTarget === "n") bufferN.push(line);
            else if (currentBranchTarget === "e") bufferE.push(line);
            else if (currentBranchTarget === "m") bufferM.push(line);
          } else {
            bufferCommon.push(line);
          }
        }
      }

      // Flush remaining
      if (inBranch) {
        // Implicit end of branch
        const srcN = bufferN;
        const srcE = bufferE.length > 0 ? bufferE : srcN;
        const srcM = bufferM.length > 0 ? bufferM : srcE;
        parseLines(srcN, normalBars, normalParams, stateN, true, true, lastBranchStartParams);
        parseLines(srcE, expertBars, expertParams, stateE, true, true, lastBranchStartParams);
        parseLines(srcM, masterBars, masterParams, stateM, true, true, lastBranchStartParams);
      } else if (bufferCommon.length > 0) {
        parseLines(bufferCommon, normalBars, normalParams, stateN, false);
        parseLines(bufferCommon, expertBars, expertParams, stateE, false);
        parseLines(bufferCommon, masterBars, masterParams, stateM, false);
      }

      // Create Charts
      const createChart = (bars: NoteType[][], params: BarParams[], type: BranchName): ParsedChart => {
        return {
          bars,
          barParams: params,
          loop: detectLoop(bars),
          balloonCounts,
          headers,
          title,
          subtitle,
          bpm,
          level,
          course,
          branchType: type,
        };
      };

      const normalChart = createChart(normalBars, normalParams, BranchName.Normal);

      if (hasSeenBranchStart) {
        normalChart.branches = {
          [BranchName.Normal]: normalChart,
          [BranchName.Expert]: createChart(expertBars, expertParams, BranchName.Expert),
          [BranchName.Master]: createChart(masterBars, masterParams, BranchName.Master),
        };
      }

      parsedCourses[courseName] = normalChart;
    }
  }

  // Assemble player-side charts: merge __p1/__p2 keys into their base course
  const sideKeyPattern = /^(.+)__([a-z0-9]+)$/;
  const baseCoursesSeen = new Set<string>();
  const sideKeysToRemove: string[] = [];

  for (const key of Object.keys(parsedCourses)) {
    const match = key.match(sideKeyPattern);
    if (match) {
      const baseCourse = match[1];
      baseCoursesSeen.add(baseCourse);
      sideKeysToRemove.push(key);
    }
  }

  for (const baseCourse of baseCoursesSeen) {
    const sides: Record<string, ParsedChart> = {};

    // If the base course has its own chart data (single-player version), include it as "single"
    const existingBase = parsedCourses[baseCourse];
    if (existingBase && existingBase.bars.length > 0) {
      sides.single = existingBase;
    }

    for (const key of Object.keys(parsedCourses)) {
      const match = key.match(sideKeyPattern);
      if (match && match[1] === baseCourse) {
        sides[match[2]] = parsedCourses[key];
      }
    }

    const sideNames = Object.keys(sides).sort();
    if (sideNames.length > 0) {
      // Default to "single" if it exists, otherwise first side (p1)
      const defaultSide = sides.single || sides[sideNames[0]];
      parsedCourses[baseCourse] = {
        ...defaultSide,
        playerSides: sides,
      };
    }
  }

  for (const key of sideKeysToRemove) {
    delete parsedCourses[key];
  }

  return parsedCourses;
}

function detectLoop(bars: NoteType[][]): LoopInfo | undefined {
  // 1. Identify start (first non-empty bar)
  let firstNonEmpty = -1;
  for (let i = 0; i < bars.length; i++) {
    if (!isBarEmpty(bars[i])) {
      firstNonEmpty = i;
      break;
    }
  }

  // If completely empty or no bars
  if (firstNonEmpty === -1) return undefined;

  const remainingLength = bars.length - firstNonEmpty;

  // Try period lengths
  for (let period = 1; period <= remainingLength / 2; period++) {
    // Define the pattern
    const pattern = bars.slice(firstNonEmpty, firstNonEmpty + period);

    // Check how many times this pattern repeats
    let iterations = 0;
    let currentIdx = firstNonEmpty;

    while (currentIdx + period <= bars.length) {
      // Check if the segment matches pattern
      let match = true;
      for (let k = 0; k < period; k++) {
        if (!areBarsEqual(bars[currentIdx + k], pattern[k])) {
          match = false;
          break;
        }
      }

      if (match) {
        iterations++;
        currentIdx += period;
      } else {
        break;
      }
    }

    // We need at least 2 iterations to call it a loop
    if (iterations >= 2) {
      // Verify that everything remaining after the loop is empty
      let remainingEmpty = true;
      for (let i = currentIdx; i < bars.length; i++) {
        if (!isBarEmpty(bars[i])) {
          remainingEmpty = false;
          break;
        }
      }

      if (remainingEmpty) {
        return {
          startBarIndex: firstNonEmpty,
          period: period,
          iterations: iterations,
        };
      }
    }
  }

  return undefined;
}

function isBarEmpty(bar: NoteType[]): boolean {
  if (bar.length === 0) return true;
  return bar.every((c) => c === NoteType.None);
}

function areBarsEqual(b1: NoteType[], b2: NoteType[]): boolean {
  if (b1.length !== b2.length) return false;
  for (let i = 0; i < b1.length; i++) {
    if (b1[i] !== b2[i]) return false;
  }
  return true;
}

function splitArgs(str: string): string[] {
  const result: string[] = [];
  let current = "";
  let isEscaped = false;

  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    if (isEscaped) {
      current += char;
      isEscaped = false;
    } else if (char === "\\") {
      isEscaped = true;
    } else if (char === ",") {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}
