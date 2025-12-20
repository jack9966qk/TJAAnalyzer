import { test, expect } from '@playwright/test';

test('Reproduction: Hit detection offset', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    await page.goto('/');
    const canvas = page.locator('#chart-canvas');
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(2000);
    
    // Switch to Selection Mode
    await page.click('button[data-do-tab="selection"]');

    // Calculate expected positions
    const dimensions = await page.evaluate(() => {
        const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
        const w = canvas.clientWidth;
        const PADDING = 20;
        const availableWidth = w - (PADDING * 2);
        const baseBarWidth = availableWidth / 4; // 16 beats / 4
        const BAR_HEIGHT = baseBarWidth * 0.14;
        const HEADER_HEIGHT_RATIO = 0.35;
        const headerHeight = baseBarWidth * HEADER_HEIGHT_RATIO;
        return { w, baseBarWidth, BAR_HEIGHT, headerHeight };
    });

    const padding = 20;
    const offsetY = padding + dimensions.headerHeight + padding;
    const visualNoteY = offsetY + dimensions.BAR_HEIGHT / 2;
    
    // Target the first note (Ka)
    // Layout X starts at PADDING. The first note is at index 0.
    // X = PADDING + (0 * noteStep)
    // But wait, the first bar in Edit difficulty is:
    // 220000000000200000200000000000200000200000200000
    // It has 48 characters.
    // noteStep = width / 48.
    // We aim for index 0. X = PADDING.
    const visualNoteX = padding + 5; // Slight offset to be safe
    
    console.log(`Calculated Visual Y: ${visualNoteY}`);

    // Attempt to select by clicking on the VISUAL location of the note
    await canvas.click({ position: { x: visualNoteX, y: visualNoteY } });

    // Check stats
    const stats = page.locator('#note-stats-display');
    const text = await stats.innerText();
    console.log(`Stats Text: ${text}`);
    
    // Expect "ka" to be present (case insensitive usually, but innerText preserves case)
    // The UI displays "ka" for '2'.
    await expect(stats).toContainText('ka');
});