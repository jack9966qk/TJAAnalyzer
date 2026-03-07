import { expect, test } from "@playwright/test";

const SIMPLE_TJA = `
TITLE:Inset Test
SUBTITLE:Content Inset
BPM:120
COURSE:Oni
LEVEL:5
#START
1000,
1000,
1000,
1000,
#END
`.trim();

test.describe("Content Inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      // biome-ignore lint/suspicious/noExplicitAny: Accessing internal chart property for test readiness check
      return chart && (chart as any).chart;
    });
    await page.evaluate((tja) => {
      window.loadChart(tja, "oni");
    }, SIMPLE_TJA);
    await page.waitForTimeout(100);
  });

  test("offsetY equals headerHeight plus gap (not double-counting insets)", async ({ page }) => {
    const info = await page.evaluate(() => window.getLayoutInfo());
    expect(info).not.toBeNull();
    if (!info) return;

    const annotationHeight = info.constants.barNumberOffsetY + 3 * info.constants.statusFontSize;
    const gap = Math.max(info.insets.top, annotationHeight);
    const expectedOffsetY = info.headerHeight + gap;

    // offsetY must be exactly headerHeight + gap (not headerHeight + insets.top + gap)
    expect(info.offsetY).toBeCloseTo(expectedOffsetY, 1);

    // Sanity check: the double-counted value would differ by insets.top
    const buggyOffsetY = info.headerHeight + info.insets.top + gap;
    if (info.insets.top > 0) {
      expect(info.offsetY).not.toBeCloseTo(buggyOffsetY, 1);
    }
  });

  test("Content inset visual regression", async ({ page }) => {
    await expect(page.locator("tja-chart")).toHaveScreenshot("content-inset.png");
  });
});
