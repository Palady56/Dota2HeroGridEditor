export type Vec = { x: number; y: number };

/** Wrap to (-180, 180]. */
export function normalizeDeg(deg: number): number {
  let a = deg % 360;
  if (a > 180) a -= 360;
  if (a <= -180) a += 360;
  return a;
}

/** Rotate `v` by `deg` clockwise (screen coordinates, y down). */
export function rotateVec(v: Vec, deg: number): Vec {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

/** True when the rotation is closer to 90° or 270° than to 0° or 180°. */
export function isSideways(deg: number): boolean {
  return Math.abs(Math.round(normalizeDeg(deg) / 90)) % 2 === 1;
}

/** A w×h box rotated around its centre. */
export type Frame = { cx: number; cy: number; width: number; height: number; rotation: number };

export function frameCorners(f: Frame): Vec[] {
  const hw = f.width / 2;
  const hh = f.height / 2;
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ].map((p) => {
    const r = rotateVec(p, f.rotation);
    return { x: f.cx + r.x, y: f.cy + r.y };
  });
}

/** Rotation handle: on the frame's top edge axis, `inset` px inside the frame. */
export function frameHandle(f: Frame, inset: number): Vec {
  const r = rotateVec({ x: 0, y: -f.height / 2 + Math.min(inset, f.height / 2) }, f.rotation);
  return { x: f.cx + r.x, y: f.cy + r.y };
}

/** Frame rotation that puts the handle under the pointer. */
export function rotationToward(f: Frame, p: Vec): number {
  const deg = (Math.atan2(p.y - f.cy, p.x - f.cx) * 180) / Math.PI + 90;
  return normalizeDeg(deg);
}

export function snapDeg(deg: number, step: number): number {
  return normalizeDeg(Math.round(deg / step) * step);
}
