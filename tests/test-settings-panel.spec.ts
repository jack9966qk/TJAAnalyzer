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

  test("bookmarklet opens the app window before the blocking copy", async ({ page }) => {
    await page.goto("/");
    const bookmarklet = await page
      .locator("settings-panel")
      .evaluate((panel) => (panel as unknown as { getBookmarkletCode: () => string }).getBookmarkletCode());

    await page.setContent(
      `<html><body><a id="run" href="${bookmarklet}">run</a><div class="table_song_name">Source Page</div></body></html>`,
    );

    await page.evaluate(() => {
      const probe = window as unknown as { events: string[]; copied: string | null; activeOnOpen: boolean };
      probe.events = [];
      probe.copied = null;
      probe.activeOnOpen = false;

      document.execCommand = (command) => {
        if (command !== "copy" || !navigator.userActivation.isActive) return false;
        const textarea = document.activeElement;
        if (!(textarea instanceof HTMLTextAreaElement)) return false;
        probe.copied = textarea.value;
        probe.events.push("copied");
        return true;
      };

      window.open = ((url: string) => {
        probe.activeOnOpen = navigator.userActivation.isActive;
        probe.events.push(`opened:${url}`);
        return { postMessage: () => {} };
      }) as unknown as typeof window.open;
    });

    await page.click("#run");

    // window.open must come first and stay inside the gesture, otherwise popup blockers
    // reject it and the tab switch waits on the copy.
    const readEvents = () =>
      page.evaluate(() => (window as unknown as { events: string[] }).events.map((e) => e.split("?")[0]));
    await expect.poll(readEvents).toEqual([`opened:${new URL(page.url()).origin}/`, "copied"]);

    const { copied, activeOnOpen } = await page.evaluate(() => {
      const probe = window as unknown as { copied: string | null; activeOnOpen: boolean };
      return { copied: probe.copied, activeOnOpen: probe.activeOnOpen };
    });
    expect(activeOnOpen).toBe(true);
    expect(copied).toContain("Source Page");
  });

  test("shows a progress indicator while waiting for the bookmarklet HTML", async ({ page }) => {
    await page.goto("/");

    // The bookmarklet path needs a real window.opener, so drive the panel into the state
    // checkImportParameter() reaches when one is present.
    await page.locator("settings-panel").evaluate((panel) => {
      const settings = panel as unknown as {
        isModalOpen: boolean;
        isImportMode: boolean;
        isListeningForMessage: boolean;
        render: () => void;
      };
      settings.isModalOpen = true;
      settings.isImportMode = true;
      settings.isListeningForMessage = true;
      settings.render();
    });

    const progress = page.locator("#import-progress");
    await expect(progress).toBeVisible();
    await expect(progress).toContainText("Importing automatically from the bookmarklet");
    await expect(progress.locator(".import-progress-spinner")).toBeVisible();

    // The plain instruction line is replaced by the progress block, not shown alongside it.
    await expect(page.locator("#settings-modal")).not.toContainText("Paste HTML content from fumen-database below");
  });
});
