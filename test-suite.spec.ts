import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Visual Regression', () => {

    test('Initial Render', async ({ page }) => {
        await page.goto('/chart-only.html');
        // Wait for render
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            if (!chart || !chart.shadowRoot) return false;
            const canvas = chart.shadowRoot.querySelector('canvas');
            return canvas && canvas.height > 0;
        }, { timeout: 10000 });

        const canvas = page.locator('#chart-component');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveScreenshot('initial-render.png');
    });

    test('Note Selected', async ({ page }) => {
        await page.goto('/chart-only.html');
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            return chart && chart.shadowRoot && chart.shadowRoot.querySelector('canvas');
        });

        await page.evaluate(() => {
            (window as any).setOptions({
                viewMode: 'original',
                coloringMode: 'categorical',
                visibility: { perfect: true, good: true, poor: true },
                collapsedLoop: false,
                beatsPerLine: 16,
                selection: { start: { originalBarIndex: 0, charIndex: 0 }, end: null },
                annotations: {},
                isAnnotationMode: false,
                showAllBranches: false
            });
        });

        const canvas = page.locator('#chart-component');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveScreenshot('note-selected.png');
    });

    test('BPM Change Tooltip', async ({ page }) => {
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
        const canvas = page.locator('#chart-component');
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
        const canvas = page.locator('#chart-component');
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
        await page.goto('/chart-only.html');
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            return chart && chart.shadowRoot && chart.shadowRoot.querySelector('canvas');
        });

        await page.evaluate(() => {
            (window as any).setOptions({
                viewMode: 'judgements',
                coloringMode: 'categorical',
                visibility: { perfect: true, good: true, poor: true },
                collapsedLoop: false,
                beatsPerLine: 16,
                selection: null,
                annotations: {},
                isAnnotationMode: false,
                showAllBranches: false
            });

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
            (window as any).setJudgements(judgements, []);
        });

        const canvas = page.locator('#chart-component');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveScreenshot('judgements-view.png');
    });

    test('Judgements Underline View', async ({ page }) => {
        await page.goto('/chart-only.html');
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            return chart && chart.shadowRoot && chart.shadowRoot.querySelector('canvas');
        });

        await page.evaluate(() => {
            (window as any).setOptions({
                viewMode: 'judgements-underline',
                coloringMode: 'categorical',
                visibility: { perfect: true, good: true, poor: true },
                collapsedLoop: false,
                beatsPerLine: 16,
                selection: null,
                annotations: {},
                isAnnotationMode: false,
                showAllBranches: false
            });

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
            (window as any).setJudgements(judgements, []);
        });

        const canvas = page.locator('#chart-component');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveScreenshot('judgements-underline-view.png');
    });

    test('Judgements Text View', async ({ page }) => {
        await page.goto('/chart-only.html');
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            return chart && chart.shadowRoot && chart.shadowRoot.querySelector('canvas');
        });

        await page.evaluate(() => {
            (window as any).setOptions({
                viewMode: 'judgements-text',
                coloringMode: 'categorical',
                visibility: { perfect: true, good: true, poor: true },
                collapsedLoop: false,
                beatsPerLine: 16,
                selection: null,
                annotations: {},
                isAnnotationMode: false,
                showAllBranches: false
            });

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
            (window as any).setJudgements(judgements, []);
        });

        const canvas = page.locator('#chart-component');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveScreenshot('judgements-text-view.png');
    });

    test('Gradient Coloring View', async ({ page }) => {
        await page.goto('/chart-only.html');
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            return chart && chart.shadowRoot && chart.shadowRoot.querySelector('canvas');
        });

        await page.evaluate(() => {
            (window as any).setOptions({
                viewMode: 'judgements',
                coloringMode: 'gradient',
                visibility: { perfect: true, good: true, poor: true },
                collapsedLoop: false,
                beatsPerLine: 16,
                selection: null,
                annotations: {},
                isAnnotationMode: false,
                showAllBranches: false
            });

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

        const canvas = page.locator('#chart-component');
        await expect(canvas).toBeVisible();
        await expect(canvas).toHaveScreenshot('gradient-coloring-view.png');
    });

    test('Loop Collapsed', async ({ page }) => {
        await page.goto('/chart-only.html');
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            if (!chart || !chart.shadowRoot) return false;
            const canvas = chart.shadowRoot.querySelector('canvas');
            return canvas && canvas.height > 0;
        });

        const loopTJA = `TITLE:exTora 27
// SUBTITLE:
BPM:150
// WAVE:DON.mp3
// OFFSET:-1.3
DEMOSTART:0
SEVOL:41

COURSE:Oni
LEVEL:10
BALLOON:
SCOREINIT:a
SCOREDIFF:

#START
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
,
#END`;

        await page.evaluate((tja) => {
            (window as any).loadChart(tja, 'oni');
            (window as any).setOptions({
                viewMode: 'original',
                coloringMode: 'categorical',
                visibility: { perfect: true, good: true, poor: true },
                collapsedLoop: true,
                selectedLoopIteration: undefined,
                beatsPerLine: 16,
                selection: null,
                annotations: {},
                isAnnotationMode: false
            });
        }, loopTJA);

        const canvas = page.locator('#chart-component');
        await expect(canvas).toHaveScreenshot('loop-collapsed.png');
    });

    test('Balloon Render', async ({ page }) => {
        await page.goto('/chart-only.html');
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            if (!chart || !chart.shadowRoot) return false;
            const canvas = chart.shadowRoot.querySelector('canvas');
            return canvas && canvas.height > 0;
        });

        const tjaContent = `TITLE:Balloon Test
BPM:120
COURSE:Oni
LEVEL:10
BALLOON:5,10
#START
100000000000700000000800,
700000000000000000000008,
#END`;
        
        await page.evaluate((tja) => {
            (window as any).loadChart(tja, 'oni');
        }, tjaContent);

        const canvas = page.locator('#chart-component');
        await expect(canvas).toHaveScreenshot('balloon-render.png');
    });

    test('Gogo Time Render', async ({ page }) => {
        await page.goto('/chart-only.html');
        await page.waitForFunction(() => {
            const chart = document.querySelector('tja-chart');
            if (!chart || !chart.shadowRoot) return false;
            const canvas = chart.shadowRoot.querySelector('canvas');
            return canvas && canvas.height > 0;
        });

        const tjaContent = `TITLE:Gogo Test
BPM:120
COURSE:Oni
LEVEL:10
#START
1000,
#GOGOSTART
2000,
2000,
#GOGOEND
1000,
#END`;
        
        await page.evaluate((tja) => {
            (window as any).loadChart(tja, 'oni');
        }, tjaContent);

        const canvas = page.locator('#chart-component');
        await expect(canvas).toHaveScreenshot('gogo-render.png');
    });

    test('Load Exported Chart', async ({ page }) => {
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
        const canvas = page.locator('#chart-component');
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

});

test.describe('UI Logic', () => {
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
        await page.waitForTimeout(1000); 
    });

    test('Data Source Tabs switch content', async ({ page }) => {
        const listTab = page.locator('button[data-mode="list"]');
        const fileTab = page.locator('button[data-mode="file"]');
        const streamTab = page.locator('button[data-mode="stream"]');
        
        const listPane = page.locator('#tab-list');
        const filePane = page.locator('#tab-file');
        const streamPane = page.locator('#tab-stream');

        // Initial: List Active
        await expect(listTab).toHaveClass(/active/);
        await expect(listPane).toBeVisible();
        await expect(filePane).not.toBeVisible();

        // Click File
        await fileTab.click();
        await expect(fileTab).toHaveClass(/active/);
        await expect(filePane).toBeVisible();
        await expect(listPane).not.toBeVisible();

        // Click Stream
        await streamTab.click();
        await expect(streamTab).toHaveClass(/active/);
        await expect(streamPane).toBeVisible();
        await expect(filePane).not.toBeVisible();
    });
    test('ESE Search by Title', async ({ page }) => {
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
        
        // Mock the ESE index response
        await page.route('**/ese_index.json', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify([
                { path: 'cat/song.tja', title: 'My Song', titleJp: '私の歌', url: 'ese/cat/song.tja', type: 'blob', sha: '123' }
            ])
        }));

        // Reload to apply mock
        await page.reload();
        await page.waitForTimeout(500);
        
        // Ensure data source panel is expanded (reload might have collapsed it)
        const dsBodyReloaded = page.locator('#ds-body');
        if (await dsBodyReloaded.count() > 0) {
            const classes = await dsBodyReloaded.getAttribute('class');
            if (classes && classes.includes('collapsed')) {
                await page.click('#ds-collapse-btn');
                await page.waitForTimeout(500);
            }
        }

        // Switch to List tab (if not already active, but it should be default)
        // Just in case click it or check visibility
        const listTab = page.locator('button[data-mode="list"]');
        const classAttr = await listTab.getAttribute('class');
        if (!classAttr?.includes('active')) {
             await listTab.click();
        }
        
        // Wait for search input
        const searchInput = page.locator('#ese-search-input');
        await expect(searchInput).toBeVisible();
        
        // Wait for mocked data to load (UI shows "No results" or results)
        // Since initial query is empty, it might show nothing or all.
        // My implementation: if query empty, shows "Search for songs..."
        await expect(page.locator('#ese-results')).toContainText('Search for songs...');
        
        // Search by English Title
        await searchInput.fill('My Song');
        await expect(page.locator('.ese-result-item')).toContainText('cat/song.tja');
        
        // Search by Japanese Title
        await searchInput.fill('私の歌');
        await expect(page.locator('.ese-result-item')).toContainText('cat/song.tja');
        
        // Search by Path
        await searchInput.fill('song.tja');
        await expect(page.locator('.ese-result-item')).toContainText('cat/song.tja');
        
        // Search by non-existent
        await searchInput.fill('NotExist');
        await expect(page.locator('.ese-result-item')).not.toBeVisible();
        await expect(page.locator('#ese-results')).toContainText('No results found');
    });
});

test.describe('Loop Controls Interaction', () => {
    test('Loop controls visibility and interaction', async ({ page }) => {
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
        const canvas = page.locator('#chart-component');
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
        const canvas = page.locator('#chart-component');
        await expect(canvas).toBeVisible();
        await page.waitForTimeout(2000);
        await page.selectOption('#difficulty-selector', 'oni');
        await page.waitForTimeout(500);

        // Switch to Selection Tab
        await page.click('button[data-do-tab="selection"]');

        const dimensions = await page.evaluate(() => {
            const canvas = document.getElementById('chart-component') as HTMLElement;
            const PADDING = 20;
            const BARS_PER_ROW = 4;
            const availableWidth = canvas.clientWidth - (PADDING * 2);
            const barWidth = availableWidth / BARS_PER_ROW;
            const headerHeight = barWidth * 0.35;
            const y = PADDING + headerHeight + PADDING + (barWidth * 0.14) / 2;
            return { y };
        });

        // Position of the first note
        const notePos = { x: 20, y: dimensions.y };

        // 1. Click on first note
        await canvas.click({ position: { x: notePos.x, y: notePos.y } });
        
        // 2. Verify Stats
        const stats = page.locator('#note-stats-display');
        await expect(stats).toContainText('Type');
        await expect(stats).toContainText('DON');

        // 3. Take Snapshot of Selection
        // Moved to 'Visual Regression' > 'Note Selected'
        // await expect(canvas).toHaveScreenshot('note-selected.png');

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
        await page.addStyleTag({ content: '#sticky-header { position: static !important; }' });
        
        const canvas = page.locator('#chart-component');
        await expect(canvas).toBeVisible();
        await page.waitForTimeout(2000);
        await page.selectOption('#difficulty-selector', 'oni');
        await page.waitForTimeout(500);

        // Switch to Selection Tab
        await page.click('button[data-do-tab="selection"]');
        await page.waitForTimeout(2000);

        // 1. Click Start Note (Bar 0, Note 0)
        const p0 = await page.evaluate(() => {
            const chart = document.getElementById('chart-component') as any;
            return chart.getNoteCoordinates(0, 0);
        });
        expect(p0).not.toBeNull();
        await canvas.click({ position: p0, force: true });
        
        const stats = page.locator('#note-stats-display');
        await expect(stats).toContainText('DON');

        await page.waitForTimeout(200);

        // 2. Click End Note (Bar 1, Note 0)
        const p1 = await page.evaluate(() => {
            const chart = document.getElementById('chart-component') as any;
            return chart.getNoteCoordinates(1, 0);
        });
        expect(p1).not.toBeNull();
        await canvas.click({ position: p1, force: true });
        await expect(stats).toContainText('DON'); 

        // 3. Click Third Note (Bar 2, Note 0 - Balloon) (Restart Selection)
        const p2 = await page.evaluate(() => {
            const chart = document.getElementById('chart-component') as any;
            return chart.getNoteCoordinates(2, 0);
        });
        expect(p2).not.toBeNull();
        await canvas.click({ position: p2, force: true });
        await expect(stats).toContainText('balloon');
    });
});



