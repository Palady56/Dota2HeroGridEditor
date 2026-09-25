import { useCallback, useEffect, useRef, useState } from "react";
import type React from "react";
import { GRID_SIZE, type GridConfig, type Rect } from "../model/types";
import { drawGrid, type ViewTransform } from "../render/drawGrid";
import { GLYPH_ANCHOR, GLYPH_FONT } from "../render/glyph";
import { usePortraitVersion } from "../render/portraits";
import { hitTest, idsInRect } from "../editor/hitTest";
import {
  addStamp,
  createTray,
  eraseNear,
  moveCategories,
  type Point,
} from "../editor/operations";
import { snapTrayRect, trayCells, traySlots, traySize } from "../render/trayLayout";
import { dragOutline, outlinePoints, shapeStamps, type ShapePoint, type ShapeSettings } from "../editor/shapes";
import type { CommitCategories } from "../editor/useDocumentHistory";
import { IconFit, IconMinus, IconPlus } from "./icons";

export type Tool = "select" | "stamp" | "shape" | "erase" | "tray" | "pan";

type Props = {
  config: GridConfig;
  selected: ReadonlySet<string>;
  onSelect: (ids: Set<string>) => void;
  tool: Tool;
  glyph: string;
  eraseRadius: number;
  paintSpacing: number;
  shape: ShapeSettings;
  trayCols: number;
  /** Ctrl + wheel: +1 grows, -1 shrinks the current tool (eraser radius, brush, shape step or tray columns). */
  onToolSizeStep: (direction: 1 | -1) => void;
  commitCategories: CommitCategories;
};

type Drag =
  | { kind: "pan"; sx: number; sy: number; tx: number; ty: number }
  | { kind: "move"; start: Point; originals: Map<string, Point>; key: string; moved: boolean }
  | { kind: "box"; start: Point; additive: boolean }
  | { kind: "tray"; start: Point }
  | { kind: "shape"; start: Point }
  | { kind: "paint"; last: Point; key: string }
  | { kind: "erase"; key: string };

const MIN_SCALE = 0.2;
const MAX_SCALE = 24;
const CLICK_PX = 4;

function normRect(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
}

export function EditorCanvas(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  const view = useRef<ViewTransform>({ scale: 1, tx: 0, ty: 0 });
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const fitted = useRef(false);
  const overlay = useRef<{ box: Rect | null; tray: Rect | null; shape: ShapePoint[] | null; cursor: Point | null }>({
    box: null,
    tray: null,
    shape: null,
    cursor: null,
  });
  const drag = useRef<Drag | null>(null);
  const spaceDown = useRef(false);
  const frame = useRef(0);
  const [zoom, setZoom] = useState(1);
  const [panning, setPanning] = useState(false);
  const [sizeBadge, setSizeBadge] = useState(false);
  const portraitVersion = usePortraitVersion();
  const badgeTimer = useRef(0);

  useEffect(() => () => window.clearTimeout(badgeTimer.current), []);

  const draw = useCallback(() => {
    frame.current = 0;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const { w, h, dpr } = size.current;
    const p = propsRef.current;
    const v = view.current;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawGrid(ctx, p.config, v, p.selected);

    const o = overlay.current;
    ctx.save();
    ctx.transform(v.scale, 0, 0, v.scale, v.tx, v.ty);
    ctx.lineWidth = 1 / v.scale;
    if (o.box) {
      ctx.setLineDash([4 / v.scale, 3 / v.scale]);
      ctx.strokeStyle = "#ffc857";
      ctx.strokeRect(o.box.x, o.box.y, o.box.width, o.box.height);
      ctx.setLineDash([]);
    }
    if (o.tray) {
      ctx.strokeStyle = "#7fd18b";
      ctx.strokeRect(o.tray.x, o.tray.y, o.tray.width, o.tray.height);
      const slots = traySlots({ ...o.tray, name: "", heroIds: [] });
      ctx.fillStyle = "rgba(127, 209, 139, 0.08)";
      ctx.strokeStyle = "rgba(127, 209, 139, 0.35)";
      for (const cell of trayCells({ id: "", name: "", heroIds: [], origin: "manual", ...o.tray })) {
        ctx.fillRect(cell.x, cell.y, cell.width, cell.height);
        ctx.strokeRect(cell.x, cell.y, cell.width, cell.height);
      }
      ctx.fillStyle = "#7fd18b";
      ctx.font = `${12 / v.scale}px Inter, sans-serif`;
      ctx.textBaseline = "bottom";
      ctx.fillText(`${slots.cols}×${slots.rows}`, o.tray.x, o.tray.y - 4 / v.scale);
    }
    if (o.shape) {
      ctx.globalAlpha = 0.75;
      ctx.font = GLYPH_FONT;
      ctx.textBaseline = "top";
      ctx.fillStyle = "#ffc857";
      for (const s of o.shape) ctx.fillText(s.glyph, s.x - GLYPH_ANCHOR.dx, s.y - GLYPH_ANCHOR.dy);
      ctx.globalAlpha = 1;
    }
    if (o.cursor && p.tool === "erase") {
      ctx.strokeStyle = "rgba(255, 120, 90, 0.9)";
      ctx.beginPath();
      ctx.arc(o.cursor.x, o.cursor.y, p.eraseRadius, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (o.cursor && p.tool === "stamp" && p.glyph) {
      ctx.strokeStyle = "rgba(255, 200, 87, 0.35)";
      ctx.beginPath();
      ctx.arc(o.cursor.x, o.cursor.y, p.paintSpacing, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.55;
      ctx.font = GLYPH_FONT;
      ctx.textBaseline = "top";
      ctx.fillStyle = "#ffc857";
      ctx.fillText(p.glyph, o.cursor.x - GLYPH_ANCHOR.dx, o.cursor.y - GLYPH_ANCHOR.dy);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }, []);

  const schedule = useCallback(() => {
    if (!frame.current) frame.current = requestAnimationFrame(draw);
  }, [draw]);

  useEffect(
    () => () => {
      cancelAnimationFrame(frame.current);
      frame.current = 0;
    },
    [],
  );

  useEffect(() => {
    schedule();
  }, [props.config, props.selected, props.tool, props.glyph, props.eraseRadius, props.paintSpacing, props.shape, props.trayCols, portraitVersion, schedule]);

  const applyView = useCallback(
    (next: ViewTransform) => {
      view.current = next;
      setZoom(next.scale);
      schedule();
    },
    [schedule],
  );

  const fit = useCallback(() => {
    const { w, h } = size.current;
    const scale = Math.min(w / GRID_SIZE.width, h / GRID_SIZE.height) * 0.95;
    applyView({
      scale,
      tx: (w - GRID_SIZE.width * scale) / 2,
      ty: (h - GRID_SIZE.height * scale) / 2,
    });
  }, [applyView]);

  const zoomAt = useCallback(
    (sx: number, sy: number, factor: number) => {
      const v = view.current;
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.scale * factor));
      const gx = (sx - v.tx) / v.scale;
      const gy = (sy - v.ty) / v.scale;
      applyView({ scale, tx: sx - gx * scale, ty: sy - gy * scale });
    },
    [applyView],
  );

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const observer = new ResizeObserver(() => {
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      size.current = { w, h, dpr };
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      if (!fitted.current && w > 0 && h > 0) {
        fitted.current = true;
        fit();
      } else {
        schedule();
      }
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [fit, schedule]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        propsRef.current.onToolSizeStep(e.deltaY < 0 ? 1 : -1);
        setSizeBadge(true);
        window.clearTimeout(badgeTimer.current);
        badgeTimer.current = window.setTimeout(() => setSizeBadge(false), 900);
        return;
      }
      const r = canvas.getBoundingClientRect();
      zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || isTyping(e.target)) return;
      e.preventDefault();
      if (!spaceDown.current) {
        spaceDown.current = true;
        setPanning(true);
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      spaceDown.current = false;
      setPanning(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const toGrid = (e: { clientX: number; clientY: number }): Point => {
    const r = canvasRef.current!.getBoundingClientRect();
    const v = view.current;
    return { x: (e.clientX - r.left - v.tx) / v.scale, y: (e.clientY - r.top - v.ty) / v.scale };
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = propsRef.current;
    const g = toGrid(e);
    e.currentTarget.setPointerCapture(e.pointerId);

    if (e.button === 1 || e.button === 2 || p.tool === "pan" || spaceDown.current) {
      const v = view.current;
      drag.current = { kind: "pan", sx: e.clientX, sy: e.clientY, tx: v.tx, ty: v.ty };
      return;
    }
    if (e.button !== 0) return;
    const key = `${p.tool}-${e.timeStamp}`;

    switch (p.tool) {
      case "select": {
        const cats = p.config.categories;
        const hit = hitTest(cats, g.x, g.y);
        if (!hit) {
          if (!e.shiftKey) p.onSelect(new Set());
          drag.current = { kind: "box", start: g, additive: e.shiftKey };
          break;
        }
        let sel = new Set(p.selected);
        if (e.shiftKey) {
          if (sel.has(hit)) sel.delete(hit);
          else sel.add(hit);
          p.onSelect(sel);
          break;
        }
        if (!sel.has(hit)) {
          sel = new Set([hit]);
          p.onSelect(sel);
        }
        const originals = new Map<string, Point>();
        for (const c of cats) if (sel.has(c.id)) originals.set(c.id, { x: c.x, y: c.y });
        drag.current = { kind: "move", start: g, originals, key, moved: false };
        break;
      }
      case "stamp":
        p.commitCategories((cats) => addStamp(cats, p.glyph, g.x, g.y), key);
        drag.current = { kind: "paint", last: g, key };
        break;
      case "erase":
        p.commitCategories((cats) => eraseNear(cats, g.x, g.y, p.eraseRadius), key);
        drag.current = { kind: "erase", key };
        break;
      case "tray":
        drag.current = { kind: "tray", start: g };
        break;
      case "shape":
        drag.current = { kind: "shape", start: g };
        overlay.current.shape = shapePreview(g, g, e);
        break;
    }
  };

  const snapTrayFromDrag = (a: Point, b: Point, defaultCols: number): Rect => {
    const raw = normRect(a, b);
    if (Math.hypot(raw.width, raw.height) * view.current.scale < CLICK_PX) {
      const size = traySize(defaultCols, 2);
      return { x: a.x, y: a.y, ...size };
    }
    return snapTrayRect(raw);
  };

  const shapePreview = (a: Point, b: Point, e: { shiftKey: boolean; altKey: boolean }): ShapePoint[] => {
    const p = propsRef.current;
    const outline = dragOutline(p.shape.kind, a, b, { square: e.shiftKey, fromCenter: e.altKey });
    return outlinePoints(outline, p.shape, p.glyph);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const p = propsRef.current;
    const g = toGrid(e);
    overlay.current.cursor = g;
    const d = drag.current;
    if (d) {
      switch (d.kind) {
        case "pan": {
          const v = view.current;
          applyView({ scale: v.scale, tx: d.tx + e.clientX - d.sx, ty: d.ty + e.clientY - d.sy });
          break;
        }
        case "move": {
          const dx = g.x - d.start.x;
          const dy = g.y - d.start.y;
          if (!d.moved && Math.hypot(dx, dy) * view.current.scale < 3) break;
          d.moved = true;
          p.commitCategories((cats) => moveCategories(cats, d.originals, dx, dy), d.key);
          break;
        }
        case "box":
          overlay.current.box = normRect(d.start, g);
          break;
        case "tray":
          overlay.current.tray = snapTrayFromDrag(d.start, g, p.trayCols);
          break;
        case "shape":
          overlay.current.shape = shapePreview(d.start, g, e);
          break;
        case "paint":
          if (Math.hypot(g.x - d.last.x, g.y - d.last.y) >= p.paintSpacing) {
            p.commitCategories((cats) => addStamp(cats, p.glyph, g.x, g.y), d.key);
            d.last = g;
          }
          break;
        case "erase":
          p.commitCategories((cats) => eraseNear(cats, g.x, g.y, p.eraseRadius), d.key);
          break;
      }
    }
    schedule();
  };

  const onPointerUp = () => {
    const p = propsRef.current;
    const d = drag.current;
    const o = overlay.current;
    if (d?.kind === "box" && o.box) {
      const ids = idsInRect(p.config.categories, o.box);
      if (d.additive) for (const id of p.selected) ids.add(id);
      p.onSelect(ids);
    }
    if (d?.kind === "tray") {
      const raw = o.tray ?? snapTrayFromDrag(d.start, d.start, p.trayCols);
      const tray = createTray(raw);
      p.commitCategories((cats) => [...cats, tray]);
      p.onSelect(new Set([tray.id]));
    }
    if (d?.kind === "shape" && o.shape) {
      const stamps = shapeStamps(o.shape);
      if (stamps.length) {
        p.commitCategories((cats) => [...cats, ...stamps]);
        p.onSelect(new Set(stamps.map((s) => s.id)));
      }
    }
    o.box = null;
    o.tray = null;
    o.shape = null;
    drag.current = null;
    schedule();
  };

  const cursor =
    panning || props.tool === "pan"
      ? "grab"
      : props.tool === "erase"
        ? "none"
        : props.tool === "select"
          ? "default"
          : "crosshair";

  return (
    <div className="editor-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ cursor }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => {
          overlay.current.cursor = null;
          schedule();
        }}
        onContextMenu={(e) => e.preventDefault()}
      />
      {sizeBadge && (
        <div className="size-badge">
          {props.tool === "stamp"
            ? `Шаг кисти: ${props.paintSpacing} px`
            : props.tool === "shape"
              ? `Шаг фигуры: ${props.shape.step} px`
              : props.tool === "tray"
                ? `Ширина блока: ${props.trayCols} ${props.trayCols === 1 ? "герой" : props.trayCols < 5 ? "героя" : "героев"}`
                : `Радиус ластика: ${props.eraseRadius} px`}
        </div>
      )}
      <div className="zoom-controls">
        <button type="button" className="btn icon ghost" title="Отдалить" onClick={() => zoomAt(size.current.w / 2, size.current.h / 2, 1 / 1.25)}>
          <IconMinus />
        </button>
        <span className="zoom-value">{Math.round(zoom * 100)}%</span>
        <button type="button" className="btn icon ghost" title="Приблизить" onClick={() => zoomAt(size.current.w / 2, size.current.h / 2, 1.25)}>
          <IconPlus />
        </button>
        <button type="button" className="btn ghost" title="Показать всю сетку" onClick={fit}>
          <IconFit />
          <span>Вписать</span>
        </button>
      </div>
    </div>
  );
}
