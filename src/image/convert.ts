import { applyTone, gaussianBlur, toGray, type RgbaImage } from "./raster";
import { cannyMask } from "../edges/canny";
import { darkMask, thinLines } from "../edges/lines";
import { removeSmallComponents } from "../edges/components";
import { samplePaths, tracePaths } from "../sampling/trace";
import type { ConversionSettings, Rect, SamplePoint } from "../model/types";

export type ConversionOutput = {
  points: SamplePoint[];
  /** Final line pixels, for the "show lines" overlay. */
  mask: Uint8Array;
  width: number;
  height: number;
};

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
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const hw = rect.width / 2 - inset;
    const hh = rect.height / 2 - inset;
    const r = (-rotation * Math.PI) / 180;
    const c = Math.cos(r);
    const s = Math.sin(r);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = x - cx;
        const dy = y - cy;
        const lx = dx * c - dy * s;
        const ly = dx * s + dy * c;
        if (Math.abs(lx) > hw || Math.abs(ly) > hh) mask[y * w + x] = 0;
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

export function convertImage(
  image: RgbaImage,
  rect: Rect,
  settings: ConversionSettings,
  rotation = 0,
): ConversionOutput {
  const { width: w, height: h } = image;
  let gray = toGray(image);
  gray = applyTone(gray, settings.brightness, settings.contrast, settings.invert);
  gray = gaussianBlur(gray, settings.blur);

  let mask =
    settings.mode === "edges"
      ? cannyMask(gray, settings.edgeThreshold * 0.5, settings.edgeThreshold)
      : darkMask(gray, settings.darkThreshold);
  clipMaskToRect(mask, w, h, rect, Math.ceil(settings.blur * 3) + 2, rotation);

  if (settings.mode === "lines") mask = thinLines(mask, w, h);
  mask = removeSmallComponents(mask, w, h, settings.minLineLength);

  const points = samplePaths(tracePaths(mask, w, h), w, h, settings.spacing);
  return { points, mask, width: w, height: h };
}
