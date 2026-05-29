import { expect, test } from "@playwright/test";
import type { TJAChart } from "../src/components/tja-chart.js";

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

test.describe("Large Vertical Insets with Attribution", () => {
  test("Visual regression", async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      return chart && (chart as TJAChart).chart;
    });

    await page.evaluate((tja) => {
      window.loadChart(tja, "oni");
      window.setOptions({ showAttribution: true, beatsPerLine: 16 });
      const chart = document.getElementById("chart-component") as TJAChart;
      if (chart) {
        chart.insetsOverride = {
          top: 80,
          bottom: 80,
          left: 20,
          right: 20,
        };
      }
    }, SIMPLE_TJA);

    await page.waitForFunction(() => {
      const chart = document.getElementById("chart-component") as TJAChart;
      return chart?.layout?.insets.top === 80;
    });

    await expect(page.locator("tja-chart")).toHaveScreenshot("large-vertical-inset-attribution.png");
  });
});

test.describe("Content Inset", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      return chart && (chart as TJAChart).chart;
    });
    await page.evaluate((tja) => {
      window.loadChart(tja, "oni");
    }, SIMPLE_TJA);
    await page.waitForTimeout(100);
  });

  test("offsetY equals insets.top plus headerHeight plus annotationHeight", async ({ page }) => {
    const info = await page.evaluate(() => window.getLayoutInfo());
    expect(info).not.toBeNull();
    if (!info) return;

    const annotationHeight = info.constants.barNumberOffsetY + 3 * info.constants.statusFontSize;
    // gap is exactly annotationHeight (not affected by insets), providing space for bar info above the first bar
    const expectedOffsetY = info.insets.top + info.headerHeight + annotationHeight;

    // offsetY must include insets.top to position below header, plus annotationHeight for bar info spacing
    expect(info.offsetY).toBeCloseTo(expectedOffsetY, 1);
  });

  test("Content inset visual regression", async ({ page }) => {
    await expect(page.locator("tja-chart")).toHaveScreenshot("content-inset.png");
  });
});
