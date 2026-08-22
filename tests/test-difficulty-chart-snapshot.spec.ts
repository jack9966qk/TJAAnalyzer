import { expect, test } from "@playwright/test";

test.describe("Difficulty Chart Snapshot", () => {
  test("matches snapshot", async ({ page }) => {
    const songs = [
      {
        id: "500",
        title: "The Future of the Taiko Drum Extended Anniversary Version",
        section: "SS",
        category: "cyan",
      },
      { id: "501", title: "CRUXNAUT", section: "SS", category: "green" },
      { id: "502", title: "Infinite Rebellion", section: "SS", category: "gold" },
      { id: "503", title: "Destination 2F29", section: "SS", category: "grey" },
      { id: "504", title: "Vixitory", section: "SS", category: "white" },
      { id: "505", title: "Calamity Fortune", section: "iS+", category: "cyan" },
      { id: "506", title: "Central Dogma Pt.1", section: "iS+", category: "green" },
      { id: "507", title: "RAGING FIRE", section: "iS+", category: "gold" },
      { id: "508", title: "Siren's Eye", section: "iS+", category: "grey" },
      { id: "509", title: "疾風怒濤", section: "iS+", category: "white" },
      { id: "510", title: "Emma", section: "pS+", category: "cyan" },
      { id: "511", title: "CUT! Into the FUTURE", section: "pS+", category: "green" },
      { id: "512", title: "刻竜 Kokuryu", section: "pS+", category: "gold" },
      { id: "513", title: "アンリミテッドゲームズ", section: "pS+", category: "grey" },
      { id: "514", title: "最果の魔法使い", section: "pS+", category: "white" },
    ] as const;
    const mockMapping = Object.fromEntries(
      songs.map((song) => [song.id, { esePath: `cat1/${song.id}.tja`, defaultTitle: song.title }]),
    );
    const mockIndex = songs.map((song, index) => ({
      path: `cat1/${song.id}.tja`,
      title: song.title,
      courses: index === 14 ? { ura: { level: 10 } } : { oni: { level: 10 } },
      dfcDifficulty: index === 14 ? { ura: song.section } : { oni: song.section },
    }));
    const mockPlaydata = {
      version: 2,
      updatedAt: "2023-01-01",
      source: "fumen-database",
      entries: songs.map((song, index) => {
        const values = {
          cyan: { crown: 3, good: 0, bad: 0 },
          green: { crown: 2, good: 4, bad: 0 },
          gold: { crown: 2, good: 12, bad: 0 },
          grey: { crown: 1, good: 18, bad: 2 },
          white: { crown: 0, good: 24, bad: 8 },
        }[song.category];
        return {
          songId: song.id,
          difficulty: index === 14 ? 5 : 4,
          score: 1000000 - index * 23000,
          scoreRank: 7 - index,
          great: 1000 - values.good - values.bad,
          good: values.good,
          bad: values.bad,
          combo: 1000 - values.bad,
          drumroll: 0,
          crown: values.crown,
        };
      }),
    };

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
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0 && (await dsBody.getAttribute("class"))?.includes("collapsed")) {
      await page.click("#ds-panel-header");
    }
    await page.locator('button[data-mode="list"]').click();
    await expect(page.locator(".ese-result-item").first()).toBeVisible();

    await page.locator(".adv-search-open-btn").click();
    await page.locator("#advanced-search-modal.open").getByText("View ★10 Difficulty Chart").click();

    const modalContent = page.locator("#difficulty-chart-modal.open .modal-content");
    await expect(modalContent).toBeVisible();
    await expect(modalContent).toHaveScreenshot("difficulty-chart-modal.png", { maxDiffPixels: 20 });

    await page.setViewportSize({ width: 390, height: 844 });

    const firstGroupItems = page
      .locator("#difficulty-chart-modal.open .difficulty-chart-section")
      .first()
      .locator(".difficulty-chart-item");
    await expect(firstGroupItems).toHaveCount(5);
    await expect
      .poll(() =>
        firstGroupItems
          .evaluateAll((items) =>
            items.slice(0, 3).map((item) => {
              const bounds = item.getBoundingClientRect();
              return { x: bounds.x, y: bounds.y };
            }),
          )
          .then(([first, second, third]) =>
            Boolean(
              first && second && third && Math.abs(first.y - second.y) < 1 && second.x > first.x && third.y > first.y,
            ),
          ),
      )
      .toBe(true);

    const longTitle = page
      .locator("#difficulty-chart-modal.open .difficulty-chart-item-title")
      .filter({ hasText: /^The Future of the Taiko Drum Extended Anniversary Version$/ });
    await expect
      .poll(() =>
        longTitle.evaluate((title) => {
          const style = getComputedStyle(title);
          const baseline = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.875;
          const fontSize = Number.parseFloat(style.fontSize);
          const lineHeight = Number.parseFloat(style.lineHeight);
          const lines = Math.ceil((title.scrollHeight - 0.5) / lineHeight);
          const scale = fontSize / baseline;
          return lines <= 3 && scale < 1 && scale >= 0.7;
        }),
      )
      .toBe(true);

    await expect(modalContent).toHaveScreenshot("difficulty-chart-modal-mobile.png", { maxDiffPixels: 20 });

    const scrollArea = page.locator("#difficulty-chart-modal.open .modal-scroll-area");
    const firstHeader = page.locator("#difficulty-chart-modal.open .difficulty-chart-section h3").first();
    await expect(firstHeader).toHaveCSS("position", "sticky");
    await scrollArea.evaluate((element) => {
      element.scrollTop = 80;
    });
    await expect
      .poll(async () => {
        const [scrollBounds, headerBounds] = await Promise.all([scrollArea.boundingBox(), firstHeader.boundingBox()]);
        if (!scrollBounds || !headerBounds) return Number.POSITIVE_INFINITY;
        return Math.abs(headerBounds.y - scrollBounds.y);
      })
      .toBeLessThan(2);
  });
});
