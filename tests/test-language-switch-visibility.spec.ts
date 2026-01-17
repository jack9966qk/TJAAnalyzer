import { expect, test } from "@playwright/test";

test.describe("Language Switch Visibility", () => {
  test("Switching language does not show hidden tabs", async ({ page }) => {
    await page.goto("/");

    // Open Data Source Panel if collapsed
    const dsBody = page.locator("#ds-body");
    const isCollapsed = await dsBody.getAttribute("class").then((c) => c?.includes("collapsed"));
    if (isCollapsed) {
      await page.click("#ds-collapse-btn");
    }

    // Ensure we are on "Chart List" tab (default)
    // The other tabs (Local File, Stream Input) should be hidden
    const localFileTab = page.locator("local-file-panel");
    const streamTab = page.locator("stream-panel");

    await expect(localFileTab).toBeHidden();
    await expect(streamTab).toBeHidden();

    // Change language
    const langSelect = page.locator("#language-selector");
    await langSelect.selectOption("zh");

    // Check if tabs remain hidden
    await expect(localFileTab).toBeHidden();
    await expect(streamTab).toBeHidden();

    // Switch to Local File tab
    await page.click('[data-mode="file"]');
    await expect(localFileTab).toBeVisible();
    await expect(streamTab).toBeHidden();

    // Change language back
    await langSelect.selectOption("en");

    // Check if visibility is maintained
    await expect(localFileTab).toBeVisible();
    await expect(streamTab).toBeHidden();
  });
});
