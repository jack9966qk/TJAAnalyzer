import { expect, test } from "@playwright/test";
import { snapForDevicePixel } from "../renderer-package/src/drawing-utils.js";

test.describe("Pixel Snapping Logic", () => {
  test("snapForDevicePixel calculation", () => {
    const dpr = 2; // Retina display
    const lineWidth = 1.5; // Logical width
    const x = 100.1; // Some coordinate not on pixel boundary

    // manually calculate expected
    // deviceBorderW = round(1.5 * 2) = 3 (odd)
    // expected = (round(100.1 * 2) + 0.5) / 2 = (200 + 0.5) / 2 = 100.25

    const snapped = snapForDevicePixel(x, lineWidth, dpr);
    expect(snapped).toBe(100.25);
  });

  test("Misalignment check", () => {
    // This test simulates the logic in drawBarLabels vs the bug I found
    const dprs = [1, 1.5, 2, 2.5, 3];
    const barBorderWidth = 1.5;
    const x = 10.333333; // A likely fractional coordinate from layout

    for (const dpr of dprs) {
      // Correct snapping
      const expected = snapForDevicePixel(x, barBorderWidth, dpr);

      // The bug: raw X
      const actualBuggy = x;

      // They should be different (unless by pure chance X aligns with pixel grid)
      // At x=10.333, it shouldn't align often.
      expect(actualBuggy).not.toBe(expected);

      // Verify behavior:
      // width = 1.5, dpr = 2 => deviceW = 3 (odd).
      // snap = (round(x*dpr) + 0.5)/dpr
      // x*dpr = 20.666 -> round = 21.
      // (21 + 0.5) / 2 = 10.75.
      if (dpr === 2) {
        expect(expected).toBe(10.75);
      }
    }
  });
});
