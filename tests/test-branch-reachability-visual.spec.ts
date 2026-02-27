import { expect, test } from "@playwright/test";

test("Reachability Visuals - Forced Branches", async ({ page }) => {
  await page.goto("/chart-only.html");

  const tjaContent = `
TITLE:Reachability_Forced_85_85
BPM:150
COURSE:Oni
LEVEL:10

#START
1,
#BRANCHSTART p, 85, 85
#N
1,
#E
2,
#M
3,
#BRANCHEND
1,
#END
`;

  await page.evaluate((tja) => {
    window.loadChart(tja);
    // Ensure "Show All Branches" is ON
    window.setOptions({ showAllBranches: true, hideUnreachableBranches: true });
  }, tjaContent);

  const canvas = page.locator("#chart-component");
  await expect(canvas).toBeVisible();

  // We expect:
  // Bar 0: Common (1 line)
  // Bar 1: Branched (2 lines: Normal, Master). Expert (85, 85) should be hidden.
  // Bar 2: Common (1 line)

  // Verify visual snapshot
  await expect(canvas).toHaveScreenshot("forced-branches-85-85.png");
});
