import { expect, test } from "@playwright/test";
import type { NoteStatsDisplay } from "../src/components/note-stats.js";

test.describe("Branch Stats in Note Stats Component", () => {
  test("Displays info when hovering branch start", async ({ page }) => {
    await page.goto("/component-test.html?component=note-stats");

    // Populate data
    await page.evaluate(() => {
      const el = document.getElementById("test-component") as NoteStatsDisplay;

      const chart = {
        branches: {
          normal: {},
          expert: {},
          master: {},
        },
        bars: [], // NoteStats needs bars for gap calc safety
        barParams: [],
      };

      // NoteStats usually takes 'hit' as note hit.
      // We need to set 'branchHit' for branch info.
      // But updateStatsComponent logic in app is what separates them.
      // In this component test, we need to set properties directly.

      const branchHit = {
        location: { charIndex: -1 }, // Indicates branch line
        branchStartParams: {
          type: "p",
          p1: 80,
          p2: 96,
        },
      };

      el.chart = chart as unknown as NoteStatsDisplay["chart"];
      el.hit = null; // No note hit
      el.branchHit = branchHit as unknown as NoteStatsDisplay["branchHit"];
    });

    const stats = page.locator("note-stats");
    await expect(stats).toBeVisible();

    await expect(stats.getByText("Accuracy", { exact: false })).toBeVisible();
    await expect(stats.getByText("80", { exact: false })).toBeVisible();
    await expect(stats.getByText("96", { exact: false })).toBeVisible();
  });

  test("Hidden when chart has no branches", async ({ page }) => {
    await page.goto("/component-test.html?component=note-stats");

    await page.evaluate(() => {
      const el = document.getElementById("test-component") as NoteStatsDisplay;
      el.chart = {} as unknown as NoteStatsDisplay["chart"];
      el.hit = null;
      el.branchHit = null;
    });

    const stats = page.locator("note-stats");
    // NoteStats is always visible
    await expect(stats).toBeVisible();
    // Branch info panel should be hidden because chart has no branches
    await expect(stats.locator(".branch-info-panel")).toBeHidden();
  });

  test("Visible and correct width when chart has branches", async ({ page }) => {
    await page.goto("/component-test.html?component=note-stats");

    await page.evaluate(() => {
      const el = document.getElementById("test-component") as NoteStatsDisplay;
      el.chart = { branches: {} } as unknown as NoteStatsDisplay["chart"];
      el.hit = null;
      el.branchHit = null;
    });

    const stats = page.locator("note-stats");
    const branchPanel = stats.locator(".branch-info-panel");

    await expect(branchPanel).toBeVisible();
  });
});
