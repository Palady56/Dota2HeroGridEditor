import type { SamplePoint, SymbolSettings } from "../model/types";

export type SymbolPreset = { id: string; name: string; settings: SymbolSettings };

export const SYMBOL_PRESETS: SymbolPreset[] = [
  {
    id: "sample",
    name: "Как в примере: точки + прямые",
    settings: {
      horizontal: "-",
      vertical: "|",
      diagDown: "\\",
      diagUp: "/",
      fallback: ".",
      minStraightness: 0.9,
      minRun: 3,
    },
  },
  {
    id: "direction",
    name: "Символ по направлению везде",
    settings: {
      horizontal: "-",
      vertical: "|",
      diagDown: "\\",
      diagUp: "/",
      fallback: ".",
      minStraightness: 0,
      minRun: 1,
    },
  },
  {
    id: "dots",
    name: "Только точки",
    settings: {
      horizontal: ".",
      vertical: ".",
      diagDown: ".",
      diagUp: ".",
      fallback: ".",
      minStraightness: 0,
      minRun: 1,
    },
  },
];

export function findPresetId(settings: SymbolSettings): string {
  const match = SYMBOL_PRESETS.find((p) =>
    (Object.keys(p.settings) as (keyof SymbolSettings)[]).every(
      (k) => p.settings[k] === settings[k],
    ),
  );
  return match?.id ?? "custom";
}

type Direction = "horizontal" | "vertical" | "diagDown" | "diagUp";

/** Angles use screen coordinates (y down): +45° runs down-right. */
function directionOf(point: SamplePoint, s: SymbolSettings): Direction | null {
  if (!Number.isFinite(point.angleDeg) || point.straightness < s.minStraightness) return null;
  const a = point.angleDeg;
  if (a >= -22.5 && a < 22.5) return "horizontal";
  if (a >= 67.5 || a < -67.5) return "vertical";
  return a > 0 ? "diagDown" : "diagUp";
}

/** Direction of each line glyph in degrees, y down. */
const LINE_GLYPH_ANGLE: Record<string, number> = { "-": 0, "\\": 45, "|": 90, "/": 135 };
const LINE_GLYPH_BY_STEP = ["-", "\\", "|", "/"];

/**
 * Line glyph after mirroring and rotating the art, snapped to the nearest
 * 45°. Other glyphs have no direction and stay as they are.
 */
export function transformGlyph(glyph: string, rotation: number, flipX: boolean, flipY: boolean): string {
  const base = LINE_GLYPH_ANGLE[glyph];
  if (base === undefined) return glyph;
  let angle = flipX !== flipY ? -base : base;
  angle += rotation;
  const step = ((Math.round(angle / 45) % 4) + 4) % 4;
  return LINE_GLYPH_BY_STEP[step];
}

/** Symbol for a single point, ignoring its neighbours. */
export function glyphForPoint(point: SamplePoint, s: SymbolSettings): string {
  const dir = directionOf(point, s);
  return dir ? s[dir] : s.fallback;
}

/**
 * Symbols for points in sampling order. Runs of one direction shorter than
 * `minRun` along a segment fall back to `s.fallback`.
 */
export function glyphsForPoints(points: SamplePoint[], s: SymbolSettings): string[] {
  const dirs = points.map((p) => directionOf(p, s));
  const out = new Array<string>(points.length);
  const minRun = Math.max(1, Math.round(s.minRun));
  let start = 0;
  while (start < points.length) {
    let end = start + 1;
    while (
      end < points.length &&
      points[end].segment === points[start].segment &&
      dirs[end] === dirs[start]
    ) {
      end++;
    }
    const dir = dirs[start];
    const glyph = dir && end - start >= minRun ? s[dir] : s.fallback;
    for (let i = start; i < end; i++) out[i] = glyph;
    start = end;
  }
  return out;
}
