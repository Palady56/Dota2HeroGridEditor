import { describe, expect, it } from "vitest";
import type { Category } from "../model/types";
import {
  DEFAULT_SHAPE_SETTINGS,
  dragBox,
  dragOutline,
  frameOutline,
  lineGlyph,
  outlinePoints,
  selectionBounds,
  shapeStamps,
  type ShapeSettings,
} from "./shapes";

const none = { square: false, fromCenter: false };
const auto: ShapeSettings = { ...DEFAULT_SHAPE_SETTINGS, step: 10, autoGlyph: true, corner: "" };

describe("shapes", () => {
  it("picks line glyphs by direction regardless of sign", () => {
    expect(lineGlyph(0)).toBe("-");
    expect(lineGlyph(180)).toBe("-");
    expect(lineGlyph(90)).toBe("|");
    expect(lineGlyph(-90)).toBe("|");
    expect(lineGlyph(45)).toBe("\\");
    expect(lineGlyph(-135)).toBe("\\");
    expect(lineGlyph(-45)).toBe("/");
    expect(lineGlyph(135)).toBe("/");
  });

  it("draws a horizontal line of '-' with both ends", () => {
    const pts = outlinePoints(dragOutline("line", { x: 100, y: 50 }, { x: 150, y: 50 }, none), auto, ".");
    expect(pts).toHaveLength(6);
    expect(pts.every((p) => p.glyph === "-" && p.y === 50)).toBe(true);
    expect(pts[0].x).toBe(100);
    expect(pts[pts.length - 1].x).toBe(150);
  });

  it("Shift snaps a line to vertical", () => {
    const o = dragOutline("line", { x: 100, y: 100 }, { x: 108, y: 180 }, { square: true, fromCenter: false });
    const end = o.vertices[1];
    expect(end.x).toBeCloseTo(100, 6);
    expect(outlinePoints(o, auto, ".").every((p) => p.glyph === "|")).toBe(true);
  });

  it("rectangle uses - on top/bottom, | on the sides and the corner symbol", () => {
    const o = dragOutline("rect", { x: 0, y: 0 }, { x: 40, y: 20 }, none);
    const pts = outlinePoints(o, { ...auto, corner: "+" }, ".");
    expect(pts.filter((p) => p.glyph === "+")).toHaveLength(4);
    expect(pts.filter((p) => p.y === 0 && p.glyph === "-")).toHaveLength(3);
    expect(pts.filter((p) => p.x === 40 && p.glyph === "|")).toHaveLength(1);
    expect(pts).toHaveLength(12);
  });

  it("diamond edges are diagonal", () => {
    const o = dragOutline("diamond", { x: 0, y: 0 }, { x: 60, y: 60 }, none);
    const glyphs = new Set(outlinePoints(o, auto, ".").map((p) => p.glyph));
    expect([...glyphs].sort()).toEqual(["/", "\\"]);
  });

  it("uses the brush symbol when direction symbols are off", () => {
    const o = dragOutline("ellipse", { x: 0, y: 0 }, { x: 100, y: 60 }, none);
    const pts = outlinePoints(o, { ...auto, autoGlyph: false }, "♡");
    expect(pts.length).toBeGreaterThan(10);
    expect(pts.every((p) => p.glyph === "♡")).toBe(true);
  });

  it("Shift makes a square and Alt draws from the centre", () => {
    expect(dragBox({ x: 10, y: 10 }, { x: 40, y: 20 }, { square: true, fromCenter: false })).toEqual({
      x: 10,
      y: 10,
      width: 30,
      height: 30,
    });
    expect(dragBox({ x: 50, y: 50 }, { x: 60, y: 70 }, { square: false, fromCenter: true })).toEqual({
      x: 40,
      y: 30,
      width: 20,
      height: 40,
    });
  });

  it("frames the selected tray with padding", () => {
    const tray: Category = { id: "t", name: "", x: 100, y: 100, width: 60, height: 90, heroIds: [1], origin: "manual" };
    const bounds = selectionBounds([tray], new Set(["t"]))!;
    expect(bounds).toEqual({ x: 100, y: 100, width: 60, height: 90 });
    const o = frameOutline("rect", bounds, 5);
    expect(o.vertices[0]).toEqual({ x: 95, y: 95 });
    expect(o.vertices[2]).toEqual({ x: 165, y: 195 });
    const stamps = shapeStamps(outlinePoints(o, auto, "."));
    expect(stamps.every((s) => s.origin === "manual" && s.heroIds.length === 0)).toBe(true);
  });

  it("diamond and ellipse frames contain the box corners", () => {
    const b = { x: 0, y: 0, width: 40, height: 20 };
    for (const kind of ["diamond", "ellipse", "triangle"] as const) {
      const v = frameOutline(kind, b, 0).vertices;
      const xs = v.map((p) => p.x);
      const ys = v.map((p) => p.y);
      expect(Math.min(...xs)).toBeLessThanOrEqual(0);
      expect(Math.max(...xs)).toBeGreaterThanOrEqual(40);
      expect(Math.min(...ys)).toBeLessThanOrEqual(0);
      expect(Math.max(...ys)).toBeGreaterThanOrEqual(20 - 1e-9);
    }
  });
});
