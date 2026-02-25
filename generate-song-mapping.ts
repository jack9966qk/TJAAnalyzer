import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ESE_DIR = path.join(__dirname, "public", "ese");
const OUTPUT_FILE = path.join(__dirname, "data", "song_mapping.json");
const ENV_FILE = path.join(__dirname, ".env");

const TAIKO_RATING_ANALYZER_URL =
  "https://raw.githubusercontent.com/KirisameVanilla/taiko-rating-analyzer/refs/heads/main/public/songs.json";
const TAIKO_WIKI_DB_URL =
  "https://raw.githubusercontent.com/taikowiki/taiko-song-database/refs/heads/main/database.json";
const DONDER_HELPER_URL =
  "https://raw.githubusercontent.com/Donder-Helper/DonderHelper/refs/heads/main/Data/songs.json";

// CLI args
const args = process.argv.slice(2);
const USE_LLM = args.includes("--resolve-llm");
const FORCE_REGEN = args.includes("--force");

const LLM_CONCURRENCY = 5;

interface TaikoRatingAnalyzerSong {
  id: number;
  title: string;
  title_cn?: string;
  [key: string]: unknown;
}

interface TaikoWikiSong {
  songNo: string;
  title: string;
  titleKo?: string | null;
  artists?: string[];
  [key: string]: unknown;
}

interface DonderHelperSong {
  TitleList?: Record<string, string>;
  [key: string]: unknown;
}

type DonderHelperData = Record<string, DonderHelperSong>;

interface MergedSong {
  id: number;
  defaultTitle: string;
  titleList: Record<string, string>;
  subtitleList?: Record<string, string>;
  artist?: string;
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
  defaultTitle: string;
  titleList?: Record<string, string>;
  subtitleList?: Record<string, string>;
  artist?: string;
  candidates?: string[];
  matchType?: "exact" | "fuzzy" | "fuzzy + manual" | "fuzzy + llm";
}

interface ProcessingItem {
  song: MergedSong;
  candidates: { file: TjaFile; dist?: number }[];
  matchType: "exact" | "fuzzy" | "fuzzy + manual" | "fuzzy + llm" | "none";
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
1. Choose original version over Nijisanji version if multiple items exist, unless if the title strongly suggests the latter.
2. Choose AC16 version over other versions if multiple items exist.
3. Choose game version over other versions if multiple items exist.
4. Choose "new audio" version over other versions if multiple items exist.

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

  // Load existing mapping if available and not forced
  let existingMapping: Record<number, SongMappingEntry> = {};
  if (!FORCE_REGEN && fs.existsSync(OUTPUT_FILE)) {
    try {
      console.log(`Loading existing mapping from ${OUTPUT_FILE}...`);
      existingMapping = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    } catch (_e) {
      console.warn("Failed to load existing mapping, starting fresh.");
    }
  }

  console.log("Step 1: Running fetch-ese...");
  try {
    execSync("npm run fetch-ese", { stdio: "inherit" });
  } catch (e) {
    console.error("Error running fetch-ese:", e);
    process.exit(1);
  }

  console.log(`Step 2: Retrieving song data...`);
  let taikoRatingAnalyzerSongs: TaikoRatingAnalyzerSong[] = [];
  let taikoWikiSongs: TaikoWikiSong[] = [];
  let donderHelperData: DonderHelperData = {};

  try {
    console.log(`Fetching songs from ${TAIKO_RATING_ANALYZER_URL}...`);
    const songsResp = await fetch(TAIKO_RATING_ANALYZER_URL);
    if (!songsResp.ok) throw new Error(`Failed to fetch songs: ${songsResp.statusText}`);
    taikoRatingAnalyzerSongs = (await songsResp.json()) as TaikoRatingAnalyzerSong[];

    console.log(`Fetching database from ${TAIKO_WIKI_DB_URL}...`);
    const dbResp = await fetch(TAIKO_WIKI_DB_URL);
    if (!dbResp.ok) throw new Error(`Failed to fetch database: ${dbResp.statusText}`);
    taikoWikiSongs = (await dbResp.json()) as TaikoWikiSong[];

    console.log(`Fetching DonderHelper data from ${DONDER_HELPER_URL}...`);
    const dhResp = await fetch(DONDER_HELPER_URL);
    if (!dhResp.ok) throw new Error(`Failed to fetch DonderHelper data: ${dhResp.statusText}`);
    donderHelperData = (await dhResp.json()) as DonderHelperData;
  } catch (e) {
    console.error("Error fetching song data:", e);
    process.exit(1);
  }

  // Create map for DB songs
  const taikoWikiMap = new Map<string, TaikoWikiSong>();
  for (const dbSong of taikoWikiSongs) {
    taikoWikiMap.set(dbSong.songNo, dbSong);
  }

  const donderHelperValues = Object.values(donderHelperData);

  // Join
  const mergedSongs: MergedSong[] = taikoRatingAnalyzerSongs.map((src) => {
    const idStr = String(src.id);
    const dbSong = taikoWikiMap.get(idStr);
    const dhSong = donderHelperData[src.title] || donderHelperValues.find((d) => d.TitleList?.ja === src.title);

    // Prefer DB title if exists
    const defaultTitle = dbSong?.title || src.title;
    const artist = dbSong?.artists?.join(", ");

    const titleList: Record<string, string> = {};
    if (src.title) titleList.ja = src.title;
    if (src.title_cn) titleList["zh-CN"] = src.title_cn;

    if (dbSong?.title) titleList.ja = dbSong.title;
    if (typeof dbSong?.titleKo === "string") titleList.ko = dbSong.titleKo;
    if (typeof dbSong?.aliasKo === "string") titleList["ALIAS-ko"] = dbSong.aliasKo;
    if (typeof dbSong?.titleEn === "string") titleList["en-US"] = dbSong.titleEn;
    if (typeof dbSong?.aliasEn === "string") titleList["ALIAS-en"] = dbSong.aliasEn;

    if (dhSong?.TitleList) {
      Object.assign(titleList, dhSong.TitleList);
    }

    let subtitleList: Record<string, string> | undefined;
    const dhSubtitles = dhSong?.SubtitleList as Record<string, string> | undefined;
    if (dhSubtitles && Object.keys(dhSubtitles).length > 0) {
      subtitleList = dhSubtitles;
    }

    return {
      id: src.id,
      defaultTitle,
      titleList,
      subtitleList,
      artist,
    };
  });

  console.log(`Merged ${mergedSongs.length} songs.`);

  console.log("Step 3: Scanning TJA files in public/ese...");
  const tjaFilePaths = getAllFiles(ESE_DIR);
  console.log(`Found ${tjaFilePaths.length} TJA files.`);

  const tjaFiles: TjaFile[] = [];
  for (const p of tjaFilePaths) {
    tjaFiles.push(extractMetadata(p));
  }

  const mapping: Record<number, SongMappingEntry> = {};

  console.log("Step 4: identifying candidates for songs...");

  // Phase 1: Identify Candidates and separate existing vs new
  const itemsForResolution: ProcessingItem[] = [];

  for (const song of mergedSongs) {
    const targetTitle = song.defaultTitle;
    let candidates: { file: TjaFile; dist?: number }[] = [];
    let matchType: ProcessingItem["matchType"] = "none";

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

    const candidatesList = candidates.map((c) => c.file.relativePath);

    // Check if already exists in mapping
    const existing = existingMapping[song.id];

    if (existing) {
      // Incrementally update: Keep resolution, update metadata and candidates
      const newEntry: SongMappingEntry = {
        ...existing,
        defaultTitle: song.defaultTitle,
        artist: song.artist || existing.artist,
        candidates: candidatesList,
      };

      // Clean up old fields
      delete (newEntry as unknown as Record<string, unknown>).title;
      delete (newEntry as unknown as Record<string, unknown>).titlecn;
      delete (newEntry as unknown as Record<string, unknown>).titleko;

      if (Object.keys(song.titleList).length > 0) {
        newEntry.titleList = song.titleList;
      }
      if (song.subtitleList) {
        newEntry.subtitleList = song.subtitleList;
      }

      mapping[song.id] = newEntry;
      // We do NOT add this to itemsForResolution
    } else {
      // New song, needs resolution
      itemsForResolution.push({
        song,
        candidates,
        matchType,
      });
    }
  }

  // Phase 2: Parallel LLM Resolution
  if (USE_LLM && genAI) {
    const itemsToLLM = itemsForResolution.filter((item) => item.candidates.length > 1);
    console.log(
      `\nStarting Parallel LLM Resolution for ${itemsToLLM.length} new items with ${LLM_CONCURRENCY} workers...`,
    );

    let processedCount = 0;
    let currentIndex = 0;

    const worker = async (_workerId: number) => {
      while (currentIndex < itemsToLLM.length) {
        const index = currentIndex++; // Atomic in JS single thread event loop
        const item = itemsToLLM[index];

        const choice = await resolveWithGemini(
          item.song.defaultTitle,
          item.candidates.map((c) => c.file),
        );
        item.llmChoiceIndex = choice;

        processedCount++;
        if (processedCount % 5 === 0 || processedCount === itemsToLLM.length) {
          process.stdout.write(`\rResolved ${processedCount}/${itemsToLLM.length}`);
        }
      }
    };

    const workers = Array(LLM_CONCURRENCY)
      .fill(null)
      .map((_, i) => worker(i + 1));
    await Promise.all(workers);
    console.log("\nLLM Resolution complete.");
  }

  // Phase 3: Finalize and Manual Fallback for NEW items
  console.log("\nStep 5: Finalizing mappings for new items...");

  if (itemsForResolution.length === 0) {
    console.log("No new items to resolve.");
  }

  for (const item of itemsForResolution) {
    const { song, candidates, matchType, llmChoiceIndex } = item;
    const targetTitle = song.defaultTitle;
    console.log(`\nProcessing New Song ID ${song.id}: "${targetTitle}"`);

    let selectedPath: string | null = null;
    let finalMatchType: "exact" | "fuzzy" | "fuzzy + manual" | "fuzzy + llm" | undefined;
    const candidatesList: string[] = candidates.map((c) => c.file.relativePath);

    if (matchType === "none") {
      console.log(`  No matches found.`);
    } else if (candidates.length === 1) {
      console.log(`  Found exact/unique match: ${candidates[0].file.relativePath}`);
      selectedPath = candidates[0].file.relativePath;
      finalMatchType = matchType; // exact or fuzzy (if unique fuzzy)
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
        // If LLM selected it, we consider it LLM match unless user overrides?
        if (idx > 0) {
          finalMatchType = "fuzzy + llm";
        }
      }

      if (idx === -1) {
        while (true) {
          const answer = await askQuestion(`  Enter choice (0-${candidates.length}): `);
          idx = parseInt(answer, 10);
          if (!Number.isNaN(idx) && idx >= 0 && idx <= candidates.length) break;
        }
        if (idx > 0) {
          finalMatchType = "fuzzy + manual";
        }
      }

      if (idx > 0) {
        selectedPath = candidates[idx - 1].file.relativePath;
      }
    }

    if (selectedPath) {
      const entry: SongMappingEntry = {
        esePath: selectedPath,
        defaultTitle: song.defaultTitle,
        candidates: candidatesList,
        matchType: finalMatchType,
      };
      if (Object.keys(song.titleList).length > 0) {
        entry.titleList = song.titleList;
      }
      if (song.subtitleList) {
        entry.subtitleList = song.subtitleList;
      }
      if (song.artist) {
        entry.artist = song.artist;
      }

      mapping[song.id] = entry;
      console.log(`  Mapped ${song.id} -> ${selectedPath} (${finalMatchType})`);
    } else {
      console.log(`  Skipped Song ID ${song.id}.`);
    }
  }

  console.log("\nStep 6: Writing output...");
  // Ensure directory exists
  if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2));
  console.log(`Done. Saved to ${OUTPUT_FILE}`);
  rl.close();
}

main();
