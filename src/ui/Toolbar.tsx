import type { GridDocument } from "../model/types";
import { FileButton } from "./controls";

export type Tab = "convert" | "edit" | "compose";

type Props = {
  tab: Tab;
  onTab: (tab: Tab) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenJson: (file: File) => void;
  onExport: () => void;
  onMergeInto: (file: File) => void;
  onExample: () => void;
  onClear: () => void;
  doc: GridDocument;
  onSelectConfig: (id: string) => void;
  onRenameConfig: (name: string) => void;
  onAddConfig: () => void;
  onDuplicateConfig: () => void;
  onRemoveConfig: () => void;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "convert", label: "1. Фото → символы" },
  { id: "edit", label: "2. Редактор сетки" },
  { id: "compose", label: "3. Сборка из файлов" },
];

export function Toolbar(props: Props) {
  const active = props.doc.configs.find((c) => c.id === props.doc.activeConfigId);
  return (
    <header className="toolbar">
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={props.tab === t.id ? "active" : ""}
            onClick={() => props.onTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="toolbar-group">
        <button type="button" className="btn" disabled={!props.canUndo} onClick={props.onUndo} title="Ctrl+Z">
          ↶
        </button>
        <button type="button" className="btn" disabled={!props.canRedo} onClick={props.onRedo} title="Ctrl+Y">
          ↷
        </button>
      </div>

      <div className="toolbar-group">
        <label className="config-name" title="config_name — так сетка называется в списке в Dota">
          Сетка
          {props.doc.configs.length > 1 ? (
            <select value={props.doc.activeConfigId} onChange={(e) => props.onSelectConfig(e.target.value)}>
              {props.doc.configs.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || "(без названия)"}
                </option>
              ))}
            </select>
          ) : null}
          <input value={active?.name ?? ""} onChange={(e) => props.onRenameConfig(e.target.value)} />
        </label>
        <button type="button" className="btn" onClick={props.onAddConfig} title="Новая пустая сетка в этом файле">
          +
        </button>
        <button type="button" className="btn" onClick={props.onDuplicateConfig} title="Копия текущей сетки">
          ⧉
        </button>
        <button
          type="button"
          className="btn"
          onClick={props.onRemoveConfig}
          title={props.doc.configs.length > 1 ? "Удалить текущую сетку из файла" : "Последнюю сетку нельзя удалить — она будет очищена"}
        >
          🗑
        </button>
      </div>

      <div className="toolbar-group right">
        <button type="button" className="btn" onClick={props.onExample} title="Временная кнопка: загрузить пример Kaneki">
          Пример
        </button>
        <button type="button" className="btn" onClick={props.onClear}>
          Очистить
        </button>
        <FileButton
          label="Открыть JSON"
          accept="application/json,.json"
          onFile={props.onOpenJson}
          title="Открыть уже готовый hero_grid_config.json, чтобы продолжить его редактировать"
        />
        <FileButton
          label="Добавить в мой файл Dota…"
          accept="application/json,.json"
          onFile={props.onMergeInto}
          title="Выберите ваш hero_grid_config.json из Steam\userdata\<id>\570\remote\cfg. Текущая сетка будет добавлена в него (сетка с таким же названием заменится), остальные ваши сетки останутся."
        />
        <button type="button" className="btn primary" onClick={props.onExport} title="Сохранить все сетки этого документа">
          Сохранить JSON
        </button>
      </div>
    </header>
  );
}
