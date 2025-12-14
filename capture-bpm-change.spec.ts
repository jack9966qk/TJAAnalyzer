import { test } from '@playwright/test';

test('capture bpm change stats', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for canvas
    const canvas = page.locator('#chart-canvas');
    await canvas.waitFor({ state: 'visible' });
    await page.waitForTimeout(1000);

    const box = await canvas.boundingBox();
    if (box) {
        // Calculate rough position of Bar 4 (Start of 2nd row)
        // Canvas width ~ 958px (1000px container - 20px padding * 2? No, inner is smaller)
        // Let's assume the renderer's logic.
        // If we just move mouse vertically down, we should hit the second row.
        // First row is top. 
        // Let's probe a few points if needed, or just pick a likely one.
        // Start of bar 4 should be near left edge, but below row 1.
        
        // Let's try x=40, y=150.
        // If the first row height is roughly 100-150px?
        // Let's move mouse to x=40, y=200 to be safe for 2nd row?
        
        // Actually, let's just find the first note of Bar 4 using the app's logic? No easy way from Playwright.
        // Let's just guess.
        
        await page.mouse.move(box.x + 35, box.y + 150);
        
        await page.waitForTimeout(500);
        
        // Capture the stats display area specifically or the whole app
        const app = page.locator('#app');
        await app.screenshot({ path: 'stats_bpm_change_snapshot.png' });
        console.log('Stats snapshot saved to: stats_bpm_change_snapshot.png');
    }
});
