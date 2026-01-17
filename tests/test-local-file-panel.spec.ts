import { expect, test } from "@playwright/test";

test.describe("Local File Panel Component", () => {
  test("Load Local TJA File functionality", async ({ page }) => {
    await page.goto("/");

    // Expand panel if needed
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-collapse-btn");
        await page.waitForTimeout(500);
      }
    }

    // Switch to Local File tab
    const fileTab = page.locator('button[data-mode="file"]');
    await fileTab.click();

    // Verify file input is visible
    const fileInput = page.locator("#tja-file-picker");
    await expect(fileInput).toBeVisible();

    // Prepare a mock TJA file content
    const tjaContent = "TITLE:Local Test Chart\nBPM:120\nCOURSE:Oni\nLEVEL:10\n#START\n10101010,\n#END";

    // We need to use setInputFiles.
    // We can create a buffer and pass it.
    await fileInput.setInputFiles({
      name: "test.tja",
      mimeType: "text/plain",
      buffer: Buffer.from(tjaContent),
    });

    // Verify status display updates
    const statusDisplay = page.locator("#status-display");
    await expect(statusDisplay).toContainText(/Loaded local TJA file/i);

    // Verify chart title is displayed in the canvas/component (indirectly via status or visual check)
    // Or we can check if the Example Load button in Chart List panel is reset?
    // Let's check if we can switch back to List tab and see the "Load Example Data" button enabled.

    const listTab = page.locator('button[data-mode="list"]');
    await listTab.click();

    const loadExampleBtn = page.locator("#load-example-btn");
    await expect(loadExampleBtn).not.toBeDisabled();
    await expect(loadExampleBtn).toHaveText(/Load Example Data/i);
  });
});
