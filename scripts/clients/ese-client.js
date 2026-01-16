export class EseClient {
    indexUrl = "ese_index.json";
    treeCache = null;
    async getTjaFiles() {
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
            const data = await response.json();
            this.treeCache = data;
            return this.treeCache;
        }
        catch (e) {
            console.error("Error fetching ESE index:", e);
            throw new Error("Failed to load song list.");
        }
    }
    async getFileContent(path) {
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
        }
        catch (e) {
            console.error("Error fetching file content:", e);
            throw new Error("Failed to load song content.");
        }
    }
}
