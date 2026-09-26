import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GridParseError, parseDotaGridJson } from "./dota-json/parse";
import { serializeDotaGrid, toDotaFile } from "./dota-json/serialize";
import { validateDotaGridFile, type ValidationIssue } from "./dota-json/validate";
import {
  activeConfig,
  addConfig,
  clearActiveConfig,
  duplicateActiveConfig,
  mergeConfigInto,
  removeActiveConfig,
  claimUntaggedArt,
  renameActiveConfig,
  replaceArt,
  setActiveConfig,
  updateActiveCategories,
} from "./model/document";
import { createId } from "./model/ids";
import {
  createLayer,
  flattenLayers,
  layerCategories,
  libraryFromConfigs,
  type Layer,
  type LibraryEntry,
} from "./compose/layers";
import { ComposeCanvas } from "./ui/ComposeCanvas";
import { ComposeSidebar } from "./ui/ComposeSidebar";
import { ComposeResult } from "./ui/ComposeResult";
import { IssuesDialog, type IssuesReport } from "./ui/IssuesDialog";
import { loadSession, saveSession } from "./app/persistence";
import {
  DEFAULT_EXPORT_FILE_NAME,
  DEFAULT_PLACEMENT,
  DOTA_JSON_VERSION,
  GRID_SIZE,
  defaultConversionSettings,
  inferCategoryKind,
  type Category,
  type ConversionSettings,
  type GridDocument,
  type Placement,
  type SymbolSettings,
} from "./model/types";
import { HEROES } from "./heroes/heroes";
import { placementBeside, placementRect } from "./image/placement";
import { loadImageSource, rasterizeSource, type ImageSource } from "./image/source";
import { createConversionClient, type ConversionClient } from "./image/conversionClient";
import type { ConversionOutput } from "./image/convert";
import { stampsFromConversion } from "./layout/stamps";
import { applyStyle } from "./symbols/artStyles";
import { StyleGallery } from "./ui/StyleGallery";
import { SYMBOL_PRESETS } from "./symbols/symbolSet";
import { useDocumentHistory } from "./editor/useDocumentHistory";
import { deleteCategories, nudgeCategories, PASTE_OFFSET, pasteCategories, snapshotSelection } from "./editor/operations";
import {
  DEFAULT_SHAPE_SETTINGS,
  frameOutline,
  outlinePoints,
  selectionBounds,
  shapeStamps,
  type ShapeSettings,
} from "./editor/shapes";
import { Toolbar, type Tab } from "./ui/Toolbar";
import { ConverterSidebar } from "./ui/ConverterSidebar";
import { PhotoPane, type PlacedPhoto } from "./ui/PhotoPane";
import { GridPreviewPane } from "./ui/GridPreviewPane";
import { EditorCanvas, type Tool } from "./ui/EditorCanvas";
import { EditorSidebar } from "./ui/EditorSidebar";
import { Inspector } from "./ui/Inspector";
import { TRAY_COLS_RANGE, getHeroIconScale, setHeroIconScale } from "./render/trayLayout";
import { useTheme } from "./ui/theme";
import { IconAlert } from "./ui/icons";

const TOOL_KEYS: Record<string, Tool> = {
  KeyV: "select",
  KeyB: "stamp",
  KeyG: "shape",
  KeyE: "erase",
  KeyT: "tray",
  KeyH: "pan",
};

function downloadText(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const AUTOSAVE_DELAY_MS = 600;
const ERASE_RADIUS_RANGE: [number, number] = [2, 60];
const BRUSH_STEP_RANGE: [number, number] = [2, 40];
const SHAPE_STEP_RANGE: [number, number] = [3, 40];

function clamp(v: number, [min, max]: [number, number]): number {
  return Math.min(max, Math.max(min, v));
}

function errorIssues(e: unknown): ValidationIssue[] {
  if (e instanceof GridParseError) return e.issues;
  return [{ level: "error", message: e instanceof Error ? e.message : String(e) }];
}

function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return !!el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT");
}

export function App() {
  const [restored] = useState(loadSession);
  const [theme, toggleTheme] = useTheme();
  const { doc, canUndo, canRedo, commit, commitCategories, undo, redo } = useDocumentHistory(restored?.doc);
  const config = activeConfig(doc);

  const [tab, setTab] = useState<Tab>("convert");
  const [source, setSource] = useState<ImageSource | null>(null);
  const [placement, setPlacement] = useState<Placement>(DEFAULT_PLACEMENT);
  const [settings, setSettings] = useState<ConversionSettings>(() => restored?.settings ?? defaultConversionSettings());
  const [symbols, setSymbols] = useState<SymbolSettings>(() => restored?.symbols ?? SYMBOL_PRESETS[0].settings);
  const [conversion, setConversion] = useState<(ConversionOutput & { settings: ConversionSettings; artId: string }) | null>(
    null,
  );
  const [photos, setPhotos] = useState<PlacedPhoto[]>([]);
  const [activePhotoId, setActivePhotoId] = useState<string | null>(null);
  const [showMask, setShowMask] = useState(false);
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [tool, setTool] = useState<Tool>("select");
  const [glyph, setGlyph] = useState(".");
  const [eraseRadius, setEraseRadius] = useState(8);
  const [brushStep, setBrushStep] = useState(5);
  const [shape, setShape] = useState<ShapeSettings>(DEFAULT_SHAPE_SETTINGS);
  const [trayCols, setTrayCols] = useState(2);
  const [heroIconScale, setHeroIconScaleState] = useState(() => {
    try {
      const n = Number(localStorage.getItem("dota-hero-grid-art:hero-icon-scale"));
      return Number.isFinite(n) && n > 0 ? setHeroIconScale(n) : getHeroIconScale();
    } catch {
      return getHeroIconScale();
    }
  });
  const [status, setStatus] = useState(() =>
    restored ? "Восстановлена прошлая работа (фото нужно загрузить заново)" : "",
  );
  const [report, setReport] = useState<IssuesReport | null>(null);
  const [library, setLibrary] = useState<LibraryEntry[]>(() => restored?.library ?? []);
  const [layers, setLayers] = useState<Layer[]>(() => restored?.layers ?? []);
  const [layerId, setLayerId] = useState<string | null>(null);
  const [composeName, setComposeName] = useState(() => restored?.composeName ?? "Сборка");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (!saveSession({ doc, settings, symbols, library, layers, composeName })) {
        setStatus("Автосохранение не удалось: в браузере закончилось место");
      }
    }, AUTOSAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [doc, settings, symbols, library, layers, composeName]);

  const clientRef = useRef<ConversionClient | null>(null);
  const rasterCanvas = useRef<HTMLCanvasElement | null>(null);

  const requestSeq = useRef(0);
  const requestSettings = useRef(new Map<number, ConversionSettings>());
  const requestArt = useRef(new Map<number, string>());
  const clipboard = useRef<Category[]>([]);
  const pasteCount = useRef(0);

  useEffect(() => {
    const client = createConversionClient((out, id) => {
      const used = id === undefined ? undefined : requestSettings.current.get(id);
      const artId = id === undefined ? undefined : requestArt.current.get(id);
      if (!used || !artId) return;
      for (const key of requestSettings.current.keys()) if (key <= id!) requestSettings.current.delete(key);
      for (const key of requestArt.current.keys()) if (key <= id!) requestArt.current.delete(key);
      setConversion({ ...out, settings: used, artId });
    });
    clientRef.current = client;
    return () => {
      client.dispose();
      clientRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!source || !activePhotoId) return;
    rasterCanvas.current ??= document.createElement("canvas");
    const rect = placementRect(source.width, source.height, GRID_SIZE, placement);
    const image = rasterizeSource(source, rect, placement, rasterCanvas.current);
    const id = ++requestSeq.current;
    requestSettings.current.set(id, settings);
    requestArt.current.set(id, activePhotoId);
    clientRef.current?.request({ image, rect, rotation: placement.rotation, settings, id });
  }, [source, placement, settings, activePhotoId]);

  useEffect(() => {
    if (!conversion || conversion.artId !== activePhotoId) return;
    const stamps = stampsFromConversion(conversion, conversion.settings, symbols).map((stamp) => ({
      ...stamp,
      artId: conversion.artId,
    }));
    commit((d) => replaceArt(d, conversion.artId, stamps), "generate");
  }, [conversion, symbols, commit, activePhotoId]);

  const loadDocument = useCallback(
    (next: GridDocument, message: string) => {
      commit(() => next);
      setPhotos([]);
      setActivePhotoId(null);
      setSource(null);
      setConversion(null);
      setSelected(new Set());
      setStatus(message);
    },
    [commit],
  );

  const onPlacement = (next: Placement) => {
    setPlacement(next);
    setPhotos((list) => list.map((photo) => (photo.id === activePhotoId ? { ...photo, placement: next } : photo)));
  };

  const selectPhoto = (id: string) => {
    const photo = photos.find((item) => item.id === id);
    if (!photo || photo.id === activePhotoId) return;
    setActivePhotoId(photo.id);
    setSource(photo.source);
    setPlacement(photo.placement);
    setConversion(null);
    setStatus(photo.source ? `Выбрано фото ${photo.name}` : `Выбрано «${photo.name}». Замените его новым файлом или оставьте как есть.`);
  };

  const onUpload = async (file: File, mode: "add" | "replace" = "add") => {
    try {
      const next = await loadImageSource(file);
      requestSettings.current.clear();
      requestArt.current.clear();
      requestSeq.current += 1;
      if (mode === "replace" && activePhotoId) {
        setPhotos((list) =>
          list.map((photo) => (photo.id === activePhotoId ? { ...photo, source: next, name: next.name } : photo)),
        );
        setSource(next);
        setConversion(null);
        setStatus(`Заменено фото «${next.name}». Остальные картинки на месте.`);
        return;
      }
      const id = createId("art");
      const legacyId = createId("art");
      const hasLooseArt = config.categories.some((c) => c.origin === "generated" && !c.artId);
      const claimId = activePhotoId ?? (hasLooseArt ? legacyId : null);
      if (claimId) commit((d) => claimUntaggedArt(d, claimId));
      const beside =
        config.categories.length > 0
          ? placementBeside(next.width, next.height, GRID_SIZE, config.categories)
          : DEFAULT_PLACEMENT;
      setPhotos((list) => [
        ...list,
        ...(claimId === legacyId
          ? [{ id: legacyId, source: null, name: "Уже на сетке", placement: DEFAULT_PLACEMENT }]
          : []),
        { id, source: next, name: next.name, placement: beside },
      ]);
      setActivePhotoId(id);
      setPlacement(beside);
      setSource(next);
      setConversion(null);
      setSelected(new Set());
      setStatus(
        photos.length > 0
          ? `Добавлено фото ${next.name}. Предыдущие остались — выберите нужное в списке, чтобы заменить только его.`
          : `Изображение ${next.name}: ${next.width}×${next.height}`,
      );
    } catch {
      setStatus(`Не удалось открыть изображение ${file.name}`);
    }
  };

  const showFailure = (title: string, e: unknown) => {
    setStatus(title);
    setReport({ title, issues: errorIssues(e) });
  };

  const onOpenJson = async (file: File) => {
    try {
      const next = parseDotaGridJson(await file.text());
      const count = next.configs.reduce((n, c) => n + c.categories.length, 0);
      loadDocument(next, `Открыт ${file.name}: сеток ${next.configs.length}, категорий ${count}`);
    } catch (e) {
      showFailure(`Не удалось открыть ${file.name}`, e);
    }
  };

  /** Switching grids ends the photo session, so generated art never lands in another grid. */
  const switchConfig = (update: (d: GridDocument) => GridDocument) => {
    commit(update);
    setPhotos([]);
    setActivePhotoId(null);
    setSource(null);
    setConversion(null);
    setSelected(new Set());
  };

  const onClear = () => {
    commit(clearActiveConfig);
    setPhotos([]);
    setActivePhotoId(null);
    setSource(null);
    setConversion(null);
    setSelected(new Set());
    setStatus("Сетка очищена");
  };

  /** Validates the exact text being written; errors block the download. */
  const saveDocument = (target: GridDocument, message: string): boolean => {
    const text = serializeDotaGrid(target);
    const issues = validateDotaGridFile(JSON.parse(text));
    if (issues.some((i) => i.level === "error")) {
      setStatus("Файл не сохранён: в нём есть ошибки");
      setReport({ title: "Файл не сохранён", issues });
      return false;
    }
    downloadText(DEFAULT_EXPORT_FILE_NAME, text);
    const warnings = issues.filter((i) => i.level === "warning").length;
    setStatus(warnings ? `${message} · предупреждений: ${warnings}` : message);
    return true;
  };

  const onExport = () => {
    saveDocument(doc, `Сохранён ${DEFAULT_EXPORT_FILE_NAME}: сеток ${doc.configs.length}`);
  };

  const onMergeInto = async (file: File) => {
    let target: GridDocument;
    try {
      target = parseDotaGridJson(await file.text());
    } catch (e) {
      showFailure(`Не удалось прочитать ${file.name}`, e);
      return;
    }
    const { doc: merged, replaced } = mergeConfigInto(target, config);
    saveDocument(
      merged,
      `Сетка «${config.name}» ${replaced ? "заменена" : "добавлена"} в ${file.name}; ` +
        `сеток в файле: ${merged.configs.length}. Скачан ${DEFAULT_EXPORT_FILE_NAME}`,
    );
  };

  const liveIssues = useMemo(
    () => validateDotaGridFile(toDotaFile(doc)).filter((i) => i.level !== "info"),
    [doc],
  );

  const onAddLibraryFile = async (file: File) => {
    try {
      const parsed = parseDotaGridJson(await file.text());
      setLibrary((lib) => [...lib, ...libraryFromConfigs(file.name, parsed.configs)]);
      setStatus(`Загружен ${file.name}: сеток ${parsed.configs.length}`);
    } catch (e) {
      showFailure(`Не удалось открыть ${file.name}`, e);
    }
  };

  const onTakeFromEditor = () => {
    setLibrary((lib) => [
      ...lib,
      { id: createId("lib"), fileName: "редактор", configName: config.name, categories: config.categories },
    ]);
  };

  const onAddLayer = (entry: LibraryEntry) => {
    const layer = createLayer(entry);
    setLayers((ls) => [...ls, layer]);
    setLayerId(layer.id);
  };

  const onLayerChange = useCallback((layer: Layer) => {
    setLayers((ls) => ls.map((l) => (l.id === layer.id ? layer : l)));
  }, []);

  const onMoveLayer = (id: string, dir: -1 | 1) => {
    setLayers((ls) => {
      const i = ls.findIndex((l) => l.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= ls.length) return ls;
      const next = [...ls];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const onRemoveLayer = useCallback((id: string) => {
    setLayers((ls) => ls.filter((l) => l.id !== id));
    setLayerId((cur) => (cur === id ? null : cur));
  }, []);

  const composePreview = useMemo(
    () => ({
      id: "compose",
      name: composeName,
      categories: layers.filter((l) => l.visible).flatMap(layerCategories),
    }),
    [layers, composeName],
  );
  const composed = useMemo(() => flattenLayers(layers), [layers]);
  const composeIssues = useMemo(
    () =>
      validateDotaGridFile(
        toDotaFile({
          version: DOTA_JSON_VERSION,
          activeConfigId: "",
          configs: [{ id: "", name: composeName, categories: composed }],
        }),
      ).filter((i) => i.level !== "info"),
    [composed, composeName],
  );

  const onComposeToEditor = (asNew: boolean) => {
    const cats = flattenLayers(layers);
    commit((d) => {
      const base = asNew ? addConfig(d, composeName) : renameActiveConfig(d, composeName);
      return updateActiveCategories(base, () => cats);
    });
    setPhotos([]);
    setActivePhotoId(null);
    setSource(null);
    setConversion(null);
    setSelected(new Set());
    setTab("edit");
    setStatus(asNew ? `Сборка добавлена как новая сетка «${composeName}»` : "Сборка заменила текущую сетку");
  };

  const onComposeSave = () => {
    const cfgId = createId("cfg");
    saveDocument(
      {
        version: DOTA_JSON_VERSION,
        activeConfigId: cfgId,
        configs: [{ id: cfgId, name: composeName, categories: flattenLayers(layers) }],
      },
      `Сборка «${composeName}» сохранена в ${DEFAULT_EXPORT_FILE_NAME}`,
    );
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.code === "KeyZ") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && e.code === "KeyY") {
        e.preventDefault();
        redo();
        return;
      }
      const arrows: Record<string, [number, number]> = {
        ArrowLeft: [-1, 0],
        ArrowRight: [1, 0],
        ArrowUp: [0, -1],
        ArrowDown: [0, 1],
      };
      if (tab === "compose") {
        const layer = layers.find((l) => l.id === layerId);
        if (!layer) return;
        const dir = arrows[e.code];
        if (dir) {
          e.preventDefault();
          const step = e.shiftKey ? 10 : 1;
          onLayerChange({ ...layer, x: layer.x + dir[0] * step, y: layer.y + dir[1] * step });
        } else if (e.code === "Delete") {
          e.preventDefault();
          onRemoveLayer(layer.id);
        } else if (e.code === "Escape") {
          setLayerId(null);
        }
        return;
      }
      if (tab !== "edit") return;
      if (mod && e.code === "KeyA") {
        e.preventDefault();
        setSelected(new Set(config.categories.map((c) => c.id)));
        return;
      }
      if (mod && e.code === "KeyC") {
        const clip = snapshotSelection(config.categories, selected);
        if (clip.length === 0) return;
        e.preventDefault();
        clipboard.current = clip;
        pasteCount.current = 0;
        setStatus(`Скопировано: ${clip.length}`);
        return;
      }
      if (mod && e.code === "KeyV") {
        if (clipboard.current.length === 0) return;
        e.preventDefault();
        pasteCount.current += 1;
        const shift = PASTE_OFFSET * pasteCount.current;
        const result = pasteCategories(config.categories, clipboard.current, shift, shift);
        commitCategories(() => result.categories, "paste");
        setSelected(new Set(result.ids));
        setStatus(`Вставлено: ${result.ids.length}`);
        return;
      }
      if (e.code === "Delete" || e.code === "Backspace") {
        if (selected.size === 0) return;
        e.preventDefault();
        commitCategories((cats) => deleteCategories(cats, selected));
        setSelected(new Set());
        return;
      }
      if (e.code === "Escape") {
        setSelected(new Set());
        return;
      }
      const dir = arrows[e.code];
      if (dir && selected.size > 0) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        commitCategories((cats) => nudgeCategories(cats, selected, dir[0] * step, dir[1] * step), "nudge");
        return;
      }
      if (!mod && TOOL_KEYS[e.code]) setTool(TOOL_KEYS[e.code]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [tab, config.categories, selected, commitCategories, undo, redo, layers, layerId, onLayerChange, onRemoveLayer]);

  const onFrameSelection = (padding: number) => {
    const bounds = selectionBounds(config.categories, selected);
    if (!bounds) return;
    const stamps = shapeStamps(outlinePoints(frameOutline(shape.kind, bounds, padding), shape, glyph));
    if (!stamps.length) return;
    commitCategories((cats) => [...cats, ...stamps]);
    setSelected(new Set(stamps.map((s) => s.id)));
    setStatus(`Рамка: ${stamps.length} символов`);
  };

  const stats = useMemo(() => {
    let generated = 0;
    let manual = 0;
    let trays = 0;
    const heroes = new Set<number>();
    for (const c of config.categories) {
      c.heroIds.forEach((id) => heroes.add(id));
      if (inferCategoryKind(c) === "tray") trays++;
      else if (c.origin === "generated") generated++;
      else manual++;
    }
    return { generated, manual, trays, hidden: HEROES.length - heroes.size };
  }, [config.categories]);

  return (
    <div className={`app ${tab !== "convert" ? "with-inspector" : ""}`}>
      <Toolbar
        tab={tab}
        onTab={setTab}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={undo}
        onRedo={redo}
        onOpenJson={onOpenJson}
        onExport={onExport}
        onMergeInto={onMergeInto}
        onClear={onClear}
        doc={doc}
        onSelectConfig={(id) => switchConfig((d) => setActiveConfig(d, id))}
        onRenameConfig={(name) => commit((d) => renameActiveConfig(d, name), "rename-config")}
        onAddConfig={() => switchConfig((d) => addConfig(d))}
        onDuplicateConfig={() => switchConfig(duplicateActiveConfig)}
        onRemoveConfig={() => switchConfig(removeActiveConfig)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <aside className="sidebar">
        {tab === "compose" ? (
          <ComposeSidebar
            library={library}
            onAddFile={onAddLibraryFile}
            onTakeFromEditor={onTakeFromEditor}
            onAddLayer={onAddLayer}
            onRemoveEntry={(id) => setLibrary((lib) => lib.filter((e) => e.id !== id))}
            layers={layers}
            selectedId={layerId}
            onSelect={setLayerId}
            onLayerChange={onLayerChange}
            onMoveLayer={onMoveLayer}
            onRemoveLayer={onRemoveLayer}
          />
        ) : tab === "convert" ? (
          <ConverterSidebar
            hasImage={!!source}
            photos={photos.map((photo) => ({ id: photo.id, name: photo.name }))}
            activePhotoId={activePhotoId}
            onSelectPhoto={selectPhoto}
            onUpload={(file) => onUpload(file, "add")}
            onReplace={(file) => onUpload(file, "replace")}
            placement={placement}
            onPlacement={onPlacement}
            settings={settings}
            onSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
            symbols={symbols}
            onSymbols={setSymbols}
            showMask={showMask}
            onShowMask={setShowMask}
          />
        ) : (
          <EditorSidebar
            tool={tool}
            onTool={setTool}
            glyph={glyph}
            onGlyph={setGlyph}
            eraseRadius={eraseRadius}
            onEraseRadius={setEraseRadius}
            eraseRadiusRange={ERASE_RADIUS_RANGE}
            brushStep={brushStep}
            onBrushStep={setBrushStep}
            brushStepRange={BRUSH_STEP_RANGE}
            shape={shape}
            onShape={(patch) => setShape((s) => ({ ...s, ...patch }))}
            shapeStepRange={SHAPE_STEP_RANGE}
            selectedCount={selected.size}
            onFrameSelection={onFrameSelection}
            trayCols={trayCols}
            onTrayCols={setTrayCols}
            trayColsRange={TRAY_COLS_RANGE}
            heroIconScale={heroIconScale}
            onHeroIconScale={(scale) => {
              const next = setHeroIconScale(scale);
              setHeroIconScaleState(next);
              try {
                localStorage.setItem("dota-hero-grid-art:hero-icon-scale", String(next));
              } catch {
                // Private mode or full storage: the scale just won't be remembered.
              }
            }}
          />
        )}
      </aside>

      <main className="content">
        {tab === "convert" ? (
          <div className="panes">
            <StyleGallery
              source={source}
              placement={placement}
              settings={settings}
              symbols={symbols}
              onApply={(style) => {
                const next = applyStyle(style, settings);
                setSettings(next.settings);
                setSymbols(next.symbols);
                setStatus(`Стиль: ${style.name}`);
              }}
            />
            <section className="pane">
              <header>Фото</header>
              <PhotoPane
                source={source}
                placement={placement}
                photos={photos}
                activeId={activePhotoId}
                onSelect={selectPhoto}
                onPlacementChange={onPlacement}
                mask={conversion?.mask ?? null}
                showMask={showMask}
              />
            </section>
            <section className="pane">
              <header>
                Превью из символов · {GRID_SIZE.width}×{GRID_SIZE.height}
              </header>
              <GridPreviewPane config={config} />
            </section>
          </div>
        ) : tab === "compose" ? (
          <ComposeCanvas
            layers={layers}
            preview={composePreview}
            selectedId={layerId}
            onSelect={setLayerId}
            onLayerChange={onLayerChange}
          />
        ) : (
          <EditorCanvas
            config={config}
            selected={selected}
            onSelect={setSelected}
            tool={tool}
            glyph={glyph}
            eraseRadius={eraseRadius}
            paintSpacing={brushStep}
            shape={shape}
            trayCols={trayCols}
            heroIconScale={heroIconScale}
            onToolSizeStep={(dir) => {
              if (tool === "stamp") setBrushStep((s) => clamp(s + dir, BRUSH_STEP_RANGE));
              else if (tool === "shape") setShape((s) => ({ ...s, step: clamp(s.step + dir, SHAPE_STEP_RANGE) }));
              else if (tool === "tray") setTrayCols((n) => clamp(n + dir, TRAY_COLS_RANGE));
              else setEraseRadius((r) => clamp(r + dir * (r >= 20 ? 2 : 1), ERASE_RADIUS_RANGE));
            }}
            commitCategories={commitCategories}
          />
        )}
      </main>

      {tab === "edit" && (
        <aside className="inspector">
          <Inspector
            config={config}
            selected={selected}
            onSelect={setSelected}
            commitCategories={commitCategories}
          />
        </aside>
      )}
      {tab === "compose" && (
        <aside className="inspector">
          <ComposeResult
            categories={composed}
            issues={composeIssues}
            configName={composeName}
            onConfigName={setComposeName}
            onReplaceCurrent={() => onComposeToEditor(false)}
            onAddAsNew={() => onComposeToEditor(true)}
            onSave={onComposeSave}
          />
        </aside>
      )}
      {report && <IssuesDialog report={report} onClose={() => setReport(null)} />}

      <footer className="statusbar">
        <span className="stat" title={`Авто ${stats.generated}, вручную или из файла ${stats.manual}`}>
          Символов <b>{stats.generated + stats.manual}</b>
          <span className="stat-sub">
            авто {stats.generated} · вручную {stats.manual}
          </span>
        </span>
        <span className="stat">
          Блоков героев <b>{stats.trays}</b>
        </span>
        <span className="stat">
          Скрыто героев <b>{stats.hidden}</b> / {HEROES.length}
        </span>
        {liveIssues.length > 0 && (
          <button
            type="button"
            className={`status-issues ${liveIssues.some((i) => i.level === "error") ? "error" : ""}`}
            onClick={() => setReport({ title: "Проверка файла", issues: liveIssues })}
          >
            <IconAlert size={13} />
            Проверка: {liveIssues.length}
          </button>
        )}
        <span className="status-message">{status}</span>
      </footer>
    </div>
  );
}
