import { inferCategoryKind, type Category, type Rect } from "../model/types";
import { stampAt } from "../layout/stamps";
import { GLYPH_ANCHOR } from "../render/glyph";
import type { Point } from "./operations";

export type ShapeKind = "line" | "rect" | "diamond" | "triangle" | "ellipse";

export type ShapeSettings = {
  kind: ShapeKind;
  /** Distance between neighbouring symbols along the outline, grid px. */
  step: number;
  /** Pick `- | / \` by the direction of each edge instead of the brush symbol. */
  autoGlyph: boolean;
  /** Symbol for corners and line ends; empty keeps the edge symbol. */
  corner: string;
};

export const DEFAULT_SHAPE_SETTINGS: ShapeSettings = { kind: "rect", step: 7, autoGlyph: true, corner: "" };

export type ShapeModifiers = { square: boolean; fromCenter: boolean };

export type Outline = { vertices: Point[]; closed: boolean; smooth: boolean };

export type ShapePoint = { x: number; y: number; glyph: string };

const ELLIPSE_VERTICES = 96;

function snapLine(a: Point, b: Point): Point {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  const angle = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  return { x: a.x + Math.cos(angle) * len, y: a.y + Math.sin(angle) * len };
}

/** Box spanned by a drag from `a` to `b`, honouring Shift (square) and Alt (from centre). */
export function dragBox(a: Point, b: Point, mods: ShapeModifiers): Rect {
  let dx = b.x - a.x;
  let dy = b.y - a.y;
  if (mods.square) {
    const side = Math.max(Math.abs(dx), Math.abs(dy));
    dx = Math.sign(dx || 1) * side;
    dy = Math.sign(dy || 1) * side;
  }
  const x0 = mods.fromCenter ? a.x - dx : a.x;
  const y0 = mods.fromCenter ? a.y - dy : a.y;
  const x1 = a.x + dx;
  const y1 = a.y + dy;
  return { x: Math.min(x0, x1), y: Math.min(y0, y1), width: Math.abs(x1 - x0), height: Math.abs(y1 - y0) };
}

export function boxOutline(kind: Exclude<ShapeKind, "line">, r: Rect): Outline {
  const { x, y, width: w, height: h } = r;
  const cx = x + w / 2;
  const cy = y + h / 2;
  switch (kind) {
    case "rect":
      return {
        vertices: [
          { x, y },
          { x: x + w, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
        ],
        closed: true,
        smooth: false,
      };
    case "diamond":
      return {
        vertices: [
          { x: cx, y },
          { x: x + w, y: cy },
          { x: cx, y: y + h },
          { x, y: cy },
        ],
        closed: true,
        smooth: false,
      };
    case "triangle":
      return {
        vertices: [
          { x: cx, y },
          { x: x + w, y: y + h },
          { x, y: y + h },
        ],
        closed: true,
        smooth: false,
      };
    case "ellipse": {
      const vertices: Point[] = [];
      for (let i = 0; i < ELLIPSE_VERTICES; i++) {
        const t = (i / ELLIPSE_VERTICES) * Math.PI * 2 - Math.PI / 2;
        vertices.push({ x: cx + (Math.cos(t) * w) / 2, y: cy + (Math.sin(t) * h) / 2 });
      }
      return { vertices, closed: true, smooth: true };
    }
  }
}

/** Outline for a drag from `a` to `b` with the given shape. */
export function dragOutline(kind: ShapeKind, a: Point, b: Point, mods: ShapeModifiers): Outline {
  if (kind === "line") {
    const end = mods.square ? snapLine(a, b) : b;
    const start = mods.fromCenter ? { x: 2 * a.x - end.x, y: 2 * a.y - end.y } : a;
    return { vertices: [start, end], closed: false, smooth: false };
  }
  return boxOutline(kind, dragBox(a, b, mods));
}

/** Line symbol for a direction in degrees (y down); the sign of the direction does not matter. */
export function lineGlyph(angleDeg: number): string {
  let a = ((angleDeg % 180) + 180) % 180;
  if (a > 90) a -= 180;
  if (Math.abs(a) < 22.5) return "-";
  if (Math.abs(a) > 67.5) return "|";
  return a > 0 ? "\\" : "/";
}

type Sample = Point & { angle: number; corner: boolean };

function edgeAngle(p: Point, q: Point): number {
  return (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
}

/** Evenly spaced points along each edge; every vertex gets a point. */
function sampleEdges(o: Outline, step: number): Sample[] {
  const v = o.vertices;
  const edges = o.closed ? v.length : v.length - 1;
  const out: Sample[] = [];
  for (let i = 0; i < edges; i++) {
    const p = v[i];
    const q = v[(i + 1) % v.length];
    const len = Math.hypot(q.x - p.x, q.y - p.y);
    const n = Math.max(1, Math.round(len / step));
    const angle = edgeAngle(p, q);
    for (let j = 0; j < n; j++) {
      const t = j / n;
      out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, angle, corner: j === 0 });
    }
  }
  if (!o.closed) {
    const last = v[v.length - 1];
    const prev = v[v.length - 2] ?? last;
    out.push({ ...last, angle: edgeAngle(prev, last), corner: true });
  }
  return out;
}

/** Evenly spaced points along the whole perimeter of a closed smooth outline. */
function samplePerimeter(o: Outline, step: number): Sample[] {
  const v = o.vertices;
  const lengths = v.map((p, i) => {
    const q = v[(i + 1) % v.length];
    return Math.hypot(q.x - p.x, q.y - p.y);
  });
  const total = lengths.reduce((s, l) => s + l, 0);
  if (total < 1e-6) return [{ ...v[0], angle: 0, corner: false }];
  const n = Math.max(3, Math.round(total / step));
  const out: Sample[] = [];
  let edge = 0;
  let edgeStart = 0;
  for (let j = 0; j < n; j++) {
    const s = (j / n) * total;
    while (edge < v.length - 1 && edgeStart + lengths[edge] < s) {
      edgeStart += lengths[edge];
      edge++;
    }
    const p = v[edge];
    const q = v[(edge + 1) % v.length];
    const t = lengths[edge] > 0 ? (s - edgeStart) / lengths[edge] : 0;
    out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t, angle: edgeAngle(p, q), corner: false });
  }
  return out;
}

/** Symbol positions (glyph centres) along the outline. */
export function outlinePoints(o: Outline, settings: ShapeSettings, glyph: string): ShapePoint[] {
  const step = Math.max(1, settings.step);
  const first = o.vertices[0];
  const degenerate = o.vertices.every((p) => Math.hypot(p.x - first.x, p.y - first.y) < 0.5);
  if (degenerate) return glyph ? [{ x: first.x, y: first.y, glyph: settings.corner || glyph }] : [];
  const samples = o.smooth ? samplePerimeter(o, step) : sampleEdges(o, step);
  const out: ShapePoint[] = [];
  for (const s of samples) {
    const g = s.corner && settings.corner ? settings.corner : settings.autoGlyph ? lineGlyph(s.angle) : glyph;
    if (g) out.push({ x: s.x, y: s.y, glyph: g });
  }
  return out;
}

export function shapeStamps(points: ShapePoint[]): Category[] {
  const out: Category[] = [];
  for (const p of points) {
    const stamp = stampAt(p.glyph, p.x, p.y, "manual");
    if (stamp) out.push(stamp);
  }
  return out;
}

/** Bounds of the chosen categories: whole hero blocks, and symbol centres for glyphs. */
export function selectionBounds(cats: Category[], ids: ReadonlySet<string>): Rect | null {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const c of cats) {
    if (!ids.has(c.id)) continue;
    if (inferCategoryKind(c) === "tray") {
      x0 = Math.min(x0, c.x);
      y0 = Math.min(y0, c.y);
      x1 = Math.max(x1, c.x + c.width);
      y1 = Math.max(y1, c.y + c.height);
    } else {
      const cx = c.x + GLYPH_ANCHOR.dx;
      const cy = c.y + GLYPH_ANCHOR.dy;
      x0 = Math.min(x0, cx);
      y0 = Math.min(y0, cy);
      x1 = Math.max(x1, cx);
      y1 = Math.max(y1, cy);
    }
  }
  if (!Number.isFinite(x0)) return null;
  return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
}

/** Outline around `bounds` with `padding` grid px of space on each side. */
export function frameOutline(kind: ShapeKind, bounds: Rect, padding: number): Outline {
  const r = {
    x: bounds.x - padding,
    y: bounds.y - padding,
    width: bounds.width + padding * 2,
    height: bounds.height + padding * 2,
  };
  if (kind === "line" || kind === "rect") return boxOutline("rect", r);
  // Smallest diamond / ellipse / triangle (base on the box bottom) that still contains the box corners.
  const grow = kind === "ellipse" ? Math.SQRT2 : 2;
  const w = r.width * grow;
  const h = r.height * grow;
  const cx = r.x + r.width / 2;
  const cy = kind === "triangle" ? r.y + r.height - h / 2 : r.y + r.height / 2;
  return boxOutline(kind, { x: cx - w / 2, y: cy - h / 2, width: w, height: h });
}
