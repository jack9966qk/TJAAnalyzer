import { expect, test } from "@playwright/test";

test.describe("Advanced Search Snapshot", () => {
  test("matches snapshot", async ({ page }) => {
    const mockIndex = [
      {
        path: "cat1/song1.tja",
        title: "Song One",
        courses: { oni: { level: 10, maxCombo: 1000 } },
        platforms: ["NS1", "PS4"],
        region: { JP: 1, US: 1 },
      },
    ];

    await page.route("**/ese_index.json", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(mockIndex) }),
    );

    await page.goto("/");

    // Pin zoom to 100% so the chart behind the modal (visible through its
    // rounded corners) is independent of the auto-zoom default.
    await page.evaluate(() => window.setRenderOptions({ autoZoom: false, beatsPerLine: 16 }));

    // Expand panel if needed
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
      }
    }

    // Switch to list tab
    await page.locator('button[data-mode="list"]').click();
    await expect(page.locator(".ese-result-item").first()).toBeVisible();

    // Open advanced search modal
    await page.locator(".adv-search-open-btn").click();
    await expect(page.locator("#advanced-search-modal.open")).toBeVisible();

    // Screenshot only the modal content (inside shadow DOM)
    const modalContent = page.locator("#advanced-search-modal.open .modal-content");
    await expect(modalContent).toHaveScreenshot("advanced-search-modal.png");
  });
});
