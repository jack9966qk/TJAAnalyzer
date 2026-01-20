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
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const tjaChart = document.getElementById("chart-component") as any;
      tjaChart.viewOptions = {
        ...tjaChart.viewOptions,
        viewMode: "judgements-underline",
        visibility: { perfect: true, good: true, poor: true },
      };
    });

    // 2. Set Judgements (perfect, miss, good)
    // 'miss' represents any judgement string that is not perfect/good/poor.
    // It should result in a grey underline.
    const judgements: string[] = ["perfect", "miss", "good"];
    const deltas: number[] = [0, 0, 0];

    await page.evaluate(
      ({ judgements, deltas }) => {
        // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
        const tjaChart = document.getElementById("chart-component") as any;
        const chart = tjaChart.chart;
        const map = new Map<string, { judgement: string; delta: number }>();

        if (chart) {
          let noteCount = 0;
          const counters: Record<string, number> = {};

          for (const bar of chart.bars) {
            for (const char of bar) {
              if (["1", "2", "3", "4"].includes(char)) {
                if (noteCount < judgements.length) {
                  const j = judgements[noteCount];
                  const d = deltas[noteCount];

                  if (counters[char] === undefined) counters[char] = 0;
                  const ordinal = counters[char];
                  counters[char]++;

                  map.set(`${char}_${ordinal}`, { judgement: j, delta: d });
                }
                noteCount++;
              }
            }
          }
        }

        window.setJudgements(map);
      },
      { judgements, deltas },
    );

    // Allow render cycle
    await page.waitForTimeout(100);

    await expect(chartElement).toHaveScreenshot("judgements-underline-miss.png");
  });
});
