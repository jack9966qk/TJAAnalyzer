import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Visual Regression', () => {

    test('Initial Render', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        
        // Give the renderer some time to draw on the canvas
        await page.waitForTimeout(2000); 

        // Previously 'snapshot.png' / 'visualizer-baseline.png'
        await expect(canvas).toHaveScreenshot('initial-render.png');
    });

    test('BPM Change Tooltip', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        await page.waitForTimeout(1000);

        const box = await canvas.boundingBox();
        if (box) {
            // Move mouse to hover over the area with BPM change
            // Based on previous capture-bpm-change.spec.ts
            await page.mouse.move(box.x + 35, box.y + 150);
            await page.waitForTimeout(500);

            // Capture the stats display area or whole app
            // Previous test captured '#app'
            const app = page.locator('#app');
            await expect(app).toHaveScreenshot('bpm-change-tooltip.png');
        }
    });

    test('Note Stats Tooltip', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        await page.waitForTimeout(1000);

        const box = await canvas.boundingBox();
        if (box) {
            // Move mouse to hover over the first note
            // Based on previous capture-stats.spec.ts
            await page.mouse.move(box.x + 35, box.y + 33);
            await page.waitForTimeout(500);

            const app = page.locator('#app');
            await expect(app).toHaveScreenshot('note-stats-tooltip.png');
        }
    });

    test('Judgements View', async ({ page }) => {
        await page.goto('/');

        // Mock setInterval to prevent random simulation updates from destabilizing the screenshot
        await page.evaluate(() => {
            window.setInterval = () => 0 as any;
        });

        // Start the test stream to enable the judgements view
        await page.click('#test-stream-btn');
        // Give frontend time to process the event
        await page.waitForTimeout(500); 
        
        const judgementsRadio = page.locator('input[name="viewMode"][value="judgements"]');
        await expect(judgementsRadio).toBeEnabled();
        await judgementsRadio.check();

        // Inject deterministic judgements
        // Simple seeded PRNG (Linear Congruential Generator)
        await page.evaluate(() => {
            let seed = 12345;
            const nextRandom = () => {
                seed = (1103515245 * seed + 12345) % 2147483648;
                return seed / 2147483648;
            };

            const judgements: string[] = [];
            for (let i = 0; i < 300; i++) {
                const rand = nextRandom();
                if (rand < 0.90) {
                    judgements.push('Perfect');
                } else if (rand < 0.99) {
                    judgements.push('Good');
                } else {
                    judgements.push('Poor');
                }
            }
            (window as any).setJudgements(judgements);
        });

        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        // Wait for render
        await page.waitForTimeout(500);

        await expect(canvas).toHaveScreenshot('judgements-view.png');
    });

    test('Loop Collapsed', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();

        // Upload the TJA file
        const filePath = path.join(process.cwd(), 'dev_instructions', 'loop_example.tja');
        await page.setInputFiles('#tja-file-picker', filePath);

        // Wait for parsing and rendering
        await page.waitForTimeout(1000);

        // Check "Collapse Loops"
        await page.check('#collapse-loop-checkbox');

        // Give renderer time to update
        await page.waitForTimeout(1000);

        await expect(canvas).toHaveScreenshot('loop-collapsed.png');
    });

    test('Balloon Render', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();

        // Load TJA with balloons
        const tjaContent = `TITLE:Balloon Test
BPM:120
COURSE:Oni
LEVEL:10
BALLOON:5,10
#START
100000000000700000000800,
700000000000000000000008,
#END`;
        
        await page.locator('#tja-file-picker').setInputFiles({
            name: 'balloon.tja',
            mimeType: 'text/plain',
            buffer: Buffer.from(tjaContent)
        });

        await page.waitForTimeout(1000);
        await expect(canvas).toHaveScreenshot('balloon-render.png');
    });
});

test.describe('Interaction', () => {
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
        await expect(stats).toContainText('Type');
        await expect(stats).toContainText('DON');
    
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
        await expect(stats).toContainText('Type');
        await expect(stats).toContainText('DON');
        
        // Check gap
        // Gap should be 1.0 (1/1)
        await expect(stats).toContainText('Gap');
        await expect(stats).toContainText('1/1');
    });
});

test.describe('UI Logic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(1000); // Wait for init
    });

    test('Manual Load mode is exclusive', async ({ page }) => {
        const manualFieldset = page.locator('#manual-load-fieldset');
        const streamFieldset = page.locator('#event-stream-fieldset');
        const clearBtn = page.locator('#clear-manual-btn');
        const fileInput = page.locator('#tja-file-picker');

        // Initial State
        await expect(manualFieldset).not.toHaveClass(/disabled/);
        await expect(streamFieldset).not.toHaveClass(/disabled/);
        await expect(clearBtn).toBeDisabled();

        // Load File
        await fileInput.setInputFiles({
            name: 'test.tja',
            mimeType: 'text/plain',
            buffer: Buffer.from('TITLE:Test\nBPM:120\nCOURSE:Oni\nLEVEL:10\n#START\n1,\n#END')
        });

        // Verify Manual Mode Active
        await expect(manualFieldset).not.toHaveClass(/disabled/);
        await expect(streamFieldset).toHaveClass(/disabled/);
        await expect(clearBtn).toBeEnabled();

        // Clear
        await clearBtn.click();

        // Verify Reset
        await expect(manualFieldset).not.toHaveClass(/disabled/);
        await expect(streamFieldset).not.toHaveClass(/disabled/);
        await expect(clearBtn).toBeDisabled();
    });

    test('Stream mode is exclusive', async ({ page }) => {
        const manualFieldset = page.locator('#manual-load-fieldset');
        const streamFieldset = page.locator('#event-stream-fieldset');
        const connectBtn = page.locator('#connect-btn');
        const testStreamBtn = page.locator('#test-stream-btn');

        // Click Test Stream (Simulation)
        await testStreamBtn.click();

        // Verify Stream Mode Active (fieldset disabled)
        await expect(manualFieldset).toHaveClass(/disabled/);
        await expect(streamFieldset).not.toHaveClass(/disabled/);
        
        // Connect button should allow disconnect
        await expect(connectBtn).toHaveText('Disconnect'); // It changes to Disconnect

        // Disconnect
        await connectBtn.click();

        // Verify Reset
        await expect(manualFieldset).not.toHaveClass(/disabled/);
        await expect(streamFieldset).not.toHaveClass(/disabled/);
        await expect(connectBtn).toHaveText('Connect');
    });
});

test.describe('Loop Controls Interaction', () => {
    test('Loop controls visibility and interaction', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();

        // 1. Upload Loop Chart
        const filePath = path.join(process.cwd(), 'dev_instructions', 'loop_example.tja');
        await page.setInputFiles('#tja-file-picker', filePath);
        await page.waitForTimeout(1000);

        // 2. Collapse Loop
        await page.check('#collapse-loop-checkbox');
        await page.waitForTimeout(500);

        // 3. Verify Controls Visible
        const loopControls = page.locator('#loop-controls');
        await expect(loopControls).toBeVisible();

        const loopCounter = page.locator('#loop-counter');
        const autoCheckbox = page.locator('#loop-auto');
        const prevBtn = page.locator('#loop-prev');
        const nextBtn = page.locator('#loop-next');

        // Initial state: Auto checked, 1/10 (assuming 10 iterations)
        await expect(autoCheckbox).toBeChecked();
        await expect(loopCounter).toContainText('1 / 10');
        await expect(prevBtn).toBeDisabled();
        await expect(nextBtn).toBeDisabled();

        // 4. Click Next (should do nothing if disabled, but logic says disabled if auto)
        // Uncheck Auto
        await autoCheckbox.uncheck();
        await expect(prevBtn).toBeDisabled(); // Still at 0, so prev disabled
        await expect(nextBtn).toBeEnabled();

        // 5. Click Next
        await nextBtn.click();
        await expect(loopCounter).toContainText('2 / 10');
        await expect(prevBtn).toBeEnabled();
        
        // 6. Click Prev
        await prevBtn.click();
        await expect(loopCounter).toContainText('1 / 10');
        await expect(prevBtn).toBeDisabled();

        // 7. Re-check Auto
        await autoCheckbox.check();
        await expect(prevBtn).toBeDisabled();
        await expect(nextBtn).toBeDisabled();
    });
});