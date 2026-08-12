import { expect, test } from "@playwright/test";

const FUMEN_DATABASE_HTML = `<html><head><meta charset="utf-8"></head><body>
  <p>最終更新：2026-02-10 02:01:52</p>
  <div class="table table_grid filter_selector genre_pops star8 difficulty_extreme crown_gold">
    <div class="table_grid_body table_grid_body_left table_song_name">
      <a href="/song/1439-4/423918217799">Test Song Delta</a>
    </div>
    <div class="table_grid_body table_crown table_crown_lightgold table_center">
      <img class="table_crown_image" src="/image/crown/crown_preDonderfull.png">
    </div>
    <div class="table_grid_body table_scorerank table_scorerank_data table_center">
      <img class="table_scorerank_image" src="/image/score/scoreRank_purple.png">
    </div>
    <div class="table_grid_body table_score table_totalscore table_center">999560</div>
    <div class="table_grid_body table_score table_good table_center">506</div>
    <div class="table_grid_body table_score table_ok table_center">9</div>
    <div class="table_grid_body table_score table_bad table_center">0</div>
    <div class="table_grid_body table_score table_combo table_center">515</div>
    <div class="table_grid_body table_score table_roll table_center">194</div>
  </div>
</body></html>`;

test.describe("Settings Panel", () => {
  test("copies imported HTML synchronously on iOS", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      Object.defineProperty(navigator, "userAgent", {
        configurable: true,
        value: "Mozilla/5.0 (iPhone; CPU iPhone OS 26_0 like Mac OS X) AppleWebKit/605.1.15",
      });
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: () => {
            sessionStorage.setItem("async-clipboard-used", "true");
            return Promise.reject(new DOMException("Not allowed", "NotAllowedError"));
          },
        },
      });
      document.execCommand = (command) => {
        if (command !== "copy" || !navigator.userActivation.isActive) return false;
        const textarea = document.activeElement;
        if (!(textarea instanceof HTMLTextAreaElement)) return false;
        sessionStorage.setItem("copied-html", textarea.value);
        return true;
      };
    });

    await page.locator("settings-panel").evaluate((panel) => {
      const settings = panel as unknown as { handleOpen: () => void; handleGoToImport: () => void };
      settings.handleOpen();
      settings.handleGoToImport();
    });
    await page.locator("#settings-modal textarea").fill(FUMEN_DATABASE_HTML);
    await page.locator("#import-playdata-btn button").click();

    await expect(page.locator("#settings-modal")).toContainText("Successfully imported 1 entries.");
    const copyButton = page.locator("#copy-imported-playdata-btn");
    await expect(copyButton).toBeVisible();
    await copyButton.locator("button").click();

    await expect.poll(() => page.evaluate(() => sessionStorage.getItem("copied-html"))).toBe(FUMEN_DATABASE_HTML);
    expect(await page.evaluate(() => sessionStorage.getItem("async-clipboard-used"))).toBeNull();
    await expect(copyButton).toContainText("Copied");
  });
});
