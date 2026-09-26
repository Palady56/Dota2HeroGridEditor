import { createId } from "./ids";
import {
  DOTA_JSON_VERSION,
  inferCategoryKind,
  type Category,
  type GridConfig,
  type GridDocument,
} from "./types";

export function emptyDocument(configName = "Custom"): GridDocument {
  const config: GridConfig = { id: createId("cfg"), name: configName, categories: [] };
  return { version: DOTA_JSON_VERSION, configs: [config], activeConfigId: config.id };
}

export function activeConfig(doc: GridDocument): GridConfig {
  return doc.configs.find((c) => c.id === doc.activeConfigId) ?? doc.configs[0];
}

export function updateActiveCategories(
  doc: GridDocument,
  update: (categories: Category[]) => Category[],
): GridDocument {
  const current = activeConfig(doc);
  const next = update(current.categories);
  if (next === current.categories) return doc;
  return {
    ...doc,
    configs: doc.configs.map((cfg) =>
      cfg.id === current.id ? { ...cfg, categories: next } : cfg,
    ),
  };
}

/** Swap auto-generated stamps; manual, imported and hero trays stay. */
export function replaceGenerated(doc: GridDocument, stamps: Category[]): GridDocument {
  return updateActiveCategories(doc, (cats) => {
    const kept = cats.filter((c) => c.origin !== "generated");
    const trays = kept.filter((c) => inferCategoryKind(c) === "tray");
    const rest = kept.filter((c) => inferCategoryKind(c) !== "tray");
    return [...rest, ...stamps, ...trays];
  });
}

/** Replace one photo's stamps and leave every other photo on the grid. */
export function replaceArt(doc: GridDocument, artId: string, stamps: Category[]): GridDocument {
  return updateActiveCategories(doc, (cats) => {
    const kept = cats.filter((c) => c.artId !== artId && !(c.origin === "generated" && !c.artId));
    const trays = kept.filter((c) => inferCategoryKind(c) === "tray");
    const rest = kept.filter((c) => inferCategoryKind(c) !== "tray");
    return [...rest, ...stamps, ...trays];
  });
}

/** Give the live photo an id before another photo is added, so its stamps are no longer "the current one". */
export function claimUntaggedArt(doc: GridDocument, artId: string): GridDocument {
  return updateActiveCategories(doc, (cats) =>
    cats.map((c) => (c.origin === "generated" && !c.artId ? { ...c, artId } : c)),
  );
}

/** Keep the current conversion on the grid when another photo is added. */
export function keepGeneratedArt(doc: GridDocument): GridDocument {
  return updateActiveCategories(doc, (cats) =>
    cats.map((c) => (c.origin === "generated" ? { ...c, origin: "manual" as const } : c)),
  );
}

/** A new picture replaces the old art but keeps hero trays and manual work. */
export function removeImportedArt(doc: GridDocument): GridDocument {
  return updateActiveCategories(doc, (cats) =>
    cats.filter(
      (c) =>
        c.origin === "manual" ||
        (c.origin === "imported" && inferCategoryKind(c) === "tray"),
    ),
  );
}

export function withoutCaptions(doc: GridDocument): GridDocument {
  return {
    ...doc,
    configs: doc.configs.map((cfg) => ({
      ...cfg,
      categories: cfg.categories.filter((c) => inferCategoryKind(c) !== "caption"),
    })),
  };
}

export function markManual(category: Category): Category {
  return category.origin === "generated" ? { ...category, origin: "manual" } : category;
}

export function setActiveConfig(doc: GridDocument, configId: string): GridDocument {
  return { ...doc, activeConfigId: configId };
}

export function renameActiveConfig(doc: GridDocument, name: string): GridDocument {
  return {
    ...doc,
    configs: doc.configs.map((cfg) =>
      cfg.id === doc.activeConfigId ? { ...cfg, name } : cfg,
    ),
  };
}

export function clearActiveConfig(doc: GridDocument): GridDocument {
  return updateActiveCategories(doc, () => []);
}

function uniqueConfigName(doc: GridDocument, base: string): string {
  const names = new Set(doc.configs.map((c) => c.name));
  if (!names.has(base)) return base;
  for (let i = 2; ; i++) {
    const name = `${base} ${i}`;
    if (!names.has(name)) return name;
  }
}

export function addConfig(doc: GridDocument, name = "Новая сетка"): GridDocument {
  const config: GridConfig = { id: createId("cfg"), name: uniqueConfigName(doc, name), categories: [] };
  return { ...doc, configs: [...doc.configs, config], activeConfigId: config.id };
}

export function duplicateActiveConfig(doc: GridDocument): GridDocument {
  const source = activeConfig(doc);
  const config: GridConfig = {
    id: createId("cfg"),
    name: uniqueConfigName(doc, `${source.name} (копия)`),
    categories: source.categories.map((c) => ({ ...c, id: createId("cat"), heroIds: [...c.heroIds] })),
  };
  return { ...doc, configs: [...doc.configs, config], activeConfigId: config.id };
}

/** The last remaining grid is emptied instead of removed: the file needs at least one. */
export function removeActiveConfig(doc: GridDocument): GridDocument {
  if (doc.configs.length <= 1) return clearActiveConfig(doc);
  const index = doc.configs.findIndex((c) => c.id === doc.activeConfigId);
  const configs = doc.configs.filter((c) => c.id !== doc.activeConfigId);
  return { ...doc, configs, activeConfigId: configs[Math.max(0, index - 1)].id };
}

export type MergeResult = { doc: GridDocument; replaced: boolean };

/**
 * Put `config` into another file: a grid with the same name is replaced in
 * place, otherwise the grid is appended. All other grids stay untouched.
 */
export function mergeConfigInto(target: GridDocument, config: GridConfig): MergeResult {
  const index = target.configs.findIndex((c) => c.name === config.name);
  const copy: GridConfig = { ...config, id: createId("cfg") };
  if (index < 0) {
    return { doc: { ...target, configs: [...target.configs, copy], activeConfigId: copy.id }, replaced: false };
  }
  const configs = target.configs.map((c, i) => (i === index ? copy : c));
  return { doc: { ...target, configs, activeConfigId: copy.id }, replaced: true };
}
