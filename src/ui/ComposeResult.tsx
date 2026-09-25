import { inferCategoryKind, type Category } from "../model/types";
import type { ValidationIssue } from "../dota-json/validate";
import { Section } from "./controls";

type Props = {
  categories: Category[];
  issues: ValidationIssue[];
  configName: string;
  onConfigName: (name: string) => void;
  onReplaceCurrent: () => void;
  onAddAsNew: () => void;
  onSave: () => void;
};

export function ComposeResult(props: Props) {
  const trays = props.categories.filter((c) => inferCategoryKind(c) === "tray").length;
  const empty = props.categories.length === 0;
  return (
    <>
      <Section title="Результат">
        <table className="stats">
          <tbody>
            <tr>
              <td>Символов и надписей</td>
              <td>{props.categories.length - trays}</td>
            </tr>
            <tr>
              <td>Блоков героев</td>
              <td>{trays}</td>
            </tr>
          </tbody>
        </table>
        {props.issues.length > 0 && (
          <ul className="issue-list compact">
            {props.issues.map((issue, i) => (
              <li key={i} className={`issue ${issue.level}`}>
                {issue.message}
              </li>
            ))}
          </ul>
        )}
        <p className="hint">Символы за краем сетки 1193×593 не попадут в результат.</p>
      </Section>

      <Section title="Куда отправить">
        <label className="field compact">
          <span>Название сетки</span>
          <input value={props.configName} onChange={(e) => props.onConfigName(e.target.value)} />
        </label>
        <button type="button" className="btn primary wide" disabled={empty} onClick={props.onAddAsNew}>
          В редактор как новую сетку
        </button>
        <button type="button" className="btn wide" disabled={empty} onClick={props.onReplaceCurrent}>
          В редактор, заменив текущую сетку
        </button>
        <button type="button" className="btn wide" disabled={empty} onClick={props.onSave}>
          Сохранить как отдельный JSON
        </button>
        <p className="hint">
          После отправки в редактор можно дорисовать детали и сохранить или добавить в свой файл Dota кнопкой
          «В мой файл Dota…» в шапке.
        </p>
      </Section>
    </>
  );
}
