/**
 * modules/fabrication/shape-library/shapeTemplates.ts
 *
 * Each function returns a self-contained SVG string with dimension
 * annotations, given parameters derived from extractIntent(). This is
 * deliberately a small fixed library (4 shapes) rather than a generic
 * CAD engine — per the spec, that's the honest, buildable version of
 * "voice-to-blueprint" for a hackathon timeline.
 */
import type { FabricationIntent, MaterialOption } from "../../../types";
import materialsData from "../data/materials.json";

const materials = materialsData as MaterialOption[];

export interface SketchResult {
  svg: string;
  materialsListTa: string[];
  estimatedWeightKg: number;
}

function pickGauge(loadKg: number): { thicknessMm: number; label: string } {
  if (loadKg <= 5) return { thicknessMm: 3, label: "25x25x3mm" };
  if (loadKg <= 15) return { thicknessMm: 5, label: "40x40x5mm" };
  return { thicknessMm: 6, label: "40x40x6mm (கனமான வேலை — பயிற்சி பெற்ற தச்சரிடம் சரிபார்க்கவும்)" };
}

function dimensionLine(x1: number, y1: number, x2: number, y2: number, label: string) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  return `
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#3E5A6E" stroke-width="1" stroke-dasharray="4 3" />
    <text x="${midX}" y="${midY - 6}" font-size="11" fill="#3E5A6E" text-anchor="middle">${label}</text>
  `;
}

function generateLBracket(intent: FabricationIntent): SketchResult {
  const armLength = Math.max(60, intent.holds.diameterMm * 1.4);
  const gauge = pickGauge(intent.estimatedLoadKg);

  const svg = `
    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <rect x="40" y="40" width="${gauge.thicknessMm * 4}" height="${armLength}" fill="#6E8CA0" stroke="#22323D" stroke-width="2" />
      <rect x="40" y="${40 + armLength - gauge.thicknessMm * 4}" width="${armLength}" height="${gauge.thicknessMm * 4}" fill="#6E8CA0" stroke="#22323D" stroke-width="2" />
      <circle cx="${40 + gauge.thicknessMm * 2}" cy="60" r="4" fill="#22323D" />
      <circle cx="${40 + armLength - 20}" cy="${40 + armLength - gauge.thicknessMm * 2}" r="4" fill="#22323D" />
      ${dimensionLine(40, 30, 40 + armLength, 30, `${Math.round(armLength)}மிமீ`)}
      ${dimensionLine(20, 40, 20, 40 + armLength, `${Math.round(armLength)}மிமீ`)}
    </svg>
  `.trim();

  return {
    svg,
    materialsListTa: [`எம்.எஸ். கோணல் இரும்பு (${gauge.label})`, "2 x M8 பொல்ட் & நட்"],
    estimatedWeightKg: Math.round(((armLength * 2 * gauge.thicknessMm) / 1000) * 7.85 * 10) / 10,
  };
}

function generatePipeClamp(intent: FabricationIntent): SketchResult {
  const innerRadius = intent.holds.diameterMm / 2 + 3; // a little larger than the pipe itself
  const gauge = pickGauge(intent.estimatedLoadKg);

  const svg = `
    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <circle cx="120" cy="120" r="${innerRadius + 10}" fill="none" stroke="#6E8CA0" stroke-width="10" />
      <circle cx="120" cy="120" r="${innerRadius}" fill="#FBF6EC" stroke="#22323D" stroke-width="1" stroke-dasharray="3 2" />
      <rect x="105" y="${120 - innerRadius - 28}" width="30" height="14" fill="#22323D" />
      ${dimensionLine(120 - innerRadius, 120, 120 + innerRadius, 120, `⌀${Math.round(innerRadius * 2)}மிமீ`)}
    </svg>
  `.trim();

  return {
    svg,
    materialsListTa: [`எம்.எஸ். தட்டை பட்டை (${gauge.label === "25x25x3mm" ? "25x5mm" : "40x6mm"})`, "1 x M8 பொல்ட் & நட்"],
    estimatedWeightKg: Math.round((((innerRadius * 2 * Math.PI) * 6 * gauge.thicknessMm) / 1000) * 7.85 * 10) / 10,
  };
}

function generateFlatStand(intent: FabricationIntent): SketchResult {
  const width = Math.max(80, intent.holds.diameterMm * 1.6);
  const gauge = pickGauge(intent.estimatedLoadKg);

  const svg = `
    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <rect x="${120 - width / 2}" y="160" width="${width}" height="${gauge.thicknessMm * 3}" fill="#6E8CA0" stroke="#22323D" stroke-width="2" />
      <rect x="${120 - 10}" y="${160 - 90}" width="20" height="90" fill="#6E8CA0" stroke="#22323D" stroke-width="2" />
      ${dimensionLine(120 - width / 2, 180, 120 + width / 2, 180, `${Math.round(width)}மிமீ`)}
    </svg>
  `.trim();

  return {
    svg,
    materialsListTa: [`எம்.எஸ். தாள் (${gauge.thicknessMm}mm)`, "எம்.எஸ். தட்டை பட்டை"],
    estimatedWeightKg: Math.round(((width * 90 * gauge.thicknessMm) / 1_000_000) * 7850 * 10) / 10,
  };
}

function generateHingeMount(intent: FabricationIntent): SketchResult {
  const gauge = pickGauge(intent.estimatedLoadKg);
  const svg = `
    <svg viewBox="0 0 240 240" xmlns="http://www.w3.org/2000/svg">
      <rect x="60" y="100" width="50" height="${gauge.thicknessMm * 4}" fill="#6E8CA0" stroke="#22323D" stroke-width="2" />
      <rect x="130" y="100" width="50" height="${gauge.thicknessMm * 4}" fill="#6E8CA0" stroke="#22323D" stroke-width="2" />
      <circle cx="120" cy="${100 + gauge.thicknessMm * 2}" r="6" fill="#22323D" />
      ${dimensionLine(60, 90, 180, 90, "120மிமீ")}
    </svg>
  `.trim();

  return {
    svg,
    materialsListTa: [`வட்ட தடி (${intent.holds.diameterMm}mm)`, "எம்.எஸ். தட்டை பட்டை"],
    estimatedWeightKg: 0.4,
  };
}

const GENERATORS: Record<FabricationIntent["shapeType"], (intent: FabricationIntent) => SketchResult> = {
  l_bracket: generateLBracket,
  pipe_clamp: generatePipeClamp,
  flat_stand: generateFlatStand,
  hinge_mount: generateHingeMount,
};

export function generateSketch(intent: FabricationIntent): SketchResult {
  return GENERATORS[intent.shapeType](intent);
}

export function listMaterials(): MaterialOption[] {
  return materials;
}
