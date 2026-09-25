import { useCallback, useEffect, useRef } from "react";
import type React from "react";
import { GRID_SIZE, type GridConfig } from "../model/types";
import { drawGrid, type ViewTransform } from "../render/drawGrid";
import { usePortraitVersion } from "../render/portraits";
import { layerAt, layerFrame, scaleLayer, type Layer } from "../compose/layers";
import { frameCorners, frameHandle, normalizeDeg, rotationToward, snapDeg, type Vec } from "../model/geometry";

type Props = {
  layers: Layer[];
  preview: GridConfig;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLayerChange: (layer: Layer) => void;
};

type Drag =
  | { kind: "move"; id: string; sx: number; sy: number; x: number; y: number }
  | { kind: "rotate"; id: string };

const NO_SELECTION: ReadonlySet<string> = new Set();
const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
/** Screen pixels. */
const HANDLE_RADIUS = 8;
const HANDLE_INSET = 22;

export function ComposeCanvas(props: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const view = useRef<ViewTransform>({ scale: 1, tx: 0, ty: 0 });
  const size = useRef({ w: 0, h: 0, dpr: 1 });
  const drag = useRef<Drag | null>(null);
  const frame = useRef(0);

  const selectedLayer = () => {
    const p = propsRef.current;
    const layer = p.layers.find((l) => l.id === p.selectedId);
    return layer?.visible ? layer : null;
  };

  const handleOf = (layer: Layer): Vec | null => {
    const f = layerFrame(layer);
    return f ? frameHandle(f, HANDLE_INSET / view.current.scale) : null;
  };

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
    drawGrid(ctx, p.preview, v, NO_SELECTION);

    const layer = selectedLayer();
    const f = layer ? layerFrame(layer) : null;
    if (layer && f) {
      ctx.save();
      ctx.transform(v.scale, 0, 0, v.scale, v.tx, v.ty);
      ctx.lineWidth = 1.5 / v.scale;
      ctx.setLineDash([6 / v.scale, 4 / v.scale]);
      ctx.strokeStyle = "#ffc857";
      ctx.beginPath();
      frameCorners(f).forEach((c, i) => (i ? ctx.lineTo(c.x, c.y) : ctx.moveTo(c.x, c.y)));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      const hp = handleOf(layer)!;
      ctx.beginPath();
      ctx.arc(hp.x, hp.y, HANDLE_RADIUS / v.scale, 0, Math.PI * 2);
      ctx.fillStyle = "#ffc857";
      ctx.fill();
      ctx.fillStyle = "#1a1411";
      ctx.font = `${12 / v.scale}px 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⟳", hp.x, hp.y + 1 / v.scale);
      ctx.restore();
    }
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

  const portraitVersion = usePortraitVersion();
  useEffect(() => {
    schedule();
  }, [props.preview, props.layers, props.selectedId, portraitVersion, schedule]);

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
      const scale = Math.min(w / GRID_SIZE.width, h / GRID_SIZE.height) * 0.96;
      view.current = {
        scale,
        tx: (w - GRID_SIZE.width * scale) / 2,
        ty: (h - GRID_SIZE.height * scale) / 2,
      };
      schedule();
    });
    observer.observe(wrap);
    return () => observer.disconnect();
  }, [schedule]);

  const toGrid = (e: { clientX: number; clientY: number }): Vec => {
    const r = canvasRef.current!.getBoundingClientRect();
    const v = view.current;
    return { x: (e.clientX - r.left - v.tx) / v.scale, y: (e.clientY - r.top - v.ty) / v.scale };
  };

  const onHandle = (g: Vec): Layer | null => {
    const layer = selectedLayer();
    const hp = layer ? handleOf(layer) : null;
    if (!layer || !hp) return null;
    return Math.hypot(g.x - hp.x, g.y - hp.y) <= (HANDLE_RADIUS + 4) / view.current.scale ? layer : null;
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      const p = propsRef.current;
      const layer = p.layers.find((l) => l.id === p.selectedId);
      if (!layer) return;
      e.preventDefault();
      if (e.shiftKey) {
        const delta = (e.deltaY || e.deltaX) > 0 ? 1 : -1;
        p.onLayerChange({ ...layer, rotation: normalizeDeg(layer.rotation + delta * (e.altKey ? 0.5 : 2)) });
        return;
      }
      const factor = Math.exp(-e.deltaY * 0.0015);
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, layer.scale * factor));
      p.onLayerChange(scaleLayer(layer, Math.round(scale * 100) / 100));
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const p = propsRef.current;
    const g = toGrid(e);
    const rotating = onHandle(g);
    if (rotating) {
      e.currentTarget.setPointerCapture(e.pointerId);
      drag.current = { kind: "rotate", id: rotating.id };
      return;
    }
    const id = layerAt(p.layers, g.x, g.y);
    p.onSelect(id);
    const layer = p.layers.find((l) => l.id === id);
    if (!layer) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { kind: "move", id: layer.id, sx: g.x, sy: g.y, x: layer.x, y: layer.y };
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    const g = toGrid(e);
    if (!d) {
      e.currentTarget.style.cursor = onHandle(g) ? "alias" : "move";
      return;
    }
    const p = propsRef.current;
    const layer = p.layers.find((l) => l.id === d.id);
    if (!layer) return;
    if (d.kind === "rotate") {
      const f = layerFrame(layer);
      if (!f) return;
      const deg = rotationToward(f, g);
      p.onLayerChange({ ...layer, rotation: e.shiftKey ? snapDeg(deg, 15) : Math.round(deg * 2) / 2 });
      return;
    }
    p.onLayerChange({
      ...layer,
      x: Math.round(d.x + g.x - d.sx),
      y: Math.round(d.y + g.y - d.sy),
    });
  };

  const onPointerUp = () => {
    drag.current = null;
  };

  return (
    <div className="editor-wrap" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        style={{ cursor: "move" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
    </div>
  );
}
