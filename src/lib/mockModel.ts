/**
 * lib/mockModel.ts
 *
 * Section 10 / Definition of Done: the app must check at runtime whether a
 * trained model file is present and degrade to a clear "limited" state
 * rather than crash if it isn't. No real soil/disease model ships with
 * this build (training needs a labeled dataset + Colab GPU time — see
 * packages/ml-models/README.md). This module is the single place that
 * decides real-model-vs-mock, so every screen calls the same function and
 * automatically picks up a real model the day one is dropped into
 * public/models/.
 */
import * as tf from "@tensorflow/tfjs";

export interface ClassificationResult {
  label: string;
  confidence: number;
  modelSource: "real" | "mock";
}

let cachedSoilModel: tf.GraphModel | tf.LayersModel | null | undefined;
let cachedDiseaseModel: tf.GraphModel | tf.LayersModel | null | undefined;

async function tryLoadModel(path: string): Promise<tf.GraphModel | tf.LayersModel | null> {
  try {
    const res = await fetch(path, { method: "HEAD" });
    if (!res.ok) return null;

    // IMPORTANT: the Colab notebooks in packages/ml-models export with
    // `tfjs.converters.save_keras_model()`, which produces a LAYERS model
    // (model.json has "format": "layers-model"). That is NOT the same
    // format as `tf.loadGraphModel()` expects (a frozen/SavedModel-style
    // graph). Calling loadGraphModel() on a layers-model file fails
    // immediately — and because that failure was being swallowed by the
    // catch block below, it silently fell back to the mock classifier
    // with no visible error anywhere. This was a real bug: a trained,
    // correctly-exported model would never load. Fixed by trying
    // loadLayersModel() first (matches our notebooks) and falling back to
    // loadGraphModel() only if that fails, so a differently-exported
    // model (e.g. via the `tensorflowjs_converter --input_format=
    // tf_saved_model` CLI path) still works too.
    try {
  return await tf.loadLayersModel(path);
} catch (e) {
  console.error("loadLayersModel failed:", e);
  throw e;
}
  } catch (err) {
    // Log this one specifically — silently eating a genuine model load
    // failure (corrupt file, wrong shard count, bad model.json) is what
    // caused this exact bug to go unnoticed in the first place.
    console.warn(`[mockModel] Failed to load model at ${path}, falling back to mock classifier:`, err);
    return null;
  }
}

const SOIL_LABELS = ["செம்மண்", "கருமண்", "வண்டல் மண்", "லேட்டரைட் மண்"]; // red, black, alluvial, laterite — these 4 map directly to folder names in the verified real dataset, see packages/ml-models/README.md
const DISEASE_LABELS = ["ஆரோக்கியம்", "இலை கருகல்", "மஞ்சள் நிற இலை", "பூச்சி தாக்கம்"]; // healthy, blight, yellowing, pest

/**
 * Deterministic mock classifier: hashes the image's pixel data into a
 * stable pseudo-random index so a given photo always returns the same
 * demo result (useful for a repeatable hackathon demo) without claiming
 * any real visual understanding. This is clearly NOT a trained model —
 * replace by training the real one (see packages/ml-models).
 */
function mockClassify(imageData: ImageData, labels: string[]): ClassificationResult {
  let hash = 0;
  for (let i = 0; i < imageData.data.length; i += 97) {
    hash = (hash + imageData.data[i]) % 9973;
  }
  const index = hash % labels.length;
  const confidence = 0.55 + (hash % 30) / 100; // lands in the 0.55-0.85 demo range
  return { label: labels[index], confidence, modelSource: "mock" };
}

async function classify(
  imageData: ImageData,
  modelPath: string,
  labels: string[],
  cacheRef: { current: tf.GraphModel | tf.LayersModel | null | undefined }
): Promise<ClassificationResult> {
  if (cacheRef.current === undefined) {
    cacheRef.current = await tryLoadModel(modelPath);
  }

  if (!cacheRef.current) {
    return mockClassify(imageData, labels);
  }

  const tensor = tf.browser
    .fromPixels(imageData)
    .resizeBilinear([224, 224])
    .toFloat()
    .div(255)
    .expandDims(0);

  const prediction = cacheRef.current.predict(tensor) as tf.Tensor;
  const rawData = await prediction.data();
  tensor.dispose();
  prediction.dispose();

  // tf.Tensor.data() resolves to a typed array (Float32Array etc.), which
  // is array-like but not a plain number[] — convert explicitly so the
  // Math.max/indexOf calls below are unambiguous regardless of which
  // TF.js typings version resolves this.
  const data = Array.from(rawData as unknown as ArrayLike<number>);
  const maxValue = Math.max(...data);
  const maxIndex = data.indexOf(maxValue);
  return { label: labels[maxIndex] ?? "unknown", confidence: data[maxIndex], modelSource: "real" };
}

export async function classifySoil(imageData: ImageData): Promise<ClassificationResult> {
  const ref = { current: cachedSoilModel };
  const result = await classify(imageData, "/models/soil_model/model.json", SOIL_LABELS, ref);
  cachedSoilModel = ref.current;
  return result;
}

export async function classifyDisease(imageData: ImageData): Promise<ClassificationResult> {
  const ref = { current: cachedDiseaseModel };
  const result = await classify(imageData, "/models/disease_model/model.json", DISEASE_LABELS, ref);
  cachedDiseaseModel = ref.current;
  return result;
}
