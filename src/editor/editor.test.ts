import { describe, expect, it } from "vitest";
import { commitHistory, initHistory, redoHistory, undoHistory, COALESCE_MS } from "./history";
import {
  addHeroes,
  addStamp,
  createTray,
  eraseNear,
  fitTray,
  moveCategories,
  moveHero,
  removeHero,
  replaceGlyph,
} from "./operations";
import { traySize, traySlots } from "../render/trayLayout";
import { hitTest, idsInRect } from "./hitTest";
import { emptyDocument, removeImportedArt, replaceGenerated, activeConfig, updateActiveCategories } from "../model/document";
import { inferCategoryKind, type Category } from "../model/types";
import { unusedHeroCount, HEROES } from "../heroes/heroes";

function cat(patch: Partial<Category>): Category {
  return { id: "x", name: ".", x: 0, y: 0, width: 30, height: 30, heroIds: [], origin: "generated", ...patch };
}

describe("history", () => {
  it("undoes, redoes and coalesces same-key commits", () => {
    let h = initHistory(0);
    h = commitHistory(h, 1, null, 0);
    h = commitHistory(h, 2, "drag", 10);
    h = commitHistory(h, 3, "drag", 20);
    expect(h.past).toEqual([0, 1]);
    h = commitHistory(h, 4, "drag", 20 + COALESCE_MS + 1);
    expect(h.past).toEqual([0, 1, 3]);
    h = undoHistory(h);
    expect(h.present).toBe(3);
    h = redoHistory(h);
    expect(h.present).toBe(4);
    h = undoHistory(undoHistory(h));
    h = commitHistory(h, 9, null, 100_000);
    expect(h.future).toEqual([]);
    expect(h.present).toBe(9);
  });
});

describe("document", () => {
  it("regeneration keeps manual stamps and trays", () => {
    let doc = emptyDocument();
    doc = updateActiveCategories(doc, () => [
      cat({ id: "g1" }),
      cat({ id: "m1", origin: "manual" }),
      cat({ id: "t1", heroIds: [1], width: 200, height: 300, origin: "imported" }),
    ]);
    const next = replaceGenerated(doc, [cat({ id: "g2" })]);
    expect(activeConfig(next).categories.map((c) => c.id)).toEqual(["m1", "g2", "t1"]);
  });

  it("a new image removes imported art but keeps imported trays", () => {
    let doc = emptyDocument();
    doc = updateActiveCategories(doc, () => [
      cat({ id: "i1", origin: "imported" }),
      cat({ id: "t1", heroIds: [1], width: 200, height: 300, origin: "imported" }),
      cat({ id: "m1", origin: "manual" }),
    ]);
    expect(activeConfig(removeImportedArt(doc)).categories.map((c) => c.id)).toEqual(["t1", "m1"]);
  });

  it("treats large empty categories as hero trays", () => {
    expect(inferCategoryKind(cat({ width: 200, height: 300 }))).toBe("tray");
    expect(inferCategoryKind(cat({ name: "をプレイし", width: 108, height: 30 }))).toBe("caption");
  });
});

describe("operations", () => {
  it("moves from original positions and marks generated stamps manual", () => {
    const cats = [cat({ id: "a", x: 10, y: 10 }), cat({ id: "b", x: 50, y: 50 })];
    const moved = moveCategories(cats, new Map([["a", { x: 10, y: 10 }]]), 5.126, -3);
    expect(moved[0]).toMatchObject({ x: 15.13, y: 7, origin: "manual" });
    expect(moved[1]).toBe(cats[1]);
  });

  it("paints, erases only glyphs and edits heroes", () => {
    let cats = addStamp([], "ず", 100, 100);
    expect(cats[0]).toMatchObject({ name: "ず", origin: "manual" });
    const tray = createTray({ x: 90, y: 90, width: 200, height: 300 });
    expect(traySlots(tray)).toEqual({ cols: 3, rows: 8 });
    cats = [...cats, tray];
    cats = eraseNear(cats, 100, 100, 5);
    expect(cats.map((c) => c.id)).toEqual([tray.id]);

    cats = addHeroes(cats, tray.id, [1, 2, 2, 3]);
    expect(cats[0].heroIds).toEqual([1, 2, 3]);
    cats = moveHero(cats, tray.id, 0, 1);
    expect(cats[0].heroIds).toEqual([2, 1, 3]);
    cats = removeHero(cats, tray.id, 2);
    expect(cats[0].heroIds).toEqual([2, 1]);
    cats = fitTray(cats, tray.id);
    expect(cats[0].width).toBe(traySize(3, 1).width);
    expect(cats[0].height).toBe(traySize(3, 1).height);
  });

  it("replaces symbols everywhere or only in a selection", () => {
    const cats = [cat({ id: "a" }), cat({ id: "b" }), cat({ id: "c", name: "-" })];
    expect(replaceGlyph(cats, ".", "*").map((c) => c.name)).toEqual(["*", "*", "-"]);
    expect(replaceGlyph(cats, "", "ぎ", new Set(["c"])).map((c) => c.name)).toEqual([".", ".", "ぎ"]);
  });

  it("hit-tests glyphs above trays and selects by rectangle", () => {
    const cats = [cat({ id: "g", x: 20, y: 20 }), cat({ id: "t", x: 0, y: 0, width: 200, height: 200, heroIds: [1] })];
    expect(hitTest(cats, 22, 25)).toBe("g");
    expect(hitTest(cats, 150, 150)).toBe("t");
    expect(hitTest(cats, 500, 500)).toBeNull();
    expect(idsInRect(cats, { x: 15, y: 15, width: 10, height: 10 })).toEqual(new Set(["g", "t"]));
  });
});

describe("heroes", () => {
  it("matches the Kaneki screenshot: 12 used, 115 hidden", () => {
    expect(HEROES).toHaveLength(127);
    expect(unusedHeroCount([12, 8, 54, 59, 38, 34, 11, 1, 74, 2, 113, 42], HEROES.length)).toBe(115);
  });
});
