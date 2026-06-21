import { describe, it, expect } from "vitest";
import { generateSketch } from "../shape-library/shapeTemplates";
import type { FabricationIntent } from "../../../types";

function baseIntent(overrides: Partial<FabricationIntent> = {}): FabricationIntent {
  return {
    shapeType: "l_bracket",
    holds: { objectType: "pipe", diameterMm: 50 },
    angleDegrees: 90,
    estimatedLoadKg: 5,
    missingField: null,
    ...overrides,
  };
}

describe("generateSketch", () => {
  it("produces valid-looking SVG markup for every shape type", () => {
    const shapes: FabricationIntent["shapeType"][] = ["l_bracket", "pipe_clamp", "flat_stand", "hinge_mount"];
    for (const shapeType of shapes) {
      const result = generateSketch(baseIntent({ shapeType }));
      expect(result.svg).toContain("<svg");
      expect(result.svg).toContain("</svg>");
    }
  });

  it("always returns at least one material and a positive estimated weight", () => {
    const result = generateSketch(baseIntent());
    expect(result.materialsListTa.length).toBeGreaterThan(0);
    expect(result.estimatedWeightKg).toBeGreaterThan(0);
  });

  it("selects a heavier gauge for a higher estimated load", () => {
    const light = generateSketch(baseIntent({ estimatedLoadKg: 2 }));
    const heavy = generateSketch(baseIntent({ estimatedLoadKg: 25 }));
    expect(heavy.estimatedWeightKg).toBeGreaterThan(light.estimatedWeightKg);
  });

  it("scales the pipe clamp diameter annotation to the requested pipe size", () => {
    const small = generateSketch(baseIntent({ shapeType: "pipe_clamp", holds: { objectType: "pipe", diameterMm: 20 } }));
    const large = generateSketch(baseIntent({ shapeType: "pipe_clamp", holds: { objectType: "pipe", diameterMm: 100 } }));
    expect(small.svg).not.toEqual(large.svg);
  });
});
