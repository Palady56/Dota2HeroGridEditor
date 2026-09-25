import { defaultConversionSettings, type ConversionSettings, type SymbolSettings } from "../model/types";
import { SYMBOL_PRESETS } from "./symbolSet";

/** Settings a style decides. Brightness, contrast, blur and thresholds stay tuned to the photo. */
const STYLE_KEYS = [
  "mode",
  "outline",
  "spacing",
  "fill",
  "fillThreshold",
  "fillSpacing",
  "fillGlyph",
  "fillRamp",
  "fillOutside",
  "fillGap",
] as const satisfies readonly (keyof ConversionSettings)[];

type StyleKey = (typeof STYLE_KEYS)[number];
export type StyleSettings = Pick<ConversionSettings, StyleKey>;

export type ArtStyle = {
  id: string;
  name: string;
  description: string;
  settings: StyleSettings;
  symbols: SymbolSettings;
};

const [SAMPLE, , DOTS] = SYMBOL_PRESETS.map((p) => p.settings);

function base(): StyleSettings {
  const d = defaultConversionSettings();
  const out = {} as Record<StyleKey, unknown>;
  for (const k of STYLE_KEYS) out[k] = d[k];
  return out as StyleSettings;
}

function style(
  id: string,
  name: string,
  description: string,
  settings: Partial<StyleSettings>,
  symbols: SymbolSettings = SAMPLE,
): ArtStyle {
  return { id, name, description, settings: { ...base(), ...settings }, symbols };
}

export const ART_STYLES: ArtStyle[] = [
  style("outline", "Контур", "Контуры фото символами - | / \\ и точками. Как в примере Kaneki.", {}),
  style("drawing", "Рисунок", "Средняя линия тёмных штрихов. Для аниме, артов и логотипов.", { mode: "lines" }),
  style("dotted", "Пунктир", "Те же контуры, но только точками — мягко и аккуратно.", { spacing: 4 }, DOTS),
  style("shadows", "Тени", "Контур плюс точки в тёмных местах: волосы, одежда, тени.", {
    fill: "shadows",
    fillThreshold: 95,
    fillSpacing: 7,
    fillGlyph: ".",
    fillGap: 4,
  }),
  style("background", "Заливка фона", "Контур на фоне из точек: фон фото и вся сетка вокруг заполнены.", {
    fill: "lights",
    fillThreshold: 165,
    fillSpacing: 8,
    fillGlyph: ".",
    fillOutside: true,
    fillGap: 5,
  }),
  style("silhouette", "Силуэт", "Без контура: тёмные области залиты символом #.", {
    outline: false,
    fill: "shadows",
    fillThreshold: 110,
    fillSpacing: 7,
    fillGlyph: "#",
  }),
  style("ascii", "ASCII-полутона", "Классический ASCII-арт: чем светлее место, тем плотнее символ.", {
    outline: false,
    fill: "tone",
    fillSpacing: 7,
    fillRamp: " .:-=+*#%@",
  }),
  style(
    "kanji",
    "Иероглифы",
    "Контур японскими знаками 一 丨 ノ ヽ 丶. Проверьте в игре — не все знаки могут быть в шрифте Dota.",
    { spacing: 9 },
    { horizontal: "一", vertical: "丨", diagDown: "ヽ", diagUp: "ノ", fallback: "丶", minStraightness: 0.8, minRun: 2 },
  ),
  style("hearts", "Сердечки", "Точечный контур, тени заполнены ♡.", {
    spacing: 4,
    fill: "shadows",
    fillThreshold: 100,
    fillSpacing: 12,
    fillGlyph: "♡",
    fillGap: 6,
  }, DOTS),
  style("stars", "Звёздное небо", "Контур, а вокруг — редкие звёздочки по всей сетке.", {
    fill: "lights",
    fillThreshold: 200,
    fillSpacing: 16,
    fillGlyph: "*",
    fillOutside: true,
    fillGap: 8,
  }),
];

export function applyStyle(s: ArtStyle, settings: ConversionSettings): { settings: ConversionSettings; symbols: SymbolSettings } {
  return { settings: { ...settings, ...s.settings }, symbols: s.symbols };
}

export function activeStyleId(settings: ConversionSettings, symbols: SymbolSettings): string | null {
  const match = ART_STYLES.find(
    (s) =>
      STYLE_KEYS.every((k) => s.settings[k] === settings[k]) &&
      (Object.keys(s.symbols) as (keyof SymbolSettings)[]).every((k) => s.symbols[k] === symbols[k]),
  );
  return match?.id ?? null;
}
