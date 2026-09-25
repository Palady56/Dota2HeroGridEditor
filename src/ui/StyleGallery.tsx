import { useEffect, useRef, useState } from "react";
import { GRID_SIZE, type Category, type ConversionSettings, type Placement, type SymbolSettings } from "../model/types";
import { createConversionClient, type ConversionClient } from "../image/conversionClient";
import { placementRect } from "../image/placement";
import { rasterizeSource, type ImageSource } from "../image/source";
import type { RgbaImage } from "../image/raster";
import { stampsFromConversion } from "../layout/stamps";
import { drawGrid, IDENTITY_VIEW } from "../render/drawGrid";
import { usePortraitVersion } from "../render/portraits";
import { activeStyleId, applyStyle, ART_STYLES, type ArtStyle } from "../symbols/artStyles";

const PREVIEW_DELAY_MS = 450;
const THUMB_WIDTH = 208;
const THUMB_HEIGHT = Math.round((THUMB_WIDTH * GRID_SIZE.height) / GRID_SIZE.width);
const NO_SELECTION: ReadonlySet<string> = new Set();

type Previews = Record<string, Category[]>;

/**
 * Converts the photo once per style on a separate worker, one style after
 * another, so the main preview keeps its own worker to itself.
 */
function useStylePreviews(source: ImageSource | null, placement: Placement, settings: ConversionSettings): Previews {
  const [previews, setPreviews] = useState<Previews>({});
  const client = useRef<ConversionClient | null>(null);
  const batch = useRef({ id: 0, image: null as RgbaImage | null, rect: null as ReturnType<typeof placementRect> | null });
  const raster = useRef<HTMLCanvasElement | null>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const next = useRef<(index: number) => void>(() => {});
  next.current = (index: number) => {
    const b = batch.current;
    const style = ART_STYLES[index];
    if (!style || !b.image || !b.rect || !client.current) return;
    client.current.request({
      image: { ...b.image, data: b.image.data.slice() },
      rect: b.rect,
      rotation: placement.rotation,
      settings: applyStyle(style, settings).settings,
      id: b.id * 1000 + index,
    });
  };

  useEffect(() => {
    const c = createConversionClient((out, id) => {
      if (id === undefined) return;
      const b = batch.current;
      const batchId = Math.floor(id / 1000);
      const index = id % 1000;
      if (batchId !== b.id) return;
      const style = ART_STYLES[index];
      const { settings: s, symbols } = applyStyle(style, settingsRef.current);
      setPreviews((p) => ({ ...p, [style.id]: stampsFromConversion(out, s, symbols) }));
      next.current(index + 1);
    });
    client.current = c;
    return () => {
      c.dispose();
      client.current = null;
    };
  }, []);

  // Only the photo-specific tuning changes how every style looks.
  const toneKey = [
    settings.brightness,
    settings.contrast,
    settings.invert,
    settings.blur,
    settings.edgeThreshold,
    settings.darkThreshold,
    settings.minLineLength,
  ].join("|");

  useEffect(() => {
    batch.current = { id: batch.current.id + 1, image: null, rect: null };
    if (!source) {
      setPreviews({});
      return;
    }
    const timer = window.setTimeout(() => {
      raster.current ??= document.createElement("canvas");
      const rect = placementRect(source.width, source.height, GRID_SIZE, placement);
      batch.current.image = rasterizeSource(source, rect, placement, raster.current);
      batch.current.rect = rect;
      next.current(0);
    }, PREVIEW_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [source, placement, toneKey]);

  return previews;
}

let fullCanvas: HTMLCanvasElement | null = null;

function StyleThumb({ categories }: { categories: Category[] | undefined }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const portraitVersion = usePortraitVersion();

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || !categories) return;
    fullCanvas ??= document.createElement("canvas");
    fullCanvas.width = GRID_SIZE.width;
    fullCanvas.height = GRID_SIZE.height;
    const full = fullCanvas.getContext("2d")!;
    drawGrid(full, { id: "preview", name: "", categories }, IDENTITY_VIEW, NO_SELECTION);
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(THUMB_WIDTH * dpr);
    canvas.height = Math.round(THUMB_HEIGHT * dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Thin symbols fade when shrunk ~6×; brighten so the thumbnail reads like the full preview.
    ctx.filter = "brightness(1.9) contrast(1.15)";
    ctx.drawImage(fullCanvas, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
  }, [categories, portraitVersion]);

  return (
    <div className={`style-thumb ${categories ? "" : "loading"}`}>
      {categories && <canvas ref={ref} style={{ width: "100%", height: "100%" }} />}
    </div>
  );
}

type Props = {
  source: ImageSource | null;
  placement: Placement;
  settings: ConversionSettings;
  symbols: SymbolSettings;
  onApply: (style: ArtStyle) => void;
};

export function StyleGallery({ source, placement, settings, symbols, onApply }: Props) {
  const previews = useStylePreviews(source, placement, settings);
  const activeId = activeStyleId(settings, symbols);
  const active = ART_STYLES.find((s) => s.id === activeId);

  return (
    <section className="pane style-pane">
      <header>
        Стиль
        <span className="style-current">
          {active ? active.name : "Свои настройки"}
        </span>
      </header>
      <div className="style-strip">
        {ART_STYLES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`style-card ${s.id === activeId ? "active" : ""}`}
            title={s.description}
            onClick={() => onApply(s)}
          >
            {source ? <StyleThumb categories={previews[s.id]} /> : <div className="style-thumb empty">{s.name[0]}</div>}
            <span className="style-name">{s.name}</span>
          </button>
        ))}
      </div>
      <p className="style-description">
        {active
          ? active.description
          : "Настройки изменены вручную. Нажмите на любой стиль, чтобы вернуться к готовому варианту."}
        {!source && " Загрузите фото — на карточках появятся превью именно вашей картинки."}
      </p>
    </section>
  );
}
