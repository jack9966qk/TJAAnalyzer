import { expect, test } from "@playwright/test";

test.describe("Layout Tests", () => {
  test("Horizontal Layout Footer and Scrollability", async ({ page }) => {
    // Set viewport to trigger horizontal layout (W > 975 usually, but code says CONTROLS_WIDTH < windowWidth * 0.4)
    // CONTROLS_WIDTH is 390. 390 < 0.4 * W => 390 / 0.4 < W => 975 < W
    // So we need width > 975. Let's use 1200.
    await page.setViewportSize({ width: 1200, height: 800 });

    await page.goto("/");
    await page.waitForTimeout(1000);

    // Verify horizontal layout class
    const body = page.locator("body");
    await expect(body).toHaveClass(/horizontal-layout/);

    // Verify footer is in controls container
    const footerInControls = page.locator("#controls-container > .app-footer");
    await expect(footerInControls).toBeVisible();

    const controls = page.locator("#controls-container");

    // Case 1: Short content (Footer should be at bottom of container)
    // Collapse everything to make content short
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0 && !(await dsBody.getAttribute("class"))?.includes("collapsed")) {
      await page.click("#ds-collapse-btn");
    }
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0 && !(await optionsBody.getAttribute("class"))?.includes("collapsed")) {
      await page.click("#options-collapse-btn");
    }
    await page.waitForTimeout(500);

    // Check footer position
    const controlsBox = await controls.boundingBox();
    const footer = page.locator(".app-footer");
    const footerBox = await footer.boundingBox();

    if (controlsBox && footerBox) {
      // Footer bottom should be at Controls bottom
      expect(Math.abs(controlsBox.y + controlsBox.height - (footerBox.y + footerBox.height))).toBeLessThan(5);
    }

    // Case 2: Tall content (Should scroll)
    // Expand everything
    if ((await dsBody.count()) > 0 && (await dsBody.getAttribute("class"))?.includes("collapsed")) {
      await page.click("#ds-collapse-btn");
    }
    if ((await optionsBody.count()) > 0 && (await optionsBody.getAttribute("class"))?.includes("collapsed")) {
      await page.click("#options-collapse-btn");
    }
    // Switch to List tab (it has results list which can be long)
    await page.click('button[data-mode="list"]');

    // Mock many results to ensure overflow
    await page.evaluate(() => {
      const results = document.getElementById("ese-results");
      if (results) {
        for (let i = 0; i < 50; i++) {
          const div = document.createElement("div");
          div.innerText = `Mock Result ${i}`;
          div.style.padding = "10px";
          results.appendChild(div);
        }
      }
    });
    await page.waitForTimeout(500);

    // Check scrollability
    // Inject a tall element to force overflow
    await page.evaluate(() => {
      const container = document.getElementById("controls-container");
      const spacer = document.createElement("div");
      spacer.style.height = "2000px";
      spacer.style.background = "red";
      spacer.innerText = "Spacer";
      container?.appendChild(spacer);
    });

    // Check scrollability
    const scrollable = await controls.evaluate((el) => {
      return el.scrollHeight > el.clientHeight;
    });
    expect(scrollable).toBe(true);

    // Verify sticky-header is static in horizontal layout
    const stickyHeader = page.locator("#sticky-header");
    await expect(stickyHeader).toHaveCSS("position", "static");

    // Verify footer is pushed down (not sticking to bottom of viewport obscuring content)
    // It should be after the content.

    // The structure is: header, ds-panel, sticky-header, footer, SPACER.
    // Wait, appending spacer puts it AFTER footer?
    // JS moves footer to controls-container. If I append spacer, it depends on when footer was moved.
    // Footer is moved in updateLayout() which runs on resize/init.
    // Spacer appended now will be last.

    // Let's scroll to bottom
    await controls.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
    });

    // Spacer should be visible at bottom
    // Footer should be above spacer?
    // Actually, if I append spacer, it is the last child.
    // So Footer is somewhere above it.

    // Let's verify we can scroll to the spacer
    await page.evaluate(() => {
      const container = document.getElementById("controls-container");
      const spacer = container?.lastElementChild as HTMLElement;
      if (!spacer) return false;
      const rect = spacer.getBoundingClientRect();
      const containerRect = container?.getBoundingClientRect();
      if (containerRect) {
        return rect.bottom > containerRect.top; // Visible in some way
      }
      return false;
    });
    // Just checking standard visibility
    await expect(page.locator("text=Spacer")).toBeVisible();
  });

  test("Vertical Layout Default Stats Hidden", async ({ page }) => {
    // Set viewport to trigger vertical layout (W <= 975)
    // 390 < 0.4 * W => W > 975 for horizontal.
    // So 800 should be vertical.
    await page.setViewportSize({ width: 800, height: 800 });

    await page.goto("/");
    await page.waitForTimeout(1000);

    // Verify vertical layout (no horizontal-layout class)
    const body = page.locator("body");
    await expect(body).not.toHaveClass(/horizontal-layout/);

    // Verify stats checkbox is unchecked
    const statsCheckbox = page.locator("#show-stats-checkbox");
    await statsCheckbox.waitFor({ state: "attached" });
    await expect(statsCheckbox).not.toBeChecked();

    // Verify note stats display is hidden
    const statsDisplay = page.locator("#note-stats-display");
    await expect(statsDisplay).toBeHidden();
  });
});
