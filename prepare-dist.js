import fs from 'fs';
import path from 'path';

const destDir = 'app_package';

// Clean destination
if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir);

// Files/Dirs to copy
const files = [
    { src: 'www/index.html', dest: 'index.html' },
    { src: 'www/style.css', dest: 'style.css' },
    { src: 'www/icon_simple.png', dest: 'icon_simple.png' },
    { src: 'js_out', dest: 'js_out' },
    { src: 'icon.png', dest: 'icon.png' }
];

files.forEach(file => {
    const srcPath = path.resolve(file.src);
    const destPath = path.resolve(destDir, file.dest);
    
    if (fs.existsSync(srcPath)) {
        console.log(`Copying ${file.src} to ${destDir}...`);
        fs.cpSync(srcPath, destPath, { recursive: true });
    } else {
        console.warn(`Warning: Source file ${file.src} not found.`);
    }
});

console.log('Preparation complete.');
