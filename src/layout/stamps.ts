import { createId } from "../model/ids";
import {
  GRID_SIZE,
  STAMP_SIZE,
  type Category,
  type ConversionSettings,
  type FillCell,
  type SamplePoint,
  type Size,
  type SymbolSettings,
} from "../model/types";
import { GLYPH_ANCHOR } from "../render/glyph";
import { glyphsForPoints } from "../symbols/symbolSet";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Category for a glyph centred on (px, py), clipped to the grid. Null if nothing fits. */
export function stampAt(
  glyph: string,
  px: number,
  py: number,
  origin: Category["origin"],
  grid: Size = GRID_SIZE,
): Category | null {
  if (!glyph) return null;
  const x = Math.max(0, round2(px - GLYPH_ANCHOR.dx));
  const y = Math.max(0, round2(py - GLYPH_ANCHOR.dy));
  const width = round2(Math.min(STAMP_SIZE, grid.width - x));
  const height = round2(Math.min(STAMP_SIZE, grid.height - y));
  if (width < 1 || height < 1) return null;
  return { id: createId("cat"), name: glyph, x, y, width, height, heroIds: [], origin };
}

/** Fill symbol for a cell; empty when the cell stays blank. */
export function fillGlyph(cell: FillCell, settings: ConversionSettings): string {
  if (settings.fill !== "tone") return settings.fillGlyph;
  const ramp = [...settings.fillRamp];
  if (ramp.length === 0) return "";
  const tone = cell.tone < 0 ? 0 : cell.tone;
  const g = ramp[Math.min(ramp.length - 1, Math.floor((tone / 256) * ramp.length))];
  return g.trim();
}

export function stampsFromFill(cells: FillCell[], settings: ConversionSettings, grid: Size = GRID_SIZE): Category[] {
  const out: Category[] = [];
  for (const cell of cells) {
    const stamp = stampAt(fillGlyph(cell, settings), cell.x, cell.y, "generated", grid);
    if (stamp) out.push(stamp);
  }
  return out;
}

/** Everything a conversion produces: the fill underneath, then the contour symbols. */
export function stampsFromConversion(
  out: { points: SamplePoint[]; fill: FillCell[] },
  settings: ConversionSettings,
  symbols: SymbolSettings,
  grid: Size = GRID_SIZE,
): Category[] {
  return [...stampsFromFill(out.fill, settings, grid), ...stampsFromPoints(out.points, symbols, grid)];
}

export function stampsFromPoints(
  points: SamplePoint[],
  symbols: SymbolSettings,
  grid: Size = GRID_SIZE,
): Category[] {
  const glyphs = glyphsForPoints(points, symbols);
  const out: Category[] = [];
  points.forEach((p, i) => {
    const stamp = stampAt(glyphs[i], p.x, p.y, "generated", grid);
    if (stamp) out.push(stamp);
  });
  return out;
}
