import { test } from '@playwright/test';
import path from 'path';

test('capture loop collapsed state', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('#chart-canvas');
    await canvas.waitFor({ state: 'visible' });

    // Upload the TJA file
    const filePath = path.join(process.cwd(), 'dev_instructions', 'loop_example.tja');
    await page.setInputFiles('#tja-file-picker', filePath);

    // Wait for parsing and rendering
    await page.waitForTimeout(1000);

    // Check "Collapse Loops"
    await page.check('#collapse-loop-checkbox');

    // Give renderer time to update
    await page.waitForTimeout(1000);

    // Save the screenshot
    const outputPath = 'loop_snapshot.png';
    await canvas.screenshot({ path: outputPath });
    
    console.log(`Snapshot saved to: ${outputPath}`);
});
