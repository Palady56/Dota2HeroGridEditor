import { describe, expect, it } from "vitest";
import { parseDotaGridJson } from "../dota-json/parse";
import { serializeDotaGrid } from "../dota-json/serialize";
import { validateDotaGridFile } from "../dota-json/validate";
import {
  addConfig,
  duplicateActiveConfig,
  emptyDocument,
  mergeConfigInto,
  removeActiveConfig,
} from "../model/document";
import type { Category, GridConfig } from "../model/types";
import { alignLayer, createLayer, flattenLayers, layerAt, layerBounds, scaleLayer } from "./layers";
import { GLYPH_HIT } from "../render/glyph";
import { createId, reserveIds } from "../model/ids";
import { transformGlyph } from "../symbols/symbolSet";
import kaneki from "../dota-json/fixtures/hero_grid_config.json";
import favorite from "../dota-json/fixtures/hero_grid_config_favorite.json";

function stamp(x: number, y: number, name = "."): Category {
  return { id: `s${x}-${y}`, name, x, y, width: 30, height: 30, heroIds: [], origin: "imported" };
}

function tray(x: number, y: number, heroIds: number[]): Category {
  return { id: `t${x}-${y}`, name: "", x, y, width: 100, height: 120, heroIds, origin: "imported" };
}

const entry = (categories: Category[]) => ({ id: "e", fileName: "f.json", configName: "Art", categories });

describe("merge into an existing Dota file", () => {
  const favDoc = () => parseDotaGridJson(JSON.stringify(favorite));
  const art: GridConfig = { id: "x", name: "Kaneki art", categories: [stamp(10, 10)] };

  it("appends a new grid and keeps every other grid", () => {
    const target = favDoc();
    const { doc, replaced } = mergeConfigInto(target, art);
    expect(replaced).toBe(false);
    expect(doc.configs).toHaveLength(target.configs.length + 1);
    expect(doc.configs[0].categories).toHaveLength(844);
    const reparsed = parseDotaGridJson(serializeDotaGrid(doc));
    expect(reparsed.configs.map((c) => c.name)).toEqual([...target.configs.map((c) => c.name), "Kaneki art"]);
  });

  it("replaces a grid with the same name in place", () => {
    const target = favDoc();
    const name = target.configs[0].name;
    const { doc, replaced } = mergeConfigInto(target, { ...art, name });
    expect(replaced).toBe(true);
    expect(doc.configs).toHaveLength(target.configs.length);
    expect(doc.configs[0].categories).toHaveLength(1);
  });
});

describe("grid management", () => {
  it("adds, duplicates and removes grids; the last one is only cleared", () => {
    let doc = addConfig(emptyDocument("Custom"));
    expect(doc.configs.map((c) => c.name)).toEqual(["Custom", "Новая сетка"]);
    doc = addConfig(doc);
    expect(doc.configs[2].name).toBe("Новая сетка 2");
    doc = duplicateActiveConfig(doc);
    expect(doc.configs).toHaveLength(4);
    doc = removeActiveConfig(removeActiveConfig(removeActiveConfig(doc)));
    expect(doc.configs).toHaveLength(1);
    const last = removeActiveConfig(doc);
    expect(last.configs).toHaveLength(1);
    expect(last.configs[0].categories).toHaveLength(0);
  });
});

describe("compose layers", () => {
  it("moves, scales around the centre and flattens into manual categories", () => {
    const layer = createLayer(entry([stamp(100, 100), stamp(200, 100), tray(300, 50, [1])]));
    expect(layer.x).toBe(100);
    expect(layer.y).toBe(50);

    const moved = { ...layer, x: 0, y: 0 };
    const flat = flattenLayers([moved]);
    expect(flat).toHaveLength(3);
    expect(flat[0]).toMatchObject({ x: 0, y: 50, width: 30, height: 30, origin: "manual" });
    expect(flat[2]).toMatchObject({ x: 200, y: 0, width: 100, height: 120, heroIds: [1] });

    const big = scaleLayer(moved, 2);
    const flatBig = flattenLayers([{ ...big, x: 0, y: 0 }]);
    expect(flatBig[1].x - flatBig[0].x).toBeCloseTo(200);
    expect(flatBig[0].width).toBe(30);
    expect(flatBig[2].width).toBe(200);
    const b0 = layerBounds(moved)!;
    const b1 = layerBounds(big)!;
    expect(Math.abs(b1.x + b1.width / 2 - (b0.x + b0.width / 2))).toBeLessThan(GLYPH_HIT.width);
  });

  it("rotates and mirrors layers, turning line glyphs with them", () => {
    // A horizontal row of "-" from x=100 to x=200.
    const row = [0, 25, 50, 75, 100].map((d) => stamp(100 + d, 100, "-"));
    const layer = createLayer(entry(row));
    const turned = flattenLayers([{ ...layer, rotation: 90 }]);
    expect(turned.every((c) => c.name === "|")).toBe(true);
    const xs = turned.map((c) => c.x);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(0.01);
    const ys = turned.map((c) => c.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(100);

    const diag = flattenLayers([{ ...layer, rotation: 45 }]);
    expect(diag.every((c) => c.name === "\\")).toBe(true);

    const mirrored = flattenLayers([{ ...layer, flipX: true }]);
    expect(mirrored.map((c) => c.x)).toEqual(flattenLayers([layer]).map((c) => c.x).reverse());

    const trayLayer = createLayer(entry([tray(0, 0, [1])]));
    const sideways = flattenLayers([{ ...trayLayer, rotation: 90 }]);
    expect(sideways[0]).toMatchObject({ width: 120, height: 100 });
  });

  it("maps line glyphs through rotation and mirroring", () => {
    expect(transformGlyph("|", 90, false, false)).toBe("-");
    expect(transformGlyph("/", 90, false, false)).toBe("\\");
    expect(transformGlyph("-", -45, false, false)).toBe("/");
    expect(transformGlyph("/", 0, true, false)).toBe("\\");
    expect(transformGlyph("/", 0, true, true)).toBe("/");
    expect(transformGlyph("ぎ", 90, true, false)).toBe("ぎ");
  });

  it("hides trays and captions without shifting the art, drops symbols off the grid", () => {
    const layer = createLayer(entry([stamp(100, 100), tray(300, 50, [1]), { ...stamp(10, 10), name: "TEXT" }]));
    expect(layer.includeCaptions).toBe(false);
    const withTrays = flattenLayers([layer]);
    const noTrays = flattenLayers([{ ...layer, includeTrays: false }]);
    expect(withTrays).toHaveLength(2);
    expect(noTrays).toHaveLength(1);
    expect(noTrays[0].x).toBe(withTrays[0].x);

    const offGrid = flattenLayers([{ ...layer, x: 5000 }]);
    expect(offGrid.every((c) => c.heroIds.length > 0)).toBe(true);
  });

  it("aligns to grid edges and picks the topmost layer", () => {
    const a = createLayer(entry([stamp(100, 100)]));
    const b = createLayer(entry([stamp(100, 100)]));
    expect(layerBounds(alignLayer(a, "left"))!.x).toBe(0);
    expect(layerBounds(alignLayer(a, "bottom"))!.y + layerBounds(a)!.height).toBeCloseTo(593);
    expect(layerAt([a, b], 103, 105)).toBe(b.id);
    expect(layerAt([a, { ...b, visible: false }], 103, 105)).toBe(a.id);
    expect(layerAt([a, b], 5, 5)).toBeNull();
  });

  it("combines two files into one valid grid", () => {
    const k = parseDotaGridJson(JSON.stringify(kaneki)).configs[0];
    const f = parseDotaGridJson(JSON.stringify(favorite)).configs[0];
    const left = alignLayer(scaleLayer(createLayer({ ...entry(k.categories), configName: "K" }), 0.5), "left");
    const right = alignLayer(scaleLayer(createLayer({ ...entry(f.categories), configName: "F" }), 0.5), "right");
    const cats = flattenLayers([left, right]);
    expect(cats.length).toBeGreaterThan(1500);
    const doc = { ...emptyDocument("Mix"), configs: [{ id: "c", name: "Mix", categories: cats }], activeConfigId: "c" };
    const issues = validateDotaGridFile(JSON.parse(serializeDotaGrid(doc)));
    expect(issues.filter((i) => i.level === "error")).toEqual([]);
  });
});

describe("restored ids", () => {
  it("never hands out an id that was restored", () => {
    reserveIds(["cat_zz", "cfg_1", "junk"]);
    const next = createId("cat");
    expect(parseInt(next.split("_")[1], 36)).toBeGreaterThan(parseInt("zz", 36));
  });
});

describe("validation messages", () => {
  it("warns about grid overflow and unknown heroes, not repeated heroes", () => {
    const file = {
      version: 3,
      configs: [
        {
          config_name: "A",
          categories: [
            { category_name: ".", x_position: 10, y_position: 580, width: 30, height: 30, hero_ids: [] },
            { category_name: "", x_position: 0, y_position: 0, width: 100, height: 100, hero_ids: [1, 99999] },
          ],
        },
        {
          config_name: "B",
          categories: [{ category_name: "", x_position: 0, y_position: 0, width: 100, height: 100, hero_ids: [1] }],
        },
      ],
    };
    const messages = validateDotaGridFile(file).map((i) => i.message);
    expect(messages.some((m) => m.includes("нижний край"))).toBe(true);
    expect(messages.some((m) => m.includes("99999"))).toBe(true);
    expect(messages.some((m) => m.includes("стоит в сетке"))).toBe(false);
  });
});
