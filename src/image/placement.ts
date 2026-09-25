import type { Placement, Rect, Size } from "../model/types";
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
