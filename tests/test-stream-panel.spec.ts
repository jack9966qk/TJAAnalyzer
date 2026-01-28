import { expect, test } from "@playwright/test";

test.describe("Stream Panel Component", () => {
  test("Connect Button State Interaction", async ({ page }) => {
    await page.goto("/");

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

    // We can't easily mock EventSource in Playwright without some work,
    // but we can verify that clicking it disables it momentarily or changes state if we could mock.

    // Instead, let's test the interactions with the inputs
    const hostInput = page.locator("#host-input");
    const portInput = page.locator("#port-input");

    await hostInput.fill("localhost");
    await portInput.fill("12345");

    // We rely on the existing "Test Stream" tests for functional verification of state changes,
    // as "Test Stream" simulates a successful connection (simulation mode).

    // Let's verify that "Test Stream" disables "Connect" button?
    // Based on logic: if isSimulating, disableConnect = true?
    // In code: disableConnect = isConnectingState || isSimulating;

    const testBtn = page.locator("#test-stream-btn");
    await testBtn.click();

    // Now simulating. Connect button should be disabled?
    // Let's check my implementation of StreamPanel.tsx
    // const disableConnect = isConnectingState || isSimulating;
    // Yes.

    await expect(connectBtn).toBeDisabled();

    // Stop simulation
    await testBtn.click();
    await expect(connectBtn).not.toBeDisabled();
  });
});
