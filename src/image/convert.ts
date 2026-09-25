import { applyTone, gaussianBlur, toGray, type GrayBuffer, type RgbaImage } from "./raster";
import { cannyMask } from "../edges/canny";
import { darkMask, thinLines } from "../edges/lines";
import { removeSmallComponents } from "../edges/components";
import { samplePaths, tracePaths } from "../sampling/trace";
import { FILL_ROW_RATIO, type ConversionSettings, type FillCell, type Rect, type SamplePoint } from "../model/types";

export type ConversionOutput = {
  points: SamplePoint[];
  fill: FillCell[];
  /** Final line pixels, for the "show lines" overlay. */
  mask: Uint8Array;
  width: number;
  height: number;
};

/** Point-in-image test: `rect` rotated around its centre by `rotation` degrees, shrunk by `inset`. */
function insideFrame(rect: Rect, inset: number, rotation: number): (x: number, y: number) => boolean {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const hw = rect.width / 2 - inset;
  const hh = rect.height / 2 - inset;
  const r = (-rotation * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return (x, y) => {
    const dx = x - cx;
    const dy = y - cy;
    return Math.abs(dx * c - dy * s) <= hw && Math.abs(dx * s + dy * c) <= hh;
  };
}

/**
 * Zero everything outside the image (the rect rotated around its centre by
 * `rotation` degrees) so its border is not traced.
 */
export function clipMaskToRect(
  mask: Uint8Array,
  w: number,
  h: number,
  rect: Rect,
  inset: number,
  rotation = 0,
): void {
  if (rotation % 360 !== 0) {
    const inside = insideFrame(rect, inset, rotation);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!inside(x, y)) mask[y * w + x] = 0;
      }
    }
    return;
  }
  const x0 = Math.max(0, Math.ceil(rect.x + inset));
  const y0 = Math.max(0, Math.ceil(rect.y + inset));
  const x1 = Math.min(w, Math.floor(rect.x + rect.width - inset));
  const y1 = Math.min(h, Math.floor(rect.y + rect.height - inset));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x < x0 || x >= x1 || y < y0 || y >= y1) mask[y * w + x] = 0;
    }
  }
}

/** Summed-area table with a zero first row and column: (w + 1) × (h + 1). */
function integral(values: ArrayLike<number>, w: number, h: number): Float64Array {
  const out = new Float64Array((w + 1) * (h + 1));
  for (let y = 0; y < h; y++) {
    let row = 0;
    for (let x = 0; x < w; x++) {
      row += values[y * w + x];
      out[(y + 1) * (w + 1) + x + 1] = out[y * (w + 1) + x + 1] + row;
    }
  }
  return out;
}

/** Sum over the box [x0, x1) × [y0, y1), clamped to the image. */
function boxSum(table: Float64Array, w: number, h: number, x0: number, y0: number, x1: number, y1: number): number {
  const ax = Math.max(0, Math.min(w, Math.floor(x0)));
  const ay = Math.max(0, Math.min(h, Math.floor(y0)));
  const bx = Math.max(0, Math.min(w, Math.ceil(x1)));
  const by = Math.max(0, Math.min(h, Math.ceil(y1)));
  if (bx <= ax || by <= ay) return 0;
  const W = w + 1;
  return table[by * W + bx] - table[ay * W + bx] - table[by * W + ax] + table[ay * W + ax];
}

/**
 * Fill positions on a staggered lattice. Brightness is the cell average; cells
 * too close to contour pixels are skipped so the outline stays readable.
 */
export function fillCells(
  gray: GrayBuffer,
  outline: Uint8Array | null,
  rect: Rect,
  rotation: number,
  settings: ConversionSettings,
): FillCell[] {
  if (settings.fill === "none") return [];
  const { width: w, height: h } = gray;
  const stepX = Math.max(2, settings.fillSpacing);
  const stepY = stepX * FILL_ROW_RATIO;
  const tones = integral(gray.data, w, h);
  const lines = outline ? integral(outline, w, h) : null;
  const gap = Math.max(0, settings.fillGap);
  const inside = insideFrame(rect, 0, rotation);
  const out: FillCell[] = [];

  let row = 0;
  for (let y = stepY / 2; y <= h - stepY / 2 + 1e-6; y += stepY, row++) {
    const offset = row % 2 ? stepX / 2 : 0;
    for (let x = stepX / 2 + offset; x <= w - stepX / 2 + 1e-6; x += stepX) {
      if (lines && boxSum(lines, w, h, x - gap, y - gap, x + gap + 1, y + gap + 1) > 0) continue;
      if (!inside(x, y)) {
        if (settings.fillOutside) out.push({ x, y, tone: -1 });
        continue;
      }
      const x0 = x - stepX / 2;
      const y0 = y - stepY / 2;
      const area =
        (Math.min(w, Math.ceil(x + stepX / 2)) - Math.max(0, Math.floor(x0))) *
        (Math.min(h, Math.ceil(y + stepY / 2)) - Math.max(0, Math.floor(y0)));
      const tone = area > 0 ? boxSum(tones, w, h, x0, y0, x + stepX / 2, y + stepY / 2) / area : 255;
      if (settings.fill === "shadows" && tone >= settings.fillThreshold) continue;
      if (settings.fill === "lights" && tone <= settings.fillThreshold) continue;
      out.push({ x, y, tone });
    }
  }
  return out;
}

export function convertImage(
  image: RgbaImage,
  rect: Rect,
  settings: ConversionSettings,
  rotation = 0,
): ConversionOutput {
  const { width: w, height: h } = image;
  const toned = applyTone(toGray(image), settings.brightness, settings.contrast, settings.invert);
  const gray = gaussianBlur(toned, settings.blur);

  let mask: Uint8Array = new Uint8Array(w * h);
  let points: SamplePoint[] = [];
  if (settings.outline) {
    mask =
      settings.mode === "edges"
        ? cannyMask(gray, settings.edgeThreshold * 0.5, settings.edgeThreshold)
        : darkMask(gray, settings.darkThreshold);
    clipMaskToRect(mask, w, h, rect, Math.ceil(settings.blur * 3) + 2, rotation);
    if (settings.mode === "lines") mask = thinLines(mask, w, h);
    mask = removeSmallComponents(mask, w, h, settings.minLineLength);
    points = samplePaths(tracePaths(mask, w, h), w, h, settings.spacing);
  }

  const fill = fillCells(gray, settings.outline ? mask : null, rect, rotation, settings);
  return { points, fill, mask, width: w, height: h };
}
