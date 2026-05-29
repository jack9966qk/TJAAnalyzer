#!/usr/bin/env node

/**
 * Automated README screenshot generator.
 *
 * Takes screenshots of the full app at desktop + mobile viewports,
 * then composites them into MacBook + iPhone device frames.
 *
 * Two modes:
 *   1. If assets/device-frames/macbook.png and iphone.png exist →
 *      composites with `sharp` (best quality, needs `npm install sharp`)
 *   2. Otherwise → renders CSS device frames in Playwright (zero extra deps)
 *
 * Usage:  node scripts/screenshots.mjs
 * Output: assets/screenshots/laptop.png  assets/screenshots/phone.png
 */

import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SCREENSHOTS_DIR = path.resolve(ROOT, "assets", "screenshots");
const FRAMES_DIR = path.resolve(ROOT, "assets", "device-frames");
const PREVIEW_PORT = 8081;
const BASE_URL = `http://localhost:${PREVIEW_PORT}`;
// App URL the framed screenshots are captured from: preloads a representative
// chart (ESE) with a difficulty + advanced filters so the result is consistent.
const APP_PATH =
  "?ese=06+Classical%2FEtude+Op.+10-4%2FEtude+Op.+10-4.tja&diff=edit&adv_starsmin=10&adv_starsmax=10&adv_dfc=iB";
const APP_URL = `${BASE_URL}/${APP_PATH}`;

// ── Config ──────────────────────────────────────────────────────────
const DESKTOP_VIEWPORT = { width: 1440, height: 900 };
const MOBILE_VIEWPORT = { width: 390, height: 844 };
// Phone safe-area insets (home-indicator style). Emulated during capture so the
// app pads its edge-anchored UI in its own background colour, keeping content
// clear of the frame's rounded corners — just like running on a real device.
const MOBILE_SAFE_AREA = { top: 24, left: 0, bottom: 34, right: 0 };
const APP_SETTLE_MS = 1500;

// iPad viewport: portrait, chart-only page with auto-annotation.
const IPAD_VIEWPORT = { width: 768, height: 1024 };

// Playdata injected into localStorage before the app loads so the chart list
// shows real scores/grades instead of just song titles.
const PLAYDATA_PATH = path.resolve(ROOT, "data", "playdata_sample.json");
const PLAYDATA_JSON = fs.readFileSync(PLAYDATA_PATH, "utf-8");

// User profile with customised Playdata Display settings.
// Must include all fields — loadUserProfile merges with defaults, but
// a partial object may lose overrides if a legacy migration path rewrites it.
const PROFILE_JSON = JSON.stringify({
  isTesterMode: false,
  // Auto-zoom on load so the chart fills the available width. Applied via the
  // profile (not window.setRenderOptions) so it survives the async chart load
  // triggered by the URL — see chart-controller's defaultViewOptions handling.
  defaultViewOptions: { zoom: "auto", showNoteStats: true },
  autoAnnotateOnLoad: false,
  showFullPathInChartList: false,
  chartListStripMode: "dnCategory",
  chartListLeadingMode: "scoreRank",
  chartListTrailingMode: "counts",
  preferredChartLanguage: "auto",
});

// ── Helpers ─────────────────────────────────────────────────────────

/** Wait for the preview server to respond. */
async function waitForServer(url, timeoutMs = 15_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok || res.status === 304) return;
    } catch {
      // server not ready yet
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

/**
 * Navigate to the app, customise its state, then return a screenshot Buffer.
 *
 *  - Injects playdata into localStorage so scores/badges are visible.
 *  - Enables auto-zoom.
 *  - On mobile, expands the bottom sheet (chart options panel).
 */
async function takeAppScreenshot(browser, viewport, safeArea, { isMobile }) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  const page = await context.newPage();

  // Two-step navigation: visit the origin first to set localStorage,
  // then load the app.  This avoids a race where app-state.ts calls
  // loadUserProfile() during module initialisation before addInitScript
  // has run (ES module loads can beat the injected script).
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ playdataStr, profileStr }) => {
      localStorage.setItem("tja_analyzer_playdata", playdataStr);
      localStorage.setItem("tja_analyzer_profile", profileStr);
    },
    { playdataStr: PLAYDATA_JSON, profileStr: PROFILE_JSON },
  );

  // Emulate device safe-area insets.
  if (safeArea) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: safeArea });
  }

  await page.goto(APP_URL, { waitUntil: "networkidle" });

  // Wait for the loading screen to finish
  await page
    .waitForFunction(
      () => {
        const ls = document.getElementById("loading-screen");
        return !ls || ls.style.display === "none" || ls.style.opacity === "0";
      },
      { timeout: 10_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(APP_SETTLE_MS);

  // ── App state customisation ───────────────────────────────────────
  // Auto zoom so the chart fills the available space.
  await page.evaluate(() => {
    window.setRenderOptions({ autoZoom: true });
  });

  if (isMobile) {
    // Let the bottom-sheet controller finish init before clicking.
    await page.waitForSelector("#options-panel-header", { state: "visible", timeout: 5000 });
    await page.waitForTimeout(500);
    // Force-click the handle — Playwright's actionability check can
    // be too strict for the bottom-sheet interactive state.
    await page.click("#options-panel-header", { force: true });
    await page.waitForTimeout(600); // let the 280ms CSS transition finish
    // Guard: if click didn't expand (rare race), force via CSS class.
    await page.evaluate(() => {
      const sheet = document.getElementById("chart-options-panel");
      if (sheet && !sheet.classList.contains("sheet-expanded")) {
        const expandedH = Math.floor(window.innerHeight * 0.7);
        const root = document.documentElement;
        root.style.setProperty("--sheet-height", `${expandedH}px`);
        root.style.setProperty("--sheet-max-height", `${expandedH}px`);
        sheet.classList.add("sheet-expanded");
        const dsBody = document.getElementById("ds-body");
        if (dsBody) dsBody.classList.add("collapsed");
      }
    });
  } else {
    // Desktop: expand the data-source panel so the chart list is visible.
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(800);
      }
    }
  }
  // The chart is loaded from the URL (APP_PATH), so every device shows the same
  // chart. Just wait for it to finish rendering before capturing.
  await page
    .waitForFunction(
      () => {
        const canvas = document.querySelector("tja-chart")?.shadowRoot?.querySelector("canvas");
        return !!canvas && canvas.height > 0;
      },
      { timeout: 10_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(500);

  if (isMobile) {
    // Note stats are off by default in the vertical (mobile) layout. The shared
    // profile's defaultViewOptions turns them on for the desktop capture, so
    // switch them back off here (after the chart load, which would otherwise
    // re-apply the profile value) rather than encoding it in defaultViewOptions.
    await page.evaluate(() => {
      const viewOptions = document.querySelector("view-options");
      if (viewOptions) viewOptions.statsVisible = false;
    });
    await page.waitForTimeout(200);
  }

  // Hide version footer so it's stable across versions.
  await page.evaluate(() => {
    const footer = document.querySelector(".app-footer");
    if (footer) footer.style.display = "none";
  });

  const screenshot = await page.screenshot({ type: "png", fullPage: false });
  await context.close();
  return screenshot;
}

/**
 * iPad screenshot: full app with auto-annotation.
 * Injects a profile with autoAnnotateOnLoad and clicks the first chart.
 */
const IPAD_PROFILE = JSON.stringify({
  isTesterMode: false,
  defaultViewOptions: { zoom: "auto", showNoteStats: true },
  autoAnnotateOnLoad: true,
  showFullPathInChartList: false,
  chartListStripMode: "dnCategory",
  chartListLeadingMode: "scoreRank",
  chartListTrailingMode: "counts",
  preferredChartLanguage: "auto",
});

async function takeIpadScreenshot(browser) {
  const context = await browser.newContext({
    viewport: IPAD_VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: "light",
  });
  const page = await context.newPage();

  // Two-step: set localStorage before app scripts run.
  await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
  await page.evaluate(
    ({ playdataStr, profileStr }) => {
      localStorage.setItem("tja_analyzer_playdata", playdataStr);
      localStorage.setItem("tja_analyzer_profile", profileStr);
    },
    { playdataStr: PLAYDATA_JSON, profileStr: IPAD_PROFILE },
  );

  await page.goto(APP_URL, { waitUntil: "networkidle" });

  await page
    .waitForFunction(
      () => {
        const ls = document.getElementById("loading-screen");
        return !ls || ls.style.display === "none" || ls.style.opacity === "0";
      },
      { timeout: 10_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(APP_SETTLE_MS);

  // Expand DS panel to reveal the chart list.
  const dsBody = page.locator("#ds-body");
  if ((await dsBody.count()) > 0) {
    const classes = await dsBody.getAttribute("class");
    if (classes?.includes("collapsed")) {
      await page.click("#ds-panel-header");
      await page.waitForTimeout(800);
    }
  }

  // The chart is loaded from the URL (APP_PATH) — same chart as the other
  // devices. Wait for it to finish rendering before capturing.
  await page
    .waitForFunction(
      () => {
        const canvas = document.querySelector("tja-chart")?.shadowRoot?.querySelector("canvas");
        return !!canvas && canvas.height > 0;
      },
      { timeout: 10_000 },
    )
    .catch(() => {});
  await page.waitForTimeout(1000);

  // Switch to the Annotate tab so annotations show.
  const annotateTab = page.locator('button[data-do-tab="annotation"]');
  if ((await annotateTab.count()) > 0) {
    await annotateTab.click();
    await page.waitForTimeout(500);
  }

  // Enter actual fullscreen mode via pseudo-fullscreen class.
  await page.evaluate(() => {
    const chart = document.getElementById("chart-component");
    if (chart) chart.classList.add("pseudo-fullscreen");
  });
  await page.waitForTimeout(400);

  // Hide the version footer.
  await page.evaluate(() => {
    const footer = document.querySelector(".app-footer");
    if (footer) footer.style.display = "none";
  });

  const screenshot = await page.screenshot({ type: "png", fullPage: false });
  await context.close();
  return screenshot;
}

// ── CSS device-frame rendering (fallback when no PNG frames exist) ──

// Padding around each frame so the glow/shadow isn't clipped by the element
// screenshot (which crops tightly to #frame-root).
const FRAME_PAD = 80;

/**
 * The screen cutout must match the source screenshot's aspect ratio exactly,
 * otherwise `object-fit` either letterboxes (dark bezel slivers) or crops. The
 * heights below are derived from the capture viewports:
 *   desktop 1440x900  → 1064 x 665   (×0.625)
 *   mobile  390x844   →  372 x 805   (×2.164)
 * so the image can fill the cutout with no distortion.
 */
function buildFrameHtml(screenshotBase64, device) {
  const img = `<img src="data:image/png;base64,${screenshotBase64}" style="display:block;width:100%;height:100%;object-fit:fill;" alt="screenshot">`;
  const shell = (innerW, innerH, inner) => `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;background:transparent;">
  <div id="frame-root" style="display:inline-block;padding:${FRAME_PAD}px;background:transparent;line-height:0;">
    <!-- Two layered shadows: a soft dark one for depth on light backgrounds,
         and a light halo so the dark frames stay legible on a black background. -->
    <div style="position:relative;width:${innerW}px;height:${innerH}px;filter:drop-shadow(0 14px 30px rgba(0,0,0,0.35)) drop-shadow(0 0 22px rgba(255,255,255,0.22));">
      ${inner}
    </div>
  </div>
</body>
</html>`;

  if (device === "iphone") {
    // iPhone 15/16 Pro-style frame — thin uniform bezel, dynamic island
    // overlaps the top of the screen, home indicator sits at the bottom.
    const screenW = 372;
    const screenH = 805; // matches the 390x844 capture aspect (no distortion)
    const bezel = 14;
    const bodyW = screenW + bezel * 2; // 400
    const bodyH = screenH + bezel * 2; // 833
    const bodyRadius = 52;
    const screenRadius = bodyRadius - bezel; // 38 (concentric)

    const inner = `
      <!-- phone body (inset rim highlight keeps the edge legible on black) -->
      <div style="position:absolute;inset:0;background:#0d0d0f;border-radius:${bodyRadius}px;overflow:hidden;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.18);">
        <!-- screen fills almost the whole body -->
        <div style="position:absolute;top:${bezel}px;left:${bezel}px;width:${screenW}px;height:${screenH}px;overflow:hidden;border-radius:${screenRadius}px;background:#000;">
          ${img}
          <!-- dynamic island (overlaps the screen at top-center) -->
          <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);width:116px;height:28px;background:#0d0d0f;border-radius:14px;"></div>
          <!-- home indicator (overlaps the screen at bottom-center) -->
          <div style="position:absolute;bottom:8px;left:50%;transform:translateX(-50%);width:134px;height:5px;background:#3a3a3f;border-radius:3px;"></div>
        </div>
      </div>`;
    return shell(bodyW, bodyH, inner);
  }

  if (device === "ipad") {
    // iPad-style frame — portrait, uniform black bezels, no notch.
    const screenW = 728;
    const screenH = Math.round((screenW * 1024) / 768); // match 768x1024 capture aspect
    const bezel = 14;
    const bodyW = screenW + bezel * 2;
    const bodyH = screenH + bezel * 2;
    const bodyRadius = 38;
    const screenRadius = bodyRadius - bezel; // 24 (concentric with the body)
    const inner = `
      <!-- iPad body (inset rim highlight keeps the edge legible on black) -->
      <div style="position:absolute;inset:0;background:#0d0d0f;border-radius:${bodyRadius}px;overflow:hidden;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.18);">
        <!-- screen -->
        <div style="position:absolute;top:${bezel}px;left:${bezel}px;width:${screenW}px;height:${screenH}px;overflow:hidden;border-radius:${screenRadius}px;background:#000;">
          ${img}
        </div>
        <!-- camera dot -->
        <div style="position:absolute;top:10px;left:50%;transform:translateX(-50%);width:4px;height:4px;border-radius:50%;background:#333;"></div>
      </div>`;
    return shell(bodyW, bodyH, inner);
  }

  // macbook
  const screenW = 1064;
  const screenH = 665;
  const bezelTop = 16;
  const bezelSide = 16;
  const bezelBottom = 22; // slightly taller chin, like a real MacBook lid
  const lidW = screenW + bezelSide * 2; // 1096
  const lidH = screenH + bezelTop + bezelBottom; // 703
  const lidRadius = 14;
  const baseW = Math.round(lidW * 1.09); // base lip is wider than the lid
  const baseH = 16;
  const baseRadius = 8;
  const notch = { w: 150, h: 9 };
  const frameW = baseW; // base is the widest element
  const frameH = lidH + baseH;
  const inner = `
      <!-- lid (inset rim highlight keeps the edge legible on black) -->
      <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:${lidW}px;height:${lidH}px;background:#0a0a0c;border-radius:${lidRadius}px;box-shadow:inset 0 0 0 1.5px rgba(255,255,255,0.16);">
        <!-- camera -->
        <div style="position:absolute;top:6px;left:50%;transform:translateX(-50%);width:6px;height:6px;border-radius:50%;background:#1d1d22;"></div>
        <!-- screen -->
        <div style="position:absolute;top:${bezelTop}px;left:${bezelSide}px;width:${screenW}px;height:${screenH}px;overflow:hidden;background:#000;">
          ${img}
        </div>
      </div>
      <!-- base / keyboard-deck front edge -->
      <div style="position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:${baseW}px;height:${baseH}px;background:linear-gradient(#d8dadd,#b7babf);border-radius:${baseRadius}px ${baseRadius}px ${baseRadius + 2}px ${baseRadius + 2}px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.65);">
        <!-- lid-opening notch -->
        <div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:${notch.w}px;height:${notch.h}px;background:#9da0a6;border-radius:0 0 ${notch.h}px ${notch.h}px;"></div>
      </div>`;
  return shell(frameW, frameH, inner);
}

// Output resolution per device (used as the frame render's deviceScaleFactor).
// The combined image composites every frame 1:1 with no resampling, so these
// values alone determine the relative on-screen size of each device. The laptop
// is the reference at 2×; the iPad and phone render at a lower resolution so
// they read as physically smaller devices beside it. The app screenshots are
// always captured at 2× and downsampled into the cutout, so content stays sharp.
const FRAME_SCALE = { macbook: 2, ipad: 1.25, iphone: 1.3 };

async function compositeWithCssFrame(browser, rawScreenshot, device) {
  const screenshotBase64 = rawScreenshot.toString("base64");
  const html = buildFrameHtml(screenshotBase64, device);
  // Viewport just needs to be large enough to hold #frame-root; the element
  // screenshot crops to it exactly (with a transparent background).
  const frameViewport =
    device === "macbook"
      ? { width: 1480, height: 960 }
      : device === "ipad"
        ? { width: 1160, height: 1280 }
        : { width: 660, height: 1100 }; // iphone

  const context = await browser.newContext({ viewport: frameViewport, deviceScaleFactor: FRAME_SCALE[device] ?? 2 });
  const page = await context.newPage();
  await page.setContent(html, { waitUntil: "networkidle" });

  // Let fonts/images settle
  await page.waitForTimeout(400);

  const framed = await page.locator("#frame-root").screenshot({ type: "png", omitBackground: true });
  await context.close();
  return framed;
}

// ── Sharp-based compositing (when PNG frames exist) ─────────────────

async function compositeWithSharp(rawScreenshot, framePath, options) {
  const sharp = (await import("sharp")).default;

  // Resize screenshot to fit the screen cutout
  const resizedScreenshot = await sharp(rawScreenshot)
    .resize(options.screenWidth, options.screenHeight, { fit: "fill" })
    .toBuffer();

  const result = await sharp(framePath)
    .composite([
      {
        input: resizedScreenshot,
        top: options.screenTop,
        left: options.screenLeft,
      },
    ])
    .png()
    .toBuffer();

  return result;
}

// ── Combined hero image (phone overlapping laptop) ─────────────────

async function combineFrames(laptopBuf, ipadBuf, phoneBuf) {
  const sharp = (await import("sharp")).default;
  const [laptopMeta, ipadMeta, phoneMeta] = await Promise.all([
    sharp(laptopBuf).metadata(),
    sharp(ipadBuf).metadata(),
    sharp(phoneBuf).metadata(),
  ]);

  // Every frame is composited at its native resolution — no resampling. Each
  // device's relative size therefore comes entirely from the resolution it was
  // rendered at (see FRAME_SCALE), so making the iPad smaller is done there.
  //
  // Each buffer carries FRAME_PAD of transparent glow margin, scaled per device,
  // so aligning the raw buffer bottoms would misalign the actual devices. Align
  // the device bottoms instead by subtracting each buffer's (scaled) bottom pad.
  const pad = {
    laptop: Math.round(FRAME_PAD * FRAME_SCALE.macbook),
    ipad: Math.round(FRAME_PAD * FRAME_SCALE.ipad),
    phone: Math.round(FRAME_PAD * FRAME_SCALE.iphone),
  };
  const baseline = Math.max(laptopMeta.height - pad.laptop, ipadMeta.height - pad.ipad, phoneMeta.height - pad.phone);
  const laptopY = baseline - (laptopMeta.height - pad.laptop);
  const ipadY = baseline - (ipadMeta.height - pad.ipad);
  const phoneY = baseline - (phoneMeta.height - pad.phone);

  // Layout: laptop → iPad → phone, cascading left-to-right, bottom-aligned.
  // The iPad sits mostly to the right of the laptop with only a small overlap.
  const ipadX = Math.round(laptopMeta.width * 0.8);
  const phoneX = ipadX + Math.round(ipadMeta.width * 0.66);

  const canvasW = Math.max(laptopMeta.width, ipadX + ipadMeta.width, phoneX + phoneMeta.width);
  const canvasH = baseline + Math.max(pad.laptop, pad.ipad, pad.phone);

  return sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: laptopBuf, top: laptopY, left: 0 },
      { input: ipadBuf, top: ipadY, left: ipadX },
      { input: phoneBuf, top: phoneY, left: phoneX },
    ])
    .png()
    .toBuffer();
}

// ── Main ────────────────────────────────────────────────────────────

async function main() {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  // 1. Build the app
  console.log("🔨 Building app...");
  execSync("npm run build", { cwd: ROOT, stdio: "inherit" });

  // 2. Start the preview server
  console.log("🚀 Starting preview server...");
  const server = spawn("npx", ["vite", "preview", "--port", String(PREVIEW_PORT)], {
    cwd: ROOT,
    stdio: "pipe",
    shell: true,
  });
  server.stderr.on("data", (d) => {
    const msg = d.toString();
    if (!msg.includes("ExperimentalWarning")) process.stderr.write(d);
  });

  try {
    await waitForServer(BASE_URL);
    console.log("   Server ready.");

    // 3. Launch browser
    const browser = await chromium.launch({ headless: true });

    // 4. Take raw screenshots
    console.log("📸 Taking desktop screenshot (%dx%d)...", DESKTOP_VIEWPORT.width, DESKTOP_VIEWPORT.height);
    const desktopRaw = await takeAppScreenshot(browser, DESKTOP_VIEWPORT, undefined, { isMobile: false });

    console.log("📸 Taking mobile screenshot (%dx%d)...", MOBILE_VIEWPORT.width, MOBILE_VIEWPORT.height);
    const mobileRaw = await takeAppScreenshot(browser, MOBILE_VIEWPORT, MOBILE_SAFE_AREA, { isMobile: true });

    console.log("📸 Taking iPad screenshot (%dx%d)...", IPAD_VIEWPORT.width, IPAD_VIEWPORT.height);
    const ipadRaw = await takeIpadScreenshot(browser);

    // 5. Composite with device frames
    const macbookFramePath = path.join(FRAMES_DIR, "macbook.png");
    const iphoneFramePath = path.join(FRAMES_DIR, "iphone.png");
    const usePngFrames = fs.existsSync(macbookFramePath) && fs.existsSync(iphoneFramePath);
    let hasSharp = false;

    if (usePngFrames) {
      try {
        await import("sharp");
        hasSharp = true;
      } catch {
        console.warn("⚠️  sharp is not installed. Install it with: npm install sharp");
      }
    }

    let laptopOutput, ipadOutput, phoneOutput;

    if (usePngFrames && hasSharp) {
      console.log("🖼️  Compositing with device-frame PNGs (sharp)...");
      laptopOutput = await compositeWithSharp(desktopRaw, macbookFramePath, {
        screenTop: 38,
        screenLeft: 108,
        screenWidth: 1064,
        screenHeight: 666,
      });
      phoneOutput = await compositeWithSharp(mobileRaw, iphoneFramePath, {
        screenTop: 24,
        screenLeft: 14,
        screenWidth: 392,
        screenHeight: 852,
      });
      // iPad always uses CSS frame (no PNG frame asset for it).
      ipadOutput = await compositeWithCssFrame(browser, ipadRaw, "ipad");
    } else {
      if (!usePngFrames) {
        console.log("💡 No device-frame PNGs found. Using CSS frames instead.");
        console.log("   For photorealistic frames, download them from:");
        console.log("     https://design.facebook.com/toolsandresources/devices/");
        console.log("   Then place as:");
        console.log(`     ${macbookFramePath}`);
        console.log(`     ${iphoneFramePath}`);
      }
      console.log("🎨 Rendering CSS device frames...");
      laptopOutput = await compositeWithCssFrame(browser, desktopRaw, "macbook");
      ipadOutput = await compositeWithCssFrame(browser, ipadRaw, "ipad");
      phoneOutput = await compositeWithCssFrame(browser, mobileRaw, "iphone");
    }

    // 6. Combine into single image (phone overlaps laptop)
    console.log("🖼️  Compositing...");
    const output = await combineFrames(laptopOutput, ipadOutput, phoneOutput);
    const devicesPath = path.join(SCREENSHOTS_DIR, "devices.png");
    fs.writeFileSync(devicesPath, output);

    console.log("✅ Done!");
    console.log(`   ${devicesPath}`);

    await browser.close();
  } finally {
    server.kill("SIGTERM");
    // Give it a moment to clean up
    await new Promise((r) => setTimeout(r, 500));
  }
}

main().catch((err) => {
  console.error("❌", err);
  process.exit(1);
});
