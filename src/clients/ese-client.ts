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

export class EseClient {
  private indexUrl = "ese_index.json";
  private treeCache: EseIndexEntry[] | null = null;

  async getTjaFiles(): Promise<EseIndexEntry[]> {
    if (this.treeCache) {
      return this.treeCache;
    }

    try {
      const response = await fetch(this.indexUrl);
      if (!response.ok) {
        // If the index file is missing, it might mean the build step didn't run or failed.
        // Or we are in a dev mode where it wasn't generated.
        if (response.status === 404) {
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
      return result;
    } catch (e) {
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
