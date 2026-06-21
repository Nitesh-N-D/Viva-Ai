# packages/ml-models

Real, runnable Colab notebooks for the two on-device classifiers. **v2,
rebuilt after v1 broke** — see "What was actually wrong" below before
you run these, it'll save you time understanding the design.

Neither model ships pre-trained in this repo (training needs you to
click "Run" in Colab with your own free Kaggle account), so the app runs
on the documented mock classifier (`src/lib/mockModel.ts`) until you do.

## What was actually wrong with v1, and what changed

Two separate real bugs, not one:

1. **The hardcoded Kaggle dataset went away (HTTP 403).** v1 assumed a
   specific dataset slug would always exist with an exact, hand-guessed
   folder structure. When the dataset disappeared, the notebook had no
   fallback and failed at the very first download step.

2. **Training and TF.js conversion shared one Python process — and that
   silently corrupted Colab's environment.** v1 called `pip install
   tensorflowjs` and then immediately converted the model, all in the
   same session that already had TensorFlow loaded and a trained model
   in memory. This is a well-documented, frequently-reported failure
   mode: `tensorflowjs`'s pip dependencies (protobuf, numpy, etc.) can
   conflict with whatever TensorFlow build Colab's GPU runtime ships
   with, and pip's dependency resolver fighting that mid-session is
   exactly the kind of thing that produces confusing downstream errors,
   garbage model output, or a notebook that "completes" but produces a
   broken export — which matches "incorrect data and the model and the
   producer many errors" as a symptom.

**v2 fixes both, structurally:**

- **Auto-discovery instead of hardcoded folder names.** The notebook
  downloads a dataset, then walks every folder, counts real image files,
  and prints a full report of what's actually there. It fuzzy-matches
  folder names against the classes we want, and if a dataset's structure
  doesn't match what's expected, you get a clear, actionable report —
  not a cryptic crash three cells later. A backup dataset slug is tried
  automatically if the primary one fails to download at all.
- **Training and TF.js conversion are split across a runtime restart.**
  The notebook trains, saves the model to disk, and explicitly tells you
  to do **Runtime → Restart session** (10 seconds, keeps your files,
  just clears Python memory) before installing `tensorflowjs` in a
  clean session and converting the already-saved file via the
  command-line `tensorflowjs_converter` tool. This means the package
  that caused the corruption never shares a process with the TensorFlow
  build used for training.

## Model format

Both notebooks export with `tfjs.converters.save_keras_model()`
semantics (via the `tensorflowjs_converter --input_format=keras` CLI,
post-restart), which produces a **Layers model** (`model.json` contains
`"format": "layers-model"`). The app's loader
(`src/lib/mockModel.ts`) tries `tf.loadLayersModel()` first to match
this, falling back to `tf.loadGraphModel()` only if that fails. This was
a separate real bug fixed earlier — loading a Layers-model file with the
wrong loader fails silently and falls back to the mock classifier with
no visible error, which is its own way to end up looking like "the real
model isn't working."

### How to verify your model actually loaded (don't just trust the file is there)

After dropping model files into `public/models/soil_model/` or
`public/models/disease_model/`, open the app, do a real scan, and check:

1. **In the UI:** the result card should show "நம்பகத்தன்மை: X%" (a real
   confidence percentage). "(டெமோ மதிப்பீடு...)" means it's still using
   the mock classifier.
2. **In the browser console** (F12 → Console): a load failure now prints
   `[mockModel] Failed to load model at ...` with the underlying error
   — that tells you exactly what's wrong instead of failing silently.

## 1. Soil classifier

**Notebook:** `soil_classifier/train_colab.ipynb`
**Primary dataset:** `ai4a-lab/comprehensive-soil-classification-datasets` on Kaggle, with `jhislainematchouath/soil-types-dataset` tried automatically as a backup if the primary fails to download.

**Important — this dataset's exact class taxonomy is genuinely uncertain
from outside Kaggle.** Different published papers describe its contents
differently (one describes black/yellow/peat/volcanic/laterite/cracked;
others describe a more standard alluvial/black/clay/red split) — likely
because it's a broad, multi-purpose collection and different
researchers used different subsets of it. Rather than gamble on a second
hardcoded guess (exactly what broke v1), the notebook **discovers
whatever classes are really in the download, prints them all, and
fuzzy-matches** against alluvial/black/red plus a flexible 4th slot that
accepts clay, laterite, or yellow soil — whichever is actually present.
**Read the printed report in step 3 of the notebook** before assuming
anything about what you'll end up training on.

### How to run it

1. Upload `train_colab.ipynb` to [Google Colab](https://colab.research.google.com).
2. Runtime → Change runtime type → **T4 GPU**.
3. Get a free Kaggle API token: kaggle.com → Account → "Create New API Token" → downloads `kaggle.json`.
4. Run cells top to bottom. Upload `kaggle.json` when prompted.
5. **Read the folder-discovery report (step 3) and the class-matching report (step 4) before continuing** — if the matching looks wrong, the notebook tells you exactly how to fix `MATCHED` by hand.
6. After training and saving (step 8), **do Runtime → Restart session** — not "Disconnect and delete runtime," which would wipe your saved model.
7. Continue running from step 9 onward in the fresh session to convert and download.
8. Unzip the download and copy everything inside into `public/models/soil_model/`, replacing the placeholder README there.
9. Set `SOIL_LABELS` in `src/lib/mockModel.ts` to the Tamil translations of the notebook's final printed `CANONICAL_CLASSES`, **in that exact order** — the notebook fixes this order deterministically and reminds you of it right before you need it.

## 2. Disease classifier

**Notebook:** `disease_classifier/train_colab.ipynb`
**Dataset:** [`vipoooool/new-plant-diseases-dataset`](https://www.kaggle.com/datasets/vipoooool/new-plant-diseases-dataset) — the standard PlantVillage republication, actively cited in published research as recently as late 2024, ~87k images across 38 classes.

Filters down to a small 4-class subset by default (tomato healthy /
tomato early blight / tomato yellow-leaf-curl / pepper bacterial spot) —
a narrow, accurate model beats a broad, unreliable one for a live demo.
Same auto-discovery and restart-isolation fixes as the soil notebook.
Edit `SELECTED_CLASSES` in step 4 if you want different diseases —
step 3's printed folder list shows you the exact real names to use.

Unlike the soil notebook, `CLASS_ORDER` here is fixed explicitly in code
(`["healthy","leaf_blight","yellowing","pest_damage"]`), so it already
matches `DISEASE_LABELS` in `mockModel.ts` with no relabeling step
needed.

## If training doesn't finish in time

Ship with the mock classifier and say so plainly in your demo. A
working, honest mock with a clear, already-built path to real training
reads better to judges than an overstated claim that falls apart under a
follow-up question.
