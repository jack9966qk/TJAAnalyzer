import { expect, test } from "@playwright/test";

test("Visual Priority: Branch Line vs BPM Line", async ({ page }) => {
  await page.goto("/chart-only.html");

  const tjaContent = `
TITLE:BPM Branch Conflict
BPM:120
COURSE:Oni
LEVEL:10

#START
1,
#BPMCHANGE 150
#BRANCHSTART p, 10, 20
#N
1,
#E
1,
#M
1,
#BRANCHEND
#END
`;

  await page.evaluate((tja) => {
    window.loadChart(tja);
    // Ensure we can see the branch start
    window.setOptions({ showAllBranches: true });
  }, tjaContent);

  const canvas = page.locator("#chart-component");
  await expect(canvas).toBeVisible();

  // We expect Bar 1 start line to be yellow (branch), not grey (BPM change).
  // Visual verification via snapshot.
  await expect(canvas).toHaveScreenshot("bpm-branch-conflict.png");
});
