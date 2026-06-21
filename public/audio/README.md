# Pre-recorded Tamil audio fallback clips

`src/shared/voice/VoiceEngine.ts` falls back to playing a clip from this
folder for a small set of fixed system phrases when a device has no
usable Tamil text-to-speech voice installed (common on some low-end
Android builds). Record short, clear Tamil `.mp3` clips for each phrase
listed in `PRERECORDED_PHRASES` in that file, name them to match (e.g.
`greeting_ta.mp3`), and place them here.

This is optional — the app works without any files in this folder; it
just means devices lacking a Tamil TTS voice will silently skip narration
for those specific phrases rather than playing a recording. Adding even
3-4 of the most common phrases (greeting, soil-scan instruction,
maker-mode instruction) covers most of a live demo.
