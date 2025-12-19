import { test, expect } from '@playwright/test';

test.describe('Annotation Inference', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        await page.waitForTimeout(2000);
        await page.selectOption('#difficulty-selector', 'oni');
        await page.waitForTimeout(500);
        
        // Switch to Annotation Tab to hide bar numbers and enable clicking
        await page.click('button[data-do-tab="annotation"]');
        await page.waitForTimeout(500);
    });

    test('Inference Coloring - Mismatch Sequence', async ({ page }) => {
        const canvas = page.locator('#chart-canvas');
        
        const barWidth = await page.evaluate(() => {
            const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
            const PADDING = 20;
            const BARS_PER_ROW = 4;
            return (canvas.clientWidth - (PADDING * 2)) / BARS_PER_ROW;
        });
        
        // Note 0 (Bar 0, Big Don)
        const note0Pos = { x: 20 + (barWidth * 0.14) / 2, y: 33 }; // Approx position, center of note 0
        // Wait, note 0 is at the start of bar 0.
        // Bar 0 x = 20.
        // Note 0 x = 20.
        // But Big Note radius is larger.
        // Let's use the layout logic.
        // Bar 0: `3,`. Length 1.
        // Note 0 is at index 0. x = 20 + 0 * step. step = width / 1 = width.
        // Wait, hit testing uses distance.
        // x = 20.
        
        // Note 1 (Bar 1, Big Don)
        // Bar 1 x = 20 + barWidth.
        // Note 1 x = 20 + barWidth.
        
        // 1. Annotate Note 0 as 'L'. (Click once -> L).
        // Default inference is R. User L -> Mismatch (Red).
        await canvas.click({ position: { x: 20 + 10, y: 33 } }); 

        // 2. Annotate Note 1 as 'L'. (Click once -> L).
        // Previous (User) was L. Next Inferred is R.
        // User L -> Mismatch (Red).
        await canvas.click({ position: { x: 20 + barWidth + 10, y: 33 } });

        await expect(canvas).toHaveScreenshot('inference-mismatch-red.png');
    });

    test('Inference Coloring - Match Sequence', async ({ page }) => {
        const canvas = page.locator('#chart-canvas');
        const barWidth = await page.evaluate(() => {
            const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
            const PADDING = 20;
            const BARS_PER_ROW = 4;
            return (canvas.clientWidth - (PADDING * 2)) / BARS_PER_ROW;
        });

        // 1. Annotate Note 0 as 'R'. (Click twice -> L -> R).
        // Default inference is R. User R -> Match (Black).
        await canvas.click({ position: { x: 20 + 10, y: 33 } });
        await canvas.click({ position: { x: 20 + 10, y: 33 } });

        // 2. Annotate Note 1 as 'L'. (Click once -> L).
        // Previous (User) was R. Next Inferred is L.
        // User L -> Match (Black).
        await canvas.click({ position: { x: 20 + barWidth + 10, y: 33 } });

        await expect(canvas).toHaveScreenshot('inference-match-black.png');
    });
});
