import { GRID_SIZE, inferCategoryKind, type Category, type GridConfig, type Rect } from "../model/types";
import { HERO_BY_ID } from "../heroes/heroes";
import { getPortrait } from "./portraits";
import { GLYPH_FONT, GLYPH_HIT } from "./glyph";
import { trayCells } from "./trayLayout";

export type ViewTransform = { scale: number; tx: number; ty: number };

export const IDENTITY_VIEW: ViewTransform = { scale: 1, tx: 0, ty: 0 };

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

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  config: GridConfig,
  view: ViewTransform,
  selected: ReadonlySet<string>,
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
  ctx.restore();
}
