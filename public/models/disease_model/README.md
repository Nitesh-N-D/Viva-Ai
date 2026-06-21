# Drop the trained disease/pest model here

Same pattern as `public/models/soil_model/README.md` — train with
`packages/ml-models/disease_classifier/train.py`, export with
`tensorflowjs_converter`, and copy `model.json` + `.bin` shards into this
folder. `src/lib/mockModel.ts` will pick it up automatically.
