import { describe, expect, it } from "vitest";
import {
  fitTraySize,
  HERO_CELL,
  snapTrayRect,
  trayCells,
  trayColumns,
  traySize,
  traySlots,
} from "./trayLayout";
import type { Category } from "../model/types";

function tray(patch: Partial<Category>): Category {
  return { id: "t", name: "", x: 0, y: 0, width: 100, height: 100, heroIds: [], origin: "manual", ...patch };
}

describe("tray layout", () => {
  it("a ~200-wide Kaneki box is three landscape icons, not two tall ones", () => {
    expect(trayColumns(197.391312)).toBe(3);
    expect(trayColumns(200.869568)).toBe(3);
    expect(traySize(3, 1).width).toBeCloseTo(202, 5);
  });

  it("snaps a freehand drag to whole icon cells", () => {
    const snapped = snapTrayRect({ x: 10, y: 20, width: 140, height: 90 });
    expect(traySlots({ ...snapped, name: "", heroIds: [] })).toEqual({ cols: 2, rows: 2 });
    expect(snapped.width).toBe(traySize(2, 2).width);
    expect(snapped.height).toBe(traySize(2, 2).height);
  });

  it("hugs icons: 2×3 empty box matches 2×3 with six heroes", () => {
    const empty = traySize(2, 3);
    const fitted = fitTraySize(tray({ ...empty, heroIds: [1, 2, 3, 4, 5, 6] }));
    expect(fitted).toEqual(empty);
  });

  it("adds a title bar without changing the icon grid", () => {
    const plain = traySize(3, 2, false);
    const titled = traySize(3, 2, true);
    expect(titled.width).toBe(plain.width);
    expect(titled.height).toBeGreaterThan(plain.height);
    expect(traySlots({ width: titled.width, height: titled.height, name: "BAN", heroIds: [] })).toEqual({
      cols: 3,
      rows: 2,
    });
  });

  it("cells are 16:9 landscape and sit inside the box", () => {
    const size = traySize(2, 2);
    const cells = trayCells(tray({ ...size, x: 40, y: 30, heroIds: [1] }));
    expect(cells).toHaveLength(4);
    expect(cells[0]).toMatchObject({ x: 44, y: 34, width: HERO_CELL.width, height: HERO_CELL.height });
    expect(HERO_CELL.width / HERO_CELL.height).toBeCloseTo(16 / 9, 1);
    const last = cells[3];
    expect(last.x + last.width).toBeLessThanOrEqual(40 + size.width + 1e-6);
    expect(last.y + last.height).toBeLessThanOrEqual(30 + size.height + 1e-6);
  });
});
