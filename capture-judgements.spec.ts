import { test, expect } from '@playwright/test';

test('capture judgements state', async ({ page }) => {
    // Navigate to the app
    await page.goto('/');

    // Start the test stream to enable the judgements view
    await page.click('#test-stream-btn');
    await page.waitForTimeout(500); // Give frontend time to process the event
    
    // Wait for the judgements radio button to be enabled
    const judgementsRadio = page.locator('input[name="viewMode"][value="judgements"]');
    await expect(judgementsRadio).toBeEnabled();

    // Switch to Judgements view
    await judgementsRadio.check();

    // Simple seeded PRNG (Linear Congruential Generator)
    // using glibc parameters: m = 2^31, a = 1103515245, c = 12345
    let seed = 12345;
    const nextRandom = () => {
        seed = (1103515245 * seed + 12345) % 2147483648;
        return seed / 2147483648;
    };

    // Generate 300 judgements with organic distribution
    // 90% Perfect, 9% Good, 1% Poor
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

    // Inject judgements
    await page.evaluate((data) => {
        (window as any).setJudgements(data);
    }, judgements);

    // Select the canvas
    const canvas = page.locator('#chart-canvas');
    await canvas.waitFor({ state: 'visible' });

    // Wait for render (although setJudgements calls refreshChart, a small tick helps ensure canvas is updated)
    await page.waitForTimeout(500);

    // Save the screenshot
    const outputPath = 'judgements.png';
    await canvas.screenshot({ path: outputPath });
    
    console.log(`Snapshot saved to: ${outputPath}`);
});
