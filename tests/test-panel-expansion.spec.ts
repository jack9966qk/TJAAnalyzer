import { expect, test } from "@playwright/test";

test.describe("Panel Expansion Logic", () => {
  test("Panels should expand if they fit in half the viewport", async ({ page }) => {
    // Set a large viewport
    await page.setViewportSize({ width: 1200, height: 1000 });
    await page.goto("/");

    // Wait for the app to initialize (element attached)
    await page.waitForSelector("#ds-body", { state: "attached" });

    // Allow some time for init logic to run
    await page.waitForTimeout(500);

    // Check if panels are expanded (should NOT have 'collapsed' class)
    const dsClass = await page.getAttribute("#ds-body", "class");
    const optionsClass = await page.getAttribute("#options-body", "class");

    expect(dsClass).not.toContain("collapsed");
    expect(optionsClass).not.toContain("collapsed");
  });

  test("Panels should collapse if they take up too much space", async ({ page }) => {
    // Set a small viewport height
    await page.setViewportSize({ width: 1200, height: 300 });
    await page.goto("/");

    // Wait for the app to initialize
    await page.waitForSelector("#ds-body", { state: "attached" });

    // Allow some time for init logic to run
    await page.waitForTimeout(500);

    // Check if panels are collapsed (should HAVE 'collapsed' class)
    const dsClass = await page.getAttribute("#ds-body", "class");
    const optionsClass = await page.getAttribute("#options-body", "class");

    expect(dsClass).toContain("collapsed");
    expect(optionsClass).toContain("collapsed");
  });
});
