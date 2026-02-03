import { expect, test } from "@playwright/test";

test("fullscreen exit button has correct icon", async ({ page }) => {
  await page.goto("http://localhost:8080"); // Assuming dev server is running or I can just load the file

  // Wait for the tja-chart component to be defined and present
  await page.waitForSelector("tja-chart");

  // Evaluate inside the page to check the shadow DOM
  const iconSrc = await page.evaluate(() => {
    const chart = document.querySelector("tja-chart");
    if (!chart || !chart.shadowRoot) return null;
    const btn = chart.shadowRoot.querySelector("#exit-fullscreen-btn");
    if (!btn) return null;
    const img = btn.querySelector("img");
    return img ? img.getAttribute("src") : null;
  });

  expect(iconSrc).toBe("assets/heroicons/optimized/24/outline/arrows-pointing-in.svg");
});
