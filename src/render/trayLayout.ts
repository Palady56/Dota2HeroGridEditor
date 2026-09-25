import type { Category, Rect } from "../model/types";

/** Portrait cells: a ~200-wide tray shows two columns, as in the Kaneki screenshot. */
export const HERO_CELL = { width: 70, height: 95, gap: 8 } as const;

export function trayCells(tray: Category): Rect[] {
  const step = HERO_CELL.width + HERO_CELL.gap;
  const cols = Math.max(1, Math.floor((tray.width + HERO_CELL.gap) / step));
  const top = tray.y + (tray.name ? 18 : 4);
  return tray.heroIds.map((_, i) => ({
    x: tray.x + (i % cols) * step,
    y: top + Math.floor(i / cols) * (HERO_CELL.height + HERO_CELL.gap),
    width: HERO_CELL.width,
    height: HERO_CELL.height,
  }));
}
