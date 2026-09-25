import { createId } from "../model/ids";
import {
  GRID_SIZE,
  STAMP_SIZE,
  inferCategoryKind,
  type Category,
  type GridConfig,
  type Rect,
  type Size,
} from "../model/types";
import { categoryBounds } from "../editor/hitTest";
import { isSideways, rotateVec, type Frame } from "../model/geometry";
import { GLYPH_HIT } from "../render/glyph";
import { transformGlyph } from "../symbols/symbolSet";

/** One grid (config) taken from a loaded file, not yet placed. */
export type LibraryEntry = {
  id: string;
  fileName: string;
  configName: string;
  categories: Category[];
};

/**
 * A placed copy of a library entry. `categories` keep their original
 * coordinates; position and scale are applied on flatten.
 */
export type Layer = {
  id: string;
  name: string;
  categories: Category[];
  /** Top-left corner of the layer's content on the grid. */
  x: number;
  y: number;
  /** Scales distances between symbols; Dota draws each symbol at a fixed size. */
  scale: number;
  /** Degrees clockwise around the content centre. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
  visible: boolean;
  includeTrays: boolean;
  includeCaptions: boolean;
};

export function libraryFromConfigs(fileName: string, configs: GridConfig[]): LibraryEntry[] {
  return configs.map((cfg) => ({
    id: createId("lib"),
    fileName,
    configName: cfg.name,
    categories: cfg.categories,
  }));
}

export function contentBounds(categories: Category[]): Rect | null {
  if (categories.length === 0) return null;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of categories) {
    const b = categoryBounds(c);
    x0 = Math.min(x0, b.x);
    y0 = Math.min(y0, b.y);
    x1 = Math.max(x1, b.x + b.width);
    y1 = Math.max(y1, b.y + b.height);
  }
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

function includedCategories(layer: Layer): Category[] {
  return layer.categories.filter((c) => {
    const kind = inferCategoryKind(c);
    if (kind === "tray") return layer.includeTrays;
    if (kind === "caption") return layer.includeCaptions;
    return true;
  });
}

export function createLayer(entry: LibraryEntry): Layer {
  const bounds = contentBounds(entry.categories);
  return {
    id: createId("layer"),
    name: entry.configName || entry.fileName,
    categories: entry.categories,
    x: bounds?.x ?? 0,
    y: bounds?.y ?? 0,
    scale: 1,
    rotation: 0,
    flipX: false,
    flipY: false,
    visible: true,
    includeTrays: true,
    includeCaptions: false,
  };
}

/** Categories of one layer in grid coordinates, unclipped. Ids are stable per render. */
export function layerCategories(layer: Layer): Category[] {
  const bounds = contentBounds(layer.categories);
  if (!bounds) return [];
  const s = layer.scale;
  const cx = (bounds.width * s) / 2;
  const cy = (bounds.height * s) / 2;
  const sideways = isSideways(layer.rotation);
  return includedCategories(layer).map((c) => {
    const tray = inferCategoryKind(c) === "tray";
    // Trays turn around their centre, symbols around the centre of their hit box.
    const ax = tray ? c.width / 2 : GLYPH_HIT.width / 2;
    const ay = tray ? c.height / 2 : GLYPH_HIT.height / 2;
    let dx = (c.x + ax - bounds.x) * s - cx;
    let dy = (c.y + ay - bounds.y) * s - cy;
    if (layer.flipX) dx = -dx;
    if (layer.flipY) dy = -dy;
    const r = rotateVec({ x: dx, y: dy }, layer.rotation);
    const px = layer.x + cx + r.x;
    const py = layer.y + cy + r.y;
    if (tray) {
      const width = (sideways ? c.height : c.width) * s;
      const height = (sideways ? c.width : c.height) * s;
      return { ...c, x: px - width / 2, y: py - height / 2, width, height };
    }
    return {
      ...c,
      name: transformGlyph(c.name, layer.rotation, layer.flipX, layer.flipY),
      x: px - ax,
      y: py - ay,
    };
  });
}

/** The layer's content box after scale and rotation (for the frame and rotation handle). */
export function layerFrame(layer: Layer): Frame | null {
  const bounds = contentBounds(layer.categories);
  if (!bounds) return null;
  const width = bounds.width * layer.scale;
  const height = bounds.height * layer.scale;
  return { cx: layer.x + width / 2, cy: layer.y + height / 2, width, height, rotation: layer.rotation };
}

/** On-grid box of the visible content, for hit testing and the selection frame. */
export function layerBounds(layer: Layer): Rect | null {
  return contentBounds(layerCategories(layer));
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * All visible layers as one category list (first layer at the bottom).
 * Symbols whose anchor falls outside the grid are dropped, the rest are
 * clipped like generated stamps; trays are kept as they are.
 */
export function flattenLayers(layers: Layer[], grid: Size = GRID_SIZE): Category[] {
  const out: Category[] = [];
  for (const layer of layers) {
    if (!layer.visible) continue;
    for (const c of layerCategories(layer)) {
      const x = round2(c.x);
      const y = round2(c.y);
      if (inferCategoryKind(c) === "tray") {
        out.push({
          ...c,
          id: createId("cat"),
          x,
          y,
          width: round2(c.width),
          height: round2(c.height),
          heroIds: [...c.heroIds],
          origin: "manual",
        });
        continue;
      }
      if (x < 0 || y < 0 || x >= grid.width - 1 || y >= grid.height - 1) continue;
      out.push({
        ...c,
        id: createId("cat"),
        x,
        y,
        width: round2(Math.min(c.width || STAMP_SIZE, grid.width - x)),
        height: round2(Math.min(c.height || STAMP_SIZE, grid.height - y)),
        heroIds: [...c.heroIds],
        origin: "manual",
      });
    }
  }
  return out;
}

/** Change scale keeping the centre of the content in place. */
export function scaleLayer(layer: Layer, scale: number): Layer {
  const bounds = contentBounds(layer.categories);
  if (!bounds) return { ...layer, scale };
  const cx = layer.x + (bounds.width * layer.scale) / 2;
  const cy = layer.y + (bounds.height * layer.scale) / 2;
  return {
    ...layer,
    scale,
    x: cx - (bounds.width * scale) / 2,
    y: cy - (bounds.height * scale) / 2,
  };
}

export type Align = "left" | "center" | "right" | "top" | "middle" | "bottom";

export function alignLayer(layer: Layer, align: Align, grid: Size = GRID_SIZE): Layer {
  const b = layerBounds(layer);
  if (!b) return layer;
  const shiftX = (target: number) => ({ ...layer, x: layer.x + target - b.x });
  const shiftY = (target: number) => ({ ...layer, y: layer.y + target - b.y });
  switch (align) {
    case "left":
      return shiftX(0);
    case "center":
      return shiftX((grid.width - b.width) / 2);
    case "right":
      return shiftX(grid.width - b.width);
    case "top":
      return shiftY(0);
    case "middle":
      return shiftY((grid.height - b.height) / 2);
    case "bottom":
      return shiftY(grid.height - b.height);
  }
}

/** Topmost visible layer whose content box contains the point. */
export function layerAt(layers: Layer[], x: number, y: number): string | null {
  for (let i = layers.length - 1; i >= 0; i--) {
    const l = layers[i];
    if (!l.visible) continue;
    const b = layerBounds(l);
    if (b && x >= b.x && x <= b.x + b.width && y >= b.y && y <= b.y + b.height) return l.id;
  }
  return null;
}
