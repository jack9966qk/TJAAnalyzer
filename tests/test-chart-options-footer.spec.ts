import { expect, test } from "@playwright/test";

test.describe("Chart Options Footer", () => {
  test("should be visible and contain export and fullscreen buttons", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Expand chart options panel if collapsed
    const panel = page.locator("#chart-options-panel");
    const body = panel.locator(".panel-body");

    // Check if collapsed
    if (await body.getAttribute("class").then((c) => c?.includes("collapsed"))) {
      await panel.locator(".panel-header").click();
    }
    await expect(body).not.toHaveClass(/collapsed/);

    const footer = page.locator("chart-options-footer");
    await expect(footer).toBeVisible();

    // Check for Export Image button
    const exportBtn = footer.locator("save-image-button");
    await expect(exportBtn).toBeVisible();
    await expect(exportBtn).toContainText("Save Image");

    // Check for Fullscreen button
    const fullscreenBtn = footer.locator("button[title='Fullscreen']");
    await expect(fullscreenBtn).toBeVisible();
  });

  test("should be hidden when panel is collapsed", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const panel = page.locator("#chart-options-panel");
    const header = panel.locator(".panel-header");
    const body = panel.locator(".panel-body");

    // Ensure expanded first
    if (await body.getAttribute("class").then((c) => c?.includes("collapsed"))) {
      await header.click();
    }
    await expect(body).not.toHaveClass(/collapsed/);

    // Now collapse it
    await header.click();
    await expect(body).toHaveClass(/collapsed/);

    // Allow animation to complete
    await page.waitForTimeout(1000);

    // Footer should be inside collapsed body, so technically it is not visible
    // Note: Playwright's toBeVisible() checks if the element is visible to the user.
    // CSS display:none on parent hides children.
    const footer = page.locator("chart-options-footer");

    // Check bounding box height
    const _box = await footer.boundingBox();
    // If hidden, box might be null, or height 0 (clipped)
    // Note: if parent clips overflow, the child still has dimensions but might not be visible.
    // But Playwright's boundingBox returns the box.
    // However, toBeVisible() handles clipping.
    // Let's rely on toBeVisible but assume my previous assumption about visibility was flaky?
    // Actually, if I use a simpler check:

    await expect(footer).not.toBeVisible();
  });

  test("should persist across tab switching", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Expand chart options panel
    const panel = page.locator("#chart-options-panel");
    if (
      await panel
        .locator(".panel-body")
        .getAttribute("class")
        .then((c) => c?.includes("collapsed"))
    ) {
      await panel.locator(".panel-header").click();
    }

    const footer = page.locator("chart-options-footer");
    await expect(footer).toBeVisible();

    // Switch to Judgements tab
    await page.click("button[data-do-tab='judgements']");
    await expect(footer).toBeVisible();
    await expect(footer.locator("save-image-button")).toBeVisible();

    // Switch to Annotation tab
    await page.click("button[data-do-tab='annotation']");
    await expect(footer).toBeVisible();
    await expect(footer.locator("save-image-button")).toBeVisible();

    // Switch to Selection tab
    await page.click("button[data-do-tab='selection']");
    await expect(footer).toBeVisible();
    // Selection tab has its own export buttons (SelectOptions), but the footer one should also be there
    await expect(footer.locator("save-image-button")).toBeVisible();
  });
});
