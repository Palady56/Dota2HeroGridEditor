import { GUIDE_MINOR } from "./drawGrid";

/** How close a dragged edge must be to another object's edge before it sticks to it. */
const PEER_SNAP = 20;

/**
 * Pull an edge onto the nearest 50px line.
 * If another object of the same kind is closer than that line, stick to it instead,
 * so two blocks can share a level that is not itself on a line.
 */
export function snapAxis(value: number, peers: number[], limit: number): number {
  const grid = Math.round(value / GUIDE_MINOR) * GUIDE_MINOR;
  let best = grid;
  let bestDist = Math.abs(value - grid);
  for (const peer of peers) {
    const dist = Math.abs(value - peer);
    if (dist <= PEER_SNAP && dist < bestDist) {
      best = peer;
      bestDist = dist;
    }
  }
  if (best < 0) return 0;
  if (best > limit) return limit;
  return Math.round(best);
}

/** Snap the top-left of a dragged block. */
export function snapTopLeft(
  x: number,
  y: number,
  peers: { x: number; y: number }[],
  limit: { width: number; height: number },
): { x: number; y: number } {
  return {
    x: snapAxis(x, peers.map((p) => p.x), limit.width),
    y: snapAxis(y, peers.map((p) => p.y), limit.height),
  };
}
