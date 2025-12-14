import { test, expect } from '@playwright/test';

test('stats display on hover', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('#chart-canvas');
    await expect(canvas).toBeVisible();

    // Wait for render
    await page.waitForTimeout(2000);

    // Switch to Oni
    await page.selectOption('#difficulty-selector', 'oni');
    await page.waitForTimeout(500);

    // Hover over the first note (DON Big)
    // Always at PADDING + 0
    await canvas.hover({ position: { x: 20, y: 33 } });

    // Check stats display
    const stats = page.locator('#note-stats-display');
    await expect(stats).toContainText('Type: DON');

    // Calculate bar width to find second note
    const barWidth = await page.evaluate(() => {
        const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
        const PADDING = 20;
        const BARS_PER_ROW = 4;
        return (canvas.clientWidth - (PADDING * 2)) / BARS_PER_ROW;
    });

    // Move to second bar (Row 0, Col 1)
    // X = 20 + barWidth
    const secondNoteX = 20 + barWidth;
    await canvas.hover({ position: { x: secondNoteX, y: 33 } });
    await expect(stats).toContainText('Type: DON');
    
    // Check gap
    // Gap should be 1.0 (1/1)
    const text = await stats.textContent();
    console.log('Stats text:', text);
    expect(text).toContain('Gap: 1/1'); // or 1.000, checking logic
});
