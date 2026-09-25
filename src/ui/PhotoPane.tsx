import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { GRID_SIZE, type Placement } from "../model/types";
import { drawPlaced, placementFrame, placementRect } from "../image/placement";
import type { ImageSource } from "../image/source";
import { frameCorners, frameHandle, normalizeDeg, rotationToward, snapDeg, type Vec } from "../model/geometry";

type Props = {
  source: ImageSource | null;
  placement: Placement;
  onPlacementChange: (placement: Placement) => void;
  mask: Uint8Array | null;
  showMask: boolean;
};

const MIN_SCALE = 0.05;
const MAX_SCALE = 6;
/** Handle size and inset in screen pixels; converted to grid pixels per frame. */
const HANDLE_RADIUS_PX = 8;
const HANDLE_INSET_PX = 26;

type Drag =
  | { kind: "move"; sx: number; sy: number; ox: number; oy: number }
  | { kind: "rotate" };

function maskToCanvas(mask: Uint8Array): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = GRID_SIZE.width;
  canvas.height = GRID_SIZE.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  const img = ctx.createImageData(GRID_SIZE.width, GRID_SIZE.height);
  for (let i = 0; i < mask.length; i++) {
    if (!mask[i]) continue;
    img.data[i * 4] = 255;
    img.data[i * 4 + 1] = 70;
    img.data[i * 4 + 2] = 50;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return canvas;
}

export function PhotoPane({ source, placement, onPlacementChange, mask, showMask }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drag = useRef<Drag | null>(null);
  const latest = useRef({ placement, onPlacementChange });
  latest.current = { placement, onPlacementChange };
  const [cursor, setCursor] = useState("grab");
  /** Grid pixels per screen pixel; the canvas is shown scaled down. */
  const [pxScale, setPxScale] = useState(1);

  const maskCanvas = useMemo(() => (mask && showMask ? maskToCanvas(mask) : null), [mask, showMask]);

  const frame = source ? placementFrame(placementRect(source.width, source.height, GRID_SIZE, placement), placement) : null;
  const handle = frame ? frameHandle(frame, HANDLE_INSET_PX * pxScale) : null;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const update = () => {
      const w = canvas.getBoundingClientRect().width;
      if (w > 0) setPxScale(GRID_SIZE.width / w);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.fillStyle = "#0e1115";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (source && frame && handle) {
      const r = placementRect(source.width, source.height, GRID_SIZE, placement);
      ctx.globalAlpha = maskCanvas ? 0.45 : 1;
      drawPlaced(ctx, source.bitmap, r, placement);
      ctx.globalAlpha = 1;
      if (maskCanvas) ctx.drawImage(maskCanvas, 0, 0);

      const corners = frameCorners(frame);
      ctx.strokeStyle = "rgba(255, 200, 87, 0.7)";
      ctx.lineWidth = pxScale;
      ctx.setLineDash([6 * pxScale, 4 * pxScale]);
      ctx.beginPath();
      corners.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.arc(handle.x, handle.y, HANDLE_RADIUS_PX * pxScale, 0, Math.PI * 2);
      ctx.fillStyle = "#ffc857";
      ctx.fill();
      ctx.strokeStyle = "#1a1411";
      ctx.stroke();
      ctx.fillStyle = "#1a1411";
      ctx.font = `${Math.round(12 * pxScale)}px 'Segoe UI', sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("⟳", handle.x, handle.y + pxScale);
      ctx.textAlign = "left";
      ctx.textBaseline = "alphabetic";
    } else {
      ctx.fillStyle = "#6b7480";
      ctx.font = "20px 'Segoe UI', sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Загрузите изображение слева", canvas.width / 2, canvas.height / 2);
      ctx.textAlign = "left";
    }
  }, [source, placement, maskCanvas, pxScale]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      if (!source) return;
      e.preventDefault();
      const { placement: p, onPlacementChange: set } = latest.current;
      if (e.shiftKey) {
        const delta = (e.deltaY || e.deltaX) > 0 ? 1 : -1;
        set({ ...p, rotation: normalizeDeg(p.rotation + delta * (e.altKey ? 0.5 : 2)) });
        return;
      }
      const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, p.scale * Math.exp(-e.deltaY * 0.001)));
      set({ ...p, scale });
    };
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [source]);

  const toGrid = (e: React.PointerEvent<HTMLCanvasElement>): Vec => {
    const r = e.currentTarget.getBoundingClientRect();
    const k = GRID_SIZE.width / r.width;
    return { x: (e.clientX - r.left) * k, y: (e.clientY - r.top) * k };
  };

  const nearHandle = (p: Vec) =>
    !!handle && Math.hypot(p.x - handle.x, p.y - handle.y) <= (HANDLE_RADIUS_PX + 4) * pxScale;

  return (
    <canvas
      ref={canvasRef}
      className="pane-canvas"
      width={GRID_SIZE.width}
      height={GRID_SIZE.height}
      style={{ cursor: source ? cursor : "default" }}
      onPointerDown={(e) => {
        if (!source) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        if (nearHandle(toGrid(e))) {
          drag.current = { kind: "rotate" };
          setCursor("crosshair");
          return;
        }
        drag.current = { kind: "move", sx: e.clientX, sy: e.clientY, ox: placement.offsetX, oy: placement.offsetY };
        setCursor("grabbing");
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) {
          if (source) setCursor(nearHandle(toGrid(e)) ? "alias" : "grab");
          return;
        }
        if (d.kind === "rotate") {
          if (!frame) return;
          const deg = rotationToward(frame, toGrid(e));
          onPlacementChange({ ...placement, rotation: e.shiftKey ? snapDeg(deg, 15) : Math.round(deg * 2) / 2 });
          return;
        }
        const k = GRID_SIZE.width / e.currentTarget.getBoundingClientRect().width;
        onPlacementChange({
          ...placement,
          offsetX: Math.round(d.ox + (e.clientX - d.sx) * k),
          offsetY: Math.round(d.oy + (e.clientY - d.sy) * k),
        });
      }}
      onPointerUp={() => {
        drag.current = null;
        setCursor("grab");
      }}
      onPointerCancel={() => {
        drag.current = null;
        setCursor("grab");
      }}
    />
  );
}
