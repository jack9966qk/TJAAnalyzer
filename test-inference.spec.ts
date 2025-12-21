import { test, expect } from '@playwright/test';

test.describe('Annotation Inference', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(500);
        // Ensure options panel is expanded
        const optionsBody = page.locator('#options-body');
        if (await optionsBody.count() > 0) {
            const classes = await optionsBody.getAttribute('class');
            if (classes && classes.includes('collapsed')) {
                await page.click('#options-collapse-btn');
                await page.waitForTimeout(500);
            }
        }
        // Ensure data source panel is expanded
        const dsBody = page.locator('#ds-body');
        if (await dsBody.count() > 0) {
            const classes = await dsBody.getAttribute('class');
            if (classes && classes.includes('collapsed')) {
                await page.click('#ds-collapse-btn');
                await page.waitForTimeout(500);
            }
        }
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
        
        const dimensions = await page.evaluate(() => {
            const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
            const PADDING = 20;
            const BARS_PER_ROW = 4;
            const availableWidth = canvas.clientWidth - (PADDING * 2);
            const barWidth = availableWidth / BARS_PER_ROW;
            const headerHeight = barWidth * 0.35;
            const y = PADDING + headerHeight + PADDING + (barWidth * 0.14) / 2;
            return { barWidth, y };
        });
        
        const { barWidth, y } = dimensions;
        
        // Note 0 (Bar 0, Big Don)
        // Note 1 (Bar 1, Big Don)
        
        // 1. Annotate Note 0 as 'L'. (Click once -> L).
        // Default inference is R. User L -> Mismatch (Red).
        await canvas.click({ position: { x: 20 + 10, y: y } }); 

        // 2. Annotate Note 1 as 'L'. (Click once -> L).
        // Previous (User) was L. Next Inferred is R.
        // User L -> Mismatch (Red).
        await canvas.click({ position: { x: 20 + barWidth + 10, y: y } });

        await expect(canvas).toHaveScreenshot('inference-mismatch-red.png');
    });

    test('Inference Coloring - Match Sequence', async ({ page }) => {
        const canvas = page.locator('#chart-canvas');
        const dimensions = await page.evaluate(() => {
            const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
            const PADDING = 20;
            const BARS_PER_ROW = 4;
            const availableWidth = canvas.clientWidth - (PADDING * 2);
            const barWidth = availableWidth / BARS_PER_ROW;
            const headerHeight = barWidth * 0.35;
            const y = PADDING + headerHeight + PADDING + (barWidth * 0.14) / 2;
            return { barWidth, y };
        });
        
        const { barWidth, y } = dimensions;

        // 1. Annotate Note 0 as 'R'. (Click twice -> L -> R).
        // Default inference is R. User R -> Match (Black).
        await canvas.click({ position: { x: 20 + 10, y: y } });
        await canvas.click({ position: { x: 20 + 10, y: y } });

        // 2. Annotate Note 1 as 'L'. (Click once -> L).
        // Previous (User) was R. Next Inferred is L.
        // User L -> Match (Black).
        await canvas.click({ position: { x: 20 + barWidth + 10, y: y } });

        await expect(canvas).toHaveScreenshot('inference-match-black.png');
    });
});
