import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const destDir = "dist";

// Clean destination
if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}
fs.mkdirSync(destDir);

// Generate Changelog
console.log("Generating changelog...");
try {
  const logOutput = execSync('git log -n 100 --pretty=format:"%h|%s|%ad" --date=short').toString();
  const changelog = logOutput
    .split("\n")
    .filter((line) => line)
    .map((line) => {
      const [hash, message, date] = line.split("|");
      return { hash, message, date };
    });
  fs.writeFileSync(path.join(destDir, "changelog.json"), JSON.stringify(changelog, null, 2));
} catch (e) {
  console.warn("Failed to generate changelog:", e.message);
  fs.writeFileSync(path.join(destDir, "changelog.json"), JSON.stringify([], null, 2));
}

// Generate Version
try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf-8"));
  fs.writeFileSync(path.join(destDir, "version.json"), JSON.stringify({ version: packageJson.version }, null, 2));
} catch (e) {
  console.warn("Failed to generate version.json:", e.message);
  fs.writeFileSync(path.join(destDir, "version.json"), JSON.stringify({ version: "unknown" }, null, 2));
}

// Create .nojekyll to bypass Jekyll processing
fs.writeFileSync(path.join(destDir, ".nojekyll"), "");

// Files/Dirs to copy
const files = [
  { src: "public/index.html", dest: "index.html" },
  { src: "public/chart-only.html", dest: "chart-only.html" },
  { src: "public/note-stats-test.html", dest: "note-stats-test.html" },
  { src: "public/style.css", dest: "style.css" },
  { src: "public/icon_simple.png", dest: "icon_simple.png" },
  { src: "public/ese", dest: "ese" },
  { src: "public/ese_index.json", dest: "ese_index.json" },
  { src: "public/CNAME", dest: "CNAME" },
  { src: "ts_output/src", dest: "scripts" },
  { src: "src/components/judgement-options.html", dest: "scripts/components/judgement-options.html" },
  { src: "src/components/select-options.html", dest: "scripts/components/select-options.html" },
  { src: "src/components/annotate-options.html", dest: "scripts/components/annotate-options.html" },
  { src: "icon.png", dest: "icon.png" },
];

files.forEach((file) => {
  const srcPath = path.resolve(file.src);
  const destPath = path.resolve(destDir, file.dest);

  if (fs.existsSync(srcPath)) {
    console.log(`Copying ${file.src} to ${destDir}...`);
    fs.cpSync(srcPath, destPath, { recursive: true });
  } else {
    console.warn(`Warning: Source file ${file.src} not found.`);
  }
});

console.log("Preparation complete.");
