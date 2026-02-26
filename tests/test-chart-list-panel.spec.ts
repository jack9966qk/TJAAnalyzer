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

    await expect(statusDisplay).toContainText(/Chart loaded/i);

    const shareBtn = page.locator("#ese-share-btn");
    await expect(shareBtn).not.toBeDisabled();
  });

  test("Playdata Status Strips", async ({ page }) => {
    // Mock song mapping
    const mockMapping = {
      "100": { esePath: "cat1/song_perfect.tja", defaultTitle: "Song Perfect" },
      "101": { esePath: "cat1/song_fc.tja", defaultTitle: "Song Full Combo" },
      "102": { esePath: "cat1/song_played.tja", defaultTitle: "Song Played" },
      "103": { esePath: "cat1/song_none.tja", defaultTitle: "Song Failed" },
      "104": { esePath: "cat1/song_mixed.tja", defaultTitle: "Song Mixed" },
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

    // 4. Failed -> No status color, but strip is present for alignment
    const itemFailed = page.locator(".ese-result-item").filter({ hasText: "Song Failed" });
    await expect(itemFailed.locator(".play-status-strip")).toBeVisible();
    await expect(itemFailed.locator(".play-status-strip")).not.toHaveClass(/status-perfect/);
    await expect(itemFailed.locator(".play-status-strip")).not.toHaveClass(/status-fullcombo/);
    await expect(itemFailed.locator(".play-status-strip")).not.toHaveClass(/status-played/);

    // 5. Mixed (Failed Hard + FC Normal) -> Should be Gold (FC), ignoring the failed run
    const itemMixed = page.locator(".ese-result-item").filter({ hasText: "Song Mixed" });
    await expect(itemMixed.locator(".play-status-strip")).toHaveClass(/status-fullcombo/);
  });

  test("Advanced Search Playdata Filter", async ({ page }) => {
    // Mock song mapping - 3 songs with distinct DN categories
    const mockMapping = {
      "200": { esePath: "cat1/song_cyan.tja", defaultTitle: "Song Cyan" },
      "201": { esePath: "cat1/song_gold.tja", defaultTitle: "Song Gold" },
      "202": { esePath: "cat1/song_grey.tja", defaultTitle: "Song Grey" },
    };

    // Mock playdata:
    //   song_cyan: great=100, good=0, bad=0, crown=3 -> dn-cyan (perfect)
    //   song_gold: great=90, good=10, bad=0, crown=2 -> dn-gold (FC, good>=10)
    //   song_grey: great=80, good=15, bad=5, crown=1 -> dn-grey (clear)
    const mockPlaydata = {
      version: 2,
      updatedAt: "2023-01-01",
      source: "fumen-database",
      entries: [
        { songId: "200", difficulty: 4, crown: 3, scoreRank: 6, great: 100, good: 0, bad: 0 },
        { songId: "201", difficulty: 4, crown: 2, scoreRank: 5, great: 90, good: 10, bad: 0 },
        { songId: "202", difficulty: 4, crown: 1, scoreRank: 4, great: 80, good: 15, bad: 5 },
      ],
    };

    const mockIndex = [
      { path: "cat1/song_cyan.tja", title: "Song Cyan" },
      { path: "cat1/song_gold.tja", title: "Song Gold" },
      { path: "cat1/song_grey.tja", title: "Song Grey" },
    ];

    await page.route("**/data/song_mapping.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockMapping) }),
    );
    await page.route("**/ese_index.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockIndex) }),
    );

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
    await expect(page.locator(".ese-result-item").first()).toBeVisible();

    // All 3 songs should be visible initially
    await expect(page.locator(".ese-result-item")).toHaveCount(3);

    // Open advanced search modal
    await page.locator(".adv-search-open-btn").click();
    await expect(page.locator("#advanced-search-modal.open")).toBeVisible();

    // Select "Perfect" (dn-cyan) from the playdata dropdown
    const playdataSelect = page.locator("#advanced-search-modal.open select").last();
    await playdataSelect.selectOption("dn-cyan");

    // Apply
    await page.locator("#advanced-search-modal.open").getByText("Apply").click();

    // Only Song Cyan should remain (dn-cyan = perfect play)
    await expect(page.locator(".ese-result-item")).toHaveCount(1);
    await expect(page.locator(".ese-result-item").first()).toContainText("Song Cyan");

    // Re-open advanced search (now shows as active bar)
    await page.locator(".adv-search-active-bar").click();
    await expect(page.locator("#advanced-search-modal.open")).toBeVisible();

    // Switch to "Clear" (dn-grey)
    const playdataSelect2 = page.locator("#advanced-search-modal.open select").last();
    await playdataSelect2.selectOption("dn-grey");
    await page.locator("#advanced-search-modal.open").getByText("Apply").click();

    // Only Song Grey should remain
    await expect(page.locator(".ese-result-item")).toHaveCount(1);
    await expect(page.locator(".ese-result-item").first()).toContainText("Song Grey");

    // Clear all filters
    await page.locator(".adv-search-clear-btn").click();

    // All 3 songs should be visible again
    await expect(page.locator(".ese-result-item")).toHaveCount(3);
  });

  test("Advanced Search DFC Difficulty Filter", async ({ page }) => {
    // Mock ESE index with 10-star songs that have DFC difficulty data
    const mockIndex = [
      {
        path: "cat1/song_ss.tja",
        title: "Song SS",
        courses: { oni: { level: 10, maxCombo: 1000 } },
        dfcDifficulty: { oni: "SS" },
      },
      {
        path: "cat1/song_ia.tja",
        title: "Song iA",
        courses: { oni: { level: 10, maxCombo: 800 } },
        dfcDifficulty: { oni: "iA" },
      },
      {
        path: "cat1/song_no_dfc.tja",
        title: "Song No DFC",
        courses: { oni: { level: 10, maxCombo: 600 } },
      },
    ];

    await page.route("**/ese_index.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockIndex) }),
    );

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
    await expect(page.locator(".ese-result-item").first()).toBeVisible();

    // All 3 songs should be visible initially
    await expect(page.locator(".ese-result-item")).toHaveCount(3);

    // Open advanced search modal
    await page.locator(".adv-search-open-btn").click();
    await expect(page.locator("#advanced-search-modal.open")).toBeVisible();

    // Select "SS" from the DFC dropdown
    // The DFC select is after difficulty, stars, so we find it by its label context
    const dfcSelect = page.locator("#advanced-search-modal.open select").nth(1); // 0=difficulty, 1=DFC
    await dfcSelect.selectOption("SS");

    // Verify stars was auto-set to 10
    const starsInput = page.locator('#advanced-search-modal.open input[type="number"]').first();
    await expect(starsInput).toHaveValue("10");

    // Apply
    await page.locator("#advanced-search-modal.open").getByText("Apply").click();

    // Only Song SS should remain
    await expect(page.locator(".ese-result-item")).toHaveCount(1);
    await expect(page.locator(".ese-result-item").first()).toContainText("Song SS");

    // Re-open advanced search
    await page.locator(".adv-search-active-bar").click();
    await expect(page.locator("#advanced-search-modal.open")).toBeVisible();

    // Change stars to 9 (should auto-clear DFC)
    const starsInput2 = page.locator('#advanced-search-modal.open input[type="number"]').first();
    await starsInput2.fill("9");
    await starsInput2.dispatchEvent("input");

    // DFC select should be reset to "Any" (empty value)
    const dfcSelect2 = page.locator("#advanced-search-modal.open select").nth(1);
    await expect(dfcSelect2).toHaveValue("");

    // Clear all and restore
    await page.locator("#advanced-search-modal.open").getByText("Clear All").click();
    await expect(page.locator(".ese-result-item")).toHaveCount(3);
  });

  test("Advanced Search Difficulty-Specific Results", async ({ page }) => {
    // Mock ESE index with a song that has both oni and ura courses, different DFC ratings
    const mockIndex = [
      {
        path: "cat1/song_both.tja",
        title: "Song Both",
        courses: {
          oni: { level: 10, maxCombo: 999 },
          ura: { level: 10, maxCombo: 1111 },
        },
        dfcDifficulty: { oni: "SS", ura: "iA" },
      },
    ];

    await page.route("**/ese_index.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockIndex) }),
    );

    await page.goto("/");

    // Open list tab
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0 && (await dsBody.getAttribute("class"))?.includes("collapsed")) {
      await page.click("#ds-panel-header");
    }
    await page.locator('button[data-mode="list"]').click();
    await expect(page.locator(".ese-result-item").first()).toBeVisible();

    // With no filter, one result (path or base title)
    await expect(page.locator(".ese-result-item")).toHaveCount(1);
    await expect(page.locator(".ese-result-item").first()).toContainText("Song Both");
    await expect(page.locator(".ese-result-item").first()).not.toContainText("(Oni)");

    // Open advanced search
    await page.locator(".adv-search-open-btn").click();
    await expect(page.locator("#advanced-search-modal.open")).toBeVisible();

    // Select DFC SS (which matches only the oni difficulty)
    const dfcSelect = page.locator("#advanced-search-modal.open select").nth(1);
    await dfcSelect.selectOption("SS");
    await page.locator("#advanced-search-modal.open").getByText("Apply").click();

    // Result should have "(Oni)" suffix
    await expect(page.locator(".ese-result-item")).toHaveCount(1);
    await expect(page.locator(".ese-result-item").first()).toContainText("Song Both (Oni)");

    // Open advanced search again and switch to DFC iA (which matches only the ura difficulty)
    await page.locator(".adv-search-active-bar").click();
    await expect(page.locator("#advanced-search-modal.open")).toBeVisible();
    await dfcSelect.selectOption("iA");
    await page.locator("#advanced-search-modal.open").getByText("Apply").click();

    // Result should have "(Ura)" suffix
    await expect(page.locator(".ese-result-item")).toHaveCount(1);
    console.log("ITEM TEXT:", await page.locator(".ese-result-item").first().textContent());
    await expect(page.locator(".ese-result-item").first()).toContainText("Song Both (Ura)");
  });

  test("Difficulty-Specific Playdata Display", async ({ page }) => {
    // Song has two difficulties played: oni (Perfect) and ura (Played/Clear)
    const mockMapping = {
      "300": { esePath: "cat1/song_diff.tja", defaultTitle: "Song Diff" },
    };

    const mockPlaydata = {
      version: 2,
      updatedAt: "2023-01-01",
      source: "fumen-database",
      entries: [
        { songId: "300", difficulty: 4, crown: 3, scoreRank: 6, great: 100, good: 0, bad: 0 }, // Oni - Perfect (dn-cyan)
        { songId: "300", difficulty: 5, crown: 1, scoreRank: 4, great: 80, good: 15, bad: 5 }, // Ura - Clear (dn-grey)
      ],
    };

    const mockIndex = [
      {
        path: "cat1/song_diff.tja",
        title: "Song Diff",
        courses: { oni: { level: 9 }, ura: { level: 9 } },
      },
    ];

    await page.route("**/data/song_mapping.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockMapping) }),
    );
    await page.route("**/ese_index.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockIndex) }),
    );
    await page.addInitScript((data) => {
      localStorage.setItem("tja_analyzer_playdata", JSON.stringify(data));
    }, mockPlaydata);

    await page.goto("/");

    // Open list tab
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0 && (await dsBody.getAttribute("class"))?.includes("collapsed")) {
      await page.click("#ds-panel-header");
    }
    await page.locator('button[data-mode="list"]').click();
    await expect(page.locator(".ese-result-item").first()).toBeVisible();

    // Without filters, one result showing Played (highest difficulty played or overall best)
    await expect(page.locator(".ese-result-item")).toHaveCount(1);
    await expect(page.locator(".ese-result-item").first().locator(".play-status-strip")).toHaveClass(/status-played/);

    // Filter by Stars = 9 (both difficulties match, so both should be shown)
    await page.locator(".adv-search-open-btn").click();
    const starsInput = page.locator('#advanced-search-modal.open input[type="number"]').first();
    await starsInput.fill("9");
    await starsInput.dispatchEvent("input");
    await page.locator("#advanced-search-modal.open").getByText("Apply").click();

    // Only one result actually visible initially but now there should be 2, "Song Diff (Oni)" and "Song Diff (Ura)"
    await expect(page.locator(".ese-result-item")).toHaveCount(2);

    const itemOni = page.locator(".ese-result-item").filter({ hasText: "Song Diff (Oni)" }).first(); // avoid matching (Ura)
    // To properly filter just "Song Diff (Oni)" we can use exact matching or class assertion safely
    const itemUra = page.locator(".ese-result-item").filter({ hasText: "Song Diff (Ura)" });

    // Verify Oni specific playdata: Perfect
    await expect(itemOni.locator(".play-status-strip")).toHaveClass(/status-perfect/);

    // Verify Ura specific playdata: Clear
    await expect(itemUra.locator(".play-status-strip")).toHaveClass(/status-played/);

    // Verify playdata filter "Clear" only shows Ura
    await page.locator(".adv-search-active-bar").click();
    const playdataSelect = page.locator("#advanced-search-modal.open select").last();
    await playdataSelect.selectOption("dn-grey");
    await page.locator("#advanced-search-modal.open").getByText("Apply").click();

    await expect(page.locator(".ese-result-item")).toHaveCount(1);
    await expect(page.locator(".ese-result-item").first()).toContainText("Song Diff (Ura)");
  });
});
