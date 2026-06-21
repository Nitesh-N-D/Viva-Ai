/**
 * modules/fabrication/intent-extraction/extractIntent.ts
 *
 * Default, always-available extraction path (Section 6.2). Works on
 * mixed Tamil/English speech since rural speech naturally code-switches
 * for technical nouns ("bracket", "pipe", "clamp"). An optional
 * LLM-based extractor can be swapped in behind the same function
 * signature for higher accuracy — see README "Optional LLM extractor".
 */
import type { FabricationIntent } from "../../../types";

const SHAPE_KEYWORDS: Record<FabricationIntent["shapeType"], string[]> = {
  l_bracket: ["bracket", "பிராக்கெட்", "ஆதரவு"],
  pipe_clamp: ["clamp", "கிளாம்ப்", "பிடிக்க"],
  flat_stand: ["stand", "ஸ்டாண்ட்", "நிலைப்பாடு"],
  hinge_mount: ["hinge", "கீல்", "மூட்டு"],
};

const OBJECT_KEYWORDS: Record<FabricationIntent["holds"]["objectType"], string[]> = {
  pipe: ["pipe", "பைப்", "குழாய்"],
  rod: ["rod", "தடி", "கம்பி"],
  sheet: ["sheet", "தாள்", "தட்டு"],
};

// Matches "2 இன்ச்", "50 மிமீ", "2 inch", "50mm" — handles both scripts.
const DIMENSION_REGEX = /(\d+(?:\.\d+)?)\s*(இன்ச்|inch|மிமீ|mm)/i;
const ANGLE_REGEX = /(\d+(?:\.\d+)?)\s*(டிகிரி|degree|°)/i;
const LOAD_REGEX = /(\d+(?:\.\d+)?)\s*(கிலோ|kg|kilo)/i;

function inchesToMm(value: number) {
  return Math.round(value * 25.4);
}

function findKeywordMatch<T extends string>(text: string, dict: Record<T, string[]>): T | null {
  for (const [key, words] of Object.entries(dict) as [T, string[]][]) {
    if (words.some((w) => text.toLowerCase().includes(w.toLowerCase()))) return key;
  }
  return null;
}

export function extractIntent(transcript: string): FabricationIntent {
  const shapeType = findKeywordMatch(transcript, SHAPE_KEYWORDS) ?? "l_bracket";
  const objectType = findKeywordMatch(transcript, OBJECT_KEYWORDS) ?? "pipe";

  const dimMatch = transcript.match(DIMENSION_REGEX);
  let diameterMm = 50; // sane default: ~2-inch pipe, the most common request in the pitch
  if (dimMatch) {
    const value = parseFloat(dimMatch[1]);
    const unit = dimMatch[2].toLowerCase();
    diameterMm = unit.includes("inch") || unit.includes("இன்ச்") ? inchesToMm(value) : value;
  }

  const angleMatch = transcript.match(ANGLE_REGEX);
  const angleDegrees = angleMatch ? parseFloat(angleMatch[1]) : 90;

  const loadMatch = transcript.match(LOAD_REGEX);
  const estimatedLoadKg = loadMatch ? parseFloat(loadMatch[1]) : 5; // light-duty default

  // Per spec: exactly one clarifying question, only if load truly wasn't
  // mentioned — don't ask about angle/dimension since we have sane
  // defaults for those.
  const missingField = loadMatch ? null : "estimatedLoadKg";

  return {
    shapeType,
    holds: { objectType, diameterMm },
    angleDegrees,
    estimatedLoadKg,
    missingField: missingField as FabricationIntent["missingField"],
  };
}

/**
 * Optional LLM-based extractor. Calls Google's Gemini API DIRECTLY from
 * the browser using VITE_GEMINI_API_KEY — no backend, works on Firebase
 * Spark (free) plan. Same trade-off as the weather key (Section in
 * weather.ts): the key is visible in the shipped bundle. Restrict it to
 * the Generative Language API only in Google Cloud Console / AI Studio
 * if that matters for your deployment.
 *
 * Gated behind VITE_LLM_EXTRACTION_ENABLED + VITE_GEMINI_API_KEY both
 * being set; returns null on ANY failure (missing key, network, bad
 * response, rate limit) so the caller always falls back to the
 * always-available, always-free rule-based extractor above with zero
 * visible difference to the user.
 */
const GEMINI_MODEL = "gemini-2.0-flash-lite"; // free-tier model; swap here if Google renames/retires it
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GEMINI_SYSTEM_PROMPT = `You extract structured fabrication requests from spoken Tamil/English text.
Respond with ONLY a JSON object, no other text, no markdown fences, matching exactly:
{
  "shapeType": "l_bracket" | "pipe_clamp" | "flat_stand" | "hinge_mount",
  "holds": { "objectType": "pipe" | "rod" | "sheet", "diameterMm": number },
  "angleDegrees": number,
  "estimatedLoadKg": number
}
If a value isn't mentioned, use a sane default for light-duty rural fabrication (diameterMm: 50, angleDegrees: 90, estimatedLoadKg: 5).`;

export async function extractIntentWithLLM(transcript: string): Promise<FabricationIntent | null> {
  const enabled = import.meta.env.VITE_LLM_EXTRACTION_ENABLED === "true";
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!enabled || !apiKey || !transcript.trim()) return null;

  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: GEMINI_SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: transcript }] }],
        generationConfig: { temperature: 0.1, maxOutputTokens: 300, responseMimeType: "application/json" },
      }),
    });
    if (!res.ok) return null;

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    const parsed = JSON.parse(text) as Partial<FabricationIntent>;

    if (!parsed.shapeType || !parsed.holds || typeof parsed.holds.diameterMm !== "number") {
      return null;
    }

    return {
      shapeType: parsed.shapeType,
      holds: parsed.holds,
      angleDegrees: parsed.angleDegrees ?? 90,
      estimatedLoadKg: parsed.estimatedLoadKg ?? 5,
      missingField: null,
    };
  } catch {
    // Covers network failure, invalid/rate-limited key, and malformed
    // JSON in the model's response — any of these silently defers to the
    // rule-based extractor rather than surfacing an error to the user.
    return null;
  }
}
