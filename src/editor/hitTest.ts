import { inferCategoryKind, type Category, type Rect } from "../model/types";
import { GLYPH_HIT } from "../render/glyph";

export function categoryBounds(c: Category): Rect {
  const kind = inferCategoryKind(c);
  if (kind === "tray") return { x: c.x, y: c.y, width: c.width, height: c.height };
  const width = kind === "caption" ? c.name.length * GLYPH_HIT.width : GLYPH_HIT.width;
  return { x: c.x, y: c.y, width, height: GLYPH_HIT.height };
}

function contains(r: Rect, x: number, y: number, pad: number): boolean {
  return x >= r.x - pad && x <= r.x + r.width + pad && y >= r.y - pad && y <= r.y + r.height + pad;
}

/** Glyphs win over the trays they sit on; the topmost (last drawn) wins among equals. */
export function hitTest(cats: Category[], x: number, y: number, pad = 1): string | null {
  for (let i = cats.length - 1; i >= 0; i--) {
    const c = cats[i];
    if (inferCategoryKind(c) !== "tray" && contains(categoryBounds(c), x, y, pad)) return c.id;
  }
  for (let i = cats.length - 1; i >= 0; i--) {
    const c = cats[i];
    if (inferCategoryKind(c) === "tray" && contains(categoryBounds(c), x, y, pad)) return c.id;
  }
  return null;
}

export function idsInRect(cats: Category[], r: Rect): Set<string> {
  const ids = new Set<string>();
  for (const c of cats) {
    const b = categoryBounds(c);
    if (b.x < r.x + r.width && b.x + b.width > r.x && b.y < r.y + r.height && b.y + b.height > r.y) {
      ids.add(c.id);
    }
  }
  return ids;
}
