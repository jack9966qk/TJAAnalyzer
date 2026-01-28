import { expect, test } from "@playwright/test";

test.describe("Chart List Panel Component", () => {
  test("Load Example Chart functionality", async ({ page }) => {
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

    await expect(loadExampleBtn).toBeVisible();
    await expect(loadExampleBtn).toBeDisabled();
    await expect(loadExampleBtn).toHaveText(/Example Data Loaded/i);

    const statusDisplay = page.locator("#status-display");

    const firstResult = page.locator(".ese-result-item").first();
    await firstResult.click();

    await expect(loadExampleBtn).not.toBeDisabled();
    await expect(loadExampleBtn).toHaveText(/Load Example Data/i);
    await expect(statusDisplay).toContainText(/Chart loaded from ESE/i);

    await loadExampleBtn.click();

    await expect(loadExampleBtn).toBeDisabled();
    await expect(loadExampleBtn).toHaveText(/Example Data Loaded/i);
    await expect(statusDisplay).toContainText(/Example chart loaded/i);

    const shareBtn = page.locator("#ese-share-btn");
    await expect(shareBtn).toBeDisabled();
  });
});
