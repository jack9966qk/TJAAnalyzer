import { expect, test } from "@playwright/test";

test.describe("Chart List Panel Component", () => {
  test("List Functionality", async ({ page }) => {
    const mockData = [
      { path: "cat1/song1.tja", title: "Song One", titleJp: "曲１", url: "ese/cat1/song1.tja", type: "blob" },
    ];
    await page.route("**/ese_index.json", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockData),
      }),
    );
    await page.route("**/ese/cat1/song1.tja", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "TITLE:Song One\nBPM:120\nWAVE:song.ogg\nCOURSE:Oni\nLEVEL:8\nBALLOON:5\nSCOREINIT:400\nSCOREDIFF:100\n#START\n10101010,\n#END",
      }),
    );

    await page.goto("/");

    // Expand panel if needed
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }

    const listTab = page.locator('button[data-mode="list"]');
    await listTab.click();

    const loadExampleBtn = page.locator("#load-example-btn");
    await expect(loadExampleBtn).not.toBeVisible();

    const statusDisplay = page.locator("#status-display");

    const firstResult = page.locator(".ese-result-item").first();
    await firstResult.click();

    await expect(statusDisplay).toContainText(/Chart loaded from ESE/i);

    const shareBtn = page.locator("#ese-share-btn");
    await expect(shareBtn).not.toBeDisabled();
  });

  test("Playdata Status Strips", async ({ page }) => {
    // Mock song mapping
    const mockMapping = {
      "100": { esePath: "cat1/song_perfect.tja" },
      "101": { esePath: "cat1/song_fc.tja" },
      "102": { esePath: "cat1/song_played.tja" },
      "103": { esePath: "cat1/song_none.tja" },
      "104": { esePath: "cat1/song_mixed.tja" },
    };

    // Mock playdata in localStorage
    const mockPlaydata = {
      version: 2,
      updatedAt: "2023-01-01",
      source: "fumen-database",
      entries: [
        // Perfect (Crown 3)
        { songId: "100", difficulty: 4, crown: 3, scoreRank: 6, great: 100, good: 0, bad: 0 },
        // Full Combo (Crown 2)
        { songId: "101", difficulty: 4, crown: 2, scoreRank: 5, great: 90, good: 10, bad: 0 },
        // Played/Clear (Crown 1)
        { songId: "102", difficulty: 4, crown: 1, scoreRank: 4, great: 80, good: 15, bad: 5 },
        // Failed (Crown 0) - Should show no strip if it's the only entry
        { songId: "103", difficulty: 4, crown: 0, scoreRank: 0, great: 0, good: 0, bad: 100 },
        // Mixed: Failed Hard (Crown 0), FC Normal (Crown 2). Should show FC (Gold).
        { songId: "104", difficulty: 3, crown: 0, scoreRank: 0, great: 0, good: 0, bad: 50 },
        { songId: "104", difficulty: 2, crown: 2, scoreRank: 5, great: 50, good: 0, bad: 0 },
      ],
    };

    // Mock ESE Index
    const mockIndex = [
      { path: "cat1/song_perfect.tja", title: "Song Perfect" },
      { path: "cat1/song_fc.tja", title: "Song Full Combo" },
      { path: "cat1/song_played.tja", title: "Song Played" },
      { path: "cat1/song_none.tja", title: "Song Failed" },
      { path: "cat1/song_mixed.tja", title: "Song Mixed" },
    ];

    await page.route("**/data/song_mapping.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockMapping) }),
    );

    await page.route("**/ese_index.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockIndex) }),
    );

    // Inject playdata before page load
    await page.addInitScript((data) => {
      localStorage.setItem("tja_analyzer_playdata", JSON.stringify(data));
    }, mockPlaydata);

    await page.goto("/");

    // Open list tab
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
      }
    }
    await page.locator('button[data-mode="list"]').click();

    // Wait for results to load
    await expect(page.locator(".ese-result-item").first()).toBeVisible();

    // Verify strips
    // 1. Perfect -> Rainbow
    const itemPerfect = page.locator(".ese-result-item").filter({ hasText: "Song Perfect" });
    await expect(itemPerfect.locator(".play-status-strip")).toHaveClass(/status-perfect/);

    // 2. Full Combo -> Gold
    const itemFC = page.locator(".ese-result-item").filter({ hasText: "Song Full Combo" });
    await expect(itemFC.locator(".play-status-strip")).toHaveClass(/status-fullcombo/);

    // 3. Played -> Grey
    const itemPlayed = page.locator(".ese-result-item").filter({ hasText: "Song Played" });
    await expect(itemPlayed.locator(".play-status-strip")).toHaveClass(/status-played/);

    // 4. Failed -> No strip
    const itemFailed = page.locator(".ese-result-item").filter({ hasText: "Song Failed" });
    await expect(itemFailed.locator(".play-status-strip")).not.toBeVisible();

    // 5. Mixed (Failed Hard + FC Normal) -> Should be Gold (FC), ignoring the failed run
    const itemMixed = page.locator(".ese-result-item").filter({ hasText: "Song Mixed" });
    await expect(itemMixed.locator(".play-status-strip")).toHaveClass(/status-fullcombo/);
  });
});
