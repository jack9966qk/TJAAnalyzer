import { expect, test } from "@playwright/test";

// iPhone X-ish dimensions; small enough that horizontal layout will not engage
// (390 < 0.4 * width requires width > 975).
const MOBILE_VIEWPORT = { width: 375, height: 812 };

async function gotoVertical(page: import("@playwright/test").Page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveClass(/horizontal-layout/);
}

async function dsIsCollapsed(page: import("@playwright/test").Page) {
  return ((await page.getAttribute("#ds-body", "class")) ?? "").includes("collapsed");
}

async function sheetIsExpanded(page: import("@playwright/test").Page) {
  return ((await page.getAttribute("#chart-options-panel", "class")) ?? "").includes("sheet-expanded");
}

test.describe("Vertical Layout: Mutually Exclusive Panel Expansion", () => {
  test("Expanding the chart options sheet collapses the data source panel", async ({ page }) => {
    await gotoVertical(page);

    // DS panel starts expanded; sheet starts collapsed.
    expect(await dsIsCollapsed(page)).toBe(false);
    expect(await sheetIsExpanded(page)).toBe(false);

    // Tap on the options panel header to expand the sheet.
    await page.click("#options-panel-header");
    await page.waitForTimeout(400);

    expect(await sheetIsExpanded(page)).toBe(true);
    expect(await dsIsCollapsed(page)).toBe(true);
  });

  test("Expanding the data source panel collapses the chart options sheet", async ({ page }) => {
    await gotoVertical(page);

    // First expand the sheet, which also collapses DS.
    await page.click("#options-panel-header");
    await page.waitForTimeout(400);
    expect(await sheetIsExpanded(page)).toBe(true);
    expect(await dsIsCollapsed(page)).toBe(true);

    // Now expand DS panel by clicking its header. Sheet should snap back to collapsed.
    await page.click("#ds-panel-header");
    await page.waitForTimeout(400);

    expect(await dsIsCollapsed(page)).toBe(false);
    expect(await sheetIsExpanded(page)).toBe(false);
  });

  test("Both panels can be collapsed simultaneously", async ({ page }) => {
    await gotoVertical(page);

    // Collapse DS panel manually (sheet is already collapsed by default).
    await page.click("#ds-panel-header");
    await page.waitForTimeout(200);

    expect(await dsIsCollapsed(page)).toBe(true);
    expect(await sheetIsExpanded(page)).toBe(false);
  });

  test("Tapping the active tab expands the sheet and collapses DS", async ({ page }) => {
    await gotoVertical(page);

    // "view" is the default active tab. Tapping it should expand the sheet.
    await page.click("button.panel-tab.active[data-do-tab='view']");
    await page.waitForTimeout(400);

    expect(await sheetIsExpanded(page)).toBe(true);
    expect(await dsIsCollapsed(page)).toBe(true);
  });
});

test.describe("Vertical Layout: Visual Regression", () => {
  test("Initial state (DS expanded, sheet collapsed)", async ({ page }) => {
    await gotoVertical(page);
    await expect(page).toHaveScreenshot("vertical-initial.png");
  });

  test("Sheet expanded state", async ({ page }) => {
    await gotoVertical(page);
    await page.click("#options-panel-header");
    await page.waitForTimeout(400);
    await expect(page).toHaveScreenshot("vertical-sheet-expanded.png");
  });

  test("Floating chart actions pill above the collapsed sheet", async ({ page }) => {
    await gotoVertical(page);
    const floating = page.locator("#floating-chart-actions");
    await expect(floating).toBeVisible();
    await expect(floating).toHaveScreenshot("vertical-floating-actions.png");
  });
});
