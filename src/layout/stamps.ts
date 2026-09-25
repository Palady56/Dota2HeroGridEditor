import { createId } from "../model/ids";
import { GRID_SIZE, STAMP_SIZE, type Category, type SamplePoint, type Size, type SymbolSettings } from "../model/types";
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
