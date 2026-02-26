import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = "https://ese.tjadataba.se/api/v1";
const RAW_BASE = "https://ese.tjadataba.se/ESE/ESE/raw/branch/master";
const TARGET_DIR = path.join(__dirname, "public", "ese");
const INDEX_FILE = path.join(__dirname, "public", "ese_index.json");
const SONG_MAPPING_FILE = path.join(__dirname, "data", "song_mapping.json");

// Load song mapping and create a lookup by esePath
const songMappingByPath = {};
if (fs.existsSync(SONG_MAPPING_FILE)) {
  try {
    const songMappingData = JSON.parse(fs.readFileSync(SONG_MAPPING_FILE, "utf8"));
    for (const [_songNo, songInfo] of Object.entries(songMappingData)) {
      if (songInfo.esePath) {
        songMappingByPath[songInfo.esePath] = songInfo;
      }
    }
    console.log(`Loaded ${Object.keys(songMappingByPath).length} song mappings.`);
  } catch (e) {
    console.warn("Failed to load song_mapping.json:", e.message);
  }
}

// Ensure target directory exists
if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  return await response.json();
}

async function downloadFile(nodePath) {
  // Encode path components but keep slashes
  const encodedPath = nodePath.split("/").map(encodeURIComponent).join("/");
  const url = `${RAW_BASE}/${encodedPath}`;

  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  return await response.text(); // TJA files are text
}

function extractMetadata(content) {
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
      // Remove leading -- if present (common in TJA subtitles)
      if (subtitle.startsWith("--")) subtitle = subtitle.substring(2).trim();
    } else if (trimmed.startsWith("SUBTITLEJA:")) {
      subtitleJp = trimmed.substring(11).trim();
      if (subtitleJp.startsWith("--")) subtitleJp = subtitleJp.substring(2).trim();
    }

    if (title && titleJp && subtitle && subtitleJp) break; // Found all
    if (line.startsWith("#START")) break; // Stop at chart start
  }
  return { title, titleJp, subtitle, subtitleJp };
}

async function main() {
  try {
    console.log("Fetching file tree from API...");

    let allNodes = [];
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

    // Fetch commit info
    console.log("Fetching commit info...");
    let commitInfo = { sha: null, date: null };
    try {
      const branchData = await fetchJson(`${API_BASE}/repos/ESE/ESE/branches/master`);
      commitInfo = {
        sha: branchData.commit.id,
        date: branchData.commit.timestamp,
      };
      console.log(`Latest commit: ${commitInfo.sha} (${commitInfo.date})`);
    } catch (e) {
      console.warn("Failed to fetch commit info:", e.message);
    }

    // Load existing index to check for SHAs
    const existingIndex = {};
    if (fs.existsSync(INDEX_FILE)) {
      try {
        const raw = fs.readFileSync(INDEX_FILE, "utf8");
        const json = JSON.parse(raw);
        // Handle both old (array) and new (object) formats
        const files = Array.isArray(json) ? json : json.files || [];
        for (const item of files) {
          if (item.path && item.sha) {
            existingIndex[item.path] = item;
          }
        }
      } catch (e) {
        console.warn("Failed to read existing index, starting fresh.", e.message);
      }
    }

    const newIndex = [];
    let downloadCount = 0;
    let skipCount = 0;
    let processedCount = 0;

    // Track paths to identify deletions later
    const validPaths = new Set();

    for (const node of tjaNodes) {
      processedCount++;
      const progress = Math.round((processedCount / tjaNodes.length) * 100);
      const targetPath = path.join(TARGET_DIR, node.path);

      validPaths.add(targetPath);

      const isCached =
        existingIndex[node.path] && existingIndex[node.path].sha === node.sha && fs.existsSync(targetPath);

      let title = null;
      let titleJp = null;
      let subtitle = null;
      let subtitleJp = null;

      if (isCached) {
        skipCount++;
        // process.stdout.write(`\r[${progress}%] Skipping ${node.path}...`);
        // Always read from local file to ensure metadata is up to date with latest parsing logic
        try {
          const content = fs.readFileSync(targetPath, "utf8");
          const meta = extractMetadata(content);
          title = meta.title;
          titleJp = meta.titleJp;
          subtitle = meta.subtitle;
          subtitleJp = meta.subtitleJp;
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

          const meta = extractMetadata(content);
          title = meta.title;
          titleJp = meta.titleJp;
          subtitle = meta.subtitle;
          subtitleJp = meta.subtitleJp;
        } catch (err) {
          console.error(`\nError downloading ${node.path}:`, err.message);
          continue; // Don't add to index if failed
        }
      }

      const entry = {
        path: node.path,
        type: "blob",
        sha: node.sha,
        url: `ese/${node.path}`,
      };
      if (title) entry.title = title;
      if (titleJp) entry.titleJp = titleJp;
      if (subtitle) entry.subtitle = subtitle;
      if (subtitleJp) entry.subtitleJp = subtitleJp;

      // Add metadata from song mapping if available
      const songMapping = songMappingByPath[node.path];
      if (songMapping) {
        // Song mapping defaultTitle may differ from TJA's TITLEJA, include as official title
        if (songMapping.defaultTitle && songMapping.defaultTitle !== titleJp) {
          entry.titleOfficial = songMapping.defaultTitle;
        }
        if (songMapping.titleList) {
          if (songMapping.titleList["zh-CN"]) entry.titleCn = songMapping.titleList["zh-CN"];
          if (songMapping.titleList.ko) entry.titleKo = songMapping.titleList.ko;
        }
        if (songMapping.artist) entry.artist = songMapping.artist;
        if (songMapping.courses) entry.courses = songMapping.courses;
        if (songMapping.bpm) entry.bpm = songMapping.bpm;
        if (songMapping.platforms) entry.platforms = songMapping.platforms;
        if (songMapping.region) entry.region = songMapping.region;
        if (songMapping.dfcDifficulty) entry.dfcDifficulty = songMapping.dfcDifficulty;
      }

      newIndex.push(entry);
    }

    process.stdout.write("\n"); // Clear last progress line
    console.log(`Downloaded: ${downloadCount}, Skipped: ${skipCount}`);

    // Cleanup orphaned files
    console.log("Cleaning up orphaned files...");
    let removedCount = 0;

    // Helper to recursively walk dir
    function getAllFiles(dirPath, arrayOfFiles) {
      const files = fs.readdirSync(dirPath);
      arrayOfFiles = arrayOfFiles || [];

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
          // Delete any file that is not in the valid list
          fs.unlinkSync(file);
          removedCount++;
        }
      }
    }
    console.log(`Removed ${removedCount} orphaned files.`);

    console.log("Writing index...");
    const output = {
      commit: commitInfo,
      files: newIndex,
    };
    fs.writeFileSync(INDEX_FILE, JSON.stringify(output, null, 2));

    console.log("ESE assets update complete.");
  } catch (e) {
    console.error("\nFatal error:", e);
    process.exit(1);
  }
}

main();
