import { expect, test } from "@playwright/test";

test.describe("Stream Panel Component", () => {
  test("Connect Button State Interaction", async ({ page }) => {
    await page.goto("/");

    // Enable Tester Mode (now in Settings panel)
    await page.click(".settings-btn");
    await page.click("text=Developer Mode");
    await page.locator("#settings-modal .close-btn").click();

    // Open Data Source Panel if collapsed
    const dsBody = page.locator("#ds-body");
    const isCollapsed = await dsBody.getAttribute("class").then((c) => c?.includes("collapsed"));
    if (isCollapsed) {
      await page.click("#ds-panel-header");
    }

    // Switch to Stream tab
    await page.click('[data-mode="stream"]');

    const connectBtn = page.locator("#connect-btn");
    await expect(connectBtn).toBeVisible();
    await expect(connectBtn).toHaveText("Connect");

    // Fill inputs
    const hostInput = page.locator("#host-input");
    const portInput = page.locator("#port-input");
    await hostInput.fill("localhost");
    await portInput.fill("12345");

    // Switch to Tester tab to start simulation
    await page.click('[data-mode="tester"]');
    const testBtn = page.locator("#test-stream-btn");
    await testBtn.click();

    // Switch back to Stream tab
    await page.click('[data-mode="stream"]');

    // Connect button should be disabled because simulation is running
    await expect(connectBtn).toBeDisabled();

    // Stop simulation by switching to File tab (or back to Tester and stop)
    // Switching to File tab disconnects
    await page.click('[data-mode="file"]');

    // Switch back to Stream tab
    await page.click('[data-mode="stream"]');
    await expect(connectBtn).not.toBeDisabled();
  });
});
