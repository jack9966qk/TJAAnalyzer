import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { fileURLToPath } from "node:url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { buildLookupMaps, fetchExternalSongData } from "./fetch-external-data.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = "https://ese.tjadataba.se/api/v1";
const RAW_BASE = "https://ese.tjadataba.se/ESE/ESE/raw/branch/master";
const TARGET_DIR = path.join(__dirname, "public", "ese");
const OUTPUT_FILE = path.join(__dirname, "data", "song_mapping.json");
const EXTERNAL_DIR = path.join(__dirname, "data", "external");
const TJA_CACHE_FILE = path.join(EXTERNAL_DIR, "tja_cache.json");
const ENV_FILE = path.join(__dirname, ".env");

// CLI args
const args = process.argv.slice(2);
const USE_LLM = args.includes("--resolve-llm");

const LLM_CONCURRENCY = 5;

interface MergedSong {
  id: number;
  defaultTitle: string;
  titleList: Record<string, string>;
  subtitleList?: Record<string, string>;
  artist?: string;
}

interface TjaFile {
  relativePath: string;
  sha: string;
  titleJa: string | null;
  title: string | null;
  subtitleJa: string | null;
  subtitle: string | null;
}

export interface SongMappingEntry {
  esePath: string;
  defaultTitle: string;
  candidates?: string[];
  matchType?: "exact" | "fuzzy" | "fuzzy + manual" | "fuzzy + llm";
}

interface ProcessingItem {
  song: MergedSong;
  candidates: { file: TjaFile; dist?: number }[];
  matchType: "exact" | "fuzzy" | "fuzzy + manual" | "fuzzy + llm" | "none";
  llmChoiceIndex?: number;
}

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
  if (!genAI) return -1;

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
  for (i = 0; i <= b.length; i++) matrix[i] = [i];
  let j: number;
  for (j = 0; j <= a.length; j++) matrix[0][j] = j;
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

async function fetchJson(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  return await response.json();
}

async function downloadFile(nodePath: string) {
  const encodedPath = nodePath.split("/").map(encodeURIComponent).join("/");
  const url = `${RAW_BASE}/${encodedPath}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  return await response.text();
}

function extractMetadata(content: string) {
  const lines = content.split(/\r?\n/);
  let title = null;
  let titleJp = null;
  let subtitle = null;
  let subtitleJp = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("TITLE:")) {
      title = trimmed.substring(6).trim();
    } else if (trimmed.startsWith("TITLEJA:")) {
      titleJp = trimmed.substring(8).trim();
    } else if (trimmed.startsWith("SUBTITLE:")) {
      subtitle = trimmed.substring(9).trim();
      if (subtitle.startsWith("--")) subtitle = subtitle.substring(2).trim();
    } else if (trimmed.startsWith("SUBTITLEJA:")) {
      subtitleJp = trimmed.substring(11).trim();
      if (subtitleJp.startsWith("--")) subtitleJp = subtitleJp.substring(2).trim();
    }

    if (title && titleJp && subtitle && subtitleJp) break;
    if (line.startsWith("#START")) break;
  }
  return { title, titleJp, subtitle, subtitleJp };
}

async function syncTjaFiles(): Promise<{
  files: TjaFile[];
  commitInfo: { sha: string | null; date: string | null };
}> {
  if (!fs.existsSync(TARGET_DIR)) {
    fs.mkdirSync(TARGET_DIR, { recursive: true });
  }

  console.log("Fetching file tree from API...");
  let allNodes: { path: string; type: string; sha: string; url: string }[] = [];
  let page = 1;
  let totalCount = 0;

  while (true) {
    process.stdout.write(`\rFetching tree page ${page}...`);
    const treeUrl = `${API_BASE}/repos/ESE/ESE/git/trees/master?recursive=1&page=${page}`;
    const data = await fetchJson(treeUrl);

    allNodes = allNodes.concat(data.tree);
    totalCount = data.total_count;

    if (allNodes.length >= totalCount || data.tree.length === 0) {
      break;
    }
    page++;
  }
  console.log(`\nFetched ${allNodes.length} entries (Total: ${totalCount})`);

  const tjaNodes = allNodes.filter((node) => node.type === "blob" && node.path.toLowerCase().endsWith(".tja"));
  console.log(`Found ${tjaNodes.length} TJA files.`);

  console.log("Fetching commit info...");
  let commitInfo = { sha: null, date: null };
  try {
    const branchData = await fetchJson(`${API_BASE}/repos/ESE/ESE/branches/master`);
    commitInfo = {
      sha: branchData.commit.id,
      date: branchData.commit.timestamp,
    };
    console.log(`Latest commit: ${commitInfo.sha} (${commitInfo.date})`);
  } catch (e: unknown) {
    console.warn("Failed to fetch commit info:", e instanceof Error ? e.message : String(e));
  }

  let existingCache: Record<string, TjaFile> = {};
  if (fs.existsSync(TJA_CACHE_FILE)) {
    try {
      const raw = fs.readFileSync(TJA_CACHE_FILE, "utf8");
      existingCache = JSON.parse(raw);
    } catch (_e) {
      console.warn("Failed to read existing TJA cache, starting fresh.");
    }
  }

  const newFiles: TjaFile[] = [];
  const validPaths = new Set<string>();
  let downloadCount = 0;
  let skipCount = 0;
  let processedCount = 0;

  for (const node of tjaNodes) {
    processedCount++;
    const progress = Math.round((processedCount / tjaNodes.length) * 100);
    const targetPath = path.join(TARGET_DIR, node.path);
    validPaths.add(targetPath);

    const isCached = existingCache[node.path] && existingCache[node.path].sha === node.sha && fs.existsSync(targetPath);

    let tjaMeta = {
      title: null as string | null,
      titleJp: null as string | null,
      subtitle: null as string | null,
      subtitleJp: null as string | null,
    };

    if (isCached) {
      skipCount++;
      // We still read from disk to ensure metadata extraction is fully up to date with the script logic
      try {
        const content = fs.readFileSync(targetPath, "utf8");
        tjaMeta = extractMetadata(content);
      } catch (_e) {
        console.warn(`Failed to read local file for metadata: ${targetPath}`);
      }
    } else {
      downloadCount++;
      process.stdout.write(`\r[${progress}%] Downloading ${node.path}...`);
      try {
        const content = await downloadFile(node.path);
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, content);
        tjaMeta = extractMetadata(content);
      } catch (err: unknown) {
        console.error(`\nError downloading ${node.path}:`, err instanceof Error ? err.message : String(err));
        continue;
      }
    }

    newFiles.push({
      relativePath: node.path,
      sha: node.sha,
      title: tjaMeta.title,
      titleJa: tjaMeta.titleJp,
      subtitle: tjaMeta.subtitle,
      subtitleJa: tjaMeta.subtitleJp,
    });
  }

  process.stdout.write("\n");
  console.log(`Downloaded: ${downloadCount}, Skipped: ${skipCount}`);

  console.log("Cleaning up orphaned files...");
  let removedCount = 0;

  function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);
    files.forEach((file) => {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    });
    return arrayOfFiles;
  }

  if (fs.existsSync(TARGET_DIR)) {
    const currentFiles = getAllFiles(TARGET_DIR);
    for (const file of currentFiles) {
      if (!validPaths.has(file)) {
        fs.unlinkSync(file);
        removedCount++;
      }
    }
  }
  console.log(`Removed ${removedCount} orphaned files.`);

  // Save cache
  const cacheMap: Record<string, TjaFile> = {};
  for (const f of newFiles) {
    cacheMap[f.relativePath] = f;
  }
  if (!fs.existsSync(EXTERNAL_DIR)) {
    fs.mkdirSync(EXTERNAL_DIR, { recursive: true });
  }
  fs.writeFileSync(TJA_CACHE_FILE, JSON.stringify(cacheMap, null, 2));

  return { files: newFiles, commitInfo };
}

async function main() {
  console.log(`Step 1: Syncing TJA Files from ESE...`);
  const { files: tjaFiles, commitInfo } = await syncTjaFiles();

  // Save commit info to external cache for build
  fs.writeFileSync(path.join(EXTERNAL_DIR, "ese_commit.json"), JSON.stringify(commitInfo, null, 2));

  console.log(`Step 2: Retrieving song databases...`);
  const externalData = await fetchExternalSongData(true);
  const { taikoRatingAnalyzerSongs, donderHelperData } = externalData;
  const { taikoWikiMap, donderHelperValues } = buildLookupMaps(externalData);

  const mergedSongs: MergedSong[] = taikoRatingAnalyzerSongs.map((src) => {
    const idStr = String(src.id);
    const dbSong = taikoWikiMap.get(idStr);
    const dhSong = donderHelperData[src.title] || donderHelperValues.find((d) => d.TitleList?.ja === src.title);

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

  let existingMapping: Record<number, SongMappingEntry> = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      existingMapping = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
    } catch (_e) {}
  }

  console.log("Step 3: identifying candidates for songs...");
  const itemsForResolution: ProcessingItem[] = [];
  const mapping: Record<number, SongMappingEntry> = {};

  for (const song of mergedSongs) {
    const targetTitle = song.defaultTitle;
    let candidates: { file: TjaFile; dist?: number }[] = [];
    let matchType: ProcessingItem["matchType"] = "none";

    let matches = tjaFiles.filter((t) => t.titleJa === targetTitle);
    if (matches.length === 0) {
      matches = tjaFiles.filter((t) => t.title === targetTitle);
    }

    if (matches.length > 0) {
      candidates = matches.map((m) => ({ file: m }));
      matchType = "exact";
    } else {
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
      candidates = fuzzyCandidates.slice(0, 5);
      if (candidates.length > 0) matchType = "fuzzy";
    }

    const candidatesList = candidates.map((c) => c.file.relativePath);
    const existing = existingMapping[song.id];

    if (existing) {
      const newEntry: SongMappingEntry = {
        esePath: existing.esePath,
        defaultTitle: song.defaultTitle,
        candidates: candidatesList,
        matchType: existing.matchType,
      };
      mapping[song.id] = newEntry;
    } else {
      itemsForResolution.push({
        song,
        candidates,
        matchType,
      });
    }
  }

  if (USE_LLM && genAI) {
    const itemsToLLM = itemsForResolution.filter((item) => item.candidates.length > 1);
    console.log(
      `\nStarting Parallel LLM Resolution for ${itemsToLLM.length} new items with ${LLM_CONCURRENCY} workers...`,
    );

    let processedCount = 0;
    let currentIndex = 0;

    const worker = async (_workerId: number) => {
      while (currentIndex < itemsToLLM.length) {
        const index = currentIndex++;
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

  console.log("\nStep 4: Finalizing mappings for new items...");
  for (const item of itemsForResolution) {
    const { song, candidates, matchType, llmChoiceIndex } = item;
    const targetTitle = song.defaultTitle;
    console.log(`\nProcessing New Song ID ${song.id}: "${targetTitle}"`);

    let selectedPath: string | null = null;
    let finalMatchType: "exact" | "fuzzy" | "fuzzy + manual" | "fuzzy + llm" | undefined;

    if (matchType === "none") {
      console.log(`  No matches found.`);
    } else if (candidates.length === 1) {
      console.log(`  Found exact/unique match: ${candidates[0].file.relativePath}`);
      selectedPath = candidates[0].file.relativePath;
      finalMatchType = matchType;
    } else {
      candidates.forEach((c, idx) => {
        const m = c.file;
        const sub = m.subtitleJa || m.subtitle || "";
        console.log(`    [${idx + 1}] ${m.relativePath} (TitleJa: ${m.titleJa}, Sub: ${sub})`);
      });
      console.log(`    [0] Skip / None of the above`);

      let idx = -1;
      if (llmChoiceIndex !== undefined && llmChoiceIndex !== -1) {
        console.log(`  Gemini previously selected: ${llmChoiceIndex}`);
        idx = llmChoiceIndex;
        if (idx > 0) finalMatchType = "fuzzy + llm";
      }

      if (idx === -1) {
        while (true) {
          const answer = await askQuestion(`  Enter choice (0-${candidates.length}): `);
          idx = parseInt(answer, 10);
          if (!Number.isNaN(idx) && idx >= 0 && idx <= candidates.length) break;
        }
        if (idx > 0) finalMatchType = "fuzzy + manual";
      }

      if (idx > 0) {
        selectedPath = candidates[idx - 1].file.relativePath;
      }
    }

    if (selectedPath) {
      mapping[song.id] = {
        esePath: selectedPath,
        defaultTitle: song.defaultTitle,
        candidates: candidates.map((c) => c.file.relativePath),
        matchType: finalMatchType,
      };
      console.log(`  Mapped ${song.id} -> ${selectedPath} (${finalMatchType})`);
    } else {
      console.log(`  Skipped Song ID ${song.id}.`);
    }
  }

  console.log("\nStep 5: Writing output...");
  if (!fs.existsSync(path.dirname(OUTPUT_FILE))) {
    fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  }
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(mapping, null, 2));
  console.log(`Done. Saved to ${OUTPUT_FILE}`);
  rl.close();
}

main();
