import { expect, test } from "@playwright/test";

test.describe("Language Selector Snapshot", () => {
  test("matches snapshot", async ({ page }) => {
    await page.goto("/");
    const selector = page.locator("language-selector");
    await expect(selector).toBeVisible();

    // Wait for icons to load if necessary, though they are SVGs masked in CSS so should be immediate.
    // However, sometimes fonts or other things take a moment.
    // Just to be safe, we might wait a tiny bit or trust the locator visibility.

    await expect(selector).toHaveScreenshot("language-selector.png");
  });
});
