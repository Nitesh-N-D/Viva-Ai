# VIVA AI

Tamil voice co-pilot for farming and frugal fabrication — two co-pilots,
one shared voice-and-avatar shell, **100% client-side, runs entirely on
free tiers, no backend server required.**

This is the architecture after a deliberate refactor away from Firebase
Cloud Functions. Earlier drafts of this project routed weather/mandi/LLM
calls through Cloud Functions to keep API keys server-side — that's
solid practice in general, but Cloud Functions require Firebase's paid
**Blaze** plan (it has a free quota, but the plan itself needs a billing
account attached, which is a real barrier for a hackathon team). This
version removes that requirement entirely: every external call happens
directly from the browser, and the app is fully usable on Firebase's
free **Spark** plan plus free hosting.

## 1. Quick start

```bash
npm install
cp .env.example .env.local   # fill in real keys later — the app runs fine without any of them
npm run dev
```

```bash
npm test       # Vitest unit tests — recommendation engine, intent extraction, shape generator
npm run build  # production build to dist/
```

Open the printed local URL on your phone (same Wi-Fi network) or in
Chrome DevTools' device emulator. Allow location + camera when prompted.

## 2. Architecture: no backend, by design

| Capability | How it works now |
|---|---|
| Weather | Browser calls OpenWeatherMap's API directly (`src/lib/weather.ts`) |
| Mandi prices | Browser attempts a direct call to data.gov.in/Agmarknet (`src/lib/mandi.ts`) |
| Fabrication intent extraction | Rule-based by default; optionally calls Gemini directly from the browser (`extractIntent.ts`) |
| Auth | Firebase Anonymous Authentication (client SDK) |
| Data storage | Firestore (client SDK) — Spark plan's free quota is generous for a hackathon's traffic |
| Crowd-sourced soil map | Each soil scan rolls itself into a `mapTiles` Firestore document via a client-side transaction — no scheduled server job needed |
| ML inference | TensorFlow.js, fully on-device, no server round-trip ever |

**The trade-off, stated plainly:** every `VITE_`-prefixed API key in
`.env.local` ends up inside the JavaScript bundle shipped to the
browser, which means it's technically visible to anyone who opens
DevTools. This is a known, standard trade-off for free client-only
architectures (countless weather widgets, map embeds, and demo apps work
exactly this way) — not a security hole specific to this project. If you
want to fully hide a key later, the fix is to add a thin proxy back in
(a free-tier Cloudflare Worker, a Vercel Edge Function, etc. — none of
which require Firebase Blaze). For a hackathon demo, restricting each
key's allowed referrer domain in its provider's dashboard once you have
a deployed URL is normally sufficient.

## 3. What's real right now vs. what degrades gracefully

**Fully working today, no setup required:**
- The entire UI shell: onboarding, home screen, both modules' navigation, Tamil/English toggle, the avatar mascot and its state machine.
- The crop recommendation engine (`src/modules/farm/cropEngine.ts`) — deterministic, explainable, runs instantly offline.
- The organic remedy database and lookup.
- The fabrication module end to end: rule-based Tamil/English intent extraction, all 4 parametric SVG shape templates, the materials database, WhatsApp share.
- Tamil voice output via the Web Speech API, with a typed-text fallback when speech recognition isn't available on a device.
- The offline sync queue (IndexedDB) — works even with zero Firebase config; it just won't have anywhere to flush to yet.

**Auto-upgrades from mock to real the moment you add a key — no code changes needed:**
- **Weather** — set `VITE_OPENWEATHER_API_KEY` and it calls the live API directly from the browser, with a 30-minute local cache to stay well within free-tier rate limits. No key, or a failed request? Falls back to the last successful cached reading for that location, or to clearly-labeled mock data if there's no cache yet. Never crashes.
- **Mandi prices** — set `VITE_AGMARKNET_API_KEY` and it attempts a direct call to data.gov.in. **Read the honest caveat in `src/lib/mandi.ts`:** many Indian government APIs don't reliably send CORS headers, so this may simply be blocked by the browser regardless of how correct your key is — there's no way to know for certain without testing it from your actual deployed domain. Whichever way it goes, the UI clearly labels what it's showing: "live" data, "cached" data (with a visible warning that it's not current), or bundled "demo" data — it never silently presents stale or fake numbers as current.
- **Fabrication intent extraction** — the rule-based path is always on and free. Set `VITE_GEMINI_API_KEY` and `VITE_LLM_EXTRACTION_ENABLED=true` to additionally try Google's free-tier Gemini API first, called directly from the browser, with automatic silent fallback to the rule-based result on any failure (missing key, network issue, rate limit).
- **The crowd-sourced soil map** — the moment a real soil scan syncs to Firestore, a client-side transaction rolls it into that location's `mapTiles` document in real time (see `recordSoilScanOnMap` in `src/lib/firebase.ts`). No waiting for a batch job — there isn't one. Before any real scans exist, the map shows sample points and says so.

**Still needs real-world input, not just a key:**
- **Soil and disease classification** — runs the documented mock classifier (`src/lib/mockModel.ts`) until you train real models. See `packages/ml-models/README.md` for two ready-to-run Google Colab notebooks wired to real, verified Kaggle datasets — this is a genuine training task, not a config flag.
- **Firebase itself** — create a free Spark-tier project and fill in the 6 `VITE_FIREBASE_*` values; everything Firebase-related no-ops safely until you do.

## 4. Project layout

```
viva-ai/
├── src/
│   ├── app/                 # Home screen navigation
│   ├── modules/
│   │   ├── farm/             # Farm Co-pilot screens, data, and the recommendation engine
│   │   └── fabrication/      # Fabrication Co-pilot screens, shape templates, materials DB
│   ├── shared/
│   │   ├── voice/             # VoiceEngine — STT/TTS abstraction
│   │   ├── offline-sync/      # IndexedDB write-ahead queue
│   │   ├── avatar-engine/     # Shared avatar state machine
│   │   └── ui/                # Button, IconTile, Screen, Avatar
│   ├── lib/                   # firebase.ts, weather.ts, mandi.ts, mockModel.ts — all direct client calls, no backend
│   ├── i18n/                  # ta.json (default), en.json
│   └── types.ts
├── packages/ml-models/         # Real Google Colab notebooks + dataset sourcing notes (not auto-run)
├── public/models/              # Drop trained TF.js models here
├── public/audio/                # Optional pre-recorded Tamil TTS fallback clips
├── public/icons/                 # Full favicon set (16/32/48/192/512px PNG + SVG + apple-touch-icon)
├── public/favicon.ico            # Multi-resolution .ico for older browsers/crawlers
├── public/robots.txt             # Crawler rules + sitemap pointer
├── public/sitemap.xml            # Sitemap (single entry — see Section 9, this is a single-page app today)
├── index.html                    # Full SEO meta tags, Open Graph, Twitter Card, JSON-LD, Search Console hook
├── firebase.json                # Hosting + Firestore only — no functions block
└── firestore.rules              # Enforces no-PII writes; client writes mapTiles directly now
```

There is no `functions/` directory in this version — it was deleted as
part of this refactor. If you find references to it in older docs or
chat history, they're stale; ignore them.

## 5. Deploying (free tiers only, no Blaze)

**Frontend:** `npm run build` then deploy the `dist/` folder to Vercel,
Netlify, or `firebase deploy --only hosting` — all free tier, no billing
account needed for any of them.

**Firestore rules:** `firebase deploy --only firestore:rules` — review
`firestore.rules` first. It now allows the client to write to `mapTiles`
directly (with shape validation), since there's no server-side Admin SDK
process doing that anymore.

**That's it.** There's no backend deploy step — no Cloud Functions, no
secrets to set, nothing requiring a Blaze upgrade prompt.

## 6. Step-by-step: turning every mock into real data

1. **Create the Firebase project** (15 min, free, no card needed on Spark). console.firebase.google.com → Add project → enable Firestore (production mode) and Anonymous Authentication → copy the web app config into `.env.local` → `firebase deploy --only firestore:rules`.
2. **Get a free OpenWeatherMap key** (5 min, instant). Paste it into `VITE_OPENWEATHER_API_KEY` in `.env.local`. Weather goes live immediately on next `npm run dev` — no deploy step, no backend.
3. **Get a free data.gov.in / Agmarknet key** (10–30 min, government signup, sometimes needs email verification). Paste it into `VITE_AGMARKNET_API_KEY`. Test it from your actual deployed domain, not just localhost — CORS behavior can differ. If it's blocked, the app already degrades to clearly-labeled cached/mock data with zero further action needed from you.
4. **(Optional) Get a free Gemini key** at aistudio.google.com/apikey (instant, no card). Set `VITE_GEMINI_API_KEY` and `VITE_LLM_EXTRACTION_ENABLED=true`. Skip this entirely if you just want the free rule-based extractor — it already handles the pitch's example phrase correctly.
5. **Let the soil map go live organically** — nothing to configure. The moment a few real soil scans sync, `mapTiles` populates itself via the client-side transaction in `firebase.ts`, and `SoilMap.tsx` switches from sample points to real ones automatically.
6. **Train the real soil and disease classifiers** (half a day minimum, the highest-risk item). Two ready-to-run Colab notebooks with real datasets are in `packages/ml-models/` — see that folder's README for the exact steps. Drop the exported model files into `public/models/soil_model/` and `public/models/disease_model/`; the app detects and switches to them automatically.
7. **Record Tamil audio fallback clips** (optional, ~1 hour). Only matters on devices with no installed Tamil TTS voice — see `public/audio/README.md`.

If you only have time for two of these, do 1 and 2 — under half an hour
combined, and it turns the most visibly fake part of a live demo (made-up
weather numbers) into something real.

## 7. Favicons, SEO, and Google Search Console

### 7.1 What's already done for you

- **Favicons:** a full set was generated from the app's avatar mark — `favicon.ico` (multi-resolution, for older browsers), plus PNGs at 16/32/48/192/512px and a 180px Apple touch icon, all in `public/icons/`. `index.html` already links every size correctly, and `vite.config.ts`'s PWA manifest now points at the PNGs (better OS/browser support for "Add to Home Screen" than SVG-only icons).
- **Meta tags:** `index.html` has a real `<title>`, `<meta name="description">`, keywords, Open Graph tags (so links shared on WhatsApp/Facebook/LinkedIn show a proper preview card), a Twitter Card, and JSON-LD structured data describing the app as a free `WebApplication` — this last one is what lets Google show a richer search result (price "Free", category, etc.) instead of a bare blue link.
- **`robots.txt` and `sitemap.xml`:** both exist in `public/` and are served at the site root automatically by Vite.

### 7.2 One thing you must do before deploying — replace the placeholder domain

Every SEO tag above uses `https://viva-ai.example.com/` as a placeholder since this project doesn't know its real deployed URL yet. Find and replace it everywhere once you have a real domain (Vercel/Netlify give you one free at `*.vercel.app` / `*.netlify.app`, or use a custom domain if your team has one):

```bash
# from the project root, after you know your real URL
grep -rl "viva-ai.example.com" index.html public/robots.txt public/sitemap.xml
# then replace in each of those 3 files (6 total occurrences)
```

Skipping this isn't fatal — the app works fine either way — but Open
Graph previews and the sitemap will point at a placeholder URL until you
do it, which looks unfinished if a judge clicks a shared link.

### 7.3 Google Search Console — getting the app indexed

Search Console doesn't make your app rank higher by itself, but it's
what tells Google your site exists at all, lets you submit the sitemap,
and surfaces indexing errors. Free, no card needed.

1. Deploy the app first (Section 5) — you need a real live URL before Search Console can verify it.
2. Go to [search.google.com/search-console](https://search.google.com/search-console) → **Add property** → choose **URL prefix** (not "Domain") → enter your exact deployed URL (e.g. `https://your-app.vercel.app/`).
3. Pick the **HTML tag** verification method. It gives you a line like:
   ```html
   <meta name="google-site-verification" content="abc123..." />
   ```
4. Open `index.html`, find the commented-out line under **"Google Search Console verification"**, uncomment it, and paste in your real code:
   ```html
   <meta name="google-site-verification" content="abc123..." />
   ```
5. Redeploy (`npm run build` + your hosting deploy command), then go back to Search Console and click **Verify**.
6. Once verified: **Sitemaps** (left sidebar) → submit `sitemap.xml` (just type `sitemap.xml`, it appends to your domain automatically).
7. Use **URL Inspection** → paste your homepage URL → **Request Indexing** to nudge Google to crawl it sooner rather than waiting for its normal schedule.

**Be aware:** this app is currently a single-page app — `App.tsx` switches between screens using internal React state, not real URLs/routes. That means there's genuinely only one crawlable, indexable URL today (the homepage), which is why `sitemap.xml` has just one entry — adding fake extra URLs would be actively misleading to Search Console. If you want individual screens (soil scan, maker mode, etc.) to be separately indexable and shareable later, that needs adding a real client-side router (e.g. `react-router-dom`) with distinct paths — a legitimate follow-up, not something this refactor silently skipped.

### 7.4 Running on localhost, and the difference from production

**Localhost (`npm run dev`):** Vite's dev server, hot-reload, no service worker registered by default in dev mode (the PWA plugin mostly activates in production builds) — so offline/installable behavior won't fully show up here. This is normal; test offline behavior against a production build instead (next point).

**Local production preview:**
```bash
npm run build      # outputs to dist/
npm run preview    # serves the real production build locally, service worker included
```
Use this — not `npm run dev` — to actually test the PWA install prompt, offline caching, and the favicon/SEO tags as they'll really appear.

**Production (deployed):** `npm run build` then deploy `dist/` via `firebase deploy --only hosting`, or connect the repo to Vercel/Netlify for automatic deploys on every push — all three are free tier and need no billing account, consistent with the rest of this project's no-Blaze constraint.

## 8. A note on the agronomic and engineering defaults

The crop soil/rainfall/season table (`src/modules/farm/data/crops.json`)
and the fabrication load-to-gauge logic
(`src/modules/fabrication/shape-library/shapeTemplates.ts`) are
reasonable starting defaults, not validated agricultural-extension or
structural-engineering data. Say this plainly in your pitch — for a
hackathon/showcase context this is a strength ("here's exactly what we'd
validate with TNAU/a structural engineer next"), not a weakness, and
it's also simply true.

## 9. Why no backend at all, instead of "just" removing Blaze requirements

An earlier version of this project used Cloud Functions purely to keep
API keys server-side, which is good practice in general — but Cloud
Functions specifically require the Blaze plan even though Blaze itself
has a generous free quota; the issue is the billing account requirement,
not actual cost for a project this size. Rather than hunting for a
"free but still server-side" workaround, this refactor leans into the
client-only trade-off explicitly and documents it (Section 2) rather
than hiding it. If your team later wants the keys fully hidden, a small
free-tier edge function (Cloudflare Workers, Vercel Edge Functions — both
have no-card free tiers) is a clean drop-in proxy that doesn't touch
Firebase's plan at all.
