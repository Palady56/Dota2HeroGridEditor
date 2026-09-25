import { beforeEach, describe, expect, it } from "vitest";
import {
  DOTA_CARD,
  fitTraySize,
  heroMetrics,
  setHeroIconScale,
  snapTrayRect,
  trayCells,
  trayColumns,
  trayRows,
  traySize,
  traySlots,
} from "./trayLayout";
import type { Category } from "../model/types";

function tray(patch: Partial<Category>): Category {
  return { id: "t", name: "", x: 0, y: 0, width: 100, height: 100, heroIds: [], origin: "manual", ...patch };
}

beforeEach(() => {
  setHeroIconScale(1);
});

describe("tray layout", () => {
  it("sizes a 2×2 block to Dota's 51×83 cards so the row does not squish", () => {
    const box = traySize(2, 2);
    expect(box).toEqual({ width: 8 + 51 * 2, height: 20 + 8 + 83 * 2 });
    expect(trayColumns(box.width)).toBe(2);
    expect(trayRows(box.height, false)).toBe(2);
  });

  it("the previous short 2×2 (~136×82) only had room for squished cards", () => {
    expect(trayColumns(136)).toBe(2);
    expect(trayRows(82, false)).toBe(1);
  });

  it("a Kaneki-width box holds three real cards", () => {
    expect(trayColumns(197.391312)).toBe(3);
    expect(trayColumns(200.869568)).toBe(3);
  });

  it("snaps a freehand drag to whole cards", () => {
    const snapped = snapTrayRect({ x: 10, y: 20, width: 120, height: 200 });
    expect(traySlots({ ...snapped, name: "", heroIds: [] })).toEqual({ cols: 2, rows: 2 });
    expect(snapped.width).toBe(traySize(2, 2).width);
    expect(snapped.height).toBe(traySize(2, 2).height);
  });

  it("hugs icons: 2×3 empty box matches 2×3 with six heroes", () => {
    const empty = traySize(2, 3);
    const fitted = fitTraySize(tray({ ...empty, heroIds: [1, 2, 3, 4, 5, 6] }));
    expect(fitted).toEqual(empty);
  });

  it("cells are the tall in-game card and sit inside the box", () => {
    const m = heroMetrics();
    const size = traySize(2, 2);
    const cells = trayCells(tray({ ...size, x: 40, y: 30, heroIds: [1] }));
    expect(cells).toHaveLength(4);
    expect(cells[0]).toMatchObject({
      x: 40 + m.pad,
      y: 30 + m.title + m.pad,
      width: DOTA_CARD.width,
      height: DOTA_CARD.height,
    });
    const last = cells[3];
    expect(last.x + last.width).toBeLessThanOrEqual(40 + size.width + 1e-6);
    expect(last.y + last.height).toBeLessThanOrEqual(30 + size.height + 1e-6);
  });

  it("icon scale enlarges a new tray without going below the Dota card", () => {
    expect(setHeroIconScale(0.5)).toBe(1);
    setHeroIconScale(1.2);
    const scaled = traySize(2, 1);
    setHeroIconScale(1);
    expect(scaled.width).toBeCloseTo(traySize(2, 1).width * 1.2, 5);
    expect(scaled.height).toBeGreaterThan(traySize(2, 1).height);
  });
});
