import { expect, test } from "@playwright/test";

test.describe("Stream Auto Switch Tab", () => {
  test("Switch to Judgements tab when stream connects", async ({ page }) => {
    await page.goto("/");

    // Open Data Source Panel if collapsed
    const dsBody = page.locator("#ds-body");
    const isCollapsed = await dsBody.getAttribute("class").then((c) => c?.includes("collapsed"));
    if (isCollapsed) {
      await page.click("#ds-collapse-btn");
    }

    // Switch to Stream tab
    await page.click('[data-mode="stream"]');

    // Ensure we are initially in View tab (default)
    const viewTab = page.locator('.panel-tab[data-do-tab="view"]');
    const judgementsTab = page.locator('.panel-tab[data-do-tab="judgements"]');

    await expect(viewTab).toHaveClass(/active/);
    await expect(judgementsTab).not.toHaveClass(/active/);

    // Start Test Stream
    const btn = page.locator("#test-stream-btn");
    await btn.click();

    // Verify we switched to Judgements tab
    await expect(judgementsTab).toHaveClass(/active/);
    await expect(viewTab).not.toHaveClass(/active/);
  });
});
