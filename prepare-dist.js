import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const destDir = 'app_package';

// Clean destination
if (fs.existsSync(destDir)) {
    fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir);

// Generate Changelog
console.log('Generating changelog...');
try {
    const logOutput = execSync('git log -n 100 --pretty=format:"%h|%s|%ad" --date=short').toString();
    const changelog = logOutput.split('\n').filter(line => line).map(line => {
        const [hash, message, date] = line.split('|');
        return { hash, message, date };
    });
    fs.writeFileSync(path.join(destDir, 'changelog.json'), JSON.stringify(changelog, null, 2));
} catch (e) {
    console.warn('Failed to generate changelog:', e.message);
    fs.writeFileSync(path.join(destDir, 'changelog.json'), JSON.stringify([], null, 2));
}

// Files/Dirs to copy
const files = [
    { src: 'www/index.html', dest: 'index.html' },
    { src: 'www/style.css', dest: 'style.css' },
    { src: 'www/icon_simple.png', dest: 'icon_simple.png' },
    { src: 'www/ese', dest: 'ese' },
    { src: 'www/ese_index.json', dest: 'ese_index.json' },
    { src: 'www/CNAME', dest: 'CNAME' },
    { src: 'js_out/src', dest: 'js_out/src' },
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
