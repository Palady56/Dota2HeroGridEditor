import { useMemo, useState } from "react";
import { inferCategoryKind, type Category, type GridConfig } from "../model/types";
import { HERO_BY_ID, HEROES, heroPortraitUrl, unusedHeroes } from "../heroes/heroes";

function HeroThumb({ id }: { id: number }) {
  const hero = HERO_BY_ID.get(id);
  const [failed, setFailed] = useState(false);
  if (!hero || failed) return <span className="hero-thumb empty" />;
  return <img className="hero-thumb" src={heroPortraitUrl(hero)} alt="" loading="lazy" onError={() => setFailed(true)} />;
}
import {
  addHeroes,
  deleteCategories,
  moveHero,
  removeHero,
  replaceGlyph,
  updateCategory,
} from "../editor/operations";
import type { CommitCategories } from "../editor/useDocumentHistory";
import { HeroPicker } from "./HeroPicker";
import { NumberField, Section } from "./controls";

type Props = {
  config: GridConfig;
  selected: ReadonlySet<string>;
  onSelect: (ids: Set<string>) => void;
  commitCategories: CommitCategories;
};

const KIND_LABEL = { stamp: "Символ", caption: "Надпись", tray: "Блок героев" } as const;
const ORIGIN_LABEL = { generated: "авто из фото", manual: "изменён вручную", imported: "из файла" } as const;

export function Inspector({ config, selected, onSelect, commitCategories }: Props) {
  const items = config.categories.filter((c) => selected.has(c.id));
  const usedIds = useMemo(
    () => new Set(config.categories.flatMap((c) => c.heroIds)),
    [config.categories],
  );

  if (items.length === 0) {
    return <Summary config={config} usedIds={usedIds} commitCategories={commitCategories} />;
  }
  if (items.length > 1) {
    return (
      <MultiSelection
        items={items}
        onDelete={() => {
          commitCategories((cats) => deleteCategories(cats, selected));
          onSelect(new Set());
        }}
        onReplace={(to) => commitCategories((cats) => replaceGlyph(cats, "", to, selected))}
      />
    );
  }
  return (
    <SingleCategory
      category={items[0]}
      usedIds={usedIds}
      commitCategories={commitCategories}
      onDelete={() => {
        commitCategories((cats) => deleteCategories(cats, selected));
        onSelect(new Set());
      }}
    />
  );
}

function Summary({
  config,
  usedIds,
  commitCategories,
}: {
  config: GridConfig;
  usedIds: ReadonlySet<number>;
  commitCategories: CommitCategories;
}) {
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of config.categories) {
      if (inferCategoryKind(c) === "tray") continue;
      map.set(c.name, (map.get(c.name) ?? 0) + 1);
    }
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [config.categories]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const source = from || counts[0]?.[0] || "";

  return (
    <>
      <Section title="Сетка">
        <p className="hint">Ничего не выбрано. Кликните по символу или блоку на холсте.</p>
        <table className="stats">
          <tbody>
            {counts.slice(0, 12).map(([glyph, n]) => (
              <tr key={glyph}>
                <td className="glyph-cell">{glyph || "(пусто)"}</td>
                <td>{n}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="hint">
          Героев на сетке: {usedIds.size}. Скрыто в Dota: {HEROES.length - usedIds.size} из {HEROES.length}.
        </p>
      </Section>
      {counts.length > 0 && (
        <Section title="Заменить символ везде">
          <div className="row">
            <select value={source} onChange={(e) => setFrom(e.target.value)}>
              {counts.map(([glyph]) => (
                <option key={glyph} value={glyph}>
                  {glyph || "(пусто)"}
                </option>
              ))}
            </select>
            <span>→</span>
            <input className="glyph-input" value={to} onChange={(e) => setTo(e.target.value)} />
            <button
              type="button"
              className="btn"
              disabled={!to}
              onClick={() => commitCategories((cats) => replaceGlyph(cats, source, to))}
            >
              Заменить
            </button>
          </div>
        </Section>
      )}
    </>
  );
}

function MultiSelection({
  items,
  onDelete,
  onReplace,
}: {
  items: Category[];
  onDelete: () => void;
  onReplace: (to: string) => void;
}) {
  const [to, setTo] = useState("");
  return (
    <Section title={`Выбрано: ${items.length}`}>
      <p className="hint">Перетаскивайте мышью или двигайте стрелками.</p>
      <div className="row">
        <span>Символ →</span>
        <input className="glyph-input" value={to} onChange={(e) => setTo(e.target.value)} />
        <button type="button" className="btn" disabled={!to} onClick={() => onReplace(to)}>
          Заменить
        </button>
      </div>
      <button type="button" className="btn danger wide" onClick={onDelete}>
        Удалить выбранное
      </button>
    </Section>
  );
}

function SingleCategory({
  category: c,
  usedIds,
  commitCategories,
  onDelete,
}: {
  category: Category;
  usedIds: ReadonlySet<number>;
  commitCategories: CommitCategories;
  onDelete: () => void;
}) {
  const kind = inferCategoryKind(c);
  const patch = (p: Partial<Category>, field: string) =>
    commitCategories((cats) => updateCategory(cats, c.id, p), `edit-${c.id}-${field}`);

  return (
    <>
      <Section title={KIND_LABEL[kind]}>
        <p className="hint">{ORIGIN_LABEL[c.origin]}</p>
        <label className="field">
          <span>{kind === "tray" ? "Название блока" : "Символ / текст"}</span>
          <input value={c.name} onChange={(e) => patch({ name: e.target.value }, "name")} />
        </label>
        <div className="grid-2">
          <NumberField label="X" value={c.x} step={0.5} onChange={(x) => patch({ x }, "x")} />
          <NumberField label="Y" value={c.y} step={0.5} onChange={(y) => patch({ y }, "y")} />
          <NumberField label="Ширина" value={c.width} min={1} onChange={(width) => patch({ width: Math.max(1, width) }, "w")} />
          <NumberField label="Высота" value={c.height} min={1} onChange={(height) => patch({ height: Math.max(1, height) }, "h")} />
        </div>
        <button type="button" className="btn danger wide" onClick={onDelete}>
          Удалить
        </button>
      </Section>

      {kind === "tray" && (
        <Section title={`Герои (${c.heroIds.length})`}>
          <ul className="hero-list">
            {c.heroIds.map((id, i) => (
              <li key={`${id}-${i}`}>
                <HeroThumb id={id} />
                <span className="grow">{HERO_BY_ID.get(id)?.name ?? `Неизвестный #${id}`}</span>
                <button type="button" className="btn tiny" onClick={() => commitCategories((cats) => moveHero(cats, c.id, i, -1))}>
                  ↑
                </button>
                <button type="button" className="btn tiny" onClick={() => commitCategories((cats) => moveHero(cats, c.id, i, 1))}>
                  ↓
                </button>
                <button type="button" className="btn tiny" onClick={() => commitCategories((cats) => removeHero(cats, c.id, i))}>
                  ×
                </button>
              </li>
            ))}
          </ul>
          <HeroPicker usedIds={usedIds} onPick={(id) => commitCategories((cats) => addHeroes(cats, c.id, [id]))} />
          <button
            type="button"
            className="btn wide"
            title="Иначе они будут скрыты в Dota («Не видно N героев»)"
            onClick={() =>
              commitCategories((cats) => addHeroes(cats, c.id, unusedHeroes(usedIds).map((h) => h.id)))
            }
          >
            Добавить всех неиспользованных ({HEROES.length - usedIds.size})
          </button>
        </Section>
      )}
    </>
  );
}
