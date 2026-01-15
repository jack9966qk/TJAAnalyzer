import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: /.*\.(test|spec)\.ts/,
  /* Maximum time one test can run for. */
  timeout: 30 * 1000,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Expect timeout per action. */
  expect: {
    timeout: 5000,
  },
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI. */
  workers: 5,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: "list",
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Maximum time each action such as `click()` can take. Defaults to 0 (no limit). */
    actionTimeout: 0,
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: "http://localhost:8080",

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: "on-first-retry",
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chromium"],
      },
    },
  ],

  /* Folder for test artifacts such as screenshots, videos, traces, etc. */
  outputDir: "test-results/",

  /* Run your local dev server before starting the tests */
  webServer: {
    command: "npm start",
    port: 8080,
    reuseExistingServer: !process.env.CI,
  },
});
