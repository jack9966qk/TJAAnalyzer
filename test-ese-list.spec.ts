import { test, expect } from '@playwright/test';

test.describe('ESE List Behavior', () => {
    test('Lists all charts when search is empty', async ({ page }) => {
        // Mock the ESE index response
        const mockData = [
            { path: 'cat1/song1.tja', title: 'Song One', titleJp: '曲１', url: 'ese/cat1/song1.tja', type: 'blob' },
            { path: 'cat2/song2.tja', title: 'Song Two', titleJp: '曲２', url: 'ese/cat2/song2.tja', type: 'blob' },
            { path: 'cat3/song3.tja', title: 'Song Three', titleJp: '曲３', url: 'ese/cat3/song3.tja', type: 'blob' }
        ];

        await page.route('**/ese_index.json', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockData)
        }));

        await page.goto('/');

        // Ensure data source panel is expanded
        const dsBody = page.locator('#ds-body');
        if (await dsBody.count() > 0) {
            const classes = await dsBody.getAttribute('class');
            if (classes && classes.includes('collapsed')) {
                await page.click('#ds-collapse-btn');
                await page.waitForTimeout(500);
            }
        }

        // Switch to List tab (it should be default, but let's be sure)
        const listTab = page.locator('button[data-mode="list"]');
        await listTab.click();

        // Wait for results to populate
        // The "Search for songs..." message should NOT be there.
        // Instead, we should see the items.
        
        const resultsContainer = page.locator('#ese-results');
        
        // We expect 3 items
        await expect(resultsContainer.locator('.ese-result-item')).toHaveCount(3);
        
        // Verify content
        await expect(resultsContainer).toContainText('cat1/song1.tja');
        await expect(resultsContainer).toContainText('cat2/song2.tja');
        await expect(resultsContainer).toContainText('cat3/song3.tja');
        
        // Ensure "Search for songs..." is NOT visible
        await expect(resultsContainer).not.toContainText('Search for songs...');
    });

    test('Truncates results when more than 100 items', async ({ page }) => {
        // Mock with 105 items
        const mockData = Array.from({ length: 105 }, (_, i) => ({
            path: `cat/song${i}.tja`,
            title: `Song ${i}`,
            titleJp: `曲 ${i}`,
            url: `ese/cat/song${i}.tja`,
            type: 'blob'
        }));

        await page.route('**/ese_index.json', route => route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify(mockData)
        }));

        await page.goto('/');

        // Ensure data source panel is expanded
        const dsBody = page.locator('#ds-body');
        if (await dsBody.count() > 0) {
            const classes = await dsBody.getAttribute('class');
            if (classes && classes.includes('collapsed')) {
                await page.click('#ds-collapse-btn');
                await page.waitForTimeout(500);
            }
        }

        const listTab = page.locator('button[data-mode="list"]');
        await listTab.click();
        
        const resultsContainer = page.locator('#ese-results');
        
        // Expect 100 items
        await expect(resultsContainer.locator('.ese-result-item')).toHaveCount(100);
        
        // Expect truncation message
        await expect(resultsContainer).toContainText('Showing top 100 results');
    });
});
