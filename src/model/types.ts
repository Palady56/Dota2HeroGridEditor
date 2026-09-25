export const DOTA_JSON_VERSION = 3 as const;

/** One canvas for conversion, preview, editing and export (converter screenshot: 1193×593). */
export const GRID_SIZE = { width: 1193, height: 593 } as const;

export type Size = { width: number; height: number };

export const STAMP_SIZE = 30;

export const DEFAULT_EXPORT_FILE_NAME = "hero_grid_config.json";

/** Editor-only; never written to the Dota file. */
export type CategoryOrigin = "imported" | "generated" | "manual";

export type Category = {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  heroIds: number[];
  origin: CategoryOrigin;
};

export type GridConfig = {
  id: string;
  name: string;
  categories: Category[];
};

export type GridDocument = {
  version: typeof DOTA_JSON_VERSION;
  configs: GridConfig[];
  activeConfigId: string;
};

export type CategoryKind = "stamp" | "caption" | "tray";

export type DotaCategoryJson = {
  category_name: string;
  x_position: number;
  y_position: number;
  width: number;
  height: number;
  hero_ids: number[];
};

export type DotaConfigJson = {
  config_name: string;
  categories: DotaCategoryJson[];
};

export type DotaGridFileJson = {
  version: number;
  configs: DotaConfigJson[];
};

export type Rect = { x: number; y: number; width: number; height: number };

export type ConversionMode = "edges" | "lines";

/**
 * Filling areas with symbols: "shadows" / "lights" put one symbol wherever the
 * photo is darker / lighter than the threshold, "tone" picks a symbol from a
 * ramp by brightness (ASCII halftone).
 */
export type FillMode = "none" | "shadows" | "lights" | "tone";

export type ConversionSettings = {
  mode: ConversionMode;
  /** Place symbols along contours / lines. */
  outline: boolean;
  fill: FillMode;
  /** 0–255 brightness boundary for "shadows" and "lights". */
  fillThreshold: number;
  /** Horizontal distance between fill symbols; rows are FILL_ROW_RATIO times further apart. */
  fillSpacing: number;
  fillGlyph: string;
  /** "tone": symbols from dark to bright; a space means "leave empty". */
  fillRamp: string;
  /** Also fill the grid around the photo (a background). */
  fillOutside: boolean;
  /** Empty space kept around contour symbols, grid px. */
  fillGap: number;
  brightness: number;
  contrast: number;
  invert: boolean;
  /** Gaussian sigma in grid pixels. */
  blur: number;
  /** Canny high threshold; low = high / 2. */
  edgeThreshold: number;
  /** "lines" mode: pixels darker than this form lines. */
  darkThreshold: number;
  /** Connected lines shorter than this (pixels) are dropped. */
  minLineLength: number;
  /** Distance between neighbouring symbols along a line. */
  spacing: number;
};

/** Object size and position on the grid canvas. scale 1 = fit inside the canvas. */
export type Placement = {
  scale: number;
  offsetX: number;
  offsetY: number;
  /** Degrees clockwise around the image centre, in (-180, 180]. */
  rotation: number;
  flipX: boolean;
  flipY: boolean;
};

/** Dota symbols are about 8×14 px, so fill rows sit further apart than columns. */
export const FILL_ROW_RATIO = 1.6;

/** A fill position (glyph centre) and the photo brightness there, 0–255; -1 outside the photo. */
export type FillCell = { x: number; y: number; tone: number };

export type SamplePoint = {
  x: number;
  y: number;
  /** Line direction in [-90, 90), y axis down; NaN when unknown. */
  angleDeg: number;
  /** 1 = perfectly straight around the point, lower = curve or corner. */
  straightness: number;
  /** Consecutive points with the same segment are neighbours along one line. */
  segment: number;
};

export type SymbolSettings = {
  horizontal: string;
  vertical: string;
  /** Line going down to the right: "\" */
  diagDown: string;
  /** Line going up to the right: "/" */
  diagUp: string;
  /** Curves, corners and short lines. */
  fallback: string;
  minStraightness: number;
  /**
   * A line symbol is kept only in runs of at least this many same-direction
   * neighbours; shorter runs get the fallback. Dota draws "|" tall and thin,
   * so a lone one reads as a stray streak.
   */
  minRun: number;
};

const TRAY_MIN_SIDE = 40;

export function inferCategoryKind(category: Category): CategoryKind {
  if (category.heroIds.length > 0) return "tray";
  if (category.width > TRAY_MIN_SIDE && category.height > TRAY_MIN_SIDE) return "tray";
  if (category.name.length > 1) return "caption";
  return "stamp";
}

export function defaultConversionSettings(): ConversionSettings {
  return {
    mode: "edges",
    outline: true,
    fill: "none",
    fillThreshold: 128,
    fillSpacing: 8,
    fillGlyph: ".",
    fillRamp: " .:-=+*#",
    fillOutside: false,
    fillGap: 4,
    brightness: 0,
    contrast: 1,
    invert: false,
    blur: 1.4,
    edgeThreshold: 110,
    darkThreshold: 110,
    minLineLength: 25,
    spacing: 5,
  };
}

export const DEFAULT_PLACEMENT: Placement = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
  rotation: 0,
  flipX: false,
  flipY: false,
};
