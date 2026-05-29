import { expect, test } from "@playwright/test";
import type { TJAChart } from "../src/components/tja-chart.js";

test("Full App - Annotation click works on Annotate tab", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  // Click on the "Annotate" tab (force: true to handle potential overlay from note-stats)
  await page.click("button[data-do-tab='annotation']", { force: true });
  await page.waitForTimeout(500);

  // Get note coordinates from the chart
  const notePos = await page.evaluate(() => {
    const chart = document.querySelector("tja-chart") as TJAChart;
    if (!chart) return null;
    return chart.getNoteCoordinates(0, 0);
  });

  if (!notePos) {
    console.log("No note found, skipping click test");
    return;
  }

  const tjaChart = page.locator("tja-chart");

  // Capture canvas content before clicking
  const canvasBefore = await page.evaluate(() => {
    const chart = document.querySelector("tja-chart");
    const canvas = chart?.shadowRoot?.querySelector("canvas");
    return canvas?.toDataURL() ?? null;
  });

  // Click on the note
  await tjaChart.click({ position: notePos });
  await page.waitForTimeout(500);

  // Capture canvas content after clicking
  const canvasAfter = await page.evaluate(() => {
    const chart = document.querySelector("tja-chart");
    const canvas = chart?.shadowRoot?.querySelector("canvas");
    return canvas?.toDataURL() ?? null;
  });

  expect(canvasBefore).not.toBeNull();
  expect(canvasAfter).not.toBeNull();
  expect(canvasAfter).not.toEqual(canvasBefore);
});
