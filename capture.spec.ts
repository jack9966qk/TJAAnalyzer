import { test } from '@playwright/test';

test('capture current state', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Select the canvas
    const canvas = page.locator('#chart-canvas');
    await canvas.waitFor({ state: 'visible' });

    // Wait for the renderer to finish drawing
    await page.waitForTimeout(2000); 

    // Save the screenshot to the root directory
    const outputPath = 'snapshot.png';
    await canvas.screenshot({ path: outputPath });
    
    console.log(`Snapshot saved to: ${outputPath}`);
});