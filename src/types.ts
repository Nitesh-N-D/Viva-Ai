// Mirrors `packages/shared-types` from the project spec. Kept inside
// src/ so the app builds as a single Vite project without workspace
// resolution — see README "Structure notes" for why.

export interface SoilScanRecord {
  geoTile: string; // lat,lng rounded to ~1km precision — never exact GPS
  soilType: string;
  confidence: number;
  timestamp: number;
}

export interface Crop {
  id: string;
  nameTa: string;
  nameEn: string;
  idealSoilTypes: string[];
  idealRainfallMm: [number, number];
  seasons: ("kharif" | "rabi" | "summer")[];
  growthDays: number;
  stages: { day: number; nameTa: string; tipTa: string }[];
}

export interface CropRecommendation {
  crop: Crop;
  score: number;
  explanationTa: string;
}

export interface RemedyEntry {
  id: string;
  pestOrDiseaseTa: string;
  pestOrDiseaseEn: string;
  symptomsTa: string[];
  ingredients: { nameTa: string; quantity: string }[];
  stepsTa: string[];
  frequencyTa: string;
}

export interface FabricationIntent {
  shapeType: "l_bracket" | "pipe_clamp" | "flat_stand" | "hinge_mount";
  holds: {
    objectType: "pipe" | "rod" | "sheet";
    diameterMm: number;
    lengthMm?: number;
  };
  angleDegrees: number;
  estimatedLoadKg: number;
  missingField?: keyof FabricationIntent | "diameter" | null;
}

export interface FabricationRequestRecord {
  geoTile: string;
  shapeType: string;
  objectType: string;
  timestamp: number;
}

export interface MaterialOption {
  nameTa: string;
  nameEn: string;
  sizes: string[];
  useTa: string;
}

export interface MapTile {
  geoTile: string;
  dominantSoilType: string;
  scanCount: number;
  soilCounts?: Record<string, number>;
  updatedAt?: number;
}

export type AvatarState = "idle" | "growing" | "concerned" | "celebrating";
