import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Visual Regression', () => {

    test('Initial Render', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        
        await page.waitForTimeout(2000); 
        await expect(canvas).toHaveScreenshot('initial-render.png');
    });

    test('BPM Change Tooltip', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        await page.waitForTimeout(1000);

        const box = await canvas.boundingBox();
        if (box) {
            await page.mouse.move(box.x + 35, box.y + 150);
            await page.waitForTimeout(500);
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
            await page.mouse.move(box.x + 35, box.y + 33);
            await page.waitForTimeout(500);
            const app = page.locator('#app');
            await expect(app).toHaveScreenshot('note-stats-tooltip.png');
        }
    });

    test('Judgements View', async ({ page }) => {
        await page.goto('/');

        await page.evaluate(() => {
            window.setInterval = () => 0 as any;
        });

        // Switch to Test Tab
        await page.click('button[data-mode="test"]');

        await page.click('#test-stream-btn');
        await page.waitForTimeout(500); 
        
        const judgementsRadio = page.locator('input[name="viewMode"][value="judgements"]');
        await expect(judgementsRadio).toBeEnabled();
        await judgementsRadio.check();

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
        await page.waitForTimeout(500);

        await expect(canvas).toHaveScreenshot('judgements-view.png');
    });

    test('Judgements Underline View', async ({ page }) => {
        await page.goto('/');

        await page.evaluate(() => {
            window.setInterval = () => 0 as any;
        });

        // Switch to Test Tab
        await page.click('button[data-mode="test"]');

        await page.click('#test-stream-btn');
        await page.waitForTimeout(500); 
        
        const judgementsUnderlineRadio = page.locator('input[name="viewMode"][value="judgements-underline"]');
        await expect(judgementsUnderlineRadio).toBeEnabled();
        await judgementsUnderlineRadio.check();

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
        await page.waitForTimeout(500);

        await expect(canvas).toHaveScreenshot('judgements-underline-view.png');
    });

    test('Gradient Coloring View', async ({ page }) => {
        await page.goto('/');

        await page.evaluate(() => {
            window.setInterval = () => 0 as any;
        });

        // Switch to Test Tab
        await page.click('button[data-mode="test"]');

        await page.click('#test-stream-btn');
        await page.waitForTimeout(500); 
        
        const judgementsRadio = page.locator('input[name="viewMode"][value="judgements"]');
        await expect(judgementsRadio).toBeEnabled();
        await judgementsRadio.check();
        
        const gradientCheckbox = page.locator('#gradient-coloring-checkbox');
        await expect(gradientCheckbox).toBeEnabled();
        await gradientCheckbox.check();

        await page.evaluate(() => {
            let seed = 12345;
            const nextRandom = () => {
                seed = (1103515245 * seed + 12345) % 2147483648;
                return seed / 2147483648;
            };

            const judgements: string[] = [];
            const deltas: number[] = [];
            
            for (let i = 0; i < 300; i++) {
                const rand = nextRandom();
                let j = 'Perfect';
                let d = 0;
                
                if (rand < 0.33) {
                    j = 'Perfect';
                    d = 10;
                } else if (rand < 0.66) {
                    j = 'Good';
                    d = 80;
                } else {
                    j = 'Poor';
                    d = -80;
                }
                
                judgements.push(j);
                deltas.push(d);
            }
            
            (window as any).setJudgements(judgements, deltas);
        });

        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        await page.waitForTimeout(500);

        await expect(canvas).toHaveScreenshot('gradient-coloring-view.png');
    });

    test('Loop Collapsed', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();

        // Switch to File Tab
        await page.click('button[data-mode="file"]');

        const filePath = path.join(process.cwd(), 'dev_instructions', 'loop_example.tja');
        await page.setInputFiles('#tja-file-picker', filePath);

        await page.waitForTimeout(1000);

        await page.check('#collapse-loop-checkbox');

        await page.waitForTimeout(1000);

        await expect(canvas).toHaveScreenshot('loop-collapsed.png');
    });

    test('Balloon Render', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();

        // Switch to File Tab
        await page.click('button[data-mode="file"]');

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
    
        await page.waitForTimeout(2000);
    
        await page.selectOption('#difficulty-selector', 'oni');
        await page.waitForTimeout(500);
    
        await canvas.hover({ position: { x: 20, y: 33 } });
    
        const stats = page.locator('#note-stats-display');
        await expect(stats).toContainText('Type');
        await expect(stats).toContainText('DON');
    
        const barWidth = await page.evaluate(() => {
            const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
            const PADDING = 20;
            const BARS_PER_ROW = 4;
            return (canvas.clientWidth - (PADDING * 2)) / BARS_PER_ROW;
        });
    
        const secondNoteX = 20 + barWidth;
        await canvas.hover({ position: { x: secondNoteX, y: 33 } });
        await expect(stats).toContainText('Type');
        await expect(stats).toContainText('DON');
        
        await expect(stats).toContainText('Gap');
        await expect(stats).toContainText('1/1');
    });
});

test.describe('UI Logic', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(1000); 
    });

    test('Data Source Tabs switch content', async ({ page }) => {
        const exampleTab = page.locator('button[data-mode="example"]');
        const fileTab = page.locator('button[data-mode="file"]');
        const streamTab = page.locator('button[data-mode="stream"]');
        
        const examplePane = page.locator('#tab-example');
        const filePane = page.locator('#tab-file');
        const streamPane = page.locator('#tab-stream');

        // Initial: Example Active
        await expect(exampleTab).toHaveClass(/active/);
        await expect(examplePane).toBeVisible();
        await expect(filePane).not.toBeVisible();

        // Click File
        await fileTab.click();
        await expect(fileTab).toHaveClass(/active/);
        await expect(filePane).toBeVisible();
        await expect(examplePane).not.toBeVisible();

        // Click Stream
        await streamTab.click();
        await expect(streamTab).toHaveClass(/active/);
        await expect(streamPane).toBeVisible();
        await expect(filePane).not.toBeVisible();
    });
});

test.describe('Loop Controls Interaction', () => {
    test('Loop controls visibility and interaction', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();

        // Switch to File Tab
        await page.click('button[data-mode="file"]');

        const filePath = path.join(process.cwd(), 'dev_instructions', 'loop_example.tja');
        await page.setInputFiles('#tja-file-picker', filePath);
        await page.waitForTimeout(1000);

        await page.check('#collapse-loop-checkbox');
        await page.waitForTimeout(500);

        const loopControls = page.locator('#loop-controls');
        await expect(loopControls).toBeVisible();

        const loopCounter = page.locator('#loop-counter');
        const autoCheckbox = page.locator('#loop-auto');
        const prevBtn = page.locator('#loop-prev');
        const nextBtn = page.locator('#loop-next');

        await expect(autoCheckbox).toBeChecked();
        await expect(loopCounter).toContainText('1 / 10');
        await expect(prevBtn).toBeDisabled();
        await expect(nextBtn).toBeDisabled();

        await autoCheckbox.uncheck();
        await expect(prevBtn).toBeDisabled(); 
        await expect(nextBtn).toBeEnabled();

        await nextBtn.click();
        await expect(loopCounter).toContainText('2 / 10');
        await expect(prevBtn).toBeEnabled();
        
        await prevBtn.click();
        await expect(loopCounter).toContainText('1 / 10');
        await expect(prevBtn).toBeDisabled();

        await autoCheckbox.check();
        await expect(prevBtn).toBeDisabled();
        await expect(nextBtn).toBeDisabled();
    });
});
