import { expect, test } from "@playwright/test";
import type { ChartListPanel } from "../src/components/chart-list-panel.js";
import type { CourseBranchSelect } from "../src/components/course-branch-select.js";
import type { SelectOptions } from "../src/components/select-options.js";
import type { AppState } from "../src/state/app-state.js";

test.describe("Web Components Visual Regression", () => {
  test("Chart List Panel", async ({ page }) => {
    await page.goto("/component-test.html?component=chart-list-panel&width=400");
    const component = page.locator("chart-list-panel");

    // Mock ESE tree
    await page.evaluate(() => {
      window.appState.eseTree = [
        { path: "Category/Song 1.tja" },
        { path: "Category/Song 2.tja" },
      ] as unknown as AppState["eseTree"];
      // Trigger render
      const el = document.querySelector("chart-list-panel") as ChartListPanel;
      if (el) el.render();
    });

    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("chart-list-panel.png");
  });

  test("Local File Panel", async ({ page }) => {
    await page.goto("/component-test.html?component=local-file-panel&width=400");
    const component = page.locator("local-file-panel");
    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("local-file-panel.png");
  });

  test("Stream Panel", async ({ page }) => {
    await page.goto("/component-test.html?component=stream-panel&width=400");
    const component = page.locator("stream-panel");
    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("stream-panel.png");
  });

  test("Course Branch Select", async ({ page }) => {
    await page.goto("/component-test.html?component=course-branch-select&width=400");
    const component = page.locator("course-branch-select");

    // Populate with mock data
    await page.evaluate(() => {
      const el = document.querySelector("course-branch-select") as CourseBranchSelect;
      if (el) {
        el.setDifficultyOptions(["oni", "hard", "normal", "easy"]);
        el.difficulty = "oni";
        el.setBranchVisibility(true);
      }
    });

    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("course-branch-select.png");
  });

  test("View Options", async ({ page }) => {
    await page.goto("/component-test.html?component=view-options&width=600");
    const component = page.locator("view-options");
    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("view-options.png");
  });

  test("Judgement Options", async ({ page }) => {
    await page.goto("/component-test.html?component=judgement-options&width=600");
    const component = page.locator("judgement-options");
    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("judgement-options.png");
  });

  test("Select Options", async ({ page }) => {
    await page.goto("/component-test.html?component=select-options&width=400");
    const component = page.locator("select-options");
    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("select-options.png");
  });

  test("Select Options (Branched)", async ({ page }) => {
    await page.goto("/component-test.html?component=select-options&width=400");
    const component = page.locator("select-options");

    await page.evaluate(() => {
      // Mock branched chart showing all branches
      window.appState.currentChart = {
        branches: {
          normal: {},
          expert: {},
          master: {},
        },
      } as unknown as AppState["currentChart"];
      window.appState.renderOptions.showAllBranches = true;

      // Trigger render
      const el = document.querySelector("select-options") as SelectOptions;
      if (el) el.render();
    });

    await expect(component).toBeVisible();
    // The toggle should not be rendered
    await expect(
      component.locator('input[type="checkbox"] + span', { hasText: "Display only selected" }),
    ).not.toBeVisible();
    await expect(component).toHaveScreenshot("select-options-branched.png");
  });

  test("Annotate Options", async ({ page }) => {
    await page.goto("/component-test.html?component=annotate-options&width=400");
    const component = page.locator("annotate-options");
    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("annotate-options.png");
  });

  test("Note Stats (Empty)", async ({ page }) => {
    await page.goto("/component-test.html?component=note-stats&width=200");
    const component = page.locator("note-stats");
    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("note-stats-empty.png");
  });

  test("Changelog Panel", async ({ page }) => {
    // Mock version.json with a placeholder so the snapshot stays stable across version bumps
    await page.route("**/version.json", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ version: "0.0.0" }),
      });
    });

    // Mock changelog.json
    await page.route("**/changelog.json", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { date: "2023-01-01", hash: "abcdef1", message: "Initial commit" },
          { date: "2023-01-02", hash: "1234567", message: "Added feature A" },
          { date: "2023-01-03", hash: "89abcde", message: "Fixed bug B" },
        ]),
      });
    });

    // Mock ese_index.json
    await page.route("**/ese_index.json", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          commit: { sha: "ese123456", date: "2023-10-27T10:00:00Z" },
          files: [],
        }),
      });
    });

    await page.goto("/component-test.html?component=changelog-panel&width=300");
    const component = page.locator("changelog-panel");
    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("changelog-panel-closed.png");

    const btn = component.locator("button#changelog-btn");
    if ((await btn.count()) > 0) {
      await btn.click();
      await expect(page.getByText("Initial commit")).toBeVisible();
      await expect(page.getByText("ESE Database")).toBeVisible();
      await expect(page.getByText("ese1234")).toBeVisible();
      await expect(page).toHaveScreenshot("changelog-panel-open.png");
    }
  });

  test("Save Image Button", async ({ page }) => {
    await page.goto("/component-test.html?component=save-image-button&width=auto");
    const btn = page.locator("save-image-button").locator("button");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveScreenshot("save-image-button.png");
  });

  test("Export Button", async ({ page }) => {
    await page.goto("/component-test.html?component=export-button&width=200");
    const component = page.locator("export-button");
    const btn = component.locator("button");
    await expect(btn).toBeVisible();
    await expect(btn).toHaveScreenshot("export-button.png");
  });

  test("Tester Panel", async ({ page }) => {
    await page.goto("/component-test.html?component=tester-panel&width=400");
    const component = page.locator("tester-panel");
    await expect(component).toBeVisible();
    await expect(component).toHaveScreenshot("tester-panel.png");
  });
});
