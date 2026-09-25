import { useId, useState } from "react";
import { HEROES } from "../heroes/heroes";

type Props = {
  onPick: (heroId: number) => void;
  usedIds: ReadonlySet<number>;
};

export function HeroPicker({ onPick, usedIds }: Props) {
  const [text, setText] = useState("");
  const listId = useId();

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
    setText("");
  };

  return (
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
            {usedIds.has(h.id) ? "уже на сетке" : `id ${h.id}`}
          </option>
        ))}
      </datalist>
    </div>
  );
}
