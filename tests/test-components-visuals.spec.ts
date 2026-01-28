import { expect, test } from "@playwright/test";

test.describe("Web Components Visual Regression", () => {
  test("Chart List Panel", async ({ page }) => {
    await page.goto("/component-test.html?component=chart-list-panel&width=400");
    const component = page.locator("chart-list-panel");

    // Mock ESE tree
    await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Mocking global objects
      (window as any).appState.eseTree = [{ path: "Category/Song 1.tja" }, { path: "Category/Song 2.tja" }];
      // Trigger render
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const el = document.querySelector("chart-list-panel") as any;
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
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const el = document.querySelector("course-branch-select") as any;
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

    const btn = component.locator("button");
    if ((await btn.count()) > 0) {
      await btn.click();
      const modal = page.locator(".modal-content");
      await expect(modal).toBeVisible();
      // Wait for content to load
      await expect(modal).toContainText("Initial commit");
      await expect(modal).toContainText("ESE Database");
      await expect(modal).toContainText("ese1234");
      await expect(modal).toHaveScreenshot("changelog-panel-open.png");
    }
  });

  test("Save Image Button", async ({ page }) => {
    await page.goto("/component-test.html?component=save-image-button&width=200");
    const component = page.locator("save-image-button");
    const btn = component.locator("button"); // Playwright pierces Shadow DOM by default
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
});
