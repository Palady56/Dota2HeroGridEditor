import { describe, expect, it } from "vitest";
import { clipMaskToRect, convertImage } from "./convert";
import { createRgba, type RgbaImage } from "./raster";
import { placementRect } from "./placement";
import { glyphForPoint, glyphsForPoints, SYMBOL_PRESETS } from "../symbols/symbolSet";
import { stampsFromPoints } from "../layout/stamps";
import {
  DEFAULT_PLACEMENT,
  defaultConversionSettings,
  type ConversionSettings,
  type SymbolSettings,
} from "../model/types";

const W = 200;
const H = 140;
const FULL = { x: 0, y: 0, width: W, height: H };
const DIRECTION: SymbolSettings = SYMBOL_PRESETS.find((p) => p.id === "direction")!.settings;

function drawLine(img: RgbaImage, x0: number, y0: number, x1: number, y1: number, thickness: number) {
  const len2 = (x1 - x0) ** 2 + (y1 - y0) ** 2;
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const t = Math.max(0, Math.min(1, ((x - x0) * (x1 - x0) + (y - y0) * (y1 - y0)) / len2));
      const d = Math.hypot(x - (x0 + t * (x1 - x0)), y - (y0 + t * (y1 - y0)));
      if (d <= thickness / 2) {
        const i = (y * img.width + x) * 4;
        img.data[i] = img.data[i + 1] = img.data[i + 2] = 0;
      }
    }
  }
}

function lineImage(x0: number, y0: number, x1: number, y1: number, thickness = 3): RgbaImage {
  const img = createRgba(W, H);
  drawLine(img, x0, y0, x1, y1, thickness);
  return img;
}

function settings(patch: Partial<ConversionSettings>): ConversionSettings {
  return { ...defaultConversionSettings(), blur: 0.8, minLineLength: 5, spacing: 5, ...patch };
}

function glyphShare(img: RgbaImage, s: ConversionSettings, glyph: string): number {
  const { points } = convertImage(img, FULL, s);
  const glyphs = points.map((p) => glyphForPoint(p, DIRECTION));
  return glyphs.filter((g) => g === glyph).length / glyphs.length;
}

function minPairDistance(points: { x: number; y: number }[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      min = Math.min(min, Math.hypot(points[i].x - points[j].x, points[i].y - points[j].y));
    }
  }
  return min;
}

describe("image → symbols", () => {
  it("lines mode turns a thick vertical stroke into one column of |", () => {
    const s = settings({ mode: "lines" });
    const { points } = convertImage(lineImage(100, 15, 100, 125, 5), FULL, s);
    expect(points.length).toBeGreaterThan(15);
    expect(points.length).toBeLessThan(26);
    expect(points.every((p) => Math.abs(p.x - 100) <= 1)).toBe(true);
    expect(glyphShare(lineImage(100, 15, 100, 125, 5), s, "|")).toBeGreaterThan(0.8);
  });

  it("edges mode merges the two sides of a thin stroke", () => {
    const s = settings({ mode: "edges", edgeThreshold: 100 });
    const { points } = convertImage(lineImage(100, 15, 100, 125, 3), FULL, s);
    expect(minPairDistance(points)).toBeGreaterThanOrEqual(s.spacing * 0.75 - 1e-6);
    expect(glyphShare(lineImage(100, 15, 100, 125, 3), s, "|")).toBeGreaterThan(0.7);
  });

  it("maps horizontal and diagonal strokes (y axis down)", () => {
    const s = settings({ mode: "lines" });
    expect(glyphShare(lineImage(20, 70, 180, 70), s, "-")).toBeGreaterThan(0.8);
    expect(glyphShare(lineImage(30, 20, 130, 120), s, "\\")).toBeGreaterThan(0.7);
    expect(glyphShare(lineImage(30, 120, 130, 20), s, "/")).toBeGreaterThan(0.7);
  });

  it("drops specks shorter than minLineLength", () => {
    const img = lineImage(100, 15, 100, 125, 3);
    for (const [x, y] of [[20, 20], [40, 90], [160, 30], [170, 110]]) drawLine(img, x, y, x + 1, y, 2);
    const { points } = convertImage(img, FULL, settings({ mode: "lines", minLineLength: 12 }));
    expect(points.every((p) => Math.abs(p.x - 100) <= 2)).toBe(true);
  });

  it("ignores everything outside the placed image", () => {
    const img = lineImage(10, 70, 190, 70);
    const rect = { x: 0, y: 0, width: 100, height: H };
    const { points } = convertImage(img, rect, settings({ mode: "lines" }));
    expect(points.length).toBeGreaterThan(5);
    expect(points.every((p) => p.x < 100)).toBe(true);
  });

  it("is deterministic", () => {
    const img = lineImage(30, 20, 170, 110, 4);
    const s = settings({ mode: "edges" });
    const a = convertImage(img, FULL, s).points;
    const b = convertImage(img, FULL, s).points;
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });
});

function pt(angleDeg: number, straightness = 1, segment = 0, x = 0, y = 0) {
  return { x, y, angleDeg, straightness, segment };
}

describe("symbols", () => {
  it("uses the fallback for curves and bins directions", () => {
    const sample = SYMBOL_PRESETS[0].settings;
    expect(glyphForPoint(pt(0), sample)).toBe("-");
    expect(glyphForPoint(pt(89), sample)).toBe("|");
    expect(glyphForPoint(pt(-89), sample)).toBe("|");
    expect(glyphForPoint(pt(45), sample)).toBe("\\");
    expect(glyphForPoint(pt(-45), sample)).toBe("/");
    expect(glyphForPoint(pt(0, 0.5), sample)).toBe(".");
    expect(glyphForPoint(pt(NaN), sample)).toBe(".");
  });

  it("keeps line symbols only in long enough runs along one segment", () => {
    const s = { ...SYMBOL_PRESETS[0].settings, minRun: 3 };
    const glyphs = glyphsForPoints(
      [
        pt(0, 0.5), pt(90), pt(0, 0.5), // lone vertical inside a curve
        pt(90, 1, 1), pt(90, 1, 1), pt(90, 1, 1), // a real vertical run
        pt(90, 1, 2), pt(90, 1, 3), // same direction, but broken into two segments
      ],
      s,
    );
    expect(glyphs).toEqual([".", ".", ".", "|", "|", "|", ".", "."]);
    expect(glyphsForPoints([pt(90), pt(0, 0.5)], { ...s, minRun: 1 })).toEqual(["|", "."]);
  });

  it("builds stamps clipped to the grid and skips empty glyphs", () => {
    const grid = { width: 100, height: 50 };
    const stamps = stampsFromPoints(
      [pt(0, 1, 0, 10, 10), pt(0, 1, 0, 95, 45), pt(90, 1, 1, 50, 20)],
      { ...DIRECTION, vertical: "" },
      grid,
    );
    expect(stamps).toHaveLength(2);
    expect(stamps[0]).toMatchObject({ name: "-", width: 30, height: 30, heroIds: [], origin: "generated" });
    expect(stamps[1].x + stamps[1].width).toBeLessThanOrEqual(100);
    expect(stamps[1].y + stamps[1].height).toBeLessThanOrEqual(50);
  });
});

describe("placement", () => {
  it("fits by height, scales around the centre and applies offsets", () => {
    const grid = { width: 1193, height: 593 };
    expect(placementRect(100, 100, grid, DEFAULT_PLACEMENT)).toEqual({
      x: 300,
      y: 0,
      width: 593,
      height: 593,
    });
    const half = placementRect(100, 100, grid, { ...DEFAULT_PLACEMENT, scale: 0.5, offsetX: 10, offsetY: -5 });
    expect(half.width).toBeCloseTo(296.5);
    expect(half.x).toBeCloseTo((1193 - 296.5) / 2 + 10);
    expect(half.y).toBeCloseTo((593 - 296.5) / 2 - 5);
  });

  it("fits a sideways-rotated image by its turned size", () => {
    const grid = { width: 1193, height: 593 };
    // A wide 400×100 image turned 90° is 100 wide and 400 tall on screen.
    const r = placementRect(400, 100, grid, { ...DEFAULT_PLACEMENT, rotation: 90 });
    expect(r.width).toBeCloseTo(593);
    expect(r.height).toBeCloseTo(148.25);
  });

  it("clips the mask to a rotated image frame", () => {
    const w = 100;
    const h = 100;
    const mask = new Uint8Array(w * h).fill(1);
    clipMaskToRect(mask, w, h, { x: 20, y: 40, width: 60, height: 20 }, 0, 90);
    // Turned 90°, the 60×20 frame covers x 40..60 and y 20..80.
    expect(mask[50 * w + 50]).toBe(1);
    expect(mask[25 * w + 50]).toBe(1);
    expect(mask[50 * w + 25]).toBe(0);
    expect(mask[50 * w + 70]).toBe(0);
  });
});
