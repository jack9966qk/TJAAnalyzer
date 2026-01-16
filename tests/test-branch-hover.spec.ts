import { expect, test } from "@playwright/test";

test.describe("Branch Hover Interaction", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-collapse-btn");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-collapse-btn");
        await page.waitForTimeout(500);
      }
    }

    // Ensure Note Stats are visible
    // Wait for view-options to be upgraded and render
    await page.waitForSelector("view-options #show-stats-checkbox", { state: "attached" });

    await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Test script
      const vo = document.querySelector("view-options") as any;
      if (vo && typeof vo.setShowStats === "function") {
        vo.setShowStats(true);
      }
    });
  });

  test("Hovering on different branches displays correct stats", async ({ page }) => {
    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();

    // Switch to File Tab
    await page.click('button[data-mode="file"]');

    const tjaContent = `TITLE:Branch Test
BPM:120
COURSE:Oni
LEVEL:10
#START
#BRANCHSTART
#N
1000,
#E
2000,
#M
3000,
#BRANCHEND
#END`;

    await page.locator("#tja-file-picker").setInputFiles({
      name: "branch.tja",
      mimeType: "text/plain",
      buffer: Buffer.from(tjaContent),
    });

    await page.waitForTimeout(1000);

    // Select "Show all branches"
    await page.selectOption("#branch-selector", "all");
    await page.waitForTimeout(1000);

    // Calculate coordinates for notes in different branches
    // Bar 0 is branched.
    // Height of branched bar is 3x standard.
    // Normal is top, Expert middle, Master bottom.

    const coords = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      const PADDING = 20;
      const logicalWidth = chart.clientWidth || 800;
      const availableWidth = logicalWidth - PADDING * 2;
      // beatsPerLine = 16 (default)
      const baseBarWidth = availableWidth / (16 / 4);
      // RATIOS.BAR_HEIGHT = 0.14
      const BASE_LANE_HEIGHT = baseBarWidth * 0.14;
      const headerHeight = baseBarWidth * 0.35;
      const offsetY = PADDING + headerHeight + PADDING;

      // Bar 0 layout
      const barX = PADDING;
      const barY = offsetY;
      // The note is at index 0, so x is roughly barX + (noteWidth/2)
      // But getNotePosition should handle it if we can target specific branch...
      // Actually getNotePosition currently doesn't support targeting branch easily without modification or known logic.
      // Let's use getNoteAt logic to reverse engineer or just calculate based on known layout.

      // Note is at index 0 of bar 0.
      // Actually renderer uses: x = layout.x + (i * noteStep)
      // For note 0: x = layout.x
      const x = barX;

      // Y coordinates
      // Normal: barY + (BASE_LANE_HEIGHT / 2)
      // Expert: barY + BASE_LANE_HEIGHT + (BASE_LANE_HEIGHT / 2)
      // Master: barY + 2*BASE_LANE_HEIGHT + (BASE_LANE_HEIGHT / 2)

      const normalY = barY + BASE_LANE_HEIGHT / 2;
      const expertY = barY + BASE_LANE_HEIGHT + BASE_LANE_HEIGHT / 2;
      const masterY = barY + 2 * BASE_LANE_HEIGHT + BASE_LANE_HEIGHT / 2;

      return { x, normalY, expertY, masterY };
    });

    const stats = page.locator("note-stats");
    const internalCanvas = canvas.locator("canvas");

    // 1. Hover Normal (Should be '1' -> don)
    await internalCanvas.hover({ position: { x: coords.x, y: coords.normalY }, force: true });
    await expect(stats.locator(".stat-value", { hasText: /don/i })).toBeVisible();

    // 2. Hover Expert (Should be '2' -> ka)
    await internalCanvas.hover({ position: { x: coords.x, y: coords.expertY }, force: true });
    await expect(stats.locator(".stat-value", { hasText: /ka/i })).toBeVisible();

    // 3. Hover Master (Should be '3' -> DON)
    await internalCanvas.hover({ position: { x: coords.x, y: coords.masterY }, force: true });
    await expect(stats.locator(".stat-value", { hasText: /DON/i })).toBeVisible(); // Case sensitive regex?
    // Note: 'DON' text might match 'don' if insensitive.
    // Let's check text content strictly or use getNoteName mapping which returns 'DON' for '3'.
    const typeValue = stats.locator(".stat-box", { hasText: "TYPE" }).locator(".stat-value");
    await expect(typeValue).toHaveText("DON");
  });

  test("Repro: Hovering on unbranched section of a partially branched chart", async ({ page }) => {
    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();

    // Switch to File Tab
    await page.click('button[data-mode="file"]');

    const tjaContent = `TITLE:Partial Branch Repro
BPM:120
COURSE:Oni
LEVEL:8
#START
1000,
#BRANCHSTART p, 1, 2
#N
1000,
#E
2000,
#M
3000,
#BRANCHEND
1000,
#END`;

    // Load custom TJA via file picker
    await page.locator("#tja-file-picker").setInputFiles({
      name: "repro.tja",
      mimeType: "text/plain",
      buffer: Buffer.from(tjaContent),
    });

    await page.waitForTimeout(1000);

    // Ensure we are in "All Branches" mode (default for branched chart)
    const branchSelector = page.locator("#branch-selector");
    await expect(branchSelector).toBeVisible();
    await expect(branchSelector).toHaveValue("all");

    // Get coordinates of the first note (Bar 0, Note 0) - Unbranched
    const p0 = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      return chart.getNoteCoordinates(0, 0);
    });
    expect(p0).not.toBeNull();

    // Hover
    await canvas.locator("canvas").hover({ position: p0, force: true });
    await page.waitForTimeout(200);

    // Check if hoveredNote is set correctly in viewOptions
    const hoveredNote = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      return chart.viewOptions.hoveredNote;
    });

    // { originalBarIndex: 0, charIndex: 0, branch: 'normal' }
    expect(hoveredNote).toEqual({ originalBarIndex: 0, charIndex: 0, branch: "normal" });

    // Snapshot to verify visual highlight (Yellow Border)
    await expect(canvas).toHaveScreenshot("repro-hover-unbranched.png");
  });
});
