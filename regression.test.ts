import { test, expect } from '@playwright/test';

test('visualizer should render correctly', async ({ page }) => {
    await page.goto('/');

    // Wait for the canvas to be present and potentially rendered
    const canvas = page.locator('#chart-canvas');
    await expect(canvas).toBeVisible();

    // Give the renderer some time to draw on the canvas
    await page.waitForTimeout(2000); 

    // Take a screenshot of the canvas and compare it to the baseline
    expect(await canvas.screenshot()).toMatchSnapshot('visualizer-baseline.png', { threshold: 0.1 });
});
