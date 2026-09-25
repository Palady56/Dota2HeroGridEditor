import type { GrayBuffer } from "../image/raster";

export type Gradient = {
  width: number;
  height: number;
  gx: Float32Array;
  gy: Float32Array;
  magnitude: Float32Array;
};

export function sobel(gray: GrayBuffer): Gradient {
  const { width: w, height: h, data } = gray;
  const gx = new Float32Array(w * h);
  const gy = new Float32Array(w * h);
  const magnitude = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const tl = data[i - w - 1];
      const t = data[i - w];
      const tr = data[i - w + 1];
      const l = data[i - 1];
      const r = data[i + 1];
      const bl = data[i + w - 1];
      const b = data[i + w];
      const br = data[i + w + 1];
      const dx = tr + 2 * r + br - tl - 2 * l - bl;
      const dy = bl + 2 * b + br - tl - 2 * t - tr;
      gx[i] = dx;
      gy[i] = dy;
      magnitude[i] = Math.hypot(dx, dy);
    }
  }
  return { width: w, height: h, gx, gy, magnitude };
}

/** Keep only the ridge of each edge (1 px wide). */
export function nonMaxSuppression(g: Gradient): Float32Array {
  const { width: w, height: h, gx, gy, magnitude } = g;
  const out = new Float32Array(w * h);
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const m = magnitude[i];
      if (m === 0) continue;
      let a = (Math.atan2(gy[i], gx[i]) * 180) / Math.PI;
      if (a < 0) a += 180;
      let n1: number;
      let n2: number;
      if (a < 22.5 || a >= 157.5) {
        n1 = magnitude[i - 1];
        n2 = magnitude[i + 1];
      } else if (a < 67.5) {
        n1 = magnitude[i - w - 1];
        n2 = magnitude[i + w + 1];
      } else if (a < 112.5) {
        n1 = magnitude[i - w];
        n2 = magnitude[i + w];
      } else {
        n1 = magnitude[i - w + 1];
        n2 = magnitude[i + w - 1];
      }
      if (m >= n1 && m > n2) out[i] = m;
    }
  }
  return out;
}

export function hysteresis(
  thin: Float32Array,
  w: number,
  h: number,
  low: number,
  high: number,
): Uint8Array {
  const mask = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  let sp = 0;
  for (let i = 0; i < thin.length; i++) {
    if (thin[i] >= high) {
      mask[i] = 1;
      stack[sp++] = i;
    }
  }
  while (sp > 0) {
    const i = stack[--sp];
    const x = i % w;
    const y = (i - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      const ny = y + dy;
      if (ny < 0 || ny >= h) continue;
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        if ((dx === 0 && dy === 0) || nx < 0 || nx >= w) continue;
        const j = ny * w + nx;
        if (!mask[j] && thin[j] >= low) {
          mask[j] = 1;
          stack[sp++] = j;
        }
      }
    }
  }
  return mask;
}

export function cannyMask(gray: GrayBuffer, low: number, high: number): Uint8Array {
  const grad = sobel(gray);
  return hysteresis(nonMaxSuppression(grad), gray.width, gray.height, low, high);
}
