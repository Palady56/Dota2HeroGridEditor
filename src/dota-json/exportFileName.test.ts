import { describe, expect, it } from "vitest";
import { resolveExportFileName } from "./exportFileName";

describe("export file name", () => {
  it("defaults and sanitizes", () => {
    expect(resolveExportFileName("")).toBe("hero_grid_config.json");
    expect(resolveExportFileName("Custom")).toBe("Custom.json");
    expect(resolveExportFileName("a/b.json")).toBe("a_b.json");
  });
});
