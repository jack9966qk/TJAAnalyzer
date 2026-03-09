import { startupLog } from "../utils/startup-log.js";

export interface CourseInfo {
  level: number;
  maxCombo?: number;
  url?: string;
  urlKo?: string;
}

export interface EseIndexEntry {
  path: string;
  type: "blob" | "tree";
  url: string; // Relative URL
  title?: string;
  titleJp?: string;
  titleOfficial?: string; // Official title from song mapping (may differ from TJA's TITLEJA)
  titleCn?: string;
  titleKo?: string;
  subtitle?: string;
  subtitleJp?: string;
  artist?: string;
  courses?: Partial<Record<"easy" | "normal" | "hard" | "oni" | "ura", CourseInfo>>;
  bpm?: { min: number; max: number };
  platforms?: string[];
  region?: Record<string, number>;
  dfcDifficulty?: Record<string, string>;
}

/**
 * Returns a string describing how the resource was served, based on
 * PerformanceResourceTiming entries. A transferSize of 0 indicates the response
 * came from a local cache (disk, memory, or service worker).
 */
function getCacheStatus(url: string): string {
  const entries = performance.getEntriesByName(url, "resource") as PerformanceResourceTiming[];
  if (entries.length === 0) return "unknown (no perf entry)";
  const entry = entries[entries.length - 1];
  if (entry.transferSize === 0) {
    // workerStart > 0 means the request was intercepted by a service worker
    if (entry.workerStart > 0) return "service worker cache (SW intercepted, no transfer)";
    return "local cache (disk/memory, no transfer)";
  }
  if (entry.workerStart > 0) return `network via SW (${entry.transferSize}B transferred)`;
  return `network (${entry.transferSize}B transferred)`;
}

export class EseClient {
  private indexUrl = "ese_index.json";
  private treeCache: EseIndexEntry[] | null = null;

  async getTjaFiles(): Promise<EseIndexEntry[]> {
    if (this.treeCache) {
      startupLog.record("ESE index: returning memory cache");
      return this.treeCache;
    }

    startupLog.record("ESE index: fetch start", this.indexUrl);
    try {
      const response = await fetch(this.indexUrl);
      const cacheStatus = getCacheStatus(new URL(this.indexUrl, location.href).href);
      if (!response.ok) {
        // If the index file is missing, it might mean the build step didn't run or failed.
        // Or we are in a dev mode where it wasn't generated.
        if (response.status === 404) {
          startupLog.record("ESE index: not found (404), returning empty list");
          console.warn("ese_index.json not found. Returning empty list.");
          return [];
        }
        throw new Error(`Failed to fetch ESE index: ${response.status} ${response.statusText}`);
      }
      let result: EseIndexEntry[];
      const data: unknown = await response.json();
      if (Array.isArray(data)) {
        result = data as EseIndexEntry[];
      } else if (
        typeof data === "object" &&
        data !== null &&
        "files" in data &&
        Array.isArray((data as { files: unknown }).files)
      ) {
        result = (data as { files: EseIndexEntry[] }).files;
      } else {
        result = [];
      }
      this.treeCache = result;
      startupLog.record("ESE index: loaded", `${result.length} entries, source: ${cacheStatus}`);
      return result;
    } catch (e) {
      startupLog.record("ESE index: fetch error", String(e));
      console.error("Error fetching ESE index:", e);
      throw new Error("Failed to load song list.");
    }
  }

  async getFileContent(path: string): Promise<string> {
    try {
      // Path is like "Category/Song.tja"
      // We serve files under "ese/"
      const encodedPath = path
        .split("/")
        .map((p) => encodeURIComponent(p).replace(/%2B/g, "+"))
        .join("/");
      const url = `ese/${encodedPath}`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      return await response.text();
    } catch (e) {
      console.error("Error fetching file content:", e);
      throw new Error("Failed to load song content.");
    }
  }
}
