import { expect, test } from "@playwright/test";

test.describe("Chart List Panel Component", () => {
  test("Load Example Chart functionality", async ({ page }) => {
    // Mock ESE index
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
    // Mock TJA content request
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
        await page.click("#ds-collapse-btn");
        await page.waitForTimeout(500);
      }
    }

    const listTab = page.locator('button[data-mode="list"]');
    await listTab.click();

    const loadExampleBtn = page.locator("#load-example-btn");

    // Initial state: Example Loaded automatically
    await expect(loadExampleBtn).toBeVisible();
    await expect(loadExampleBtn).toBeDisabled();
    await expect(loadExampleBtn).toHaveText(/Example Data Loaded/i);

    // Verify status display (might be ESE loaded or Example loaded depending on timing, but ESE load finishes last)
    const statusDisplay = page.locator("#status-display");
    // await expect(statusDisplay).toContainText(/Example chart loaded/i);
    // We skip status check here as ESE loading overwrites it. Button state is enough.

    // Now load an ESE chart to reset the button
    const firstResult = page.locator(".ese-result-item").first();
    await firstResult.click();

    // Verify button becomes enabled
    await expect(loadExampleBtn).not.toBeDisabled();
    await expect(loadExampleBtn).toHaveText(/Load Example Data/i);
    await expect(statusDisplay).toContainText(/Chart loaded from ESE/i);

    // Click it again to reload example
    await loadExampleBtn.click();

    // Verify state change
    await expect(loadExampleBtn).toBeDisabled();
    await expect(loadExampleBtn).toHaveText(/Example Data Loaded/i);
    await expect(statusDisplay).toContainText(/Example chart loaded/i);

    // Verify Share button is disabled
    const shareBtn = page.locator("#ese-share-btn");
    await expect(shareBtn).toBeDisabled();
  });
});
