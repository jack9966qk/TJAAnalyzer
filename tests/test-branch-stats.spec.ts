import { expect, test } from "@playwright/test";

test.describe("Branch Stats in Note Stats Component", () => {
  test("Displays info when hovering branch start", async ({ page }) => {
    await page.goto("/component-test.html?component=note-stats");

    // Populate data
    await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: accessing custom element props
      const el = document.getElementById("test-component") as any;

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
        charIndex: -1, // Indicates branch line
        branchStartParams: {
          type: "p",
          p1: 80,
          p2: 96,
        },
      };

      el.chart = chart;
      el.hit = null; // No note hit
      el.branchHit = branchHit;
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
      // biome-ignore lint/suspicious/noExplicitAny: accessing custom element props
      const el = document.getElementById("test-component") as any;
      el.chart = {};
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
      // biome-ignore lint/suspicious/noExplicitAny: accessing custom element props
      const el = document.getElementById("test-component") as any;
      el.chart = { branches: {} };
      el.hit = null;
      el.branchHit = null;
    });

    const stats = page.locator("note-stats");
    const branchPanel = stats.locator(".branch-info-panel");

    await expect(branchPanel).toBeVisible();

    // Check width calculation: 90px * 2 + 10px = 190px
    await expect(branchPanel).toHaveCSS("flex-basis", "190px");
    await expect(branchPanel).toHaveCSS("min-width", "190px");
  });
});
