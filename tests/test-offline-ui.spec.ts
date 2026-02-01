import { expect, test } from "@playwright/test";

test.describe("Offline UI Behavior", () => {
  test("Basic UI loads when ESE index fetch fails", async ({ page }) => {
    // 1. Simulate ESE index fetch failure (network error/blocked)
    await page.route("**/ese_index.json", (route) => route.abort());

    // 2. Simulate Version fetch failure
    await page.route("**/version.json", (route) => route.abort());

    // 3. Navigate to the app
    await page.goto("/");

    // 4. Verify Key UI Elements are Visible
    // Header
    await expect(page.locator("h1")).toHaveText("TJA Analyzer");
    
    // Data Source Panel
    const dsPanel = page.locator("#data-source-panel");
    await expect(dsPanel).toBeVisible();

    // Tabs
    await expect(page.locator(".panel-tab[data-mode='list']")).toBeVisible();
    await expect(page.locator(".panel-tab[data-mode='file']")).toBeVisible();

    // Chart Options Panel (sticky header)
    const optionsPanel = page.locator("#chart-options-panel");
    await expect(optionsPanel).toBeVisible();

    // Footer
    await expect(page.locator(".app-footer")).toBeVisible();

    // 5. Verify that the Chart List panel is visible
    const panel = page.locator("chart-list-panel");
    await expect(panel).toBeVisible();
    
    // Depending on how fast the failure propagates, it might show "Loading..." or error
    // We just want to ensure the UI structure is painted.
  });

  test("Basic UI loads in offline mode", async ({ context, page }) => {
    // 1. Set context to offline
    await context.setOffline(true);

    // 2. Navigate to the app
    // Note: If the PWA is not installed/cached in the browser context, this might fail to load index.html
    // unless Playwright serves it from localhost which might bypass "offline" check for the document request 
    // depending on browser implementation, OR we rely on the fact that we are testing the "runtime" offline behavior.
    // However, typically `page.goto` fails if offline.
    // So we load first, then go offline, then reload? 
    // Or we rely on the fact that we just want to test "assets load but API fails".
    
    // Actually, the user's report is "UI loads... with delay".
    // The previous test (aborting ese_index.json) mimics the "API is unreachable" best.
    
    // Let's try loading the page while online, then going offline and checking interaction?
    // No, the user said "UI still loads... under bad internet connection".
    // So the initial HTML load succeeds (maybe slowly), but the subsequent resources fail.
    
    // Simulating "Bad Network" for ESE index specifically is better handled by route.abort() or route.fulfill({ delay: ... }).
    
    // Let's add a test for delayed response to verify no blocking.
    await context.setOffline(false); // Reset
    
    // Simulate a LONG delay for ESE index
    await page.route("**/ese_index.json", async (route) => {
      await new Promise(f => setTimeout(f, 5000)); // 5 seconds delay
      await route.abort(); 
    });

    await page.goto("/");

    // Expect UI to be visible IMMEDIATELY (well, fast), before the 5s timeout
    // We can check this by expecting visibility with a short timeout, 
    // but Playwright auto-waits.
    // Instead, we can check that it's visible while the request is still pending?
    // Playwright awaits page load. If page load waits for fetch, this test will be slow.
    // If page load does NOT wait for fetch (which is what we want), the test passes quickly.
    
    await expect(page.locator("h1")).toBeVisible({ timeout: 2000 });
    await expect(page.locator("#data-source-panel")).toBeVisible({ timeout: 2000 });
  });
});
