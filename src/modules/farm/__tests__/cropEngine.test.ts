import { describe, it, expect } from "vitest";
import { recommendCrops } from "../cropEngine";
import type { WeatherSnapshot } from "../../../lib/weather";

describe("recommendCrops", () => {
  const kharifWeather: WeatherSnapshot = {
    district: "கோயம்புத்தூர்",
    tempC: 30,
    rainfallOutlookMm: 50,
    humidity: 60,
    season: "kharif",
    source: "mock",
  };

  it("returns exactly topN recommendations, sorted by descending score", () => {
    const result = recommendCrops("செம்மண்", kharifWeather, "கோயம்புத்தூர்", 3);
    expect(result).toHaveLength(3);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it("ranks a crop matching both soil type and season above a mismatched one", () => {
    const result = recommendCrops("செம்மண்", kharifWeather, "கோயம்புத்தூர்", 6);
    const groundnut = result.find((r) => r.crop.id === "groundnut")!;
    const cotton = result.find((r) => r.crop.id === "cotton")!; // ideal soil is கருமண், not செம்மண்
    expect(groundnut.score).toBeGreaterThan(cotton.score);
  });

  it("never returns a negative or NaN score", () => {
    const result = recommendCrops("அறியப்படாத மண்", kharifWeather, "அறியப்படாத ஊர்", 6);
    result.forEach((r) => {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(Number.isNaN(r.score)).toBe(false);
    });
  });

  it("every recommendation includes a non-empty Tamil explanation", () => {
    const result = recommendCrops("வண்டல் மண்", kharifWeather, "திருச்சி", 3);
    result.forEach((r) => expect(r.explanationTa.length).toBeGreaterThan(0));
  });
});
