import type { SamplePoint } from "../model/types";

const NEIGHBORS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [0, 1],
  [-1, 0],
  [0, -1],
  [1, 1],
  [-1, 1],
  [-1, -1],
  [1, -1],
];

function neighborCount(mask: Uint8Array, w: number, h: number, i: number): number {
  const x = i % w;
  const y = (i - x) / w;
  let n = 0;
  for (const [dx, dy] of NEIGHBORS) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && nx < w && ny >= 0 && ny < h && mask[ny * w + nx]) n++;
  }
  return n;
}

/** Split a thin mask into ordered pixel paths. Line ends are traced first, then loops. */
export function tracePaths(mask: Uint8Array, w: number, h: number): number[][] {
  const visited = new Uint8Array(w * h);
  const paths: number[][] = [];

  const walk = (start: number): number[] => {
    const path = [start];
    visited[start] = 1;
    let cur = start;
    for (;;) {
      const x = cur % w;
      const y = (cur - x) / w;
      let next = -1;
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
        const j = ny * w + nx;
        if (mask[j] && !visited[j]) {
          next = j;
          break;
        }
      }
      if (next < 0) break;
      visited[next] = 1;
      path.push(next);
      cur = next;
    }
    return path;
  };

  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && !visited[i] && neighborCount(mask, w, h, i) === 1) paths.push(walk(i));
  }
  for (let i = 0; i < mask.length; i++) {
    if (mask[i] && !visited[i]) paths.push(walk(i));
  }
  return paths;
}

function normalizeLineAngle(deg: number): number {
  let a = deg;
  while (a >= 90) a -= 180;
  while (a < -90) a += 180;
  return a;
}

/**
 * Place points every `spacing` pixels along each path. A point is skipped when
 * another point is closer than 0.75 × spacing, which also merges the two
 * parallel edges of a thick line.
 */
export function samplePaths(
  paths: number[][],
  w: number,
  h: number,
  spacing: number,
): SamplePoint[] {
  const minDist = spacing * 0.75;
  const minDist2 = minDist * minDist;
  const cell = Math.max(1, minDist);
  const cols = Math.ceil(w / cell) + 1;
  const rows = Math.ceil(h / cell) + 1;
  const buckets = new Map<number, number[]>();
  const points: SamplePoint[] = [];
  const window = Math.max(2, Math.round(spacing));

  const tooClose = (x: number, y: number): boolean => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let oy = -1; oy <= 1; oy++) {
      const ry = cy + oy;
      if (ry < 0 || ry >= rows) continue;
      for (let ox = -1; ox <= 1; ox++) {
        const list = buckets.get(ry * cols + cx + ox);
        if (!list) continue;
        for (const idx of list) {
          const dx = points[idx].x - x;
          const dy = points[idx].y - y;
          if (dx * dx + dy * dy < minDist2) return true;
        }
      }
    }
    return false;
  };

  let segment = -1;
  for (const path of paths) {
    const n = path.length;
    if (n < 2) continue;
    let broken = true;
    const xs = new Int32Array(n);
    const ys = new Int32Array(n);
    const cum = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      xs[i] = path[i] % w;
      ys[i] = (path[i] - xs[i]) / w;
      if (i > 0) {
        const diagonal = xs[i] !== xs[i - 1] && ys[i] !== ys[i - 1];
        cum[i] = cum[i - 1] + (diagonal ? Math.SQRT2 : 1);
      }
    }

    let nextAt = 0;
    for (let i = 0; i < n; i++) {
      if (cum[i] < nextAt) continue;
      const x = xs[i];
      const y = ys[i];
      if (tooClose(x, y)) {
        broken = true;
        continue;
      }
      if (broken) {
        segment++;
        broken = false;
      }

      const ia = Math.max(0, i - window);
      const ib = Math.min(n - 1, i + window);
      const dx = xs[ib] - xs[ia];
      const dy = ys[ib] - ys[ia];
      const chord = Math.hypot(dx, dy);
      const arc = cum[ib] - cum[ia];
      const angleDeg = chord > 0 ? normalizeLineAngle((Math.atan2(dy, dx) * 180) / Math.PI) : NaN;
      const straightness = arc > 0 ? chord / arc : 0;

      const idx = points.length;
      points.push({ x, y, angleDeg, straightness, segment });
      const key = Math.floor(y / cell) * cols + Math.floor(x / cell);
      const list = buckets.get(key);
      if (list) list.push(idx);
      else buckets.set(key, [idx]);
      nextAt = cum[i] + spacing;
    }
  }
  return points;
}
