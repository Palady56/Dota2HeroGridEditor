import { inferCategoryKind } from "../model/types";
import { alignLayer, scaleLayer, type Align, type Layer, type LibraryEntry } from "../compose/layers";
import { Checkbox, FileButton, NumberField, Section, Slider } from "./controls";
import { TransformControls } from "./TransformControls";

type Props = {
  library: LibraryEntry[];
  onAddFile: (file: File) => void;
  onTakeFromEditor: () => void;
  onAddLayer: (entry: LibraryEntry) => void;
  onRemoveEntry: (id: string) => void;
  layers: Layer[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onLayerChange: (layer: Layer) => void;
  onMoveLayer: (id: string, dir: -1 | 1) => void;
  onRemoveLayer: (id: string) => void;
};

const ALIGN_BUTTONS: { align: Align; label: string; title: string }[] = [
  { align: "left", label: "⇤", title: "К левому краю" },
  { align: "center", label: "↔", title: "По центру по горизонтали" },
  { align: "right", label: "⇥", title: "К правому краю" },
  { align: "top", label: "⤒", title: "К верхнему краю" },
  { align: "middle", label: "↕", title: "По центру по вертикали" },
  { align: "bottom", label: "⤓", title: "К нижнему краю" },
];

function describe(entry: LibraryEntry): string {
  let trays = 0;
  let captions = 0;
  for (const c of entry.categories) {
    const kind = inferCategoryKind(c);
    if (kind === "tray") trays++;
    else if (kind === "caption") captions++;
  }
  const parts = [`${entry.categories.length - trays - captions} симв.`];
  if (trays) parts.push(`${trays} блок.`);
  if (captions) parts.push(`${captions} надп.`);
  return parts.join(", ");
}

export function ComposeSidebar(props: Props) {
  const selected = props.layers.find((l) => l.id === props.selectedId) ?? null;
  const hasTrays = selected?.categories.some((c) => inferCategoryKind(c) === "tray") ?? false;
  const hasCaptions = selected?.categories.some((c) => inferCategoryKind(c) === "caption") ?? false;

  return (
    <>
      <Section title="Файлы">
        <FileButton
          label="Загрузить JSON-файлы"
          accept="application/json,.json"
          multiple
          className="btn primary wide"
          onFile={props.onAddFile}
          title="Можно выбрать несколько hero_grid_config.json сразу"
        />
        <button type="button" className="btn wide" onClick={props.onTakeFromEditor}>
          Взять текущую сетку из редактора
        </button>
        {props.library.length === 0 ? (
          <p className="hint">
            Загрузите сохранённые сетки — каждая сетка из файла появится здесь, её можно добавить на холст
            слоем. Слои двигаются мышью, колесо мыши меняет размер выбранного слоя.
          </p>
        ) : (
          <ul className="item-list">
            {props.library.map((entry) => (
              <li key={entry.id}>
                <div className="grow">
                  <div className="item-title">{entry.configName || "(без названия)"}</div>
                  <div className="item-sub">
                    {entry.fileName} · {describe(entry)}
                  </div>
                </div>
                <button type="button" className="btn tiny" title="Добавить на холст" onClick={() => props.onAddLayer(entry)}>
                  +
                </button>
                <button type="button" className="btn tiny" title="Убрать из списка" onClick={() => props.onRemoveEntry(entry.id)}>
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Слои">
        {props.layers.length === 0 ? (
          <p className="hint">Пока пусто. Нажмите «+» у сетки выше.</p>
        ) : (
          <ul className="item-list">
            {[...props.layers].reverse().map((layer) => (
              <li
                key={layer.id}
                className={layer.id === props.selectedId ? "selected" : ""}
                onClick={() => props.onSelect(layer.id)}
              >
                <input
                  type="checkbox"
                  checked={layer.visible}
                  title="Показывать"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => props.onLayerChange({ ...layer, visible: e.target.checked })}
                />
                <span className="grow item-title">{layer.name}</span>
                <button
                  type="button"
                  className="btn tiny"
                  title="Выше"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onMoveLayer(layer.id, 1);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn tiny"
                  title="Ниже"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onMoveLayer(layer.id, -1);
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="btn tiny"
                  title="Удалить слой"
                  onClick={(e) => {
                    e.stopPropagation();
                    props.onRemoveLayer(layer.id);
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {selected && (
        <Section title="Выбранный слой">
          <label className="field compact">
            <span>Название</span>
            <input value={selected.name} onChange={(e) => props.onLayerChange({ ...selected, name: e.target.value })} />
          </label>
          <div className="grid-2">
            <NumberField label="X" value={selected.x} onChange={(x) => props.onLayerChange({ ...selected, x })} />
            <NumberField label="Y" value={selected.y} onChange={(y) => props.onLayerChange({ ...selected, y })} />
          </div>
          <Slider
            label="Размер"
            value={selected.scale}
            min={0.2}
            max={4}
            step={0.01}
            format={(v) => `${Math.round(v * 100)}%`}
            hint="Меняет расстояние между символами. Сам символ в Dota всегда одного размера."
            onChange={(scale) => props.onLayerChange(scaleLayer(selected, scale))}
          />
          <TransformControls
            rotation={selected.rotation}
            flipX={selected.flipX}
            flipY={selected.flipY}
            onChange={(patch) => props.onLayerChange({ ...selected, ...patch })}
          />
          <div className="align-row">
            {ALIGN_BUTTONS.map((b) => (
              <button
                key={b.align}
                type="button"
                className="btn"
                title={b.title}
                onClick={() => props.onLayerChange(alignLayer(selected, b.align))}
              >
                {b.label}
              </button>
            ))}
          </div>
          {hasTrays && (
            <Checkbox
              label="Блоки героев"
              checked={selected.includeTrays}
              onChange={(includeTrays) => props.onLayerChange({ ...selected, includeTrays })}
            />
          )}
          {hasCaptions && (
            <Checkbox
              label="Надписи"
              checked={selected.includeCaptions}
              onChange={(includeCaptions) => props.onLayerChange({ ...selected, includeCaptions })}
            />
          )}
          <p className="hint">
            Стрелки двигают слой на 1 px (Shift — на 10), Delete удаляет. При повороте символы «- | / \» тоже
            поворачиваются; блоки героев поворачиваются только на 90°.
          </p>
        </Section>
      )}
    </>
  );
}
