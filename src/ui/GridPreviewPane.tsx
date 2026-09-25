import { useEffect, useRef } from "react";
import { GRID_SIZE, type GridConfig } from "../model/types";
import { drawGrid, IDENTITY_VIEW } from "../render/drawGrid";
import { usePortraitVersion } from "../render/portraits";

const NO_SELECTION: ReadonlySet<string> = new Set();

export function GridPreviewPane({ config }: { config: GridConfig }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const portraitVersion = usePortraitVersion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const frame = requestAnimationFrame(() => drawGrid(ctx, config, IDENTITY_VIEW, NO_SELECTION));
    return () => cancelAnimationFrame(frame);
  }, [config, portraitVersion]);

  return (
    <canvas
      ref={canvasRef}
      className="pane-canvas"
      width={GRID_SIZE.width}
      height={GRID_SIZE.height}
    />
  );
}
