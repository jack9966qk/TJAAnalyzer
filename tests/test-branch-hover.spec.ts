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
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }

    // Ensure Note Stats are visible
    // Wait for view-options to be upgraded and render
    await page.waitForSelector("view-options #show-stats-checkbox", { state: "attached" });

    await page.waitForSelector("#show-stats-checkbox");
    const checkbox = page.locator("#show-stats-checkbox");
    if (!(await checkbox.isChecked())) {
      await checkbox.click({ force: true });
    }
    await page.waitForFunction(() => {
      const ns = document.getElementById("note-stats-display");
      return ns && !ns.classList.contains("collapsed");
    });
    await page.waitForTimeout(500);
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
    await page.selectOption("#branch-selector-internal", "all");
    await page.waitForTimeout(1000);

    // Calculate coordinates for notes in different branches
    // Bar 0 is branched.
    // Height of branched bar is 3x standard.
    // Normal is top, Expert middle, Master bottom.

    const coords = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      const layout = chart._layout;
      if (!layout) throw new Error("Layout not available");

      const { insets, baseBarWidth, offsetY } = layout;

      // RATIOS.BAR_HEIGHT = 0.14
      const BASE_LANE_HEIGHT = baseBarWidth * 0.14;

      // Bar 0 layout
      const barX = insets.left;
      const barY = offsetY;

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

    const stats = page.locator("#note-stats-display");
    const internalCanvas = canvas.locator("canvas");

    // 1. Hover Normal (Should show stats for note in normal branch)
    await internalCanvas.hover({ position: { x: coords.x, y: coords.normalY }, force: true });
    await page.waitForTimeout(200);

    await expect(stats.locator(".stat-value").nth(1)).toHaveText("120"); // BPM = 120

    // 2. Hover Expert (Should show stats for note in expert branch)
    await internalCanvas.hover({ position: { x: coords.x, y: coords.expertY }, force: true });
    await expect(stats.locator(".stat-value").nth(1)).toHaveText("120"); // BPM = 120

    // 3. Hover Master (Should show stats for note in master branch)
    await internalCanvas.hover({ position: { x: coords.x, y: coords.masterY }, force: true });
    await expect(stats.locator(".stat-value").nth(1)).toHaveText("120"); // BPM = 120
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
    const branchSelector = page.locator("#branch-selector-internal");
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

    // Check if hoveredNote is set correctly in renderOptions
    const hoveredNote = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      return chart.renderOptions.hoveredNote;
    });

    // { barIndex: 0, charIndex: 0, branch: 'normal' }
    expect(hoveredNote).toEqual({ barIndex: 0, charIndex: 0, branch: "normal" });

    // Snapshot to verify visual highlight (Yellow Border)
    await expect(canvas).toHaveScreenshot("repro-hover-unbranched.png");
  });
});
