import type { Category, Rect, Size } from "../model/types";

/**
 * Hero card inside a category, taken from Dota's panorama stylesheet
 * (`panorama/styles/hero_grid_new.vcss_c`):
 *   .HeroCard { width: 51px; height: 83px }
 *   #HeroList { padding: 4px; flow-children: right-wrap }
 *   .HeroCategoryControls { height: 20px }
 *
 * A shorter box makes Panorama squish the cards, so a 2×2 frame turns into
 * one row of narrower portraits and they spill out of the border.
 */
export const DOTA_CARD = { width: 51, height: 83 } as const;
export const HERO_LIST_PAD = 4;
export const TRAY_TITLE = 20;
export const TRAY_COLS_RANGE: [number, number] = [1, 8];
/** 100% is the in-game card. A bit above only adds air; below would squish in Dota. */
export const HERO_ICON_SCALE_RANGE: [number, number] = [1, 1.25];

export type HeroMetrics = {
  width: number;
  height: number;
  pad: number;
  title: number;
};

let iconScale = 1;

export function getHeroIconScale(): number {
  return iconScale;
}

export function setHeroIconScale(scale: number): number {
  const [lo, hi] = HERO_ICON_SCALE_RANGE;
  iconScale = Math.min(hi, Math.max(lo, scale));
  return iconScale;
}

export function heroMetrics(scale = iconScale): HeroMetrics {
  return {
    width: DOTA_CARD.width * scale,
    height: DOTA_CARD.height * scale,
    pad: HERO_LIST_PAD * scale,
    title: TRAY_TITLE * scale,
  };
}

export function traySize(cols: number, rows: number, _named = false, m = heroMetrics()): Size {
  const c = Math.max(1, Math.round(cols));
  const r = Math.max(1, Math.round(rows));
  return {
    width: m.pad * 2 + c * m.width,
    height: m.title + m.pad * 2 + r * m.height,
  };
}

export function trayColumns(width: number, m = heroMetrics()): number {
  return Math.max(1, Math.floor((width - m.pad * 2) / m.width + 1e-4));
}

export function trayRows(height: number, _named: boolean, m = heroMetrics()): number {
  return Math.max(1, Math.floor((height - m.title - m.pad * 2) / m.height + 1e-4));
}

export function snapTrayRect(rect: Rect, named = false, m = heroMetrics()): Rect {
  const cols = Math.max(1, Math.round(Math.max(rect.width - m.pad * 2, m.width) / m.width));
  const rows = Math.max(1, Math.round(Math.max(rect.height - m.title - m.pad * 2, m.height) / m.height));
  return { x: rect.x, y: rect.y, ...traySize(cols, rows, named, m) };
}

/** Tight box around the icons that already fit, growing rows if heroes overflow. */
export function fitTraySize(tray: Pick<Category, "width" | "height" | "name" | "heroIds">, m = heroMetrics()): Size {
  const cols = trayColumns(tray.width, m);
  const rows =
    tray.heroIds.length > 0 ? Math.max(1, Math.ceil(tray.heroIds.length / cols)) : trayRows(tray.height, false, m);
  return traySize(cols, rows, false, m);
}

export function resizeTrayGrid(_tray: Pick<Category, "name">, cols: number, rows: number, m = heroMetrics()): Size {
  return traySize(cols, rows, false, m);
}

export function traySlots(
  tray: Pick<Category, "width" | "height" | "name" | "heroIds">,
  m = heroMetrics(),
): { cols: number; rows: number } {
  const cols = trayColumns(tray.width, m);
  const rows = Math.max(trayRows(tray.height, false, m), tray.heroIds.length ? Math.ceil(tray.heroIds.length / cols) : 1);
  return { cols, rows };
}

/** Portrait cells inside the tray, plus empty slots so the grid is visible. */
export function trayCells(tray: Category, m = heroMetrics()): Rect[] {
  const { cols, rows } = traySlots(tray, m);
  const top = tray.y + m.title + m.pad;
  const left = tray.x + m.pad;
  const count = Math.max(cols * rows, tray.heroIds.length);
  const out: Rect[] = [];
  for (let i = 0; i < count; i++) {
    out.push({
      x: left + (i % cols) * m.width,
      y: top + Math.floor(i / cols) * m.height,
      width: m.width,
      height: m.height,
    });
  }
  return out;
}
