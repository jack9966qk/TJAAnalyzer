import { expect, test } from "@playwright/test";

test.describe("Language Selector Component", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders correctly with default state", async ({ page }) => {
    const selector = page.locator("language-selector");
    await expect(selector).toBeVisible();

    const btn = selector.locator(".lang-btn");
    await expect(btn).toBeVisible();

    // Check for icons
    await expect(btn.locator(".icon-language")).toBeVisible();
    await expect(btn.locator(".icon-chevron-down-small")).toBeVisible();

    // Check for hidden native select
    const select = selector.locator("select");
    await expect(select).toHaveCSS("opacity", "0");
    await expect(select).toHaveValue("en"); // Assuming default 'en'
  });

  test("shows correct options in native select", async ({ page }) => {
    const selector = page.locator("language-selector");
    const select = selector.locator("select");

    const options = select.locator("option");
    await expect(options).toHaveCount(3);
    await expect(options.nth(0)).toHaveText("English");
    await expect(options.nth(1)).toHaveText("中文");
    await expect(options.nth(2)).toHaveText("日本語");
  });

  test("switches language via native select", async ({ page }) => {
    const selector = page.locator("language-selector");
    const select = selector.locator("select");

    // Switch to Chinese
    await select.selectOption("zh");

    // Verify value changed
    await expect(select).toHaveValue("zh");

    // Switch back
    await select.selectOption("en");
    await expect(select).toHaveValue("en");
  });
});
