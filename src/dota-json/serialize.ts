import type { DotaGridFileJson, GridDocument } from "../model/types";

function formatFloat(n: number): string {
  if (!Number.isFinite(n)) return "0.000000";
  return n.toFixed(6);
}

function formatInt(n: number): string {
  return String(Math.trunc(n));
}

/**
 * Serialize to Valve-like hero_grid_config.json.
 * Numeric values use 6 decimal places; hero ids are integers.
 */
export function serializeDotaGrid(doc: GridDocument): string {
  const file = toDotaFile(doc);
  return formatDotaFile(file);
}

export function toDotaFile(doc: GridDocument): DotaGridFileJson {
  return {
    version: doc.version,
    configs: doc.configs.map((cfg) => ({
      config_name: cfg.name,
      categories: cfg.categories.map((c) => ({
        category_name: c.name,
        x_position: c.x,
        y_position: c.y,
        width: c.width,
        height: c.height,
        hero_ids: c.heroIds,
      })),
    })),
  };
}

function formatDotaFile(file: DotaGridFileJson): string {
  const lines: string[] = [];
  lines.push("{");
  lines.push(`\t"version": ${file.version},`);
  lines.push(`\t"configs":`);
  lines.push("\t[");
  file.configs.forEach((cfg, ci) => {
    lines.push("\t\t{");
    lines.push(`\t\t\t"config_name": ${JSON.stringify(cfg.config_name)},`);
    lines.push(`\t\t\t"categories":`);
    lines.push("\t\t\t[");
    cfg.categories.forEach((cat, i) => {
      lines.push("\t\t\t\t{");
      lines.push(`\t\t\t\t\t"category_name": ${JSON.stringify(cat.category_name)},`);
      lines.push(`\t\t\t\t\t"x_position": ${formatFloat(cat.x_position)},`);
      lines.push(`\t\t\t\t\t"y_position": ${formatFloat(cat.y_position)},`);
      lines.push(`\t\t\t\t\t"width": ${formatFloat(cat.width)},`);
      lines.push(`\t\t\t\t\t"height": ${formatFloat(cat.height)},`);
      lines.push(`\t\t\t\t\t"hero_ids":`);
      if (cat.hero_ids.length === 0) {
        lines.push("\t\t\t\t\t[");
        lines.push("\t\t\t\t\t]");
      } else {
        lines.push("\t\t\t\t\t[");
        cat.hero_ids.forEach((id, hi) => {
          const comma = hi === cat.hero_ids.length - 1 ? "" : ",";
          lines.push(`\t\t\t\t\t\t${formatInt(id)}${comma}`);
        });
        lines.push("\t\t\t\t\t]");
      }
      const catComma = i === cfg.categories.length - 1 ? "" : ",";
      lines.push(`\t\t\t\t}${catComma}`);
    });
    lines.push("\t\t\t]");
    const cfgComma = ci === file.configs.length - 1 ? "" : ",";
    lines.push(`\t\t}${cfgComma}`);
  });
  lines.push("\t]");
  lines.push("}");
  lines.push("");
  return lines.join("\n");
}
