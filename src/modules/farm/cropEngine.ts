/**
 * modules/farm/cropEngine.ts
 *
 * Deterministic, explainable scoring — NOT a black-box model — so it runs
 * instantly offline with zero ML needed. See Section 5.3 of the spec.
 *
 * IMPORTANT: the soil/rainfall/season defaults in data/crops.json are
 * reasonable agronomic generalizations for common Tamil Nadu crops, NOT
 * validated agricultural-extension data. Per the spec's DO NOT list, this
 * must be reviewed against real TNAU/agricultural department guidance
 * before any real-world deployment — flagging that clearly in the demo
 * pitch is honest and, frankly, makes the project look more credible, not
 * less.
 */
import cropsData from "./data/crops.json";
import type { Crop, CropRecommendation } from "../../types";
import type { WeatherSnapshot } from "../../lib/weather";

const crops = cropsData as Crop[];

// Local popularity is a static placeholder keyed by a few sample
// districts. Replace with real crowd-sourced or government data once
// available — this is intentionally a thin, swappable lookup.
const LOCAL_POPULARITY: Record<string, Record<string, number>> = {
  "கோயம்புத்தூர்": { groundnut: 0.9, cotton: 0.7, millet: 0.5 },
  "திருச்சி": { paddy: 0.95, blackgram: 0.6 },
  "சேலம்": { millet: 0.8, vegetables: 0.7 },
};

function soilMatchWeight(crop: Crop, soilType: string): number {
  return crop.idealSoilTypes.includes(soilType) ? 1 : 0.2;
}

function rainfallMatchWeight(crop: Crop, rainfallMm: number): number {
  const [min, max] = crop.idealRainfallMm;
  if (rainfallMm >= min && rainfallMm <= max) return 1;
  const distance = rainfallMm < min ? min - rainfallMm : rainfallMm - max;
  return Math.max(0, 1 - distance / 100);
}

function seasonMatchWeight(crop: Crop, season: WeatherSnapshot["season"]): number {
  return crop.seasons.includes(season) ? 1 : 0.1;
}

function localPopularityWeight(crop: Crop, district: string): number {
  return LOCAL_POPULARITY[district]?.[crop.id] ?? 0.5;
}

function explain(crop: Crop, soilType: string, season: WeatherSnapshot["season"]): string {
  const soilGood = crop.idealSoilTypes.includes(soilType);
  const seasonGood = crop.seasons.includes(season);
  if (soilGood && seasonGood) {
    return `இந்த ${soilType} மண்ணுக்கும் இந்த பருவத்திற்கும் ${crop.nameTa} நல்லா வரும்`;
  }
  if (soilGood) {
    return `இந்த மண்ணுக்கு ${crop.nameTa} ஏற்றது`;
  }
  return `${crop.nameTa} இந்த பருவத்தில் வளரக்கூடியது`;
}

export function recommendCrops(
  soilType: string,
  weather: WeatherSnapshot,
  district: string,
  topN = 3
): CropRecommendation[] {
  const scored = crops.map((crop) => {
    const score =
      soilMatchWeight(crop, soilType) * 0.4 +
      rainfallMatchWeight(crop, weather.rainfallOutlookMm) * 0.3 +
      seasonMatchWeight(crop, weather.season) * 0.2 +
      localPopularityWeight(crop, district) * 0.1;

    return {
      crop,
      score: Math.round(score * 100) / 100,
      explanationTa: explain(crop, soilType, weather.season),
    } as CropRecommendation;
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, topN);
}
