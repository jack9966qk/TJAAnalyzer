import { expect, test } from "@playwright/test";

test.describe("Chart List Playdata Display Modes", () => {
  test.beforeEach(async ({ page }) => {
    // Mock song_mapping.json
    await page.route("**/data/song_mapping.json", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          song1: { esePath: "Category/Song 1.tja", title: "Song 1", candidates: [], matchType: "manual" },
          song2: { esePath: "Category/Song 2.tja", title: "Song 2", candidates: [], matchType: "manual" },
          song3: {
            esePath: "Category/Song 3 with a very long title.tja",
            title: "Song 3 with a very long title that should wrap around to the next line",
            candidates: [],
            matchType: "manual",
          },
          song4: { esePath: "Category/Song 4.tja", title: "Song 4", candidates: [], matchType: "manual" },
          song5: { esePath: "Category/Song 5.tja", title: "Song 5", candidates: [], matchType: "manual" },
          song6: { esePath: "Category/Song 6.tja", title: "Song 6", candidates: [], matchType: "manual" },
        }),
      });
    });

    await page.goto("/component-test.html?component=chart-list-panel&width=400");
  });

  const modes = [
    { mode: "crown", name: "Crown" },
    { mode: "crownWithScoreRank", name: "Crown + ScoreRank" },
    { mode: "dnStyle", name: "DN Style" },
    { mode: "dnStyleWithCounts", name: "DN Style + Counts" },
  ];

  for (const { mode, name } of modes) {
    test(`renders ${name} correctly with variety`, async ({ page }) => {
      const component = page.locator("chart-list-panel");

      // Setup ESE tree and Playdata
      await page.evaluate((modeVal) => {
        // Mock ESE Tree
        // biome-ignore lint/suspicious/noExplicitAny: Mocking global objects
        (window as any).appState.eseTree = [
          { path: "Category/Song 1.tja", title: "Song 1" }, // Gold: FC, > 10 OKs
          { path: "Category/Song 2.tja", title: "Song 2" }, // Cyan: Perfect
          {
            path: "Category/Song 3 with a very long title.tja",
            title: "Song 3 with a very long title that should wrap around to the next line",
          }, // Green: FC, < 10 OKs
          { path: "Category/Song 4.tja", title: "Song 4" }, // Grey: Clear
          { path: "Category/Song 5.tja", title: "Song 5" }, // White: Failed
          { path: "Category/Song 6.tja", title: "Song 6" }, // No data
        ];

        // Mock Playdata
        const playdata = {
          version: 2,
          entries: [
            {
              songId: "song1", // Gold
              difficulty: 3,
              crown: 2, // FullCombo
              scoreRank: 5, // Gold
              great: 500, // Greats
              good: 15, // Oks
              bad: 0,
              score: 1000000,
            },
            {
              songId: "song2", // Cyan
              difficulty: 3,
              crown: 3, // Perfect
              scoreRank: 6, // Rainbow
              great: 1000,
              good: 0,
              bad: 0,
              score: 1000000,
            },
            {
              songId: "song3", // Green
              difficulty: 3,
              crown: 2, // FullCombo
              scoreRank: 4, // Pink
              great: 400,
              good: 5, // < 10 OKs -> Green
              bad: 0,
              score: 900000,
            },
            {
              songId: "song4", // Grey
              difficulty: 3,
              crown: 1, // Clear
              scoreRank: 3, // Gold (rank doesn't affect strip color in DN style, but just to be realistic)
              great: 300,
              good: 50,
              bad: 5,
              score: 800000,
            },
            {
              songId: "song5", // White
              difficulty: 3,
              crown: 0, // None (Failed)
              scoreRank: 2, // Silver
              great: 100,
              good: 50,
              bad: 20,
              score: 500000,
            },
          ],
        };

        // Mock LocalStorage
        localStorage.setItem("tja_analyzer_playdata", JSON.stringify(playdata));
        localStorage.setItem(
          "tja_analyzer_profile",
          JSON.stringify({
            chartListDisplayMode: modeVal,
          }),
        );

        // Force reload settings and data
        // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
        const el = document.querySelector("chart-list-panel") as any;
        if (el) {
          window.dispatchEvent(new Event("settings-change"));
          el.searchQuery = ""; // Trigger render
        }
      }, mode);

      await expect(component).toBeVisible();

      const song1Row = component.locator(".ese-result-item", { hasText: "Song 1" });
      const song2Row = component.locator(".ese-result-item", { hasText: "Song 2" });
      const song3Row = component.locator(".ese-result-item", { hasText: "Song 3" });
      const song4Row = component.locator(".ese-result-item", { hasText: "Song 4" });
      const song5Row = component.locator(".ese-result-item", { hasText: "Song 5" });

      if (mode === "dnStyleWithCounts") {
        await expect(song1Row.locator(".judgement-counts-chip")).toBeVisible();
        await expect(song1Row.locator(".judgement-counts-chip")).toHaveText("15(0)"); // Gold: 0 bads, but >10 oks

        await expect(song2Row.locator(".judgement-counts-chip")).toBeVisible();
        await expect(song2Row.locator(".judgement-counts-chip")).toHaveText("0(0)"); // Cyan: 0 bads, 0 oks

        await expect(song3Row.locator(".judgement-counts-chip")).toBeVisible();
        await expect(song3Row.locator(".judgement-counts-chip")).toHaveText("5(0)"); // Green: 0 bads, <10 oks

        await expect(song4Row.locator(".judgement-counts-chip")).toBeVisible();
        await expect(song4Row.locator(".judgement-counts-chip")).toHaveText("50(5)"); // Grey: 5 bads

        await expect(song5Row.locator(".judgement-counts-chip")).toBeVisible();
        await expect(song5Row.locator(".judgement-counts-chip")).toHaveText("50(20)"); // White: 20 bads
      }

      await expect(component).toHaveScreenshot(`chart-list-${mode}.png`);
    });
  }
});
