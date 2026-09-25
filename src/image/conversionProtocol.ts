import type { ConversionSettings, FillCell, Rect, SamplePoint } from "../model/types";
import type { RgbaImage } from "./raster";

export type ConversionRequest = {
  image: RgbaImage;
  rect: Rect;
  /** Degrees; the image is `rect` rotated around its centre. */
  rotation: number;
  settings: ConversionSettings;
  /** Echoed back in the response so callers can match results to requests. */
  id?: number;
};

export type ConversionResponse = {
  packed: Float32Array;
  packedFill: Float32Array;
  mask: Uint8Array;
  width: number;
  height: number;
  id?: number;
};

const STRIDE = 5;
const FILL_STRIDE = 3;

export function packPoints(points: SamplePoint[]): Float32Array {
  const out = new Float32Array(points.length * STRIDE);
  points.forEach((p, i) => {
    out[i * STRIDE] = p.x;
    out[i * STRIDE + 1] = p.y;
    out[i * STRIDE + 2] = p.angleDeg;
    out[i * STRIDE + 3] = p.straightness;
    out[i * STRIDE + 4] = p.segment;
  });
  return out;
}

export function unpackPoints(packed: Float32Array): SamplePoint[] {
  const points: SamplePoint[] = [];
  for (let i = 0; i < packed.length; i += STRIDE) {
    points.push({
      x: packed[i],
      y: packed[i + 1],
      angleDeg: packed[i + 2],
      straightness: packed[i + 3],
      segment: packed[i + 4],
    });
  }
  return points;
}

export function packFill(cells: FillCell[]): Float32Array {
  const out = new Float32Array(cells.length * FILL_STRIDE);
  cells.forEach((c, i) => {
    out[i * FILL_STRIDE] = c.x;
    out[i * FILL_STRIDE + 1] = c.y;
    out[i * FILL_STRIDE + 2] = c.tone;
  });
  return out;
}

export function unpackFill(packed: Float32Array): FillCell[] {
  const cells: FillCell[] = [];
  for (let i = 0; i < packed.length; i += FILL_STRIDE) {
    cells.push({ x: packed[i], y: packed[i + 1], tone: packed[i + 2] });
  }
  return cells;
}
