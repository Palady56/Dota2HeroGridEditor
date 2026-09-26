import type { ReactNode } from "react";
import type { GridDocument } from "../model/types";
import { FileButton } from "./controls";
import type { Theme } from "./theme";
import {
  BrandMark,
  IconCopy,
  IconDownload,
  IconEraser,
  IconFilePlus,
  IconFolder,
  IconImage,
  IconLayers,
  IconMoon,
  IconPencil,
  IconPlus,
  IconRedo,
  IconSun,
  IconTrash,
  IconUndo,
} from "./icons";

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
  onClear: () => void;
  doc: GridDocument;
  onSelectConfig: (id: string) => void;
  onRenameConfig: (name: string) => void;
  onAddConfig: () => void;
  onDuplicateConfig: () => void;
  onRemoveConfig: () => void;
  theme: Theme;
  onToggleTheme: () => void;
};

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "convert", label: "Фото → символы", icon: <IconImage /> },
  { id: "edit", label: "Редактор", icon: <IconPencil /> },
  { id: "compose", label: "Сборка", icon: <IconLayers /> },
];

export function Toolbar(props: Props) {
  const active = props.doc.configs.find((c) => c.id === props.doc.activeConfigId);
  const dark = props.theme === "dark";
  return (
    <header className="toolbar">
      <div className="brand" title="Dota 2 Hero Grid Editor">
        <BrandMark />
        <div className="brand-text">
          <span className="brand-name">Hero Grid</span>
          <span className="brand-sub">Dota 2 editor</span>
        </div>
      </div>

      <nav className="tabs" aria-label="Режим">
        {TABS.map((t, i) => (
          <button
            key={t.id}
            type="button"
            className={props.tab === t.id ? "active" : ""}
            onClick={() => props.onTab(t.id)}
          >
            <span className="tab-step">{i + 1}</span>
            {t.icon}
            <span className="tab-label">{t.label}</span>
          </button>
        ))}
      </nav>

      <div className="toolbar-group">
        <button type="button" className="btn icon" disabled={!props.canUndo} onClick={props.onUndo} title="Отменить (Ctrl+Z)">
          <IconUndo />
        </button>
        <button type="button" className="btn icon" disabled={!props.canRedo} onClick={props.onRedo} title="Повторить (Ctrl+Y)">
          <IconRedo />
        </button>
      </div>

      <div className="toolbar-group config-group">
        <label className="config-name" title="config_name — так сетка называется в списке в Dota">
          <span className="config-caption">Сетка</span>
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
        <button type="button" className="btn icon ghost" onClick={props.onAddConfig} title="Новая пустая сетка в этом файле">
          <IconPlus />
        </button>
        <button type="button" className="btn icon ghost" onClick={props.onDuplicateConfig} title="Копия текущей сетки">
          <IconCopy />
        </button>
        <button
          type="button"
          className="btn icon ghost"
          onClick={props.onRemoveConfig}
          title={props.doc.configs.length > 1 ? "Удалить текущую сетку из файла" : "Последнюю сетку нельзя удалить — она будет очищена"}
        >
          <IconTrash />
        </button>
      </div>

      <div className="toolbar-group right">
        <button type="button" className="btn ghost" onClick={props.onClear} title="Очистить текущую сетку">
          <IconEraser />
          <span className="btn-label">Очистить</span>
        </button>
        <span className="toolbar-divider" />
        <FileButton
          label="Открыть JSON"
          icon={<IconFolder />}
          accept="application/json,.json"
          onFile={props.onOpenJson}
          title="Открыть уже готовый hero_grid_config.json, чтобы продолжить его редактировать"
        />
        <FileButton
          label="В мой файл Dota…"
          icon={<IconFilePlus />}
          accept="application/json,.json"
          onFile={props.onMergeInto}
          title="Выберите ваш hero_grid_config.json из Steam\userdata\<id>\570\remote\cfg. Текущая сетка будет добавлена в него (сетка с таким же названием заменится), остальные ваши сетки останутся."
        />
        <button type="button" className="btn primary" onClick={props.onExport} title="Сохранить все сетки этого документа">
          <IconDownload />
          <span>Сохранить JSON</span>
        </button>
        <button
          type="button"
          className="btn icon theme-toggle"
          onClick={props.onToggleTheme}
          title={dark ? "Светлая тема" : "Тёмная тема"}
          aria-label={dark ? "Включить светлую тему" : "Включить тёмную тему"}
        >
          {dark ? <IconSun /> : <IconMoon />}
        </button>
      </div>
    </header>
  );
}
