import type { CSSProperties, ReactNode } from "react";

type SliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  format?: (value: number) => string;
  hint?: string;
};

export function Slider({ label, value, min, max, step, onChange, format, hint }: SliderProps) {
  const fill = max > min ? ((value - min) / (max - min)) * 100 : 0;
  return (
    <label className="field" title={hint}>
      <span className="field-head">
        <span>{label}</span>
        <span className="field-value">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ "--fill": `${fill}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

type NumberFieldProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
};

export function NumberField({ label, value, onChange, step = 1, min }: NumberFieldProps) {
  return (
    <label className="field compact">
      <span>{label}</span>
      <input
        type="number"
        step={step}
        min={min}
        value={Number(value.toFixed(2))}
        onChange={(e) => {
          const v = Number(e.target.value);
          if (e.target.value !== "" && Number.isFinite(v)) onChange(v);
        }}
      />
    </label>
  );
}

export function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="checkbox">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function FileButton({
  label,
  accept,
  onFile,
  className = "btn",
  title,
  multiple = false,
  icon,
}: {
  label: string;
  icon?: ReactNode;
  accept: string;
  /** Called once per chosen file. */
  onFile: (file: File) => void;
  className?: string;
  title?: string;
  multiple?: boolean;
}) {
  return (
    <label className={className} title={title}>
      {icon}
      <span className="btn-label">{label}</span>
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          const files = [...(e.target.files ?? [])];
          e.target.value = "";
          files.forEach(onFile);
        }}
      />
    </label>
  );
}
