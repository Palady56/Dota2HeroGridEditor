import { DOTA_JSON_VERSION, GRID_SIZE } from "../model/types";
import { HERO_BY_ID } from "../heroes/heroes";

export type IssueLevel = "error" | "warning" | "info";

export type ValidationIssue = {
  level: IssueLevel;
  message: string;
};

/** Per-category errors beyond this are summarised in one line. */
const MAX_DETAILED_ERRORS = 20;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function heroLabel(id: number): string {
  const hero = HERO_BY_ID.get(id);
  return hero ? `${id} (${hero.name})` : String(id);
}

export function validateDotaGridFile(raw: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  let categoryErrors = 0;
  const categoryError = (message: string) => {
    categoryErrors++;
    if (categoryErrors <= MAX_DETAILED_ERRORS) issues.push({ level: "error", message });
  };

  if (!isRecord(raw)) {
    issues.push({ level: "error", message: "Это не файл сетки: корень JSON должен быть объектом" });
    return issues;
  }
  if (raw.version !== DOTA_JSON_VERSION) {
    issues.push({
      level: "error",
      message: `Неподдерживаемая version ${String(raw.version)}, нужна ${DOTA_JSON_VERSION}`,
    });
  }
  if (!Array.isArray(raw.configs)) {
    issues.push({ level: "error", message: "В файле нет списка configs" });
    return issues;
  }
  if (raw.configs.length === 0) {
    issues.push({ level: "error", message: "Список configs пуст — в файле нет ни одной сетки" });
  }

  raw.configs.forEach((cfg, ci) => {
    if (!isRecord(cfg)) {
      issues.push({ level: "error", message: `configs[${ci}] не объект` });
      return;
    }
    const cfgLabel =
      typeof cfg.config_name === "string" ? `Сетка «${cfg.config_name}»` : `Сетка №${ci + 1}`;
    if (typeof cfg.config_name !== "string") {
      issues.push({ level: "error", message: `${cfgLabel}: config_name должен быть строкой` });
    } else if (cfg.config_name.trim() === "") {
      issues.push({ level: "warning", message: `${cfgLabel}: пустое название сетки` });
    }
    if (!Array.isArray(cfg.categories)) {
      issues.push({ level: "error", message: `${cfgLabel}: categories должен быть массивом` });
      return;
    }

    const heroCount = new Map<number, number>();
    const unknownHeroes = new Set<number>();
    let beyondBottom = 0;
    let beyondRight = 0;
    let negative = 0;

    cfg.categories.forEach((cat, ki) => {
      const path = `${cfgLabel}, категория №${ki + 1}`;
      if (!isRecord(cat)) {
        categoryError(`${path}: не объект`);
        return;
      }
      if (typeof cat.category_name !== "string") {
        categoryError(`${path}: category_name должен быть строкой`);
      }
      for (const field of ["x_position", "y_position", "width", "height"] as const) {
        if (!isFiniteNumber(cat[field])) categoryError(`${path}: ${field} должен быть числом`);
      }
      if (isFiniteNumber(cat.width) && cat.width <= 0) categoryError(`${path}: width должен быть > 0`);
      if (isFiniteNumber(cat.height) && cat.height <= 0) categoryError(`${path}: height должен быть > 0`);
      if (
        isFiniteNumber(cat.x_position) &&
        isFiniteNumber(cat.y_position) &&
        isFiniteNumber(cat.width) &&
        isFiniteNumber(cat.height)
      ) {
        if (cat.x_position < 0 || cat.y_position < 0) negative++;
        if (cat.y_position + cat.height > GRID_SIZE.height + 0.5) beyondBottom++;
        if (cat.x_position + cat.width > GRID_SIZE.width + 0.5) beyondRight++;
      }
      if (!Array.isArray(cat.hero_ids)) {
        categoryError(`${path}: hero_ids должен быть массивом`);
        return;
      }
      cat.hero_ids.forEach((id) => {
        if (!Number.isInteger(id) || (id as number) <= 0) {
          categoryError(`${path}: id героя «${String(id)}» должен быть целым числом > 0`);
          return;
        }
        const n = id as number;
        heroCount.set(n, (heroCount.get(n) ?? 0) + 1);
        if (!HERO_BY_ID.has(n)) unknownHeroes.add(n);
      });
    });

    for (const [id, count] of heroCount) {
      if (count > 1) {
        issues.push({
          level: "warning",
          message: `${cfgLabel}: герой ${heroLabel(id)} стоит в сетке ${count} раза`,
        });
      }
    }
    if (unknownHeroes.size) {
      issues.push({
        level: "warning",
        message: `${cfgLabel}: неизвестные id героев ${[...unknownHeroes].join(", ")} (новый герой или ошибка в файле)`,
      });
    }
    if (beyondBottom) {
      issues.push({
        level: "warning",
        message: `${cfgLabel}: ${beyondBottom} категорий выходят за нижний край ${GRID_SIZE.height} px — в Dota может появиться прокрутка`,
      });
    }
    if (beyondRight) {
      issues.push({
        level: "warning",
        message: `${cfgLabel}: ${beyondRight} категорий выходят за правый край ${GRID_SIZE.width} px`,
      });
    }
    if (negative) {
      issues.push({
        level: "warning",
        message: `${cfgLabel}: ${negative} категорий с отрицательными координатами`,
      });
    }
  });

  if (categoryErrors > MAX_DETAILED_ERRORS) {
    issues.push({
      level: "error",
      message: `…и ещё ${categoryErrors - MAX_DETAILED_ERRORS} ошибок в категориях`,
    });
  }
  return issues;
}
