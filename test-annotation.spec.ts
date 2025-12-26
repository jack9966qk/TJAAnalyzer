import { test, expect } from '@playwright/test';

test.describe('Annotation Interaction (Chart Only)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/chart-only.html');
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            if (!chart || !chart.shadowRoot) return false;
            const canvas = chart.shadowRoot.querySelector('canvas');
            return canvas && canvas.height > 0;
        });
    });

    test('Annotation Cycle', async ({ page }) => {
        // Load default/simple chart
        await page.evaluate(() => {
            const tja = `TITLE:Annotation Test
BPM:120
COURSE:Oni
LEVEL:10
#START
1000100010001000,
#END`;
            (window as any).loadChart(tja, 'oni');
            (window as any).setOptions({
                viewMode: 'original',
                coloringMode: 'categorical',
                visibility: { perfect: true, good: true, poor: true },
                collapsedLoop: false,
                beatsPerLine: 16,
                selection: null,
                annotations: {},
                isAnnotationMode: true, // Enable Annotation
                showAllBranches: false
            });
        });

        const canvas = page.locator('#chart-component');
        await expect(canvas).toBeVisible();

        // Implicit check of initial state
        await expect(canvas).toHaveScreenshot('annotation-mode-initial.png');

        // We need coordinates. Since we load a simple chart, we can predict.
        // But getNoteCoordinates is available on the element.
        
        const notePos = await page.evaluate(() => {
            const chart = document.getElementById('chart-component') as any;
            return chart.getNoteCoordinates(0, 0); // Bar 0, Note 0
        });

        if (!notePos) throw new Error('Note not found');

        // 3. Click to Annotate "L"
        await canvas.click({ position: notePos });
        await expect(canvas).toHaveScreenshot('annotation-L.png');

        // 4. Click to Annotate "R"
        await canvas.click({ position: notePos });
        await expect(canvas).toHaveScreenshot('annotation-R.png');

        // 5. Click to Clear
        await canvas.click({ position: notePos });
        await expect(canvas).toHaveScreenshot('annotation-none.png');
    });

    // Helper for Rule Tests
    async function testAutoAnnotateRule(page: any, tjaContent: string, snapshotName: string) {
        await page.evaluate((tja: string) => {
            (window as any).loadChart(tja, 'oni');
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
            (window as any).autoAnnotate();
        }, tjaContent);
        
        const canvas = page.locator('#chart-component');
        await expect(canvas).toHaveScreenshot(snapshotName);
    }

    test('Auto Annotate Logic', async ({ page }) => {
        const tja = `TITLE:Auto Annotate Test
BPM:120
COURSE:Oni
LEVEL:10
#START
1000100010001000,
1010101010101010,
#END`;
        await testAutoAnnotateRule(page, tja, 'auto-annotate-result.png');
    });

    test('Rule: Gap Decrease but >= Quarter Note (Half -> Quarter)', async ({ page }) => {
        const tja = `TITLE:Half to Quarter
BPM:120
COURSE:Oni
LEVEL:10
#START
1000000010000000,
1000100010001000,
#END`;
        await testAutoAnnotateRule(page, tja, 'rule-half-quarter.png');
    });

    test('Rule: Gap Decrease and < Quarter Note (Quarter -> Eighth)', async ({ page }) => {
        const tja = `TITLE:Quarter to Eighth
BPM:120
COURSE:Oni
LEVEL:10
#START
1000100010001000,
1010101010101010,
#END`;
        await testAutoAnnotateRule(page, tja, 'rule-quarter-eighth.png');
    });

    test('Rule: Gap Decrease and < Quarter Note (Eighth -> Sixteenth)', async ({ page }) => {
        const tja = `TITLE:Eighth to Sixteenth
BPM:120
COURSE:Oni
LEVEL:10
#START
1010101010101010,
1111111111111111,
#END`;
        await testAutoAnnotateRule(page, tja, 'rule-eighth-sixteenth.png');
    });

    test('Rule: Segmentation - Quarter (No Annotate) -> Eighth (Annotate)', async ({ page }) => {
        const tja = `TITLE:Q to E
BPM:120
COURSE:Oni
LEVEL:10
#START
1000100010001000,
1010101010101010,
#END`;
        await testAutoAnnotateRule(page, tja, 'q-to-e.png');
    });

    test('Rule: Segmentation - Eighth (Annotate) -> Quarter (No Annotate)', async ({ page }) => {
        const tja = `TITLE:E to Q
BPM:120
COURSE:Oni
LEVEL:10
#START
1010101010101010,
1000100010001000,
#END`;
        await testAutoAnnotateRule(page, tja, 'e-to-q.png');
    });

    test('Rule: Segmentation - Eighth (Annotate) -> Sixteenth (Annotate)', async ({ page }) => {
        const tja = `TITLE:E to S
BPM:120
COURSE:Oni
LEVEL:10
#START
1010101011111111,
#END`;
        await testAutoAnnotateRule(page, tja, 'e-to-s.png');
    });

    test('Rule: Segmentation - Sixteenth (Annotate) -> Eighth (Annotate)', async ({ page }) => {
        const tja = `TITLE:S to E
BPM:120
COURSE:Oni
LEVEL:10
#START
1111111110101010,
#END`;
        await testAutoAnnotateRule(page, tja, 's-to-e.png');
    });

    test('Rule: 3 Opposite Color Notes', async ({ page }) => {
        const tja = `TITLE:Opposite Color Test
BPM:120
COURSE:Oni
LEVEL:10
#START
2020201020000000,
1010102010000000,
#END`;
        await testAutoAnnotateRule(page, tja, 'auto-annotate-opposite-color.png');
    });
});
