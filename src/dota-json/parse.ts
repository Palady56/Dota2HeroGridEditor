import { createId } from "../model/ids";
import type {
  Category,
  DotaCategoryJson,
  DotaGridFileJson,
  GridDocument,
} from "../model/types";
import { DOTA_JSON_VERSION } from "../model/types";
import { validateDotaGridFile, type ValidationIssue } from "./validate";

export class GridParseError extends Error {
  constructor(
    message: string,
    readonly issues: ValidationIssue[],
  ) {
    super(message);
    this.name = "GridParseError";
  }
}

export function parseDotaGridJson(text: string): GridDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(text.replace(/^\uFEFF/, ""));
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    throw new GridParseError("Файл не является корректным JSON", [
      { level: "error", message: `Ошибка синтаксиса JSON: ${detail}` },
    ]);
  }
  return parseDotaGridValue(raw);
}

export function parseDotaGridValue(raw: unknown): GridDocument {
  const issues = validateDotaGridFile(raw);
  const errors = issues.filter((i) => i.level === "error");
  if (errors.length) {
    throw new GridParseError(errors[0].message, issues);
  }
  const file = raw as DotaGridFileJson;
  const configs = file.configs.map((cfg) => ({
    id: createId("cfg"),
    name: cfg.config_name,
    categories: cfg.categories.map(fromDotaCategory),
  }));
  return {
    version: DOTA_JSON_VERSION,
    configs,
    activeConfigId: configs[0].id,
  };
}

export function fromDotaCategory(cat: DotaCategoryJson): Category {
  return {
    id: createId("cat"),
    name: cat.category_name,
    x: cat.x_position,
    y: cat.y_position,
    width: cat.width,
    height: cat.height,
    heroIds: [...cat.hero_ids],
    origin: "imported",
  };
}
