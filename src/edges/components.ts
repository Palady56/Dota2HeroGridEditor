/** Drop 8-connected groups of pixels smaller than `minSize`. */
export function removeSmallComponents(
  mask: Uint8Array,
  w: number,
  h: number,
  minSize: number,
): Uint8Array {
  if (minSize <= 1) return mask;
  const out = mask.slice();
  const seen = new Uint8Array(w * h);
  const stack = new Int32Array(w * h);
  const component = new Int32Array(w * h);

  for (let start = 0; start < out.length; start++) {
    if (!out[start] || seen[start]) continue;
    let sp = 0;
    let n = 0;
    stack[sp++] = start;
    seen[start] = 1;
    while (sp > 0) {
      const i = stack[--sp];
      component[n++] = i;
      const x = i % w;
      const y = (i - x) / w;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= h) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if ((dx === 0 && dy === 0) || nx < 0 || nx >= w) continue;
          const j = ny * w + nx;
          if (out[j] && !seen[j]) {
            seen[j] = 1;
            stack[sp++] = j;
          }
        }
      }
    }
    if (n < minSize) {
      for (let k = 0; k < n; k++) out[component[k]] = 0;
    }
  }
  return out;
}
