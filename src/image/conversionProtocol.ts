import type { ConversionSettings, Rect, SamplePoint } from "../model/types";
import type { RgbaImage } from "./raster";

export type ConversionRequest = {
  image: RgbaImage;
  rect: Rect;
  /** Degrees; the image is `rect` rotated around its centre. */
  rotation: number;
  settings: ConversionSettings;
};

export type ConversionResponse = {
  packed: Float32Array;
  mask: Uint8Array;
  width: number;
  height: number;
};

const STRIDE = 5;

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
