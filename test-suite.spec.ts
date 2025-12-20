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
        
        const judgementsCheckbox = page.locator('#show-judgements-checkbox');
        await expect(judgementsCheckbox).toBeEnabled();
        await judgementsCheckbox.check();

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
        
        // 1. Enable Judgements
        const judgementsCheckbox = page.locator('#show-judgements-checkbox');
        await expect(judgementsCheckbox).toBeEnabled();
        await judgementsCheckbox.check();
        
        // 2. Select Underline Style
        const underlineRadio = page.locator('input[name="judgementStyle"][value="underline"]');
        await underlineRadio.check();

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

    test('Judgements Text View', async ({ page }) => {
        await page.goto('/');

        await page.evaluate(() => {
            window.setInterval = () => 0 as any;
        });

        // Switch to Test Tab
        await page.click('button[data-mode="test"]');

        await page.click('#test-stream-btn');
        await page.waitForTimeout(500); 
        
        // 1. Enable Judgements
        const judgementsCheckbox = page.locator('#show-judgements-checkbox');
        await expect(judgementsCheckbox).toBeEnabled();
        await judgementsCheckbox.check();
        
        // 2. Select Text Style
        const textRadio = page.locator('input[name="judgementStyle"][value="text"]');
        await textRadio.check();

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

        await expect(canvas).toHaveScreenshot('judgements-text-view.png');
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
        
        // 1. Enable Judgements
        const judgementsCheckbox = page.locator('#show-judgements-checkbox');
        await expect(judgementsCheckbox).toBeEnabled();
        await judgementsCheckbox.check();
        
        // 2. Select Gradient Coloring
        const gradientRadio = page.locator('input[name="judgementColoring"][value="gradient"]');
        await gradientRadio.check();

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

    test('Load Exported Chart', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();

        // Switch to File Tab
        await page.click('button[data-mode="file"]');

        const tjaContent = `TITLE:Exported Selection
SUBTITLE:--
BPM:250
WAVE:placeholder.mp3
OFFSET:0
COURSE:Edit
LEVEL:10

#START

// Loop 1
#MEASURE 4/4
#BPMCHANGE 250
#SCROLL 1
0,
10220120,
202120202120,
3022203022203022,
2030222030222220,

// Loop 2
#MEASURE 4/4
#BPMCHANGE 250
#SCROLL 1
0,
10220120,
202120202120,
3022203022203022,
2030222030222220,

// End Padding
#MEASURE 4/4
#BPMCHANGE 250
#SCROLL 1
0,
0,
0,
#END`;

        await page.locator('#tja-file-picker').setInputFiles({
            name: 'exported.tja',
            mimeType: 'text/plain',
            buffer: Buffer.from(tjaContent)
        });

        await page.waitForTimeout(1000);
        
        // Verify Canvas is still there
        await expect(canvas).toBeVisible();
        
        // Check Status
        // Key: status.fileLoaded
        // Use evaluate to check translation or text content
        const status = page.locator('#status-display');
        // i18n keys are loaded. If English, it should be "File loaded".
        // Let's just check if it is NOT "Ready" (status.ready)
        await expect(status).not.toContainText('Ready');
        await expect(status).not.toContainText('Initializing');
    });

    test('Export Chart Image Width', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(2000);

        const width = await page.evaluate(async () => {
             // Force fallback by removing navigator.share if present
             try {
                // @ts-ignore
                navigator.share = undefined;
             } catch (e) {}
             
             try {
                // @ts-ignore
                navigator.canShare = () => false;
             } catch (e) {}

             return new Promise<number>((resolve) => {
                 const originalCreateElement = document.createElement;
                 
                 document.createElement = (tagName: string, options?: any) => {
                      const el = originalCreateElement.call(document, tagName, options) as any;
                      if (tagName.toLowerCase() === 'a') {
                          el.click = () => {
                               const href = el.href;
                               if (href && (href.startsWith('data:image/png') || href.startsWith('blob:'))) {
                                    const img = new Image();
                                    img.onload = () => resolve(img.width);
                                    img.src = href;
                               }
                          };
                      }
                      return el;
                 };
                 
                 const btn = document.getElementById('export-image-btn');
                 if (btn) btn.click();
                 else resolve(-1);
             });
        });
        
        expect(width).toBe(1024);
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

test.describe('Zoom Controls', () => {
    test('Zoom In/Out/Reset', async ({ page }) => {
        await page.goto('/');
        await page.waitForTimeout(1000);

        const zoomOutBtn = page.locator('#zoom-out-btn');
        const zoomInBtn = page.locator('#zoom-in-btn');
        const zoomResetBtn = page.locator('#zoom-reset-btn');

        // Initial State
        await expect(zoomResetBtn).toHaveText('100%');

        // Zoom In (Decrease beats per line)
        await zoomInBtn.click();
        await expect(zoomResetBtn).not.toHaveText('100%');
        
        // Reset
        await zoomResetBtn.click();
        await expect(zoomResetBtn).toHaveText('100%');

        // Zoom Out (Increase beats per line)
        await zoomOutBtn.click();
        await expect(zoomResetBtn).not.toHaveText('100%');

        // Reset
        await zoomResetBtn.click();
        await expect(zoomResetBtn).toHaveText('100%');
    });
});

test.describe('Selection Interaction', () => {
    test('Select note, verify visual and sticky stats', async ({ page }) => {
        await page.goto('/');
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        await page.waitForTimeout(2000);
        await page.selectOption('#difficulty-selector', 'oni');
        await page.waitForTimeout(500);

        // Switch to Selection Tab
        await page.click('button[data-do-tab="selection"]');

        // Position of the first note (approximate based on previous tests)
        const notePos = { x: 20, y: 33 };

        // 1. Click on first note
        await canvas.click({ position: { x: notePos.x, y: notePos.y } });
        
        // 2. Verify Stats
        const stats = page.locator('#note-stats-display');
        await expect(stats).toContainText('Type');
        await expect(stats).toContainText('DON');

        // 3. Take Snapshot of Selection
        await expect(canvas).toHaveScreenshot('note-selected.png');

        // 4. Hover away to empty space (e.g. x + 100, same y)
        await canvas.hover({ position: { x: notePos.x + 100, y: notePos.y }, force: true });

        // 5. Verify Stats are STICKY (still showing 'DON')
        await expect(stats).toContainText('DON');

        // 6. Click again to unselect
        await canvas.click({ position: { x: notePos.x, y: notePos.y }, force: true });
        
        // 7. Move away to empty space
        await canvas.hover({ position: { x: notePos.x + 100, y: notePos.y }, force: true });
        
        // 8. Stats should be cleared (showing '-')
        await expect(stats).toContainText('-');
    });

    test('Range Selection Interaction', async ({ page }) => {
        await page.goto('/');
        await page.addStyleTag({ content: '#sticky-header { position: static !important; }' });
        
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        await page.waitForTimeout(2000);
        await page.selectOption('#difficulty-selector', 'oni');
        await page.waitForTimeout(500);

        // Switch to Selection Tab
        await page.click('button[data-do-tab="selection"]');

        const barWidth = await page.evaluate(() => {
            const canvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
            const PADDING = 20;
            const BARS_PER_ROW = 4;
            return (canvas.clientWidth - (PADDING * 2)) / BARS_PER_ROW;
        });
        
        const y = 20 + (barWidth * 0.14) / 2;
        
        // Bar 0 (Start), Bar 1, Bar 2
        const x0 = 20; 
        const x1 = 20 + barWidth;
        const x2 = 20 + 2 * barWidth;

        // 1. Click Start Note (Bar 0 - DON)
        await canvas.click({ position: { x: x0, y }, force: true });
        const stats = page.locator('#note-stats-display');
        await expect(stats).toContainText('DON');

        // 2. Click End Note (Bar 1 - DON)
        await canvas.click({ position: { x: x1, y }, force: true });
        await expect(stats).toContainText('DON'); 

        // 3. Click Third Note (Bar 2 - Balloon) (Restart Selection)
        await canvas.click({ position: { x: x2, y }, force: true });
        await expect(stats).toContainText('balloon');
    });
});

test.describe('Annotation Interaction', () => {
    test('Annotation Cycle', async ({ page }) => {
        await page.goto('/');
        await page.addStyleTag({ content: '#sticky-header { position: static !important; }' });
        
        const canvas = page.locator('#chart-canvas');
        await expect(canvas).toBeVisible();
        await page.waitForTimeout(2000);
        await page.selectOption('#difficulty-selector', 'oni');
        await page.waitForTimeout(500);

        // 1. Switch to Annotation Tab
        await page.click('button[data-do-tab="annotation"]');
        
        // 2. Enable Annotation (Implicit by tab switch)
        // await page.check('#annotation-toggle'); // Removed

        // Verify Bar Numbers Hidden (implicit via snapshot of clean state in mode)
        await expect(canvas).toHaveScreenshot('annotation-mode-initial.png');

        // Note Position (First note)
        const notePos = { x: 20, y: 33 };

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
});

