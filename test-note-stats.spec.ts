import { expect, test } from "@playwright/test";

test.describe("Note Stats Component", () => {
  test("Empty Render", async ({ page }) => {
    await page.goto("/note-stats-test.html");
    const stats = page.locator("note-stats");
    await expect(stats).toBeVisible();
    await expect(stats).toHaveScreenshot("note-stats-empty.png");
  });

  test("Populated Stats", async ({ page }) => {
    await page.goto("/note-stats-test.html");

    await page.evaluate(() => {
      const hit = {
        type: "1", // Don
        bpm: 150,
        scroll: 1.0,
        originalBarIndex: 0,
        charIndex: 0,
        judgeableNoteIndex: 0,
      };
      // Mock ViewOptions and Chart
      const viewOptions = {
        viewMode: "original",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        beatsPerLine: 16,
      };
      // Minimal chart structure for gap calc
      const chart = {
        bars: [["1", "0", "0", "0"]],
      };

      (window as any).setStats(hit, chart, viewOptions);
    });

    const stats = page.locator("note-stats");
    await expect(stats).toHaveScreenshot("note-stats-populated.png");
  });

  test("Judgement Display", async ({ page }) => {
    await page.goto("/note-stats-test.html");

    await page.evaluate(() => {
      const hit = {
        type: "2", // Ka
        bpm: 150,
        scroll: 1.0,
        originalBarIndex: 0,
        charIndex: 1,
        judgeableNoteIndex: 0,
      };
      const viewOptions = {
        viewMode: "judgements",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        beatsPerLine: 16,
      };
      const chart = {
        bars: [["1", "2", "0", "0"]],
      };
      const judgements = ["Perfect"];
      const deltas = [10];

      (window as any).setStats(hit, chart, viewOptions, judgements, deltas);
    });

    const stats = page.locator("note-stats");
    await expect(stats).toHaveScreenshot("note-stats-judgement.png");
  });

  test("Locate Text Inside", async ({ page }) => {
    await page.goto("/note-stats-test.html");
    await page.evaluate(() => {
      const hit = {
        type: "1",
        bpm: 150,
        scroll: 1.0,
        originalBarIndex: 0,
        charIndex: 0,
        judgeableNoteIndex: 0,
      };
      const viewOptions = {
        viewMode: "original",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        beatsPerLine: 16,
      };
      const chart = { bars: [["1"]] };
      (window as any).setStats(hit, chart, viewOptions);
    });

    const stats = page.locator("note-stats");
    // Check finding by text
    await expect(stats.getByText("Type")).toBeVisible();
    await expect(stats.getByText("don", { exact: false })).toBeVisible(); // 'don' from getNoteName('1')

    // Check finding by class
    await expect(stats.locator(".stat-label").first()).toBeVisible();
  });
});
