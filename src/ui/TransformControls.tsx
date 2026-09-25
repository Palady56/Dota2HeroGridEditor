import { normalizeDeg } from "../model/geometry";
import { Slider } from "./controls";

export type TransformValue = { rotation: number; flipX: boolean; flipY: boolean };

type Props = TransformValue & {
  onChange: (patch: Partial<TransformValue>) => void;
  /** Colour inversion; only meaningful for photos. */
  invert?: { value: boolean; onChange: (v: boolean) => void };
};

export function TransformControls({ rotation, flipX, flipY, onChange, invert }: Props) {
  return (
    <>
      <Slider
        label="Поворот"
        value={rotation}
        min={-180}
        max={180}
        step={0.5}
        format={(v) => `${v}°`}
        hint="Вращать можно и мышью: жёлтая ручка на холсте (Shift — шаг 15°) или Shift + колесо"
        onChange={(v) => onChange({ rotation: v })}
      />
      <div className="transform-row">
        <button type="button" className="btn" title="Повернуть на 90° против часовой" onClick={() => onChange({ rotation: normalizeDeg(rotation - 90) })}>
          ⟲ 90°
        </button>
        <button type="button" className="btn" title="Повернуть на 90° по часовой" onClick={() => onChange({ rotation: normalizeDeg(rotation + 90) })}>
          ⟳ 90°
        </button>
        <button type="button" className="btn" title="Повернуть на 45° по часовой (диагональ)" onClick={() => onChange({ rotation: normalizeDeg(rotation + 45) })}>
          ↻ 45°
        </button>
        <button type="button" className="btn" title="Сбросить поворот" disabled={rotation === 0} onClick={() => onChange({ rotation: 0 })}>
          0°
        </button>
      </div>
      <div className="transform-row">
        <button type="button" className={`btn ${flipX ? "active" : ""}`} title="Отразить по горизонтали (зеркально)" onClick={() => onChange({ flipX: !flipX })}>
          ⇆ Зеркало
        </button>
        <button type="button" className={`btn ${flipY ? "active" : ""}`} title="Отразить по вертикали (вверх ногами)" onClick={() => onChange({ flipY: !flipY })}>
          ⇅ Переворот
        </button>
        {invert && (
          <button
            type="button"
            className={`btn ${invert.value ? "active" : ""}`}
            title="Инверсия цветов: светлое становится тёмным. Нужна для светлых линий на тёмном фоне."
            onClick={() => invert.onChange(!invert.value)}
          >
            ◐ Инверсия
          </button>
        )}
      </div>
    </>
  );
}
