import { describe, expect, it } from "vitest";
import { compactStamps, stampAt, stampsFromConversion, symbolCount } from "./stamps";
import { defaultConversionSettings } from "../model/types";
import { SYMBOL_PRESETS } from "../symbols/symbolSet";

describe("compactStamps", () => {
  it("drops a second copy of the same glyph stacked on the first", () => {
    const a = stampAt(".", 40, 40, "generated");
    const b = stampAt(".", 42, 41, "generated");
    const c = stampAt("-", 42, 41, "generated");
    const far = stampAt(".", 80, 80, "generated");
    expect(a && b && c && far).toBeTruthy();
    const kept = compactStamps([a!, b!, c!, far!]);
    expect(kept.map((s) => s.name)).toEqual([".", "-", "."]);
    expect(kept[0].id).toBe(a!.id);
    expect(kept[2].id).toBe(far!.id);
  });

  it("keeps outline stamps when fill would land on the same cell", () => {
    const outline = stampAt("|", 100, 100, "generated")!;
    const fill = stampAt("|", 101, 100, "generated")!;
    expect(compactStamps([outline, fill])).toEqual([outline]);
  });

  it("counts only categories without heroes as symbols", () => {
    expect(
      symbolCount([
        { heroIds: [] },
        { heroIds: [] },
        { heroIds: [1, 2] },
      ]),
    ).toBe(2);
  });
});

describe("stampsFromConversion", () => {
  it("does not emit two identical glyphs on top of each other", () => {
    const stamps = stampsFromConversion(
      {
        points: [{ x: 50, y: 50, angleDeg: 0, straightness: 1, segment: 0 }],
        fill: [{ x: 50, y: 50, tone: 10 }],
      },
      { ...defaultConversionSettings(), fill: "shadows", fillGlyph: "." },
      { ...SYMBOL_PRESETS[0].settings, horizontal: ".", fallback: ".", minRun: 1 },
    );
    const same = stamps.filter((s) => Math.hypot(s.x - stamps[0].x, s.y - stamps[0].y) < 4);
    expect(same).toHaveLength(1);
  });
});
