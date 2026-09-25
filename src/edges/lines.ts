import type { GrayBuffer } from "../image/raster";

export function darkMask(gray: GrayBuffer, threshold: number): Uint8Array {
  const mask = new Uint8Array(gray.data.length);
  for (let i = 0; i < gray.data.length; i++) {
    mask[i] = gray.data[i] < threshold ? 1 : 0;
  }
  return mask;
}

/** Zhang–Suen thinning: thick strokes become 1 px centre lines. */
export function thinLines(mask: Uint8Array, w: number, h: number): Uint8Array {
  const m = mask.slice();
  for (let x = 0; x < w; x++) {
    m[x] = 0;
    m[(h - 1) * w + x] = 0;
  }
  for (let y = 0; y < h; y++) {
    m[y * w] = 0;
    m[y * w + w - 1] = 0;
  }

  let active: number[] = [];
  for (let i = 0; i < m.length; i++) if (m[i]) active.push(i);

  const toDelete: number[] = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (let step = 0; step < 2; step++) {
      toDelete.length = 0;
      for (const i of active) {
        if (!m[i]) continue;
        const p2 = m[i - w];
        const p3 = m[i - w + 1];
        const p4 = m[i + 1];
        const p5 = m[i + w + 1];
        const p6 = m[i + w];
        const p7 = m[i + w - 1];
        const p8 = m[i - 1];
        const p9 = m[i - w - 1];
        const b = p2 + p3 + p4 + p5 + p6 + p7 + p8 + p9;
        if (b < 2 || b > 6) continue;
        const a =
          (p2 === 0 && p3 === 1 ? 1 : 0) +
          (p3 === 0 && p4 === 1 ? 1 : 0) +
          (p4 === 0 && p5 === 1 ? 1 : 0) +
          (p5 === 0 && p6 === 1 ? 1 : 0) +
          (p6 === 0 && p7 === 1 ? 1 : 0) +
          (p7 === 0 && p8 === 1 ? 1 : 0) +
          (p8 === 0 && p9 === 1 ? 1 : 0) +
          (p9 === 0 && p2 === 1 ? 1 : 0);
        if (a !== 1) continue;
        if (step === 0) {
          if (p2 * p4 * p6 !== 0 || p4 * p6 * p8 !== 0) continue;
        } else if (p2 * p4 * p8 !== 0 || p2 * p6 * p8 !== 0) {
          continue;
        }
        toDelete.push(i);
      }
      for (const i of toDelete) m[i] = 0;
      if (toDelete.length) changed = true;
    }
    active = active.filter((i) => m[i] === 1);
  }
  return m;
}
