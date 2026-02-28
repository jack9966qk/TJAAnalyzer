export function drawTextWithCompression(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  minScale: number = 0.7,
) {
  const width = ctx.measureText(text).width;
  let scale = 1.0;
  if (width > maxWidth) {
    scale = maxWidth / width;
    if (scale < minScale) scale = minScale;
  }

  if (scale < 1.0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, 1.0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  } else {
    ctx.fillText(text, x, y);
  }
}

export function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  let r = 0,
    g = 0,
    b = 0;
  if (h.length === 3) {
    r = parseInt(h[0] + h[0], 16);
    g = parseInt(h[1] + h[1], 16);
    b = parseInt(h[2] + h[2], 16);
  } else if (h.length === 6) {
    r = parseInt(h.substring(0, 2), 16);
    g = parseInt(h.substring(2, 4), 16);
    b = parseInt(h.substring(4, 6), 16);
  } else if (h.length === 8) {
    r = parseInt(h.substring(0, 2), 16);
    g = parseInt(h.substring(2, 4), 16);
    b = parseInt(h.substring(4, 6), 16);
  }
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function drawGradientRect(
  canvasContext: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  color: string,
  direction: "left" | "right",
) {
  const grad = canvasContext.createLinearGradient(x, y, x + width, y);
  const cSolid = hexToRgba(color, 1);
  const cMid = hexToRgba(color, 0.2);
  const cTrans = hexToRgba(color, 0);

  if (direction === "left") {
    grad.addColorStop(0, cTrans);
    grad.addColorStop(0.25, cMid);
    grad.addColorStop(0.5, cSolid);
    grad.addColorStop(1, cSolid);
  } else {
    grad.addColorStop(0, cSolid);
    grad.addColorStop(0.5, cSolid);
    grad.addColorStop(0.75, cMid);
    grad.addColorStop(1, cTrans);
  }

  canvasContext.fillStyle = grad;
  canvasContext.fillRect(x, y, width, height);
}

export function drawGradientLine(
  canvasContext: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  color: string,
  lineWidth: number,
  direction: "left" | "right",
) {
  const grad = canvasContext.createLinearGradient(x1, y1, x2, y1); // Horizontal gradient
  const cSolid = hexToRgba(color, 1);
  const cMid = hexToRgba(color, 0.2);
  const cTrans = hexToRgba(color, 0);

  if (direction === "left") {
    grad.addColorStop(0, cTrans);
    grad.addColorStop(0.25, cMid);
    grad.addColorStop(0.5, cSolid);
    grad.addColorStop(1, cSolid);
  } else {
    grad.addColorStop(0, cSolid);
    grad.addColorStop(0.5, cSolid);
    grad.addColorStop(0.75, cMid);
    grad.addColorStop(1, cTrans);
  }

  canvasContext.strokeStyle = grad;
  canvasContext.lineWidth = lineWidth;
  canvasContext.beginPath();
  canvasContext.moveTo(x1, y1);
  canvasContext.lineTo(x2, y2);
  canvasContext.stroke();
}

export function getGradientColor(delta: number): string {
  const clamped = Math.max(-100, Math.min(100, delta));
  let r = 0;
  let g = 0;
  let b = 0;

  if (clamped < 0) {
    // -100 (#B0CC35: 176, 204, 53) -> 0 (White: 255, 255, 255)
    // t: 0 (at -100) -> 1 (at 0)
    const t = (clamped + 100) / 100;

    // Lerp from Target to White
    r = Math.round(176 + (255 - 176) * t);
    g = Math.round(204 + (255 - 204) * t);
    b = Math.round(53 + (255 - 53) * t);
  } else {
    // 0 (White: 255, 255, 255) -> 100 (#952CD1: 149, 44, 209)
    // t: 0 (at 0) -> 1 (at 100)
    const t = clamped / 100;

    // Lerp from White to Target
    r = Math.round(255 + (149 - 255) * t);
    g = Math.round(255 + (44 - 255) * t);
    b = Math.round(255 + (209 - 255) * t);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * Draws multiple stacked solid-color rectangles with a single shared gradient fade,
 * avoiding the visual compositing issue of stacking multiple individual gradient layers.
 * Each layer is specified as { y, height, color }.
 */
export function drawStackedGradientRect(
  canvasContext: CanvasRenderingContext2D,
  x: number,
  totalWidth: number,
  layers: { y: number; height: number; color: string }[],
  direction: "left" | "right",
  dpr: number = 1,
) {
  if (layers.length === 0) return;

  const minY = Math.min(...layers.map((l) => l.y));
  const maxY = Math.max(...layers.map((l) => l.y + l.height));
  const totalHeight = maxY - minY;

  const offscreen = new OffscreenCanvas(Math.ceil(totalWidth * dpr), Math.ceil(totalHeight * dpr));
  const offCtx = offscreen.getContext("2d");
  if (!offCtx) return;

  // Scale drawing context to match DPR
  offCtx.scale(dpr, dpr);

  // Draw layers as solid rectangles on the offscreen canvas
  for (const layer of layers) {
    offCtx.fillStyle = layer.color;
    offCtx.fillRect(0, layer.y - minY, totalWidth, layer.height);
  }

  // Apply gradient alpha mask using destination-in
  const grad = offCtx.createLinearGradient(0, 0, totalWidth, 0);
  if (direction === "left") {
    grad.addColorStop(0, "rgba(0,0,0,0)");
    grad.addColorStop(0.25, "rgba(0,0,0,0.2)");
    grad.addColorStop(0.5, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,1)");
  } else {
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.5, "rgba(0,0,0,1)");
    grad.addColorStop(0.75, "rgba(0,0,0,0.2)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
  }
  offCtx.globalCompositeOperation = "destination-in";
  offCtx.fillStyle = grad;
  offCtx.fillRect(0, 0, totalWidth, totalHeight);

  // Draw the composited result onto the main canvas.
  // We must specify width and height in logical units because the main context is already scaled.
  canvasContext.drawImage(offscreen, x, minY, totalWidth, totalHeight);
}

/**
 * Snaps a coordinate to the nearest device pixel for crisp rendering of lines with a given width.
 * @param value The logical coordinate to snap
 * @param lineWidth The logical line width
 * @param dpr Device pixel ratio
 */
export function snapForDevicePixel(value: number, lineWidth: number, dpr: number): number {
  const deviceBorderW = Math.round(lineWidth * dpr);
  return deviceBorderW % 2 === 1 ? (Math.round(value * dpr) + 0.5) / dpr : Math.round(value * dpr) / dpr;
}
