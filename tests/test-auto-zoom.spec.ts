import { expect, test } from "@playwright/test";

test.describe("Auto Zoom Feature", () => {
  test("Auto Zoom Checkbox Interaction and Window Resize", async ({ page }) => {
    test.setTimeout(60000);
    await page.goto("/");
    await page.waitForTimeout(500);

    // Expand options if needed (though usually open by default on desktop)
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }

    const zoomAutoCheckbox = page.locator("#zoom-auto-checkbox");
    const zoomResetBtn = page.locator("#zoom-reset-btn");
    const zoomInBtn = page.locator("#zoom-in-btn");
    const zoomOutBtn = page.locator("#zoom-out-btn");

    await expect(zoomAutoCheckbox).toBeVisible();
    await expect(zoomAutoCheckbox).not.toBeChecked();

    // Enable Auto Zoom
    await zoomAutoCheckbox.check();
    await expect(zoomAutoCheckbox).toBeChecked();

    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(1000);

    // New logic caps at 32 beats per line -> 50% zoom (16/32)
    await expect(zoomResetBtn).toHaveText("50%");
    const text1 = await zoomResetBtn.textContent();

    await page.setViewportSize({ width: 1400, height: 900 });
    await page.waitForTimeout(1000); // Wait for debouncing/resize observer
    const text2 = await zoomResetBtn.textContent();
    expect(text1).not.toEqual(text2);
    // Width ~970. MaxBeats ~22. Limit 22. 20 beats (multiple of 4) is best.
    // 16 / 20 = 80%
    await expect(zoomResetBtn).toHaveText("80%");

    await page.setViewportSize({ width: 600, height: 600 });
    await page.waitForTimeout(1000);
    // Width ~480. MaxBeats ~11. Best multiple of 4 is 8.
    // 16 / 8 = 200%
    await expect(zoomResetBtn).toHaveText("200%");

    // Verify Auto is still active
    await expect(zoomAutoCheckbox).toBeChecked();

    // Manual Zoom Out -> Should disable Auto
    await zoomOutBtn.click();
    await expect(zoomAutoCheckbox).not.toBeChecked();

    // Re-enable Auto
    await zoomAutoCheckbox.check();
    await expect(zoomAutoCheckbox).toBeChecked();

    // Manual Zoom In -> Should disable Auto
    await zoomInBtn.click();
    await expect(zoomAutoCheckbox).not.toBeChecked();

    // Re-enable Auto
    await zoomAutoCheckbox.check();
    await expect(zoomAutoCheckbox).toBeChecked();

    // Reset -> Should disable Auto
    await zoomResetBtn.click();
    await expect(zoomAutoCheckbox).not.toBeChecked();
    await expect(zoomResetBtn).toHaveText("100%");
  });
});
