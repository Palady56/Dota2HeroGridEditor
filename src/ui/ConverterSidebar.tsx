import type { ConversionSettings, Placement, SymbolSettings } from "../model/types";
import { DEFAULT_PLACEMENT } from "../model/types";
import { findPresetId, SYMBOL_PRESETS } from "../symbols/symbolSet";
import { Checkbox, FileButton, Section, Slider } from "./controls";
import { TransformControls } from "./TransformControls";

type Props = {
  hasImage: boolean;
  onUpload: (file: File) => void;
  placement: Placement;
  onPlacement: (p: Placement) => void;
  settings: ConversionSettings;
  onSettings: (patch: Partial<ConversionSettings>) => void;
  symbols: SymbolSettings;
  onSymbols: (s: SymbolSettings) => void;
  showMask: boolean;
  onShowMask: (v: boolean) => void;
};

const GLYPH_FIELDS: { key: keyof Omit<SymbolSettings, "minStraightness" | "minRun">; label: string }[] = [
  { key: "horizontal", label: "Горизонталь" },
  { key: "vertical", label: "Вертикаль" },
  { key: "diagDown", label: "Диагональ ↘" },
  { key: "diagUp", label: "Диагональ ↗" },
  { key: "fallback", label: "Изгибы" },
];

export function ConverterSidebar(props: Props) {
  const { settings, onSettings, symbols, onSymbols, placement, onPlacement } = props;
  const presetId = findPresetId(symbols);

  return (
    <>
      <Section title="Изображение">
        <FileButton
          label={props.hasImage ? "Заменить изображение" : "Загрузить изображение"}
          accept="image/*"
          className="btn primary wide"
          onFile={props.onUpload}
        />
        <Slider
          label="Размер объекта"
          value={placement.scale}
          min={0.1}
          max={3}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onChange={(scale) => onPlacement({ ...placement, scale })}
        />
        <div className="row">
          <button
            type="button"
            className="btn"
            title="Вернуть размер и положение (поворот и отражение остаются)"
            onClick={() => onPlacement({ ...placement, scale: DEFAULT_PLACEMENT.scale, offsetX: 0, offsetY: 0 })}
          >
            Вписать в сетку
          </button>
          <button type="button" className="btn" title="Сбросить всё: размер, положение, поворот, отражение" onClick={() => onPlacement(DEFAULT_PLACEMENT)}>
            Сбросить
          </button>
        </div>
        <TransformControls
          rotation={placement.rotation}
          flipX={placement.flipX}
          flipY={placement.flipY}
          onChange={(patch) => onPlacement({ ...placement, ...patch })}
          invert={{ value: settings.invert, onChange: (invert) => onSettings({ invert }) }}
        />
        <p className="hint">Фото двигается мышью, колесо — размер, Shift + колесо или жёлтая ручка — поворот.</p>
      </Section>

      <Section title="Обработка">
        <div className="segmented">
          <button
            type="button"
            className={settings.mode === "edges" ? "active" : ""}
            onClick={() => onSettings({ mode: "edges" })}
            title="Границы между светлым и тёмным. Подходит для фото."
          >
            Контуры
          </button>
          <button
            type="button"
            className={settings.mode === "lines" ? "active" : ""}
            onClick={() => onSettings({ mode: "lines" })}
            title="Средняя линия тёмных штрихов. Подходит для рисунков, аниме, логотипов."
          >
            Линии рисунка
          </button>
        </div>
        <Slider label="Яркость" value={settings.brightness} min={-100} max={100} step={1} onChange={(brightness) => onSettings({ brightness })} />
        <Slider label="Контраст" value={settings.contrast} min={0.3} max={3} step={0.05} format={(v) => v.toFixed(2)} onChange={(contrast) => onSettings({ contrast })} />
        <Slider
          label="Сглаживание"
          value={settings.blur}
          min={0}
          max={4}
          step={0.1}
          format={(v) => v.toFixed(1)}
          hint="Убирает шум и мелкую текстуру"
          onChange={(blur) => onSettings({ blur })}
        />
        {settings.mode === "edges" ? (
          <Slider
            label="Порог контуров"
            value={settings.edgeThreshold}
            min={20}
            max={500}
            step={5}
            hint="Больше — остаются только сильные контуры"
            onChange={(edgeThreshold) => onSettings({ edgeThreshold })}
          />
        ) : (
          <Slider
            label="Порог тёмного"
            value={settings.darkThreshold}
            min={10}
            max={245}
            step={1}
            hint="Пиксели темнее этого значения считаются линией"
            onChange={(darkThreshold) => onSettings({ darkThreshold })}
          />
        )}
        <Slider
          label="Убрать короткие линии"
          value={settings.minLineLength}
          min={1}
          max={200}
          step={1}
          format={(v) => `< ${v} px`}
          onChange={(minLineLength) => onSettings({ minLineLength })}
        />
        <Checkbox label="Показать найденные линии на фото" checked={props.showMask} onChange={props.onShowMask} />
      </Section>

      <Section title="Символы">
        <Slider
          label="Шаг между символами"
          value={settings.spacing}
          min={2}
          max={20}
          step={0.5}
          hint="Меньше — плотнее и больше категорий"
          onChange={(spacing) => onSettings({ spacing })}
        />
        <label className="field">
          <span>Набор</span>
          <select
            value={presetId}
            onChange={(e) => {
              const preset = SYMBOL_PRESETS.find((p) => p.id === e.target.value);
              if (preset) onSymbols(preset.settings);
            }}
          >
            {SYMBOL_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            {presetId === "custom" && <option value="custom">Свой набор</option>}
          </select>
        </label>
        <div className="glyph-grid">
          {GLYPH_FIELDS.map((f) => (
            <label key={f.key} className="field compact">
              <span>{f.label}</span>
              <input
                className="glyph-input"
                value={symbols[f.key]}
                onChange={(e) => onSymbols({ ...symbols, [f.key]: e.target.value })}
              />
            </label>
          ))}
        </div>
        <Slider
          label="Прямота для символов линий"
          value={symbols.minStraightness}
          min={0}
          max={1}
          step={0.01}
          format={(v) => v.toFixed(2)}
          hint="Ниже этого значения ставится символ «Изгибы»"
          onChange={(minStraightness) => onSymbols({ ...symbols, minStraightness })}
        />
        <Slider
          label="Мин. длина прямого участка"
          value={symbols.minRun}
          min={1}
          max={10}
          step={1}
          format={(v) => `${v} симв.`}
          hint="Одиночный «|» в Dota выглядит как тонкая вертикальная полоса. Прямые символы ставятся только сериями не короче этого значения, остальное — «Изгибы»."
          onChange={(minRun) => onSymbols({ ...symbols, minRun })}
        />
        <p className="hint">Пустое поле — символ в этом направлении не ставится.</p>
      </Section>
    </>
  );
}
