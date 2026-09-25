import { createId } from "../model/ids";
import { markManual } from "../model/document";
import { GRID_SIZE, inferCategoryKind, type Category, type Rect } from "../model/types";
import { stampAt } from "../layout/stamps";
import { GLYPH_ANCHOR } from "../render/glyph";
import { fitTraySize, resizeTrayGrid, snapTrayRect, trayColumns, trayNamed, trayRows, traySize } from "../render/trayLayout";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n;
}

export type Point = { x: number; y: number };

export function moveCategories(
  cats: Category[],
  originals: ReadonlyMap<string, Point>,
  dx: number,
  dy: number,
): Category[] {
  return cats.map((c) => {
    const o = originals.get(c.id);
    if (!o) return c;
    return markManual({
      ...c,
      x: round2(clamp(o.x + dx, 0, GRID_SIZE.width - 1)),
      y: round2(clamp(o.y + dy, 0, GRID_SIZE.height - 1)),
    });
  });
}

export function nudgeCategories(
  cats: Category[],
  ids: ReadonlySet<string>,
  dx: number,
  dy: number,
): Category[] {
  const originals = new Map<string, Point>();
  for (const c of cats) if (ids.has(c.id)) originals.set(c.id, { x: c.x, y: c.y });
  return moveCategories(cats, originals, dx, dy);
}

export function deleteCategories(cats: Category[], ids: ReadonlySet<string>): Category[] {
  if (ids.size === 0) return cats;
  const next = cats.filter((c) => !ids.has(c.id));
  return next.length === cats.length ? cats : next;
}

export function addStamp(cats: Category[], glyph: string, px: number, py: number): Category[] {
  const stamp = stampAt(glyph, px, py, "manual");
  return stamp ? [...cats, stamp] : cats;
}

/** Removes glyphs whose centre is within `radius`; hero trays are never erased. */
export function eraseNear(cats: Category[], px: number, py: number, radius: number): Category[] {
  const r2 = radius * radius;
  const next = cats.filter((c) => {
    if (inferCategoryKind(c) === "tray") return true;
    const dx = c.x + GLYPH_ANCHOR.dx - px;
    const dy = c.y + GLYPH_ANCHOR.dy - py;
    return dx * dx + dy * dy > r2;
  });
  return next.length === cats.length ? cats : next;
}

export function createTray(rect: Rect): Category {
  const snapped = snapTrayRect(rect);
  return {
    id: createId("cat"),
    name: "",
    x: round2(snapped.x),
    y: round2(snapped.y),
    width: round2(snapped.width),
    height: round2(snapped.height),
    heroIds: [],
    origin: "manual",
  };
}

/** Shrink or grow the box so the frame sits on the icons. */
export function fitTray(cats: Category[], id: string): Category[] {
  return cats.map((c) => {
    if (c.id !== id || inferCategoryKind(c) !== "tray") return c;
    const size = fitTraySize(c);
    if (size.width === c.width && size.height === c.height) return c;
    return markManual({ ...c, width: round2(size.width), height: round2(size.height) });
  });
}

export function setTrayGrid(cats: Category[], id: string, cols: number, rows: number): Category[] {
  return cats.map((c) => {
    if (c.id !== id) return c;
    const size = resizeTrayGrid(c, cols, rows);
    return markManual({ ...c, width: round2(size.width), height: round2(size.height) });
  });
}

export function updateCategory(
  cats: Category[],
  id: string,
  patch: Partial<Omit<Category, "id" | "origin">>,
): Category[] {
  return cats.map((c) => (c.id === id ? markManual({ ...c, ...patch }) : c));
}

/** Replace a symbol on glyph categories; limited to `ids` when given. */
export function replaceGlyph(
  cats: Category[],
  from: string,
  to: string,
  ids?: ReadonlySet<string>,
): Category[] {
  return cats.map((c) => {
    if (inferCategoryKind(c) === "tray") return c;
    if (ids ? !ids.has(c.id) : c.name !== from) return c;
    return markManual({ ...c, name: to });
  });
}

export function addHeroes(cats: Category[], trayId: string, heroIds: number[]): Category[] {
  return cats.map((c) => {
    if (c.id !== trayId) return c;
    const merged = [...c.heroIds];
    for (const id of heroIds) if (!merged.includes(id)) merged.push(id);
    const named = trayNamed(c);
    const cols = trayColumns(c.width);
    const need = Math.max(1, Math.ceil(merged.length / cols));
    const rows = Math.max(trayRows(c.height, named), need);
    const size = traySize(cols, rows, named);
    return markManual({ ...c, heroIds: merged, width: round2(size.width), height: round2(size.height) });
  });
}

export function removeHero(cats: Category[], trayId: string, index: number): Category[] {
  return cats.map((c) =>
    c.id === trayId ? markManual({ ...c, heroIds: c.heroIds.filter((_, i) => i !== index) }) : c,
  );
}

export function moveHero(cats: Category[], trayId: string, index: number, delta: -1 | 1): Category[] {
  return cats.map((c) => {
    if (c.id !== trayId) return c;
    const target = index + delta;
    if (target < 0 || target >= c.heroIds.length) return c;
    const ids = [...c.heroIds];
    [ids[index], ids[target]] = [ids[target], ids[index]];
    return markManual({ ...c, heroIds: ids });
  });
}
