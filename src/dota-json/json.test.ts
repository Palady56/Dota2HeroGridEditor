import { describe, expect, it } from "vitest";
import { parseDotaGridJson } from "./parse";
import { serializeDotaGrid } from "./serialize";
import { validateDotaGridFile } from "./validate";
import { inferCategoryKind } from "../model/types";
import { withoutCaptions } from "../model/document";
import kaneki from "./fixtures/hero_grid_config.json";
import favorite from "./fixtures/hero_grid_config_favorite.json";

describe("dota json", () => {
  it("parses the Kaneki custom grid", () => {
    const doc = parseDotaGridJson(JSON.stringify(kaneki));
    expect(doc.version).toBe(3);
    expect(doc.configs).toHaveLength(1);
    expect(doc.configs[0].name).toBe("Custom");
    expect(doc.configs[0].categories).toHaveLength(1464);
    const trays = doc.configs[0].categories.filter((c) => inferCategoryKind(c) === "tray");
    expect(trays).toHaveLength(2);
    expect(trays[0].heroIds).toEqual([12, 8, 54, 59, 38, 34]);
    expect(trays[1].heroIds).toEqual([11, 1, 74, 2, 113, 42]);
    const dots = doc.configs[0].categories.filter((c) => c.name === ".");
    expect(dots).toHaveLength(598);
    const caption = doc.configs[0].categories.find((c) =>
      c.name.startsWith("ЛЕТЕЛИ"),
    );
    expect(caption?.x).toBe(25);
    expect(caption?.y).toBe(23);
    expect(doc.configs[0].categories.every((c) => c.origin === "imported")).toBe(true);
  });

  it("the example loader strips the four captions", () => {
    const doc = withoutCaptions(parseDotaGridJson(JSON.stringify(kaneki)));
    const cats = doc.configs[0].categories;
    expect(cats).toHaveLength(1460);
    expect(cats.some((c) => inferCategoryKind(c) === "caption")).toBe(false);
    expect(cats.filter((c) => inferCategoryKind(c) === "tray")).toHaveLength(2);
  });

  it("roundtrips parse → serialize → parse", () => {
    const a = parseDotaGridJson(JSON.stringify(kaneki));
    const b = parseDotaGridJson(serializeDotaGrid(a));
    expect(b.configs[0].name).toBe(a.configs[0].name);
    expect(b.configs[0].categories).toHaveLength(a.configs[0].categories.length);
    b.configs[0].categories.forEach((cat, i) => {
      const orig = a.configs[0].categories[i];
      expect(cat.name).toBe(orig.name);
      expect(cat.x).toBeCloseTo(orig.x, 5);
      expect(cat.y).toBeCloseTo(orig.y, 5);
      expect(cat.width).toBeCloseTo(orig.width, 5);
      expect(cat.height).toBeCloseTo(orig.height, 5);
      expect(cat.heroIds).toEqual(orig.heroIds);
    });
  });

  it("parses the favorite grid and warns on duplicate hero 5", () => {
    const issues = validateDotaGridFile(favorite);
    expect(issues.some((i) => i.level === "warning" && i.message.includes(" 5 "))).toBe(
      true,
    );
    const doc = parseDotaGridJson(JSON.stringify(favorite));
    expect(doc.configs[0].categories).toHaveLength(844);
  });

  it("rejects invalid files", () => {
    expect(() => parseDotaGridJson("{")).toThrow(/JSON/);
    expect(parseDotaGridJson("\uFEFF" + JSON.stringify(kaneki)).configs).toHaveLength(1);
    expect(() => parseDotaGridJson(JSON.stringify({ version: 2, configs: [] }))).toThrow(
      /version/,
    );
    expect(() =>
      parseDotaGridJson(
        JSON.stringify({
          version: 3,
          configs: [
            {
              config_name: "x",
              categories: [
                {
                  category_name: ".",
                  x_position: 0,
                  y_position: 0,
                  width: 0,
                  height: 30,
                  hero_ids: [],
                },
              ],
            },
          ],
        }),
      ),
    ).toThrow(/width/);
  });
});
