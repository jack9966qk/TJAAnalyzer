import path from "node:path";
import { expect, test } from "@playwright/test";

interface TestWindow extends Window {
  // biome-ignore lint/suspicious/noExplicitAny: Test helper
  JudgementMap: any;
  // biome-ignore lint/suspicious/noExplicitAny: Test helper
  NoteLocationMap: any;
}

test.describe("Visual Regression", () => {
  test("Initial Render", async ({ page }) => {
    await page.goto("/chart-only.html");
    // Wait for render
    await page.waitForFunction(
      () => {
        const chart = document.querySelector("tja-chart");
        if (!chart || !chart.shadowRoot) return false;
        const canvas = chart.shadowRoot.querySelector("canvas");
        return canvas && canvas.height > 0;
      },
      { timeout: 10000 },
    );

    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveScreenshot("initial-render.png");
  });

  test("Note Selected", async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      return chart?.shadowRoot?.querySelector("canvas");
    });

    await page.evaluate(() => {
      window.setOptions({
        viewMode: "original",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        beatsPerLine: 16,
        selection: { start: { barIndex: 0, charIndex: 0 }, end: null },
        annotations: new (window as unknown as TestWindow).NoteLocationMap(),
        isAnnotationMode: false,
        showAllBranches: false,
      });
    });

    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveScreenshot("note-selected.png");
  });

  test("BPM Change Tooltip", async ({ page }) => {
    // Mock version to ensure stable snapshot
    await page.route("**/version.json", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ version: "0.0.0" }),
      }),
    );

    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }
    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1000);

    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 35, box.y + 150);
      await page.waitForTimeout(500);
      const app = page.locator("#app");
      await expect(app).toHaveScreenshot("bpm-change-tooltip.png");
    }
  });

  test("Note Stats Tooltip", async ({ page }) => {
    // Mock version to ensure stable snapshot
    await page.route("**/version.json", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ version: "0.0.0" }),
      }),
    );

    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is collapsed
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes && !classes.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is collapsed
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes && !classes.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }
    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(1000);

    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 35, box.y + 33);
      await page.waitForTimeout(500);

      // Verify stats are visible
      const stats = page.locator("note-stats");
      await expect(stats.locator(".stat-value").first()).toBeVisible();

      const app = page.locator("#app");
      await expect(app).toHaveScreenshot("note-stats-tooltip.png");
    }
  });

  test("Judgements View", async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      return chart?.shadowRoot?.querySelector("canvas");
    });

    await page.evaluate(() => {
      window.setOptions({
        viewMode: "judgements",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        beatsPerLine: 16,
        selection: null,
        annotations: new window.NoteLocationMap(),
        isAnnotationMode: false,
        showAllBranches: false,
      });

      let seed = 12345;
      const nextRandom = () => {
        seed = (1103515245 * seed + 12345) % 2147483648;
        return seed / 2147483648;
      };

      const judgements: string[] = [];
      for (let i = 0; i < 300; i++) {
        const rand = nextRandom();
        if (rand < 0.9) {
          judgements.push("perfect");
        } else if (rand < 0.99) {
          judgements.push("good");
        } else {
          judgements.push("poor");
        }
      }
      // Construct Map
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom property
      const tjaChart = document.getElementById("chart-component") as any;
      const chart = tjaChart.chart;
      const map = new (window as unknown as TestWindow).JudgementMap();

      if (chart) {
        let noteCount = 0;
        const counters: Record<string, number> = {};

        for (const bar of chart.bars) {
          for (const char of bar) {
            if (["1", "2", "3", "4"].includes(char)) {
              if (noteCount < judgements.length) {
                const j = judgements[noteCount];

                if (counters[char] === undefined) counters[char] = 0;
                const ordinal = counters[char];
                counters[char]++;

                map.set({ char, ordinal }, { judgement: j, delta: 0 });
              }
              noteCount++;
            }
          }
        }
      }
      window.setJudgements(map);
    });

    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveScreenshot("judgements-view.png");
  });

  test("Judgements Underline View", async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      return chart?.shadowRoot?.querySelector("canvas");
    });

    await page.evaluate(() => {
      window.setOptions({
        viewMode: "judgements-underline",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        beatsPerLine: 16,
        selection: null,
        annotations: new (window as unknown as TestWindow).NoteLocationMap(),
        isAnnotationMode: false,
        showAllBranches: false,
      });

      let seed = 12345;
      const nextRandom = () => {
        seed = (1103515245 * seed + 12345) % 2147483648;
        return seed / 2147483648;
      };

      const judgements: string[] = [];
      for (let i = 0; i < 300; i++) {
        const rand = nextRandom();
        if (rand < 0.9) {
          judgements.push("perfect");
        } else if (rand < 0.99) {
          judgements.push("good");
        } else {
          judgements.push("poor");
        }
      }
      // Construct Map
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom property
      const tjaChart = document.getElementById("chart-component") as any;
      const chart = tjaChart.chart;
      // biome-ignore lint/suspicious/noExplicitAny: Test helper
      const map = new (window as any).JudgementMap();

      if (chart) {
        let noteCount = 0;
        const counters: Record<string, number> = {};

        for (const bar of chart.bars) {
          for (const char of bar) {
            if (["1", "2", "3", "4"].includes(char)) {
              if (noteCount < judgements.length) {
                const j = judgements[noteCount];

                if (counters[char] === undefined) counters[char] = 0;
                const ordinal = counters[char];
                counters[char]++;

                map.set({ char, ordinal }, { judgement: j, delta: 0 });
              }
              noteCount++;
            }
          }
        }
      }
      window.setJudgements(map);
    });

    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveScreenshot("judgements-underline-view.png");
  });

  test("Judgements Text View", async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      return chart?.shadowRoot?.querySelector("canvas");
    });

    await page.evaluate(() => {
      window.setOptions({
        viewMode: "judgements-text",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        beatsPerLine: 16,
        selection: null,
        annotations: new (window as unknown as TestWindow).NoteLocationMap(),
        isAnnotationMode: false,
        showAllBranches: false,
      });

      let seed = 12345;
      const nextRandom = () => {
        seed = (1103515245 * seed + 12345) % 2147483648;
        return seed / 2147483648;
      };

      const judgements: string[] = [];
      for (let i = 0; i < 300; i++) {
        const rand = nextRandom();
        if (rand < 0.9) {
          judgements.push("perfect");
        } else if (rand < 0.99) {
          judgements.push("good");
        } else {
          judgements.push("poor");
        }
      }
      // Construct Map
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom property
      const tjaChart = document.getElementById("chart-component") as any;
      const chart = tjaChart.chart;
      const map = new (window as unknown as TestWindow).JudgementMap();

      if (chart) {
        let noteCount = 0;
        const counters: Record<string, number> = {};

        for (const bar of chart.bars) {
          for (const char of bar) {
            if (["1", "2", "3", "4"].includes(char)) {
              if (noteCount < judgements.length) {
                const j = judgements[noteCount];

                if (counters[char] === undefined) counters[char] = 0;
                const ordinal = counters[char];
                counters[char]++;

                map.set({ char, ordinal }, { judgement: j, delta: 0 });
              }
              noteCount++;
            }
          }
        }
      }
      window.setJudgements(map);
    });

    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveScreenshot("judgements-text-view.png");
  });

  test("Gradient Coloring View", async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      return chart?.shadowRoot?.querySelector("canvas");
    });

    await page.evaluate(() => {
      window.setOptions({
        viewMode: "judgements",
        coloringMode: "gradient",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: false,
        beatsPerLine: 16,
        selection: null,
        annotations: new (window as unknown as TestWindow).NoteLocationMap(),
        isAnnotationMode: false,
        showAllBranches: false,
      });

      let seed = 12345;
      const nextRandom = () => {
        seed = (1103515245 * seed + 12345) % 2147483648;
        return seed / 2147483648;
      };

      const judgements: string[] = [];
      const deltas: number[] = [];

      for (let i = 0; i < 300; i++) {
        const rand = nextRandom();
        let j = "perfect";
        let d = 0;

        if (rand < 0.33) {
          j = "perfect";
          d = 10;
        } else if (rand < 0.66) {
          j = "good";
          d = 80;
        } else {
          j = "poor";
          d = -80;
        }

        judgements.push(j);
        deltas.push(d);
      }

      // Construct Map
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom property
      const tjaChart = document.getElementById("chart-component") as any;
      const chart = tjaChart.chart;
      const map = new (window as unknown as TestWindow).JudgementMap();

      if (chart) {
        let noteCount = 0;
        const counters: Record<string, number> = {};

        for (const bar of chart.bars) {
          for (const char of bar) {
            if (["1", "2", "3", "4"].includes(char)) {
              if (noteCount < judgements.length) {
                const j = judgements[noteCount];
                const d = deltas[noteCount];

                if (counters[char] === undefined) counters[char] = 0;
                const ordinal = counters[char];
                counters[char]++;

                map.set({ char, ordinal }, { judgement: j, delta: d });
              }
              noteCount++;
            }
          }
        }
      }
      window.setJudgements(map);
    });

    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await expect(canvas).toHaveScreenshot("gradient-coloring-view.png");
  });

  test("Loop Collapsed", async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      if (!chart || !chart.shadowRoot) return false;
      const canvas = chart.shadowRoot.querySelector("canvas");
      return canvas && canvas.height > 0;
    });

    const loopTJA = `TITLE:exTora 27
// SUBTITLE:
BPM:150
// WAVE:DON.mp3
// OFFSET:-1.3
DEMOSTART:0
SEVOL:41

COURSE:Oni
LEVEL:10
BALLOON:
SCOREINIT:a
SCOREDIFF:

#START
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
100100102020100100102020100000200000500008000000,
,
,
#END`;

    await page.evaluate((tja) => {
      window.loadChart(tja, "oni");
      window.setOptions({
        viewMode: "original",
        coloringMode: "categorical",
        visibility: { perfect: true, good: true, poor: true },
        collapsedLoop: true,
        selectedLoopIteration: undefined,
        beatsPerLine: 16,
        selection: null,
        annotations: new (window as unknown as TestWindow).NoteLocationMap(),
        isAnnotationMode: false,
      });
    }, loopTJA);

    const canvas = page.locator("#chart-component");
    await expect(canvas).toHaveScreenshot("loop-collapsed.png");
  });

  test("Balloon Render", async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      if (!chart || !chart.shadowRoot) return false;
      const canvas = chart.shadowRoot.querySelector("canvas");
      return canvas && canvas.height > 0;
    });

    const tjaContent = `TITLE:Balloon Test
BPM:120
COURSE:Oni
LEVEL:10
BALLOON:5,10
#START
100000000000700000000800,
700000000000000000000008,
#END`;

    await page.evaluate((tja) => {
      window.loadChart(tja, "oni");
    }, tjaContent);

    const canvas = page.locator("#chart-component");
    await expect(canvas).toHaveScreenshot("balloon-render.png");
  });

  test("Gogo Time Render", async ({ page }) => {
    await page.goto("/chart-only.html");
    await page.waitForFunction(() => {
      const chart = document.querySelector("tja-chart");
      if (!chart || !chart.shadowRoot) return false;
      const canvas = chart.shadowRoot.querySelector("canvas");
      return canvas && canvas.height > 0;
    });

    const tjaContent = `TITLE:Gogo Test
BPM:120
COURSE:Oni
LEVEL:10
#START
1000,
#GOGOSTART
2000,
2000,
#GOGOEND
1000,
#END`;

    await page.evaluate((tja) => {
      window.loadChart(tja, "oni");
    }, tjaContent);

    const canvas = page.locator("#chart-component");
    await expect(canvas).toHaveScreenshot("gogo-render.png");
  });

  test("Load Exported Chart", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }
    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();

    // Switch to File Tab
    await page.click('button[data-mode="file"]');

    const tjaContent = `TITLE:Exported Selection
SUBTITLE:--
BPM:250
WAVE:placeholder.mp3
OFFSET:0
COURSE:Edit
LEVEL:10

#START

// Loop 1
#MEASURE 4/4
#BPMCHANGE 250
#SCROLL 1
0,
10220120,
202120202120,
3022203022203022,
2030222030222220,

// Loop 2
#MEASURE 4/4
#BPMCHANGE 250
#SCROLL 1
0,
10220120,
202120202120,
3022203022203022,
2030222030222220,

// End Padding
#MEASURE 4/4
#BPMCHANGE 250
#SCROLL 1
0,
0,
0,
#END`;

    await page.locator("#tja-file-picker").setInputFiles({
      name: "exported.tja",
      mimeType: "text/plain",
      buffer: Buffer.from(tjaContent),
    });

    await page.waitForTimeout(1000);

    // Verify Canvas is still there
    await expect(canvas).toBeVisible();

    // Check Status
    // Key: status.fileLoaded
    // Use evaluate to check translation or text content
    const status = page.locator("#status-display");
    // i18n keys are loaded. If English, it should be "File loaded".
    // Let's just check if it is NOT "Ready" (status.ready)
    await expect(status).not.toContainText("Ready");
    await expect(status).not.toContainText("Initializing");
  });

  test("Visual Regression › Export Chart Image Width", async ({ page }) => {
    test.setTimeout(60000); // Increase timeout
    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }
    await page.waitForTimeout(2000);

    const width = await page.evaluate(async () => {
      // Force fallback by removing navigator.share if present
      try {
        // biome-ignore lint/suspicious/noExplicitAny: Need to modify readonly property for testing
        (navigator as any).share = undefined;
      } catch (_e) {}

      try {
        navigator.canShare = () => false;
      } catch (_e) {}

      try {
        // biome-ignore lint/suspicious/noExplicitAny: Mocking global
        (window as any).Neutralino = undefined;
      } catch (_e) {}

      return new Promise<number>((resolve) => {
        const originalCreateElement = document.createElement;

        // biome-ignore lint/suspicious/noExplicitAny: Mocking DOM API
        document.createElement = (tagName: string, options?: any) => {
          // biome-ignore lint/suspicious/noExplicitAny: Mocking DOM API
          const el = originalCreateElement.call(document, tagName, options) as any;
          if (tagName.toLowerCase() === "a") {
            el.click = () => {
              const href = el.href;
              if (href && (href.startsWith("data:image/png") || href.startsWith("blob:"))) {
                const img = new Image();
                img.onload = () => {
                  resolve(img.width);
                };
                img.onerror = (_e) => {
                  resolve(-2);
                };
                img.src = href;
              }
            };
          }
          return el;
        };

        const host = document.querySelector("#export-image-footer-btn");
        if (host?.shadowRoot) {
          const actionBtn = host.shadowRoot.querySelector("action-button");
          if (actionBtn?.shadowRoot) {
            const btn = actionBtn.shadowRoot.querySelector("button");
            if (btn) {
              (btn as HTMLElement).click();
            } else {
              resolve(-3); // Button not found in action-button
            }
          } else {
            // Fallback for flat structure if action-button is not used or different structure
            const btn = host.shadowRoot.querySelector("button");
            if (btn) {
              (btn as HTMLElement).click();
            } else {
              resolve(-1); // action-button not found or no button found
            }
          }
        } else {
          resolve(-1);
        }
      });
    });

    expect(width).toBe(1024);
  });
});

test.describe("Interaction", () => {});

test.describe("UI Logic", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }
    await page.waitForTimeout(1000);
  });

  test("Data Source Tabs switch content", async ({ page }) => {
    const listTab = page.locator('button[data-mode="list"]');
    const fileTab = page.locator('button[data-mode="file"]');
    const streamTab = page.locator('button[data-mode="stream"]');

    const listPane = page.locator("#tab-list");
    const filePane = page.locator("#tab-file");
    const streamPane = page.locator("#tab-stream");

    // Initial: List Active
    await expect(listTab).toHaveClass(/active/);
    await expect(listPane).toBeVisible();
    await expect(filePane).not.toBeVisible();

    // Click File
    await fileTab.click();
    await expect(fileTab).toHaveClass(/active/);
    await expect(filePane).toBeVisible();
    await expect(listPane).not.toBeVisible();

    // Click Stream
    await streamTab.click();
    await expect(streamTab).toHaveClass(/active/);
    await expect(streamPane).toBeVisible();
    await expect(filePane).not.toBeVisible();
  });
  test("ESE Search by Title", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }

    // Mock the ESE index response
    await page.route("**/ese_index.json", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            path: "cat/song.tja",
            title: "My Song",
            titleJp: "私の歌",
            url: "ese/cat/song.tja",
            type: "blob",
            sha: "123",
          },
        ]),
      }),
    );

    // Reload to apply mock
    await page.reload();
    await page.waitForTimeout(500);

    // Ensure data source panel is expanded (reload might have collapsed it)
    const dsBodyReloaded = page.locator("#ds-body");
    if ((await dsBodyReloaded.count()) > 0) {
      const classes = await dsBodyReloaded.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }

    // Switch to List tab (if not already active, but it should be default)
    // Just in case click it or check visibility
    const listTab = page.locator('button[data-mode="list"]');
    const classAttr = await listTab.getAttribute("class");
    if (!classAttr?.includes("active")) {
      await listTab.click();
    }

    // Wait for search input
    const searchInput = page.locator("#ese-search-input");
    await expect(searchInput).toBeVisible();

    // Wait for mocked data to load (UI shows "No results" or results)
    // Since initial query is empty, it should list all charts (mocked one)
    // Now displays title instead of path by default
    await expect(page.locator(".ese-result-item")).toContainText("My Song");

    // Search by English Title
    await searchInput.fill("My Song");
    await expect(page.locator(".ese-result-item")).toContainText("My Song");

    // Search by Japanese Title
    await searchInput.fill("私の歌");
    await expect(page.locator(".ese-result-item")).toContainText("My Song");

    // Search by Path
    await searchInput.fill("song.tja");
    await expect(page.locator(".ese-result-item")).toContainText("My Song");

    // Search by non-existent
    await searchInput.fill("NotExist");
    await expect(page.locator(".ese-result-item")).not.toBeVisible();
    await expect(page.locator("#ese-results")).toContainText("No results found");
  });

  test("Chart Info Language Setting changes displayed title", async ({ page }) => {
    // Mock song_mapping.json to provide language titles
    await page.route("**/data/song_mapping.json", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          song1: {
            esePath: "category/sample.tja",
            defaultTitle: "Sample Song",
            titleList: {
              ja: "サンプル曲",
              "en-US": "Sample Song (English)",
            },
            candidates: [],
            matchType: "manual",
          },
        }),
      });
    });

    // Mock TJA files
    await page.route("**/*.tja", (route) =>
      route.fulfill({
        status: 200,
        contentType: "text/plain; charset=shift_jis",
        body: "TITLE:Sample Song\nBPM:120\nCOURSE:Oni\n#START\n1010,\n#END",
      }),
    );

    // Mock ESE index
    await page.route("**/ese_index.json", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            path: "category/sample.tja",
            title: "Sample Song",
            titleJp: "サンプル曲",
            url: "ese/category/sample.tja",
            type: "blob",
            sha: "123",
          },
        ]),
      }),
    );

    await page.goto("/");
    await page.reload();
    await page.waitForTimeout(500);

    // 1. Open Settings
    const settingsPanel = page.locator("settings-panel");
    await settingsPanel.evaluate((panel) => {
      const btn = panel.querySelector(".settings-btn") as HTMLElement;
      if (btn) btn.click();
    });

    // Wait for the modal to be visible internally
    await page.waitForTimeout(500);

    // Wait for the language dropdown to appear (should be inside settings-panel)

    // Change language to English using Playwright native selection
    const settingsModal = page.locator("#settings-modal");
    const langSelect = settingsModal.locator("select").filter({ has: page.locator('option[value="auto"]') });
    await langSelect.selectOption("en");

    await page.waitForTimeout(500);

    // Close settings modal
    await settingsModal.locator(".close-btn").click();

    // 2. Verify List Title changed
    // In our mock, the English title is "Sample Song (English)"
    const listPane = page.locator("#tab-list");
    await expect(listPane).toContainText("Sample Song (English)");

    // 3. Open Chart and Verify Canvas Render
    await listPane.locator(".ese-result-item", { hasText: "Sample Song (English)" }).click();

    // Wait for chart load and title update
    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();

    // The mapping fetch is async, wait until the title matches expectation
    await page.waitForFunction(
      () => {
        // biome-ignore lint/suspicious/noExplicitAny: internal testing
        const tjaChart = document.getElementById("chart-component") as any;
        return tjaChart?.renderOptions?.titleOverride === "Sample Song (English)";
      },
      undefined,
      { timeout: 5000 },
    );

    const chartTitleInfo = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: internal testing
      const tjaChart = document.getElementById("chart-component") as any;
      return {
        title: tjaChart.renderOptions?.titleOverride,
      };
    });

    expect(chartTitleInfo.title).toBe("Sample Song (English)");
  });
});

test.describe("Loop Controls Interaction", () => {
  test("Loop controls visibility and interaction", async ({ page }) => {
    test.setTimeout(60000); // Increase timeout
    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }
    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();

    // Switch to File Tab
    await page.click('button[data-mode="file"]');

    const filePath = path.join(process.cwd(), "dev_instructions", "loop_example.tja");
    await page.setInputFiles("#tja-file-picker", filePath);
    await page.waitForTimeout(1000);

    // Switch to Judgements Tab
    await page.click('button[data-do-tab="judgements"]');
    await page.waitForTimeout(500);

    // Wait for component to render content
    await page.waitForSelector("#collapse-loop-checkbox", { state: "attached" });

    await page.check("#collapse-loop-checkbox");
    await expect(page.locator("#collapse-loop-checkbox")).toBeChecked();

    // 4. Verify Loop Controls are visible
    // The structure inside judgement-options might be different, let's target by known IDs in component

    // Note: The element is <judgement-options> which contains #loop-control-group
    // We can target IDs directly as they are in light DOM

    const loopControls = page.locator("#loop-control-group");
    await expect(loopControls).toBeVisible();

    const loopCounter = page.locator("#loop-counter-display");
    const autoCheckbox = page.locator("#loop-auto");
    const prevBtn = page.locator("#prev-loop-btn");
    const nextBtn = page.locator("#next-loop-btn");

    await expect(autoCheckbox).toBeChecked();
    await expect(loopCounter).toContainText("1 / 10");
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeDisabled();

    await autoCheckbox.uncheck();
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeEnabled();

    await nextBtn.click();
    await expect(loopCounter).toContainText("2 / 10");
    await expect(prevBtn).toBeEnabled();

    await prevBtn.click();
    await expect(loopCounter).toContainText("1 / 10");
    await expect(prevBtn).toBeDisabled();

    await autoCheckbox.check();
    await expect(prevBtn).toBeDisabled();
    await expect(nextBtn).toBeDisabled();
  });
});

test.describe("Zoom Controls", () => {
  test("Zoom Controls › Zoom In/Out/Reset", async ({ page }) => {
    test.setTimeout(60000); // Increase timeout
    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }
    await page.waitForTimeout(1000);

    const stepper = page.locator("view-options stepper-control").first();
    const zoomOutBtn = stepper.locator(".tiny-btn").nth(0);
    const zoomResetBtn = stepper.locator(".tiny-btn").nth(1);
    const zoomInBtn = stepper.locator(".tiny-btn").nth(2);
    await stepper.waitFor({ state: "attached" });

    // Initial State
    await expect(zoomResetBtn).toHaveText("100%");

    // Zoom In (Decrease beats per line)
    await zoomInBtn.click();
    await expect(zoomResetBtn).not.toHaveText("100%");

    // Reset
    await zoomResetBtn.click();
    await expect(zoomResetBtn).toHaveText("100%");

    // Zoom Out (Increase beats per line)
    await zoomOutBtn.click();
    await expect(zoomResetBtn).not.toHaveText("100%");

    // Reset
    await zoomResetBtn.click();
    await expect(zoomResetBtn).toHaveText("100%");
  });
});

test.describe("Selection Interaction", () => {
  test("Select note, verify visual and sticky stats", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }
    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(2000);
    await page.selectOption("#difficulty-selector-internal", "oni");
    await page.waitForTimeout(500);

    // Switch to Selection Tab
    await page.click('button[data-do-tab="selection"]');

    // Use internal helper to get first note coordinates
    const notePos = await page.evaluate(() => {
      const chart = document.getElementById("chart-component") as HTMLElement & {
        getNoteCoordinates: (b: number, c: number) => { x: number; y: number } | null;
      };
      return chart.getNoteCoordinates(0, 0); // Bar 0, Note 0
    });

    if (!notePos) throw new Error("Could not find first note coordinates");

    // 1. Click on first note
    await canvas.click({ position: { x: notePos.x, y: notePos.y } });

    // 2. Verify Stats
    const stats = page.locator("note-stats");
    await expect(stats.locator(".stat-label").first()).toBeVisible();
    await expect(stats.locator(".stat-value").nth(1)).not.toHaveText("-"); // BPM has a value when a note is selected

    // 3. Take Snapshot of Selection
    // Moved to 'Visual Regression' > 'Note Selected'
    // await expect(canvas).toHaveScreenshot('note-selected.png');

    // 4. Hover away to empty space (e.g. x + 100, same y)
    await canvas.hover({ position: { x: notePos.x + 100, y: notePos.y }, force: true });

    // 5. Verify Stats are STICKY (BPM still showing after hover away)
    await expect(stats.locator(".stat-value").nth(1)).not.toHaveText("-");

    // 6. Click again to unselect
    await canvas.click({ position: { x: notePos.x, y: notePos.y }, force: true });

    // 7. Move away to empty space
    await canvas.hover({ position: { x: notePos.x + 100, y: notePos.y }, force: true });

    // 8. Stats should be cleared (showing '-')
    await expect(stats.locator(".stat-value").first()).toHaveText("-");
  });

  test("Range Selection Interaction", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(500);
    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }
    await page.addStyleTag({ content: "#sticky-header { position: static !important; }" });

    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(2000);
    await page.selectOption("#difficulty-selector-internal", "oni");
    await page.waitForTimeout(500);

    // Switch to Selection Tab
    await page.click('button[data-do-tab="selection"]');
    await page.waitForTimeout(2000);

    // 1. Click Start Note (Bar 0, Note 0)
    const p0 = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      return chart.getNoteCoordinates(0, 0);
    });
    expect(p0).not.toBeNull();
    await canvas.click({ position: p0, force: true });

    const stats = page.locator("note-stats");
    await expect(stats.locator(".stat-value").nth(1)).not.toHaveText("-"); // BPM has a value when a note is selected

    await page.waitForTimeout(200);

    // 2. Click End Note (Bar 1, Note 0)
    const p1 = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      return chart.getNoteCoordinates(1, 0);
    });
    expect(p1).not.toBeNull();
    await canvas.click({ position: p1, force: true });
    await expect(stats.locator(".stat-value").nth(1)).not.toHaveText("-"); // BPM has a value when a note is selected

    // 3. Click Third Note (Bar 2, Note 0 - Balloon) (Restart Selection)
    const p2 = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      return chart.getNoteCoordinates(2, 0);
    });
    expect(p2).not.toBeNull();
    await canvas.click({ position: p2, force: true });
    await expect(stats.locator(".stat-value").nth(1)).not.toHaveText("-"); // BPM has a value when a note is selected
  });

  test("Hover Interaction", async ({ page }) => {
    test.setTimeout(60000); // Increase timeout
    await page.goto("/");
    await page.waitForTimeout(500);

    // Ensure options panel is expanded
    const optionsBody = page.locator("#options-body");
    if ((await optionsBody.count()) > 0) {
      const classes = await optionsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#options-panel-header");
        await page.waitForTimeout(500);
      }
    }
    // Ensure data source panel is expanded
    const dsBody = page.locator("#ds-body");
    if ((await dsBody.count()) > 0) {
      const classes = await dsBody.getAttribute("class");
      if (classes?.includes("collapsed")) {
        await page.click("#ds-panel-header");
        await page.waitForTimeout(500);
      }
    }

    const canvas = page.locator("#chart-component");
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(2000);
    await page.selectOption("#difficulty-selector-internal", "oni");

    // Ensure stats are visible
    const showStatsCheckbox = page.locator("#show-stats-checkbox");
    await showStatsCheckbox.waitFor({ state: "attached" });
    await expect(showStatsCheckbox).toBeChecked();

    // 1. Hover over a note
    const p0 = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      return chart.getNoteCoordinates(0, 0);
    });
    expect(p0).not.toBeNull();
    await canvas.hover({ position: p0, force: true });

    // Verify renderOptions.hoveredNote is set
    const hoveredNote = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      return chart.hoveredNote;
    });
    expect(hoveredNote).toEqual({ barIndex: 0, charIndex: 0, branch: "normal" });

    // 2. Hide stats
    await showStatsCheckbox.uncheck();

    // Verify hoveredNote is cleared
    const hoveredNoteHidden = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      return chart.hoveredNote;
    });
    expect(hoveredNoteHidden).toBeNull();

    // 3. Hover again (stats hidden)
    await canvas.hover({ position: { x: 0, y: 0 }, force: true }); // Move away
    await canvas.hover({ position: p0, force: true }); // Move back

    const hoveredNoteStillNull = await page.evaluate(() => {
      // biome-ignore lint/suspicious/noExplicitAny: Accessing custom element
      const chart = document.getElementById("chart-component") as any;
      return chart.hoveredNote;
    });
    expect(hoveredNoteStillNull).toBeNull();
  });
});
