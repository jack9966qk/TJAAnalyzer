import { expect, test } from "@playwright/test";

test.describe("Note Stats Component", () => {
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
        ordinal: 0,
      };
      // Mock renderOptions and Chart
      const renderOptions = {
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

      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom test function
      (window as any).setStats(hit, chart, renderOptions);
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
        ordinal: 0,
      };
      const renderOptions = {
        viewMode: "judgements",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        beatsPerLine: 16,
      };
      const chart = {
        bars: [["1", "2", "0", "0"]],
      };
      // 1st note (Don) -> dummy, 2nd note (Ka) -> perfect
      const judgements = ["good", "perfect"];
      const deltas = [0, 10];

      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom test function
      (window as any).setStats(hit, chart, renderOptions, judgements, deltas);
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
      const renderOptions = {
        viewMode: "original",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        beatsPerLine: 16,
      };
      const chart = { bars: [["1"]] };
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom test function
      (window as any).setStats(hit, chart, renderOptions);
    });

    const stats = page.locator("note-stats");
    // Check finding by text
    await expect(stats.getByText("BPM", { exact: true })).toBeVisible();

    // Check finding by class
    await expect(stats.locator(".stat-label").first()).toBeVisible();
  });
});
