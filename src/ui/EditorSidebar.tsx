import { useState, type ReactNode } from "react";
import { IconBrush, IconEraser, IconGrid, IconMove, IconPointer, IconShapes } from "./icons";
import type { Tool } from "./EditorCanvas";
import type { ShapeKind, ShapeSettings } from "../editor/shapes";
import { Section, Slider } from "./controls";

type Props = {
  tool: Tool;
  onTool: (tool: Tool) => void;
  glyph: string;
  onGlyph: (glyph: string) => void;
  eraseRadius: number;
  onEraseRadius: (r: number) => void;
  eraseRadiusRange: [number, number];
  brushStep: number;
  onBrushStep: (step: number) => void;
  brushStepRange: [number, number];
  shape: ShapeSettings;
  onShape: (patch: Partial<ShapeSettings>) => void;
  shapeStepRange: [number, number];
  /** Number of selected categories a frame can go around. */
  selectedCount: number;
  onFrameSelection: (padding: number) => void;
  trayCols: number;
  onTrayCols: (cols: number) => void;
  trayColsRange: [number, number];
};

const SHAPES: { id: ShapeKind; icon: string; label: string }[] = [
  { id: "line", icon: "╱", label: "Линия" },
  { id: "rect", icon: "▭", label: "Прямоуг." },
  { id: "diamond", icon: "◇", label: "Ромб" },
  { id: "triangle", icon: "△", label: "Треугольник" },
  { id: "ellipse", icon: "◯", label: "Овал" },
];

const SHAPE_TITLES: Record<ShapeKind, string> = {
  line: "Линия",
  rect: "Прямоугольник",
  diamond: "Ромб",
  triangle: "Треугольник",
  ellipse: "Овал",
};

const SHAPE_HINTS: Record<ShapeKind, string> = {
  line: "Shift — строго горизонтально, вертикально или под 45°. Alt — от центра",
  rect: "Shift — квадрат. Alt — от центра",
  diamond: "Shift — ровный ромб. Alt — от центра",
  triangle: "Shift — равные ширина и высота. Alt — от центра",
  ellipse: "Shift — круг. Alt — от центра",
};

const TOOLS: { id: Tool; label: string; key: string; hint: string; icon: ReactNode }[] = [
  { id: "select", label: "Выбор", key: "V", icon: <IconPointer />, hint: "Клик — выбрать, перетащить — двигать, рамка — выбрать несколько, Shift — добавить" },
  { id: "stamp", label: "Кисть", key: "B", icon: <IconBrush />, hint: "Ставит выбранный символ; можно вести мышью" },
  { id: "shape", label: "Фигура", key: "G", icon: <IconShapes />, hint: "Линия, прямоугольник, ромб, треугольник или овал из символов" },
  { id: "erase", label: "Ластик", key: "E", icon: <IconEraser />, hint: "Стирает символы под кругом (блоки героев не трогает)" },
  { id: "tray", label: "Блок героев", key: "T", icon: <IconGrid />, hint: "Клик — блок на выбранную ширину и 2 ряда. Тяните — целое число иконок. Ctrl + колесо — число колонок" },
  { id: "pan", label: "Рука", key: "H", icon: <IconMove />, hint: "Двигать холст" },
];

type PaletteGroup = { title: string; hint?: string; glyphs: string[] };

const PALETTE: PaletteGroup[] = [
  { title: "Линии и точки", glyphs: [".", "-", "|", "/", "\\", ":", "'", ",", "_", "~", "^", "*", "+", "=", "o"] },
  {
    title: "Японские",
    hint: "Японские символы уже есть в ваших сетках — Dota их показывает",
    glyphs: ["ぎ", "ず", "の", "ん", "ツ", "シ", "ノ", "ミ", "彡", "〆", "ゞ", "ヅ", "ッ", "ヽ", "丶"],
  },
  {
    title: "Иероглифы",
    hint: "Иероглифы (кандзи / ханьцзы)",
    glyphs: ["人", "口", "木", "山", "川", "心", "愛", "龍", "火", "水", "日", "月", "田", "十", "光", "闇", "鬼", "神", "死", "夢"],
  },
  {
    title: "Фигуры",
    hint: "♡ проверен в Dota; остальные проверьте в игре — если шрифт Dota не знает символ, будет пустой квадрат",
    glyphs: ["♡", "♥", "☆", "★", "♪", "♫", "○", "●", "□", "■", "△", "▽", "◇", "◆", "∞", "✝", "♠", "♣", "♦", "☯", "✿", "❀", "☠", "⚔"],
  },
];

export function EditorSidebar(props: Props) {
  const [framePadding, setFramePadding] = useState(6);
  const shape = props.shape;
  return (
    <>
      <Section title="Инструменты">
        <div className="tool-list">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`btn tool ${props.tool === t.id ? "active" : ""}`}
              title={t.hint}
              onClick={() => props.onTool(t.id)}
            >
              {t.icon}
              <span className="tool-label">{t.label}</span>
              <kbd>{t.key}</kbd>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Символ кисти">
        {PALETTE.map((group) => (
          <div key={group.title} className="palette-group">
            <div className="palette-title" title={group.hint}>
              {group.title}
              {group.hint && <span className="palette-info">ⓘ</span>}
            </div>
            <div className="palette">
              {group.glyphs.map((g) => (
                <button
                  key={g}
                  type="button"
                  className={`btn glyph ${props.glyph === g ? "active" : ""}`}
                  onClick={() => {
                    props.onGlyph(g);
                    if (props.tool === "shape") props.onShape({ autoGlyph: false });
                    else props.onTool("stamp");
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        ))}
        <label className="field compact">
          <span>Свой символ (можно вставить любой)</span>
          <input className="glyph-input" value={props.glyph} onChange={(e) => props.onGlyph(e.target.value)} />
        </label>
        <Slider
          label="Шаг кисти"
          value={props.brushStep}
          min={props.brushStepRange[0]}
          max={props.brushStepRange[1]}
          step={1}
          format={(v) => `${v} px`}
          hint="Расстояние между символами, когда ведёте кистью. Ctrl + колесо на холсте"
          onChange={props.onBrushStep}
        />
      </Section>

      <Section title="Фигуры">
        <div className="shape-list">
          {SHAPES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`btn shape ${props.tool === "shape" && shape.kind === s.id ? "active" : ""}`}
              title={`${SHAPE_TITLES[s.id]}. ${SHAPE_HINTS[s.id]}`}
              onClick={() => {
                props.onShape({ kind: s.id });
                props.onTool("shape");
              }}
            >
              <span className="shape-icon">{s.icon}</span>
              <span className="shape-label">{s.label}</span>
            </button>
          ))}
        </div>
        <p className="hint">
          Потяните мышью по холсту. {SHAPE_HINTS[shape.kind]}. Клавиша <kbd>G</kbd> — последняя фигура.
        </p>
        <div className="field-label">Чем рисовать контур</div>
        <div className="segmented">
          <button
            type="button"
            className={`btn ${shape.autoGlyph ? "active" : ""}`}
            title="Горизонтальные края — «-», вертикальные — «|», диагонали — «/» и «\»"
            onClick={() => props.onShape({ autoGlyph: true })}
          >
            Авто <span className="glyph-inline">- | / \</span>
          </button>
          <button
            type="button"
            className={`btn ${!shape.autoGlyph ? "active" : ""}`}
            title="Весь контур одним символом"
            onClick={() => props.onShape({ autoGlyph: false })}
          >
            Свой символ
          </button>
        </div>
        {!shape.autoGlyph && (
          <label className="field compact own-glyph">
            <span>Символ (впишите или нажмите в палитре выше)</span>
            <input
              className="glyph-input"
              value={props.glyph}
              placeholder="♡"
              autoFocus
              onChange={(e) => props.onGlyph(e.target.value)}
            />
          </label>
        )}
        <label className="field compact">
          <span>Уголки и концы (пусто — как у линии)</span>
          <input
            className="glyph-input"
            value={shape.corner}
            placeholder="например + или o"
            onChange={(e) => props.onShape({ corner: e.target.value })}
          />
        </label>
        <Slider
          label="Шаг фигуры"
          value={shape.step}
          min={props.shapeStepRange[0]}
          max={props.shapeStepRange[1]}
          step={1}
          format={(v) => `${v} px`}
          hint="Расстояние между символами контура. Ctrl + колесо на холсте"
          onChange={(step) => props.onShape({ step })}
        />
        <div className="frame-row">
          <Slider
            label="Отступ рамки"
            value={framePadding}
            min={0}
            max={40}
            step={1}
            format={(v) => `${v} px`}
            onChange={setFramePadding}
          />
          <button
            type="button"
            className="btn"
            disabled={props.selectedCount === 0}
            title="Обводит выбранные блоки героев или символы текущей фигурой"
            onClick={() => props.onFrameSelection(framePadding)}
          >
            Обвести выбранное
          </button>
        </div>
      </Section>

      <Section title="Блок героев">
        <div className="field-label">Ширина в иконках</div>
        <div className="segmented tray-cols">
          {Array.from({ length: props.trayColsRange[1] - props.trayColsRange[0] + 1 }, (_, i) => {
            const n = props.trayColsRange[0] + i;
            return (
              <button
                key={n}
                type="button"
                className={props.trayCols === n ? "active" : ""}
                title={`${n} ${n === 1 ? "герой" : n < 5 ? "героя" : "героев"} в ряду`}
                onClick={() => {
                  props.onTrayCols(n);
                  props.onTool("tray");
                }}
              >
                {n}
              </button>
            );
          })}
        </div>
        <p className="hint">
          Клик ставит блок {props.trayCols}×2. Тяните мышью — рамка прыгает по целым иконкам и обнимает их без лишнего поля. Потом добавьте героев справа.
        </p>
      </Section>

      <Section title="Ластик">
        <Slider
          label="Радиус"
          value={props.eraseRadius}
          min={props.eraseRadiusRange[0]}
          max={props.eraseRadiusRange[1]}
          step={1}
          format={(v) => `${v} px`}
          hint="Ctrl + колесо на холсте"
          onChange={props.onEraseRadius}
        />
      </Section>

      <Section title="Управление">
        <ul className="hint-list">
          <li>Колесо — масштаб</li>
          <li>Ctrl + колесо — радиус ластика / шаг кисти или фигуры / ширина блока героев</li>
          <li>Фигура: Shift — ровно (квадрат, круг, линия 0/45/90°), Alt — от центра</li>
          <li>Пробел + мышь, средняя или правая кнопка — двигать холст</li>
          <li>Delete — удалить выбранное</li>
          <li>Стрелки — сдвиг на 1 (Shift — на 10)</li>
          <li>Ctrl+Z / Ctrl+Y — отменить / повторить</li>
          <li>Ctrl+A — выбрать всё, Esc — снять выбор</li>
        </ul>
      </Section>
    </>
  );
}
