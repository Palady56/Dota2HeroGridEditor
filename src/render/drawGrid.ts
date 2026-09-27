import { GRID_SIZE, inferCategoryKind, type Category, type GridConfig, type Rect } from "../model/types";
import { HERO_BY_ID } from "../heroes/heroes";
import { getPortrait } from "./portraits";
import { GLYPH_FONT, GLYPH_HIT } from "./glyph";
import { trayCells } from "./trayLayout";

export type ViewTransform = { scale: number; tx: number; ty: number };

export const IDENTITY_VIEW: ViewTransform = { scale: 1, tx: 0, ty: 0 };

/** Light ruler so trays and photos can share a level. Major lines are labeled. */
export const GUIDE_MINOR = 50;
export const GUIDE_MAJOR = 100;

/**
 * Graph paper in grid coordinates. `pixel` is grid units per screen pixel,
 * so lines and labels stay about one pixel / 11px on screen at any zoom.
 */
export function drawGuideGrid(ctx: CanvasRenderingContext2D, pixel: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, GRID_SIZE.width, GRID_SIZE.height);
  ctx.clip();
  ctx.setLineDash([]);
  ctx.lineWidth = pixel;
  ctx.font = `${Math.max(11 * pixel, 1)}px 'Segoe UI', sans-serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  for (let x = GUIDE_MINOR; x < GRID_SIZE.width; x += GUIDE_MINOR) {
    const major = x % GUIDE_MAJOR === 0;
    ctx.strokeStyle = major ? "rgba(230, 182, 94, 0.5)" : "rgba(236, 231, 221, 0.16)";
    ctx.beginPath();
    ctx.moveTo(x + pixel * 0.5, 0);
    ctx.lineTo(x + pixel * 0.5, GRID_SIZE.height);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = "rgba(230, 182, 94, 0.92)";
      ctx.fillText(String(x), x + 3 * pixel, 3 * pixel);
    }
  }
  for (let y = GUIDE_MINOR; y < GRID_SIZE.height; y += GUIDE_MINOR) {
    const major = y % GUIDE_MAJOR === 0;
    ctx.strokeStyle = major ? "rgba(230, 182, 94, 0.5)" : "rgba(236, 231, 221, 0.16)";
    ctx.beginPath();
    ctx.moveTo(0, y + pixel * 0.5);
    ctx.lineTo(GRID_SIZE.width, y + pixel * 0.5);
    ctx.stroke();
    if (major) {
      ctx.fillStyle = "rgba(230, 182, 94, 0.92)";
      ctx.fillText(String(y), 3 * pixel, y + 3 * pixel);
    }
  }
  ctx.restore();
}

const COLORS = {
  background: "#0e1115",
  border: "rgba(226, 84, 58, 0.55)",
  glyph: "#ece7dd",
  selected: "#ffc857",
  trayBorder: "rgba(236, 231, 221, 0.3)",
  heroText: "#f4efe6",
};

/**
 * Fill the vertical card the way Dota does. Card art is already a portrait;
 * a wide banner (fallback for heroes without one) is cropped to the same slot.
 */
function drawPortrait(ctx: CanvasRenderingContext2D, image: HTMLImageElement, cell: Rect): void {
  const iw = image.naturalWidth || image.width;
  const ih = image.naturalHeight || image.height;
  if (iw <= 0 || ih <= 0 || cell.width <= 0 || cell.height <= 0) return;
  const scale = Math.max(cell.width / iw, cell.height / ih);
  const sw = cell.width / scale;
  const sh = cell.height / scale;
  const sx = Math.max(0, (iw - sw) / 2);
  const sy = Math.max(0, (ih - sh) / 2);
  ctx.save();
  ctx.beginPath();
  ctx.rect(cell.x, cell.y, cell.width, cell.height);
  ctx.clip();
  ctx.drawImage(image, sx, sy, sw, sh, cell.x, cell.y, cell.width, cell.height);
  ctx.restore();
}

function drawTray(
  ctx: CanvasRenderingContext2D,
  tray: Category,
  scale: number,
  selected: boolean,
): void {
  ctx.strokeStyle = selected ? COLORS.selected : COLORS.trayBorder;
  ctx.lineWidth = (selected ? 2 : 1) / scale;
  ctx.strokeRect(tray.x, tray.y, tray.width, tray.height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(tray.x, tray.y, tray.width, tray.height);
  ctx.clip();
  ctx.font = "10px 'Segoe UI', sans-serif";
  ctx.textBaseline = "top";
  trayCells(tray).forEach((cell, i) => {
    const id = tray.heroIds[i];
    if (id === undefined) {
      ctx.fillStyle = "rgba(236, 231, 221, 0.04)";
      ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
      ctx.strokeStyle = "rgba(236, 231, 221, 0.14)";
      ctx.lineWidth = 1 / scale;
      ctx.strokeRect(cell.x + 0.5 / scale, cell.y + 0.5 / scale, cell.width - 1 / scale, cell.height - 1 / scale);
      return;
    }
    const hero = HERO_BY_ID.get(id);
    const portrait = hero ? getPortrait(hero) : null;
    if (portrait) {
      drawPortrait(ctx, portrait, cell);
      return;
    }
    ctx.fillStyle = `hsl(${(id * 47) % 360} 30% 26%)`;
    ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
    ctx.fillStyle = COLORS.heroText;
    const words = (hero?.name ?? `#${id}`).split(" ").slice(0, 3);
    words.forEach((word, line) => ctx.fillText(word, cell.x + 4, cell.y + 4 + line * 12));
  });
  ctx.restore();
}

/** Bright line through the top of the selected object, labeled with its level. */
export function drawLevelLine(ctx: CanvasRenderingContext2D, y: number, pixel: number, anchorX: number): void {
  const label = `уровень ${Math.round(y)}`;
  ctx.save();
  ctx.strokeStyle = "#ffc857";
  ctx.lineWidth = 2 * pixel;
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.lineTo(GRID_SIZE.width, y);
  ctx.stroke();
  ctx.font = `700 ${Math.max(13 * pixel, 1)}px 'Segoe UI', sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  const padX = 6 * pixel;
  const textW = ctx.measureText(label).width;
  const h = 18 * pixel;
  const w = textW + padX * 2;
  const bx = Math.min(Math.max(anchorX, 4 * pixel), GRID_SIZE.width - w - 4 * pixel);
  const by = y - h - 6 * pixel < 4 * pixel ? y + 6 * pixel : y - h - 6 * pixel;
  ctx.fillStyle = "#ffc857";
  ctx.fillRect(bx, by, w, h);
  ctx.fillStyle = "#1a1411";
  ctx.fillText(label, bx + padX, by + h / 2);
  ctx.restore();
}

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  config: GridConfig,
  view: ViewTransform,
  selected: ReadonlySet<string>,
  guides = true,
): void {
  ctx.save();
  ctx.transform(view.scale, 0, 0, view.scale, view.tx, view.ty);

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, GRID_SIZE.width, GRID_SIZE.height);
  ctx.strokeStyle = COLORS.border;
  ctx.lineWidth = 1 / view.scale;
  ctx.strokeRect(0, 0, GRID_SIZE.width, GRID_SIZE.height);

  for (const c of config.categories) {
    if (inferCategoryKind(c) === "tray") drawTray(ctx, c, view.scale, selected.has(c.id));
  }

  ctx.font = GLYPH_FONT;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = COLORS.glyph;
  const selectedGlyphs: Category[] = [];
  for (const c of config.categories) {
    if (!c.name) continue;
    if (selected.has(c.id)) {
      selectedGlyphs.push(c);
      continue;
    }
    ctx.fillText(c.name, c.x, c.y);
  }

  ctx.fillStyle = COLORS.selected;
  ctx.strokeStyle = COLORS.selected;
  ctx.lineWidth = 1 / view.scale;
  for (const c of selectedGlyphs) {
    ctx.fillText(c.name, c.x, c.y);
    if (inferCategoryKind(c) !== "tray") {
      ctx.strokeRect(c.x - 1, c.y - 1, GLYPH_HIT.width + 2, GLYPH_HIT.height + 2);
    }
  }
  if (guides) drawGuideGrid(ctx, 1 / view.scale);
  ctx.restore();
}
