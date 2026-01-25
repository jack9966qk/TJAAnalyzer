import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ESE_DIR = path.join(__dirname, "public", "ese");
const OUTPUT_FILE = path.join(__dirname, "song_mapping.json");
const ENV_FILE = path.join(__dirname, ".env");

// CLI args
const args = process.argv.slice(2);
const USE_LLM = args.includes("--resolve-llm");
// Filter out flags to get positional args
const positionalArgs = args.filter((arg) => !arg.startsWith("--"));

if (positionalArgs.length === 0) {
  console.error("Error: Please provide the path to songs.json as an argument.");
  console.error("Usage: npm run generate-mapping <path/to/songs.json> [--resolve-llm]");
  process.exit(1);
}

const SONGS_JSON_PATH = path.resolve(process.cwd(), positionalArgs[0]);
const LLM_CONCURRENCY = 5;

interface Song {
  id: number;
  title: string;
  title_cn?: string;
  [key: string]: unknown;
}

interface TjaFile {
  relativePath: string;
  titleJa: string | null;
  title: string | null;
  subtitleJa: string | null;
  subtitle: string | null;
}

interface SongMappingEntry {
  esePath: string;
  title: string;
  titlecn?: string;
  candidates?: string[];
}

interface ProcessingItem {
  song: Song;
  candidates: { file: TjaFile; dist?: number }[];
  matchType: "exact" | "fuzzy" | "none";
  llmChoiceIndex?: number;
}

// Load env
let GEMINI_API_KEY: string | undefined = process.env.GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | undefined;

if (USE_LLM) {
  if (!GEMINI_API_KEY && fs.existsSync(ENV_FILE)) {
    const envContent = fs.readFileSync(ENV_FILE, "utf8");
    for (const line of envContent.split("\n")) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith("#")) {
        const [key, value] = trimmed.split("=");
        if (key.trim() === "GEMINI_API_KEY") {
          GEMINI_API_KEY = value ? value.trim() : undefined;
          break;
        }
      }
    }
  }
  if (!GEMINI_API_KEY) {
    console.error("Error: --resolve-llm flag provided but GEMINI_API_KEY not found in .env.");
    process.exit(1);
  } else {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
  }
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function resolveWithGemini(targetTitle: string, options: TjaFile[]): Promise<number> {
  if (!genAI) return -1; // Fallback

  const optionsText = options
    .map((opt, idx) => {
      const sub = opt.subtitleJa || opt.subtitle || "(none)";
      return `${idx + 1}. Path: ${opt.relativePath}, TitleJa: ${opt.titleJa || "(none)"}, Title: ${opt.title || "(none)"}, Subtitle: ${sub}`;
    })
    .join("\n");

  const prompt = `I am trying to map a song with target title "${targetTitle}" to a TJA file.
Here are the candidates:
${optionsText}

Select the best match. 
1. Choose original version over Nijisanji version if both exists.
2. Choose AC16 version over other versions if both exists.

Return ONLY the number of the choice (1-based index). If none of the candidates are a good match, return 0.
Only output the number, nothing else.`;

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();

    if (!text) return -1;

    const choice = parseInt(text, 10);
    if (!Number.isNaN(choice) && choice >= 0 && choice <= options.length) {
      return choice;
    }
  } catch (e) {
    console.error(`Error calling Gemini API for "${targetTitle}":`, e);
  }
  return -1;
}

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];

  let i: number;
  for (i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  let j: number;
  for (j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (i = 1; i <= b.length; i++) {
    for (j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
      }
    }
  }

  return matrix[b.length][a.length];
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getAllFiles(fullPath, arrayOfFiles);
    } else {
      if (file.toLowerCase().endsWith(".tja")) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

function extractMetadata(filePath: string): TjaFile {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  let title = null;
  let titleJa = null;
  let subtitle = null;
  let subtitleJa = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("TITLE:")) {
      title = trimmed.substring(6).trim();
    } else if (trimmed.startsWith("TITLEJA:")) {
      titleJa = trimmed.substring(8).trim();
    } else if (trimmed.startsWith("SUBTITLE:")) {
      subtitle = trimmed.substring(9).trim();
    } else if (trimmed.startsWith("SUBTITLEJA:")) {
      subtitleJa = trimmed.substring(11).trim();
    }

    if (title && titleJa && subtitle && subtitleJa) break;
  }

  const relativePath = path.relative(ESE_DIR, filePath);
  const normalizedPath = relativePath.split(path.sep).join("/");

  return {
    relativePath: normalizedPath,
    titleJa,
    title,
    subtitleJa,
    subtitle,
  };
}

async function main() {
  console.log(`Args: ${args.join(" ")}`);
  console.log("Step 1: Running fetch-ese...");
  try {
    execSync("npm run fetch-ese", { stdio: "inherit" });
  } catch (e) {
    console.error("Error running fetch-ese:", e);
    process.exit(1);
  }

  console.log(`Step 2: Reading songs.json from ${SONGS_JSON_PATH}...`);
  let songs: Song[] = [];
  try {
    const songsContent = fs.readFileSync(SONGS_JSON_PATH, "utf8");
    songs = JSON.parse(songsContent);
  } catch (e) {
    console.error("Error reading songs.json:", e);
    process.exit(1);
  }

  console.log("Step 3: Scanning TJA files in public/ese...");
  const tjaFilePaths = getAllFiles(ESE_DIR);
  console.log(`Found ${tjaFilePaths.length} TJA files.`);

  const tjaFiles: TjaFile[] = [];
  for (const p of tjaFilePaths) {
    tjaFiles.push(extractMetadata(p));
  }

  const mapping: Record<number, SongMappingEntry> = {};

  console.log("Step 4: identifying candidates for songs...");

  // Phase 1: Identify Candidates
  const processingItems: ProcessingItem[] = [];

  for (const song of songs) {
    const targetTitle = song.title;
    let candidates: { file: TjaFile; dist?: number }[] = [];
    let matchType: "exact" | "fuzzy" | "none" = "none";

    // Exact match on TITLEJA
    let matches = tjaFiles.filter((t) => t.titleJa === targetTitle);
    if (matches.length === 0) {
      // Fallback: Exact match on TITLE
      matches = tjaFiles.filter((t) => t.title === targetTitle);
    }

    if (matches.length > 0) {
      candidates = matches.map((m) => ({ file: m }));
      matchType = "exact";
    } else {
      // Fuzzy match
      const fuzzyCandidates = tjaFiles
        .map((t) => {
          const tJa = t.titleJa || "";
          let dist = 999;
          if (tJa) {
            if (tJa.includes(targetTitle) || targetTitle.includes(tJa)) {
              dist = 0.1;
            } else {
              dist = levenshtein(targetTitle, tJa);
            }
          }
          return { file: t, dist };
        })
        .filter((c) => c.dist <= Math.max(3, targetTitle.length * 0.4));

      fuzzyCandidates.sort((a, b) => (a.dist || 999) - (b.dist || 999));
      // Take top 5
      candidates = fuzzyCandidates.slice(0, 5);
      if (candidates.length > 0) {
        matchType = "fuzzy";
      }
    }

    processingItems.push({
      song,
      candidates,
      matchType,
    });
  }

  // Phase 2: Parallel LLM Resolution
  if (USE_LLM && genAI) {
    const itemsToResolve = processingItems.filter((item) => item.candidates.length > 1);
    console.log(
      `\nStarting Parallel LLM Resolution for ${itemsToResolve.length} items with ${LLM_CONCURRENCY} workers...`,
    );

    let processedCount = 0;
    let currentIndex = 0;

    const worker = async (_workerId: number) => {
      while (currentIndex < itemsToResolve.length) {
        const index = currentIndex++; // Atomic in JS single thread event loop
        const item = itemsToResolve[index];

        // console.log(`[Worker ${workerId}] Resolving "${item.song.title}"...`);
        const choice = await resolveWithGemini(
          item.song.title,
          item.candidates.map((c) => c.file),
        );
        item.llmChoiceIndex = choice;

        processedCount++;
        if (processedCount % 5 === 0 || processedCount === itemsToResolve.length) {
          process.stdout.write(`\rResolved ${processedCount}/${itemsToResolve.length}`);
        }
      }
    };

    const workers = Array(LLM_CONCURRENCY)
      .fill(null)
      .map((_, i) => worker(i + 1));
    await Promise.all(workers);
    console.log("\nLLM Resolution complete.");
  }

  // Phase 3: Finalize and Manual Fallback
  console.log("\nStep 5: Finalizing mappings...");

  for (const item of processingItems) {
    const { song, candidates, matchType, llmChoiceIndex } = item;
    const targetTitle = song.title;
    console.log(`\nProcessing Song ID ${song.id}: "${targetTitle}"`);

    let selectedPath: string | null = null;
    const candidatesList: string[] = candidates.map((c) => c.file.relativePath);

    if (matchType === "none") {
      console.log(`  No matches found.`);
    } else if (candidates.length === 1) {
      console.log(`  Found exact/unique match: ${candidates[0].file.relativePath}`);
      selectedPath = candidates[0].file.relativePath;
    } else {
      // Multiple candidates
      if (matchType === "exact") {
        console.log(`  Found ${candidates.length} exact matches.`);
      } else {
        console.log(`  Found fuzzy matches.`);
      }

      candidates.forEach((c, idx) => {
        const m = c.file;
        const sub = m.subtitleJa || m.subtitle || "";
        const distStr = c.dist !== undefined ? `, Dist: ${c.dist}` : "";
        console.log(`    [${idx + 1}] ${m.relativePath} (TitleJa: ${m.titleJa}${distStr}, Sub: ${sub})`);
      });
      console.log(`    [0] Skip / None of the above`);

      let idx = -1;

      if (llmChoiceIndex !== undefined && llmChoiceIndex !== -1) {
        console.log(`  Gemini previously selected: ${llmChoiceIndex}`);
        idx = llmChoiceIndex;
      }

      if (idx === -1) {
        while (true) {
          const answer = await askQuestion(`  Enter choice (0-${candidates.length}): `);
          idx = parseInt(answer, 10);
          if (!Number.isNaN(idx) && idx >= 0 && idx <= candidates.length) break;
        }
      }

      if (idx > 0) {
        selectedPath = candidates[idx - 1].file.relativePath;
      }
    }

    if (selectedPath) {
      const entry: SongMappingEntry = {
        esePath: selectedPath,
        title: song.title,
        candidates: candidatesList,
      };
      if (song.title_cn) {
        entry.titlecn = song.title_cn;
      }
      mapping[song.id] = entry;
      console.log(`  Mapped ${song.id} -> ${selectedPath}`);
    } else {
      console.log(`  Skipped Song ID ${song.id}.`);
    }
  }

  console.log("\nStep 6: Writing output...");
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2));
  console.log(`Done. Saved to ${OUTPUT_FILE}`);
  rl.close();
}

main();
