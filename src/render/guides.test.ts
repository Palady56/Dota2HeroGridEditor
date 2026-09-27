import { describe, expect, it } from "vitest";
import { GRID_SIZE } from "../model/types";
import { snapAxis, snapTopLeft } from "./guides";

const limit = GRID_SIZE;

describe("snapAxis", () => {
  it("lands on the nearest 50px line", () => {
    expect(snapAxis(73, [], limit.height)).toBe(50);
    expect(snapAxis(80, [], limit.height)).toBe(100);
    expect(snapAxis(0, [], limit.height)).toBe(0);
  });

  it("sticks to another block's edge when that edge is closer than the line", () => {
    expect(snapAxis(76, [70], limit.height)).toBe(70);
    expect(snapAxis(40, [70], limit.height)).toBe(50);
  });
});

describe("snapTopLeft", () => {
  it("snaps both edges so two blocks can share a level", () => {
    expect(snapTopLeft(176, 214, [{ x: 180, y: 200 }], limit)).toEqual({ x: 180, y: 200 });
  });
});
