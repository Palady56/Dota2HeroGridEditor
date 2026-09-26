import { DEFAULT_PLACEMENT, type Placement, type Rect, type Size } from "../model/types";
import { isSideways, type Frame } from "../model/geometry";

/**
 * Unrotated rectangle of the placed image; it is drawn rotated around its
 * centre. The fit uses the 90°-snapped orientation so free rotation does
 * not make the image pulse in size.
 */
export function placementRect(
  sourceWidth: number,
  sourceHeight: number,
  grid: Size,
  placement: Placement,
): Rect {
  const sideways = isSideways(placement.rotation ?? 0);
  const fitW = sideways ? sourceHeight : sourceWidth;
  const fitH = sideways ? sourceWidth : sourceHeight;
  const fit = Math.min(grid.width / fitW, grid.height / fitH);
  const width = sourceWidth * fit * placement.scale;
  const height = sourceHeight * fit * placement.scale;
  return {
    x: (grid.width - width) / 2 + placement.offsetX,
    y: (grid.height - height) / 2 + placement.offsetY,
    width,
    height,
  };
}

function categoriesBounds(categories: ReadonlyArray<Rect>): Rect | null {
  if (categories.length === 0) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of categories) {
    x0 = Math.min(x0, c.x);
    y0 = Math.min(y0, c.y);
    x1 = Math.max(x1, c.x + c.width);
    y1 = Math.max(y1, c.y + c.height);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** Sit a new photo to the right of existing art, or under it. If neither fits, shrink it onto the right so the previous photo stays visible. */
export function placementBeside(
  sourceWidth: number,
  sourceHeight: number,
  grid: Size,
  categories: ReadonlyArray<Rect>,
  scale = 1,
): Placement {
  const bounds = categoriesBounds(categories);
  if (!bounds) return DEFAULT_PLACEMENT;
  const fit = Math.min(grid.width / sourceWidth, grid.height / sourceHeight);
  const gap = 24;
  const place = (nextScale: number, x: number, y: number): Placement => {
    const width = sourceWidth * fit * nextScale;
    const height = sourceHeight * fit * nextScale;
    return {
      ...DEFAULT_PLACEMENT,
      scale: nextScale,
      offsetX: x - (grid.width - width) / 2,
      offsetY: y - (grid.height - height) / 2,
    };
  };
  const width = sourceWidth * fit * scale;
  const height = sourceHeight * fit * scale;
  const rightX = bounds.x + bounds.width + gap;
  if (rightX + width <= grid.width) return place(scale, rightX, bounds.y);
  const belowY = bounds.y + bounds.height + gap;
  if (belowY + height <= grid.height) return place(scale, bounds.x, belowY);
  const shrunk = Math.min(scale, 0.5);
  const sw = sourceWidth * fit * shrunk;
  const sh = sourceHeight * fit * shrunk;
  return place(shrunk, Math.max(0, grid.width - sw - gap), Math.max(0, (grid.height - sh) / 2));
}

export function hitPlacement(
  px: number,
  py: number,
  sourceWidth: number,
  sourceHeight: number,
  grid: Size,
  placement: Placement,
): boolean {
  const frame = placementFrame(placementRect(sourceWidth, sourceHeight, grid, placement), placement);
  const r = (-frame.rotation * Math.PI) / 180;
  const c = Math.cos(r);
  const s = Math.sin(r);
  const dx = px - frame.cx;
  const dy = py - frame.cy;
  return Math.abs(dx * c - dy * s) <= frame.width / 2 && Math.abs(dx * s + dy * c) <= frame.height / 2;
}

export function placementFrame(rect: Rect, placement: Placement): Frame {
  return {
    cx: rect.x + rect.width / 2,
    cy: rect.y + rect.height / 2,
    width: rect.width,
    height: rect.height,
    rotation: placement.rotation,
  };
}

export function drawPlaced(
  ctx: CanvasRenderingContext2D,
  image: CanvasImageSource,
  rect: Rect,
  placement: Placement,
): void {
  ctx.save();
  ctx.translate(rect.x + rect.width / 2, rect.y + rect.height / 2);
  ctx.rotate((placement.rotation * Math.PI) / 180);
  ctx.scale(placement.flipX ? -1 : 1, placement.flipY ? -1 : 1);
  ctx.drawImage(image, -rect.width / 2, -rect.height / 2, rect.width, rect.height);
  ctx.restore();
}
