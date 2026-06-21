# Drop the trained soil model here

This folder is intentionally empty in this build. Once you've trained a
real model using `packages/ml-models/soil_classifier/train.py` and
exported it with `tensorflowjs_converter`, copy the resulting
`model.json` and its `.bin` shard files directly into this folder.

`src/lib/mockModel.ts` checks for `model.json` here at runtime — the
moment it's present, the app automatically uses it instead of the mock
classifier. No other code change is required.
