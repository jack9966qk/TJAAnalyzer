import { test, expect } from '@playwright/test';

test.describe('Annotation Inference', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/chart-only.html');
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            if (!chart || !chart.shadowRoot) return false;
            const canvas = chart.shadowRoot.querySelector('canvas');
            return canvas && canvas.height > 0;
        });

        const tja = `TITLE:Inference Test
BPM:120
COURSE:Oni
LEVEL:10
#START
1000000000000000,
1000000000000000,
#END`;

        await page.evaluate((tjaContent) => {
            (window as any).loadChart(tjaContent, 'oni');
            (window as any).setOptions({
                viewMode: 'original',
                coloringMode: 'categorical',
                visibility: { perfect: true, good: true, poor: true },
                collapsedLoop: false,
                beatsPerLine: 16,
                selection: null,
                annotations: {},
                isAnnotationMode: true,
                showAllBranches: false
            });
        }, tja);
    });

    test('Inference Coloring - Mismatch Sequence', async ({ page }) => {
        const canvas = page.locator('tja-chart').locator('canvas'); // Access canvas inside shadow root? No, locator('tja-chart canvas') won't work easily if shadow.
        // Playwright handles shadow DOM automatically with locators if properly targeted, 
        // but 'tja-chart canvas' selector might fail if not explicitly penetrating shadow.
        // However, the previous test used `page.locator('tja-chart canvas')` which implies tja-chart didn't use shadow DOM or Playwright handled it.
        // Actually, tja-chart DOES use shadow DOM. 
        // Best practice: locator('tja-chart').locator('canvas') might not work if 'canvas' is in shadow root.
        // But Playwright's css engine penetrates shadow DOM by default.
        // Let's use `#chart-component` which is the ID of tja-chart in chart-only.html.
        
        const chartElement = page.locator('#chart-component');
        await expect(chartElement).toBeVisible();

        const dimensions = await page.evaluate(() => {
            const chart = document.getElementById('chart-component') as any;
            const canvas = chart.shadowRoot.querySelector('canvas');
            if (!canvas) throw new Error('Canvas not found');
            const PADDING = 20;
            const BARS_PER_ROW = 4;
            const availableWidth = canvas.clientWidth - (PADDING * 2);
            const barWidth = availableWidth / BARS_PER_ROW;
            const headerHeight = barWidth * 0.35;
            const y = PADDING + headerHeight + PADDING + (barWidth * 0.14) / 2;
            return { barWidth, y };
        });
        
        const { barWidth, y } = dimensions;
        
        // Note 0 (Bar 0, Start)
        // Note 1 (Bar 1, Start)
        
        // 1. Annotate Note 0 as 'L'. (Click once -> L).
        // Default inference is R. User L -> Mismatch (Red).
        await chartElement.click({ position: { x: 20 + 10, y: y } }); 

        // 2. Annotate Note 1 as 'L'. (Click once -> L).
        // Previous (User) was L. Next Inferred is R.
        // User L -> Mismatch (Red).
        await chartElement.click({ position: { x: 20 + barWidth + 10, y: y } });

        await expect(chartElement).toHaveScreenshot('inference-mismatch-red.png');
    });

    test('Inference Coloring - Match Sequence', async ({ page }) => {
        const chartElement = page.locator('#chart-component');
        await expect(chartElement).toBeVisible();

        const dimensions = await page.evaluate(() => {
            const chart = document.getElementById('chart-component') as any;
            const canvas = chart.shadowRoot.querySelector('canvas');
            if (!canvas) throw new Error('Canvas not found');
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
        await chartElement.click({ position: { x: 20 + 10, y: y } });
        await chartElement.click({ position: { x: 20 + 10, y: y } });

        // 2. Annotate Note 1 as 'L'. (Click once -> L).
        // Previous (User) was R. Next Inferred is L.
        // User L -> Match (Black).
        await chartElement.click({ position: { x: 20 + barWidth + 10, y: y } });

        await expect(chartElement).toHaveScreenshot('inference-match-black.png');
    });
});
