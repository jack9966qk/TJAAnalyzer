import { test, expect } from '@playwright/test';

test.describe('Stream Control Interaction', () => {
    test('Start/Stop Test Stream Button Toggle', async ({ page }) => {
        await page.goto('/');
        
        // Open Data Source Panel if collapsed
        const dsBody = page.locator('#ds-body');
        const isCollapsed = await dsBody.getAttribute('class').then(c => c?.includes('collapsed'));
        if (isCollapsed) {
             await page.click('#ds-collapse-btn');
        }

        // Switch to Stream tab
        await page.click('[data-mode="stream"]');
        
        const btn = page.locator('#test-stream-btn');
        await expect(btn).toBeVisible();
        await expect(btn).toHaveText('Start Test Stream');

        // Start
        await btn.click();
        await expect(btn).toHaveText('Stop Test Stream');
        
        // Verify status
        const status = page.locator('#status-display');
        await expect(status).toContainText('Receiving data...');

        // Stop
        await btn.click();
        await expect(btn).toHaveText('Start Test Stream');
        await expect(status).toContainText('Simulation Stopped');
    });

    test('Switching Tabs Stops Stream', async ({ page }) => {
        await page.goto('/');
        const dsBody = page.locator('#ds-body');
        const isCollapsed = await dsBody.getAttribute('class').then(c => c?.includes('collapsed'));
        if (isCollapsed) {
             await page.click('#ds-collapse-btn');
        }
        await page.click('[data-mode="stream"]');
        
        const btn = page.locator('#test-stream-btn');
        await btn.click();
        await expect(btn).toHaveText('Stop Test Stream');

        // Switch to File tab
        await page.click('[data-mode="file"]');
        
        // Wait a bit for status update (though switchDataSourceMode calls disconnect synchronously, status update might be async via callback)
        const status = page.locator('#status-display');
        await expect(status).toContainText('Simulation Stopped');

        // Switch back to Stream tab
        await page.click('[data-mode="stream"]');
        await expect(btn).toHaveText('Start Test Stream');
    });
});
