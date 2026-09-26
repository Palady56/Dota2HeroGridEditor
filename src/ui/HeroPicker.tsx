import { useId, useMemo, useState } from "react";
import { HEROES, heroPortraitUrl, type Hero } from "../heroes/heroes";

type Props = {
  onPick: (heroId: number) => void;
  usedIds?: ReadonlySet<number>;
};

function matches(hero: Hero, query: string): boolean {
  if (!query) return true;
  return (
    hero.name.toLowerCase().includes(query) ||
    hero.key.includes(query) ||
    String(hero.id) === query
  );
}

function HeroThumb({ hero }: { hero: Hero }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="hero-thumb empty" />;
  return <img className="hero-thumb" src={heroPortraitUrl(hero)} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

export function HeroPicker({ onPick, usedIds }: Props) {
  const [text, setText] = useState("");
  const listId = useId();
  const query = text.trim().toLowerCase();
  const visible = useMemo(() => HEROES.filter((h) => matches(h, query)), [query]);

  const submit = () => {
    const t = text.trim().toLowerCase();
    if (!t) return;
    const hero =
      HEROES.find((h) => h.name.toLowerCase() === t) ??
      HEROES.find((h) => String(h.id) === t) ??
      HEROES.find((h) => h.name.toLowerCase().startsWith(t)) ??
      HEROES.find((h) => h.name.toLowerCase().includes(t));
    if (!hero) return;
    onPick(hero.id);
  };

  return (
    <div className="hero-picker">
      <div className="row">
        <input
          className="grow"
          list={listId}
          value={text}
          placeholder="Имя героя или id"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />
        <button type="button" className="btn" onClick={submit}>
          Добавить
        </button>
        <datalist id={listId}>
          {HEROES.map((h) => (
            <option key={h.id} value={h.name}>
              {usedIds?.has(h.id) ? `id ${h.id}, уже есть` : `id ${h.id}`}
            </option>
          ))}
        </datalist>
      </div>
      <p className="hint">Одного героя можно поставить несколько раз — как в Dota.</p>
      <div className="hero-picker-grid">
        {visible.map((h) => (
          <button
            key={h.id}
            type="button"
            className={usedIds?.has(h.id) ? "used" : undefined}
            title={`${h.name}${usedIds?.has(h.id) ? " — уже на сетке, можно добавить ещё" : ""}`}
            onClick={() => onPick(h.id)}
          >
            <HeroThumb hero={h} />
            <span>{h.name}</span>
          </button>
        ))}
      </div>
      {visible.length === 0 && <p className="hint">Нет героя «{text.trim()}».</p>}
    </div>
  );
}
