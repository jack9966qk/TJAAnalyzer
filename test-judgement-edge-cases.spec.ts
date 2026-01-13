import { expect, test } from "@playwright/test";

test.describe("Judgement View Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/chart-only.html");

    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      if (!chart || !chart.shadowRoot) return false;
      const canvas = chart.shadowRoot.querySelector("canvas");
      return canvas && canvas.height > 0;
    });
  });

  test("Judgements Underline View with Miss (Non-Standard Judgement)", async ({ page }) => {
    const chartElement = page.locator("#chart-component");

    // 1. Set View Mode to Judgements Underline
    await page.evaluate(() => {
      const tjaChart = document.getElementById("chart-component") as any;
      tjaChart.viewOptions = {
        ...tjaChart.viewOptions,
        viewMode: "judgements-underline",
        visibility: { perfect: true, good: true, poor: true },
      };
    });

    // 2. Set Judgements (Perfect, Miss, Good)
    // 'Miss' represents any judgement string that is not Perfect/Good/Poor.
    // It should result in a grey underline.
    const judgements: string[] = ["Perfect", "Miss", "Good"];
    const deltas: number[] = [0, 0, 0];

    await page.evaluate(
      ({ judgements, deltas }) => {
        (window as any).setJudgements(judgements, deltas);
      },
      { judgements, deltas },
    );

    // Allow render cycle
    await page.waitForTimeout(100);

    await expect(chartElement).toHaveScreenshot("judgements-underline-miss.png");
  });
});
