import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const CONFIG_FILE = "neutralino.config.json";
const BUILD_SCRIPTS_DIR = "neutralino-build-scripts";
const PATCH_FILE = "neutralino-build-scripts.patch";
const REPO_URL = "https://github.com/hschneider/neutralino-build-scripts.git";
const COMMIT_HASH = "ececd00d5fcbc78b83947db8fbab4a4b628ffd13";

function run(cmd, options = {}) {
  console.log(`> ${cmd}`);
  try {
    execSync(cmd, { stdio: "inherit", ...options });
  } catch (_e) {
    if (options.ignoreError) {
      console.warn(`Command failed (ignored): ${cmd}`);
      return;
    }
    console.error(`Command failed: ${cmd}`);
    process.exit(1);
  }
}

function getJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function replaceInFile(filePath, replacements) {
  let content = fs.readFileSync(filePath, "utf8");
  for (const [key, value] of Object.entries(replacements)) {
    content = content.replaceAll(key, value);
  }
  fs.writeFileSync(filePath, content);
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function setupBuildScripts() {
  if (!fs.existsSync(BUILD_SCRIPTS_DIR)) {
    console.log(`Cloning ${REPO_URL}...`);
    run(`git clone "${REPO_URL}" "${BUILD_SCRIPTS_DIR}"`);
    run(`git checkout "${COMMIT_HASH}"`, { cwd: BUILD_SCRIPTS_DIR });
  } else {
    console.log(`${BUILD_SCRIPTS_DIR} already exists. Resetting...`);
    run(`git fetch origin`, { cwd: BUILD_SCRIPTS_DIR });
    run(`git checkout "${COMMIT_HASH}"`, { cwd: BUILD_SCRIPTS_DIR });
  }

  console.log("Applying patch...");
  run(`git reset --hard "${COMMIT_HASH}"`, { cwd: BUILD_SCRIPTS_DIR });
  run(`git apply "../${PATCH_FILE}"`, { cwd: BUILD_SCRIPTS_DIR });
}

function buildWin(config) {
  if (!config.buildScript?.win) return;

  const winConfig = config.buildScript.win;
  const archs = winConfig.architecture;
  const binaryName = config.cli.binaryName;
  let appName = winConfig.appName;
  const appIcon = winConfig.appIcon;
  const distPath = config.cli.distributionPath || "dist";

  if (!appName.endsWith(".exe")) {
    appName += ".exe";
  }

  const appSrc = path.join(BUILD_SCRIPTS_DIR, "_app_scaffolds/win");

  for (const arch of archs) {
    const appDst = path.join(distPath, `win_${arch}`);
    const exePath = path.join(distPath, binaryName, `${binaryName}-win_${arch}.exe`);
    const resPath = path.join(distPath, binaryName, "resources.neu");
    const extPath = path.join(distPath, binaryName, "extensions");

    console.log(`
Building Windows App Bundle (${arch})...`);
    console.log(`  Target: ${appDst}`);

    if (!fs.existsSync(exePath)) {
      console.error(`ERROR: Binary not found: ${exePath}`);
      process.exit(1);
    }
    if (!fs.existsSync(resPath)) {
      console.error(`ERROR: Resources not found: ${resPath}`);
      process.exit(1);
    }

    if (fs.existsSync(appDst)) {
      fs.rmSync(appDst, { recursive: true, force: true });
    }
    fs.mkdirSync(appDst, { recursive: true });

    if (fs.existsSync(appIcon)) {
      console.log("  Cloning scaffold...");
      copyDir(appSrc, appDst);

      const installIconCmd = path.join(appDst, "install-icon.cmd");
      if (fs.existsSync(installIconCmd)) {
        replaceInFile(installIconCmd, {
          "{APP_NAME}": appName,
          "{APP_ICON}": appIcon,
        });
      }
    }

    console.log("  Copying content...");
    fs.copyFileSync(exePath, path.join(appDst, appName));
    fs.copyFileSync(resPath, path.join(appDst, "resources.neu"));

    if (fs.existsSync(extPath)) {
      copyDir(extPath, path.join(appDst, "extensions"));
    }

    if (fs.existsSync(appIcon)) {
      fs.copyFileSync(appIcon, path.join(appDst, path.basename(appIcon)));
    }

    console.log("  Done.");
  }
}

function buildLinux(config) {
  if (!config.buildScript?.linux) return;

  const linuxConfig = config.buildScript.linux;
  const archs = linuxConfig.architecture;
  const binaryName = config.cli.binaryName;
  const appName = linuxConfig.appName;
  const appIcon = linuxConfig.appIcon;
  const distPath = config.cli.distributionPath || "dist";

  // Defaults if missing
  const appPath = linuxConfig.appPath || `/usr/share/${appName}`;
  const appIconPath = linuxConfig.appIconPath || `/usr/share/${appName}`;

  // Replacement for APP_BASEPATH logic: remove /${APP_NAME} from end of APP_PATH
  const appBasePath = appPath.replace(new RegExp(`/${appName}$`), "");

  const appSrc = path.join(BUILD_SCRIPTS_DIR, "_app_scaffolds/linux/myapp.desktop");
  const installScript = path.join(BUILD_SCRIPTS_DIR, "_app_scaffolds/linux/install.sh");

  for (const arch of archs) {
    const appDst = path.join(distPath, `linux_${arch}`, appName);
    const exePath = path.join(distPath, binaryName, `${binaryName}-linux_${arch}`);
    const resPath = path.join(distPath, binaryName, "resources.neu");
    const extPath = path.join(distPath, binaryName, "extensions");
    const appExec = `${appPath}/${binaryName}-linux_${arch}`;

    console.log(`
Building Linux App Bundle (${arch})...`);
    console.log(`  Target: ${appDst}`);

    if (!fs.existsSync(exePath)) {
      console.error(`ERROR: Binary not found: ${exePath}`);
      process.exit(1);
    }

    if (fs.existsSync(appDst)) {
      fs.rmSync(appDst, { recursive: true, force: true });
    }
    fs.mkdirSync(appDst, { recursive: true });

    // Clone scaffold
    // cp "${APP_SRC}" "${APP_DST}/${APP_NAME}.desktop"
    fs.copyFileSync(appSrc, path.join(appDst, `${appName}.desktop`));
    // cp "${INSTALL_SCRIPT}" "${APP_DST}"
    fs.copyFileSync(installScript, path.join(appDst, "install.sh"));
    // chmod +x (implicitly handled by OS or not needed for copy, but useful for shell)
    try {
      fs.chmodSync(path.join(appDst, "install.sh"), "755");
    } catch (_e) {}

    console.log("  Copying content...");
    fs.copyFileSync(exePath, path.join(appDst, path.basename(exePath)));
    fs.copyFileSync(resPath, path.join(appDst, "resources.neu"));

    if (fs.existsSync(extPath)) {
      copyDir(extPath, path.join(appDst, "extensions"));
    }

    if (fs.existsSync(appIcon)) {
      fs.copyFileSync(appIcon, path.join(appDst, path.basename(appIcon)));
    }

    console.log("  Processing Desktop File...");
    replaceInFile(path.join(appDst, `${appName}.desktop`), {
      "{APP_NAME}": appName,
      "{APP_ICON_LOCATION}": appIconPath,
      "{APP_ICON_PATH}": appIconPath,
      "{APP_PATH}": appPath,
      "{APP_EXEC}": appExec,
    });

    replaceInFile(path.join(appDst, "install.sh"), {
      "{APP_NAME}": appName,
      "{APP_PATH}": appPath,
      "{APP_BASEPATH}": appBasePath,
      "{APP_EXEC}": appExec,
      "{APP_ICON}": appIcon,
      "{APP_ICON_PATH}": appIconPath,
    });

    console.log("  Done.");
  }
}

function buildMac(config) {
  if (!config.buildScript?.mac) return;

  const macConfig = config.buildScript.mac;
  const archs = macConfig.architecture;
  const binaryName = config.cli.binaryName;
  const appName = macConfig.appName;
  const appIcon = macConfig.appIcon;
  const distPath = config.cli.distributionPath || "dist";

  const appBundle = macConfig.appBundleName;
  const appId = macConfig.appIdentifier;
  const appVersion = config.version;
  const appMinOs = macConfig.minimumOS;

  const appSrc = path.join(BUILD_SCRIPTS_DIR, "_app_scaffolds/mac/myapp.app");

  if (!fs.existsSync(appSrc)) {
    console.error(`ERROR: App scaffold not found: ${appSrc}`);
    return;
  }

  for (const arch of archs) {
    const appDst = path.join(distPath, `mac_${arch}`, `${appName}.app`);
    const appMacOS = path.join(appDst, "Contents/MacOS");
    const appResources = path.join(appDst, "Contents/Resources");

    const exePath = path.join(distPath, binaryName, `${binaryName}-mac_${arch}`);
    const resPath = path.join(distPath, binaryName, "resources.neu");
    const extPath = path.join(distPath, binaryName, "extensions");

    console.log(`
Building Mac App Bundle (${arch})...`);
    console.log(`  Target: ${appDst}`);

    if (!fs.existsSync(exePath)) {
      console.error(`ERROR: Binary not found: ${exePath}`);
      process.exit(1);
    }

    if (fs.existsSync(appDst)) {
      fs.rmSync(appDst, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(appDst), { recursive: true });

    console.log("  Cloning scaffold...");
    copyDir(appSrc, appDst);

    console.log("  Copying content...");
    fs.copyFileSync(exePath, path.join(appMacOS, "main"));
    try {
      fs.chmodSync(path.join(appMacOS, "main"), "755");
    } catch (_e) {}

    fs.copyFileSync(resPath, path.join(appResources, "resources.neu"));

    if (fs.existsSync(extPath)) {
      copyDir(extPath, path.join(appResources, "extensions"));
    }

    if (fs.existsSync(appIcon)) {
      console.log("  Icon processing (limited support)...");

      if (process.platform === "darwin" && appIcon.endsWith(".png")) {
        try {
          const tmpIconSet = path.join(appDst, "tmp_icon.iconset");
          fs.mkdirSync(tmpIconSet, { recursive: true });

          const runSips = (z, out) =>
            run(`sips -z ${z} ${z} "${appIcon}" --out "${path.join(tmpIconSet, out)}"`, {
              stdio: "ignore",
              ignoreError: true,
            });

          runSips(16, "icon_16x16.png");
          runSips(32, "icon_16x16@2x.png");
          runSips(32, "icon_32x32.png");
          runSips(64, "icon_32x32@2x.png");
          runSips(128, "icon_128x128.png");
          runSips(256, "icon_128x128@2x.png");
          runSips(256, "icon_256x256.png");
          runSips(512, "icon_512x512.png");
          runSips(512, "icon_512x512@2x.png");

          run(`iconutil -c icns "${tmpIconSet}" -o "${path.join(appResources, "icon.icns")}"`, {
            stdio: "ignore",
            ignoreError: true,
          });
          fs.rmSync(tmpIconSet, { recursive: true, force: true });
        } catch (_e) {
          console.warn("  Icon conversion failed, skipping.");
        }
      } else {
        fs.copyFileSync(appIcon, path.join(appResources, path.basename(appIcon)));
      }
    }

    console.log("  Processing Info.plist...");
    const plistPath = path.join(appDst, "Contents/Info.plist");
    replaceInFile(plistPath, {
      "{APP_NAME}": appName,
      "{APP_BUNDLE}": appBundle,
      "{APP_ID}": appId,
      "{APP_VERSION}": appVersion,
      "{APP_MIN_OS}": appMinOs,
    });

    // Clear xattr if on Mac
    if (process.platform === "darwin") {
      run(`find "${appDst}" -type f -exec xattr -c {} ;`, { stdio: "ignore", ignoreError: true });
    }

    console.log("  Done.");
  }
}

async function main() {
  setupBuildScripts();

  console.log("Running neu update...");
  run("npx neu update");

  console.log("Running neu build...");
  run("npx neu build");

  const config = getJson(CONFIG_FILE);

  try {
    buildWin(config);
  } catch (e) {
    console.error("Windows build failed:", e);
  }

  try {
    buildLinux(config);
  } catch (e) {
    console.error("Linux build failed:", e);
  }

  try {
    buildMac(config);
  } catch (e) {
    console.error("Mac build failed:", e);
  }
}

main();
