import { expect, test } from "@playwright/test";

// iPhone X-ish dimensions; small enough that horizontal layout will not engage
// (390 < 0.4 * width requires width > 975).
const MOBILE_VIEWPORT = { width: 375, height: 812 };

// The bottom sheet slides in via a `transform` transition. Wait until its
// position is stable across several frames so visual snapshots always capture
// the settled state rather than a mid-transition frame (which would shift the
// whole sheet and fail regardless of any pixel budget).
async function waitForSheetSettled(page: import("@playwright/test").Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const sheet = document.getElementById("chart-options-panel");
        if (!sheet) return resolve();
        let lastTop = Number.NaN;
        let stableFrames = 0;
        const tick = () => {
          const top = sheet.getBoundingClientRect().top;
          if (Math.abs(top - lastTop) < 0.01) {
            if (++stableFrames >= 3) return resolve();
          } else {
            stableFrames = 0;
          }
          lastTop = top;
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

async function gotoVertical(page: import("@playwright/test").Page) {
  await page.setViewportSize(MOBILE_VIEWPORT);
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await expect(page.locator("body")).not.toHaveClass(/horizontal-layout/);
  await waitForSheetSettled(page);
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

test.describe("Vertical Layout: Floating Actions Auto-Hide", () => {
  test("Floating actions hide when the chart is scrolled out of bounds", async ({ page }) => {
    await gotoVertical(page);
    const wrapper = page.locator("#floating-actions-wrapper");

    // Visible while pill sits over the chart preview.
    await expect(wrapper).not.toHaveClass(/floating-hidden/);

    // Scroll far enough that the chart's bottom rises above the pill.
    await page.evaluate(() => window.scrollTo(0, 1000));
    await page.waitForTimeout(300);
    await expect(wrapper).toHaveClass(/floating-hidden/);

    // Scroll back; visibility restores.
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await expect(wrapper).not.toHaveClass(/floating-hidden/);
  });
  test("Floating actions visibility tracks the bottom sheet height, not just scroll", async ({ page }) => {
    await gotoVertical(page);
    const wrapper = page.locator("#floating-actions-wrapper");

    // Collapse the data source panel first so expanding the sheet later does
    // not reflow the chart — isolating sheet height as the only variable.
    await page.click("#ds-panel-header");
    await page.waitForTimeout(300);

    // Scroll so the chart's bottom edge sits just above the pill (collapsed
    // sheet): the pill now overhangs the chart and must hide.
    await page.evaluate(() => {
      const pill = document.getElementById("floating-chart-actions")?.getBoundingClientRect();
      const chart = document.getElementById("chart-component")?.getBoundingClientRect();
      if (!pill || !chart) return;
      window.scrollBy(0, chart.bottom - (pill.bottom - 20));
    });
    await page.waitForTimeout(300);
    await expect(wrapper).toHaveClass(/floating-hidden/);

    // Expand the sheet without scrolling: the pill rises above the chart's
    // bottom edge and should become visible again purely from the height change.
    await page.click("#options-panel-header");
    await page.waitForTimeout(500);
    await expect(wrapper).not.toHaveClass(/floating-hidden/);

    // Collapsing the sheet drops the pill back over the edge → hidden again.
    await page.click("#options-panel-header");
    await page.waitForTimeout(500);
    await expect(wrapper).toHaveClass(/floating-hidden/);
  });
});

test.describe("Vertical Layout: Visual Regression", () => {
  // The chart-options tab bar at the bottom of the collapsed sheet exhibits
  // Chromium sub-pixel text-antialiasing jitter (the box layout is fully
  // deterministic — verified — but glyph edges rasterize a few pixels
  // differently between renders). Allow a small per-snapshot pixel budget so
  // this AA noise (observed up to ~80px) doesn't flake while real regressions,
  // which are far larger, still fail.
  const AA_NOISE_BUDGET = { maxDiffPixels: 200 };

  test("Initial state (DS expanded, sheet collapsed)", async ({ page }) => {
    await gotoVertical(page);
    await expect(page).toHaveScreenshot("vertical-initial.png", AA_NOISE_BUDGET);
  });

  test("Sheet expanded state", async ({ page }) => {
    await gotoVertical(page);
    await page.click("#options-panel-header");
    await waitForSheetSettled(page);
    await expect(page).toHaveScreenshot("vertical-sheet-expanded.png", AA_NOISE_BUDGET);
  });

  test("Floating chart actions pill above the collapsed sheet", async ({ page }) => {
    await gotoVertical(page);
    const floating = page.locator("#floating-chart-actions");
    await expect(floating).toBeVisible();
    await expect(floating).toHaveScreenshot("vertical-floating-actions.png");
  });
});
