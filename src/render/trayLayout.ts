import type { Category, Rect, Size } from "../model/types";

/**
 * One hero icon in Dota's grid: landscape, same 16:9 as Valve's CDN portraits
 * (256×144). Pitch of ~66 px matches a ~200-wide category holding 3 icons
 * (Kaneki trays, BAN/arcane rows in the favourite grid).
 */
export const HERO_CELL = { width: 62, height: 35, gap: 4 } as const;
export const TRAY_PAD = 4;
export const TRAY_TITLE = 16;
export const TRAY_COLS_RANGE: [number, number] = [1, 8];

export function trayNamed(tray: { name: string }): boolean {
  return tray.name.length > 0;
}

export function trayInnerTop(named: boolean): number {
  return TRAY_PAD + (named ? TRAY_TITLE : 0);
}

export function traySize(cols: number, rows: number, named = false): Size {
  const c = Math.max(1, Math.round(cols));
  const r = Math.max(1, Math.round(rows));
  return {
    width: TRAY_PAD * 2 + c * HERO_CELL.width + (c - 1) * HERO_CELL.gap,
    height: trayInnerTop(named) + TRAY_PAD + r * HERO_CELL.height + (r - 1) * HERO_CELL.gap,
  };
}

export function trayColumns(width: number): number {
  return Math.max(1, Math.round((width - TRAY_PAD * 2 + HERO_CELL.gap) / (HERO_CELL.width + HERO_CELL.gap)));
}

export function trayRows(height: number, named: boolean): number {
  const inner = height - trayInnerTop(named) - TRAY_PAD + HERO_CELL.gap;
  return Math.max(1, Math.round(inner / (HERO_CELL.height + HERO_CELL.gap)));
}

export function snapTrayRect(rect: Rect, named = false): Rect {
  const cols = Math.max(1, Math.round((Math.max(rect.width, 1) + HERO_CELL.gap) / (HERO_CELL.width + HERO_CELL.gap)));
  const rows = Math.max(1, Math.round((Math.max(rect.height, 1) + HERO_CELL.gap) / (HERO_CELL.height + HERO_CELL.gap)));
  return { x: rect.x, y: rect.y, ...traySize(cols, rows, named) };
}

/** Tight box around the icons that already fit, growing rows if heroes overflow. */
export function fitTraySize(tray: Pick<Category, "width" | "height" | "name" | "heroIds">): Size {
  const named = trayNamed(tray);
  const cols = trayColumns(tray.width);
  const rows =
    tray.heroIds.length > 0 ? Math.max(1, Math.ceil(tray.heroIds.length / cols)) : trayRows(tray.height, named);
  return traySize(cols, rows, named);
}

export function resizeTrayGrid(tray: Pick<Category, "name">, cols: number, rows: number): Size {
  return traySize(cols, rows, trayNamed(tray));
}

export function traySlots(tray: Pick<Category, "width" | "height" | "name" | "heroIds">): { cols: number; rows: number } {
  const named = trayNamed(tray);
  const cols = trayColumns(tray.width);
  const rows = Math.max(trayRows(tray.height, named), tray.heroIds.length ? Math.ceil(tray.heroIds.length / cols) : 1);
  return { cols, rows };
}

/** Portrait cells inside the tray, plus empty slots so the grid is visible. */
export function trayCells(tray: Category): Rect[] {
  const { cols, rows } = traySlots(tray);
  const top = tray.y + trayInnerTop(trayNamed(tray));
  const left = tray.x + TRAY_PAD;
  const stepX = HERO_CELL.width + HERO_CELL.gap;
  const stepY = HERO_CELL.height + HERO_CELL.gap;
  const count = Math.max(cols * rows, tray.heroIds.length);
  const out: Rect[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: left + (i % cols) * stepX,
      y: top + Math.floor(i / cols) * stepY,
      width: HERO_CELL.width,
      height: HERO_CELL.height,
    });
  }
  return out;
}
