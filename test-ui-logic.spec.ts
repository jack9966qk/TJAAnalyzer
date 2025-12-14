import { test, expect } from '@playwright/test';
import * as path from 'path';

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
        // We need a dummy .tja file.
        // We can just use the example one or create a buffer.
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
