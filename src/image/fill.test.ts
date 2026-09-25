import { describe, expect, it } from "vitest";
import { convertImage } from "./convert";
import { createRgba, type RgbaImage } from "./raster";
import { fillGlyph, stampsFromConversion } from "../layout/stamps";
import { defaultConversionSettings, type ConversionSettings } from "../model/types";
import { activeStyleId, applyStyle, ART_STYLES } from "../symbols/artStyles";
import { SYMBOL_PRESETS } from "../symbols/symbolSet";

const W = 200;
const H = 100;

/** White image with a black square in the left half. */
function squareImage(): RgbaImage {
  const img = createRgba(W, H);
  for (let y = 20; y < 80; y++) {
    for (let x = 20; x < 80; x++) {
      const i = (y * W + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 0;
    }
  }
  return img;
}

const rect = { x: 0, y: 0, width: W, height: H };

function settings(patch: Partial<ConversionSettings>): ConversionSettings {
  return { ...defaultConversionSettings(), blur: 0, outline: false, fillSpacing: 8, ...patch };
}

describe("fill", () => {
  it("shadows fills only the dark square", () => {
    const out = convertImage(squareImage(), rect, settings({ fill: "shadows", fillThreshold: 128 }));
    expect(out.fill.length).toBeGreaterThan(20);
    expect(out.fill.every((c) => c.x >= 16 && c.x <= 84 && c.y >= 16 && c.y <= 84)).toBe(true);
    expect(out.points).toHaveLength(0);
  });

  it("lights fills everything except the square", () => {
    const out = convertImage(squareImage(), rect, settings({ fill: "lights", fillThreshold: 128 }));
    expect(out.fill.some((c) => c.x > 120)).toBe(true);
    expect(out.fill.some((c) => c.x > 30 && c.x < 70 && c.y > 30 && c.y < 70)).toBe(false);
  });

  it("fillOutside covers the grid around a smaller photo", () => {
    const small = { x: 50, y: 25, width: 100, height: 50 };
    const without = convertImage(createRgba(W, H), small, settings({ fill: "lights", fillThreshold: 100 }));
    const withOutside = convertImage(createRgba(W, H), small, settings({ fill: "lights", fillThreshold: 100, fillOutside: true }));
    expect(without.fill.every((c) => c.x >= 50 && c.x <= 150)).toBe(true);
    expect(withOutside.fill.length).toBeGreaterThan(without.fill.length);
    expect(withOutside.fill.some((c) => c.tone === -1)).toBe(true);
  });

  it("keeps a gap around contour symbols", () => {
    const s = settings({ outline: true, fill: "shadows", fillThreshold: 128, fillGap: 5, minLineLength: 5 });
    const out = convertImage(squareImage(), rect, s);
    expect(out.points.length).toBeGreaterThan(0);
    for (const c of out.fill) {
      const near = out.points.some((p) => Math.abs(p.x - c.x) < 3 && Math.abs(p.y - c.y) < 3);
      expect(near).toBe(false);
    }
  });

  it("tone ramp maps brightness to symbols and skips spaces", () => {
    const s = settings({ fill: "tone", fillRamp: " .#" });
    expect(fillGlyph({ x: 0, y: 0, tone: 10 }, s)).toBe("");
    expect(fillGlyph({ x: 0, y: 0, tone: 128 }, s)).toBe(".");
    expect(fillGlyph({ x: 0, y: 0, tone: 250 }, s)).toBe("#");
    const out = convertImage(squareImage(), rect, s);
    const stamps = stampsFromConversion(out, s, SYMBOL_PRESETS[0].settings, { width: W, height: H });
    expect(stamps.every((c) => c.name === "#" || c.name === ".")).toBe(true);
    expect(stamps.length).toBeLessThan(out.fill.length);
  });
});

describe("art styles", () => {
  it("every style is recognised after applying it", () => {
    const base = { ...defaultConversionSettings(), brightness: 12, contrast: 1.3 };
    for (const style of ART_STYLES) {
      const applied = applyStyle(style, base);
      expect(activeStyleId(applied.settings, applied.symbols)).toBe(style.id);
      expect(applied.settings.brightness).toBe(12);
      expect(applied.settings.contrast).toBe(1.3);
    }
  });

  it("default settings match the classic outline style", () => {
    expect(activeStyleId(defaultConversionSettings(), SYMBOL_PRESETS[0].settings)).toBe("outline");
  });

  it("styles have unique ids", () => {
    expect(new Set(ART_STYLES.map((s) => s.id)).size).toBe(ART_STYLES.length);
  });
});
