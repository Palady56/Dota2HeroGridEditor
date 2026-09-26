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

/** Dota starts to hitch around this many categories; the editor warns here. */
export const DOTA_SYMBOL_WARN = 2000;
/** Past this, the in-game grid often freezes or crashes while you edit it. */
export const DOTA_SYMBOL_DANGER = 2500;

/** Drop a second stamp of the same glyph closer than this — they stack as extra Dota panels. */
const STAMP_DEDUP = 6;

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function symbolCount(categories: ReadonlyArray<Pick<Category, "heroIds">>): number {
  return categories.filter((c) => c.heroIds.length === 0).length;
}

/**
 * Keep outline stamps over fill, and skip a glyph that already sits in the same
 * 6 px cell. Overlapping copies look the same in the editor but each one is a
 * separate panel in Dota.
 */
export function compactStamps(stamps: Category[], minGap = STAMP_DEDUP): Category[] {
  if (stamps.length < 2) return stamps;
  const cell = Math.max(1, minGap);
  const cols = Math.ceil(GRID_SIZE.width / cell) + 2;
  const kept: Category[] = [];
  const buckets = new Map<number, number[]>();
  const min2 = minGap * minGap;

  const tooClose = (x: number, y: number, name: string): boolean => {
    const cx = Math.floor(x / cell);
    const cy = Math.floor(y / cell);
    for (let oy = -1; oy <= 1; oy++) {
      for (let ox = -1; ox <= 1; ox++) {
        const list = buckets.get((cy + oy) * cols + (cx + ox));
        if (!list) continue;
        for (const i of list) {
          const s = kept[i];
          if (s.name !== name) continue;
          const dx = s.x + GLYPH_ANCHOR.dx - x;
          const dy = s.y + GLYPH_ANCHOR.dy - y;
          if (dx * dx + dy * dy < min2) return true;
        }
      }
    }
    return false;
  };

  for (const stamp of stamps) {
    const x = stamp.x + GLYPH_ANCHOR.dx;
    const y = stamp.y + GLYPH_ANCHOR.dy;
    if (tooClose(x, y, stamp.name)) continue;
    const key = Math.floor(y / cell) * cols + Math.floor(x / cell);
    const list = buckets.get(key);
    if (list) list.push(kept.length);
    else buckets.set(key, [kept.length]);
    kept.push(stamp);
  }
  return kept;
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
  const outline = stampsFromPoints(out.points, symbols, grid);
  const fill = stampsFromFill(out.fill, settings, grid);
  return compactStamps([...outline, ...fill]);
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
