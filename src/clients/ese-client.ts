export interface GitNode {
  path: string;
  type: "blob" | "tree";
  url: string; // Relative URL
  title?: string;
  titleJp?: string;
}

export class EseClient {
  private indexUrl = "ese_index.json";
  private treeCache: GitNode[] | null = null;

  async getTjaFiles(): Promise<GitNode[]> {
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
      let result: GitNode[];
      const data: unknown = await response.json();
      if (Array.isArray(data)) {
        result = data as GitNode[];
      } else if (
        typeof data === "object" &&
        data !== null &&
        "files" in data &&
        Array.isArray((data as { files: unknown }).files)
      ) {
        result = (data as { files: GitNode[] }).files;
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
      const encodedPath = path.split("/").map(encodeURIComponent).join("/");
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
