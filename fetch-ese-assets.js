import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_BASE = 'https://ese.tjadataba.se/api/v1';
const RAW_BASE = 'https://ese.tjadataba.se/ESE/ESE/raw/branch/master';
const TARGET_DIR = path.join(__dirname, 'www', 'ese');
const INDEX_FILE = path.join(__dirname, 'www', 'ese_index.json');

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
    const encodedPath = nodePath.split('/').map(encodeURIComponent).join('/');
    const url = `${RAW_BASE}/${encodedPath}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
    return await response.text(); // TJA files are text
}

async function main() {
    try {
        console.log('Fetching file tree from API...');
        
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

        const tjaNodes = allNodes.filter(node => 
            node.type === 'blob' && node.path.toLowerCase().endsWith('.tja')
        );

        console.log(`Found ${tjaNodes.length} TJA files.`);

        // Load existing index to check for SHAs
        let existingIndex = {};
        if (fs.existsSync(INDEX_FILE)) {
            try {
                const raw = fs.readFileSync(INDEX_FILE, 'utf8');
                const json = JSON.parse(raw);
                for (const item of json) {
                    if (item.path && item.sha) {
                        existingIndex[item.path] = item.sha;
                    }
                }
            } catch (e) {
                console.warn('Failed to read existing index, starting fresh.', e.message);
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

            const isCached = existingIndex[node.path] === node.sha && fs.existsSync(targetPath);

            if (isCached) {
                skipCount++;
                // process.stdout.write(`\r[${progress}%] Skipping ${node.path}...`); 
            } else {
                downloadCount++;
                process.stdout.write(`\r[${progress}%] Downloading ${node.path}...`);
                
                try {
                    const content = await downloadFile(node.path);
                    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
                    fs.writeFileSync(targetPath, content);
                } catch (err) {
                    console.error(`\nError downloading ${node.path}:`, err.message);
                    continue; // Don't add to index if failed
                }
            }

            newIndex.push({
                path: node.path,
                type: 'blob',
                sha: node.sha,
                url: `ese/${node.path}`
            });
        }
        
        process.stdout.write('\n'); // Clear last progress line
        console.log(`Downloaded: ${downloadCount}, Skipped: ${skipCount}`);

        // Cleanup orphaned files
        console.log('Cleaning up orphaned files...');
        let removedCount = 0;
        
        // Helper to recursively walk dir
        function getAllFiles(dirPath, arrayOfFiles) {
            const files = fs.readdirSync(dirPath);
            arrayOfFiles = arrayOfFiles || [];
        
            files.forEach(function(file) {
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
                    // Only delete if it looks like a TJA file we manage (optional safety)
                    // But for now, we manage the whole 'ese' folder, so safe to delete.
                    fs.unlinkSync(file);
                    removedCount++;
                }
            }
        }
        console.log(`Removed ${removedCount} orphaned files.`);

        // Clean empty directories
        // (Simple implementation: attempt to rmdir empty parents. 
        //  A full cleanup might need bottom-up traversal. Skipping for simplicity unless requested.)

        console.log('Writing index...');
        fs.writeFileSync(INDEX_FILE, JSON.stringify(newIndex, null, 2));

        console.log('ESE assets update complete.');

    } catch (e) {
        console.error('\nFatal error:', e);
        process.exit(1);
    }
}

main();
