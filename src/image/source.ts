import { GRID_SIZE, type Placement, type Rect } from "../model/types";
import type { RgbaImage } from "./raster";
import { drawPlaced } from "./placement";

export type ImageSource = {
  bitmap: ImageBitmap;
  width: number;
  height: number;
  name: string;
};

export async function loadImageSource(file: File): Promise<ImageSource> {
  const bitmap = await createImageBitmap(file);
  return { bitmap, width: bitmap.width, height: bitmap.height, name: file.name };
}

/** Draw the placed image onto a grid-sized canvas and read the pixels back. */
export function rasterizeSource(
  source: ImageSource,
  rect: Rect,
  placement: Placement,
  canvas: HTMLCanvasElement,
): RgbaImage {
  canvas.width = GRID_SIZE.width;
  canvas.height = GRID_SIZE.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is not available");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, GRID_SIZE.width, GRID_SIZE.height);
  ctx.imageSmoothingQuality = "high";
  drawPlaced(ctx, source.bitmap, rect, placement);
  const pixels = ctx.getImageData(0, 0, GRID_SIZE.width, GRID_SIZE.height);
  return { width: pixels.width, height: pixels.height, data: pixels.data };
}
