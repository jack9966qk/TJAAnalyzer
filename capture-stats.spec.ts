import { test } from '@playwright/test';

test('capture stats ui', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Wait for canvas
    const canvas = page.locator('#chart-canvas');
    await canvas.waitFor({ state: 'visible' });
    await page.waitForTimeout(1000);

    // Get the canvas bounding box
    const box = await canvas.boundingBox();
    if (box) {
        // Estimate position of the first note. 
        // Based on renderer logic: PADDING + (0 * barWidth) ...
        // It's the first note of the first bar.
        // Let's just hover slightly inside the top-left area where the first bar starts.
        // PADDING is 20. Bar height is small.
        // Let's try hovering at (35, 33) relative to canvas to hit the first note.
        await page.mouse.move(box.x + 35, box.y + 33);
        
        // Wait a bit for UI to update (it's synchronous but good practice)
        await page.waitForTimeout(500);
        
        // Capture the whole app container
        const app = page.locator('#app');
        await app.screenshot({ path: 'stats_snapshot.png' });
        console.log('Stats snapshot saved to: stats_snapshot.png');
    }
});
