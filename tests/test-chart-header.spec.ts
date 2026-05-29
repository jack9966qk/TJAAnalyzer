import { expect, test } from "@playwright/test";
import type { TJAChart } from "../src/components/tja-chart.js";

test.describe("Chart Header Layout", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      return chart && (chart as TJAChart).chart;
    });
  });

  test("Standard Layout (Short Title)", async ({ page }) => {
    const tja = `
TITLE:Short Title
SUBTITLE:Short Subtitle
BPM:120
COURSE:Oni
LEVEL:8
#START
1000,
#END
    `;
    await page.evaluate((tjaContent) => {
      window.loadChart(tjaContent, "oni");
    }, tja);

    // Wait for render
    await page.waitForTimeout(100);

    await expect(page.locator("tja-chart")).toHaveScreenshot("header-standard.png");
  });

  test("Stacked Layout (Long Title)", async ({ page }) => {
    const tja = `
TITLE:This is a very very long title that should trigger the stacked layout mode because it overlaps
SUBTITLE:This is also a very long subtitle that contributes to the overlap decision
BPM:120
COURSE:Oni
LEVEL:10
#START
1000,
#END
    `;
    await page.evaluate((tjaContent) => {
      window.loadChart(tjaContent, "oni");
    }, tja);

    // Wait for render
    await page.waitForTimeout(100);

    await expect(page.locator("tja-chart")).toHaveScreenshot("header-stacked.png");
  });
});
