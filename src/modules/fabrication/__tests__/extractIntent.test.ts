import { describe, it, expect } from "vitest";
import { extractIntent, extractIntentWithLLM } from "../intent-extraction/extractIntent";

describe("extractIntentWithLLM", () => {
  it("returns null when the feature flag and/or Gemini key aren't configured (the default)", async () => {
    const result = await extractIntentWithLLM("2 இன்ச் பைப்பை bracket வேணும்");
    expect(result).toBeNull();
  });

  it("returns null on an empty transcript even if the flag were enabled", async () => {
    const result = await extractIntentWithLLM("");
    expect(result).toBeNull();
  });
});

describe("extractIntent", () => {
  it("parses the canonical pitch example: 2-inch pipe bracket at an angle", () => {
    const intent = extractIntent("2 இன்ச் பைப்பை இந்த கோணத்தில் பிடிக்க bracket வேணும்");
    expect(intent.holds.objectType).toBe("pipe");
    expect(intent.holds.diameterMm).toBe(51); // 2 inch -> 50.8mm, rounded
    expect(intent.shapeType).toBe("l_bracket");
  });

  it("detects a pipe clamp request and converts mm dimensions directly", () => {
    const intent = extractIntent("50 மிமீ பைப்பை பிடிக்க clamp வேணும்");
    expect(intent.shapeType).toBe("pipe_clamp");
    expect(intent.holds.diameterMm).toBe(50);
  });

  it("flags load as the missing field when not mentioned", () => {
    const intent = extractIntent("bracket வேணும்");
    expect(intent.missingField).toBe("estimatedLoadKg");
  });

  it("does not flag load as missing once a kg value is spoken", () => {
    const intent = extractIntent("bracket வேணும், 10 kg தாங்கணும்");
    expect(intent.missingField).toBeNull();
    expect(intent.estimatedLoadKg).toBe(10);
  });

  it("falls back to sane defaults rather than throwing on an empty transcript", () => {
    expect(() => extractIntent("")).not.toThrow();
    const intent = extractIntent("");
    expect(intent.shapeType).toBeDefined();
    expect(intent.holds.diameterMm).toBeGreaterThan(0);
  });
});
