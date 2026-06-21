# VIVA AI

Tamil voice co-pilot for farming and frugal fabrication — two co-pilots,
one shared voice-and-avatar shell, **100% client-side, runs entirely on
free tiers, no backend server required.**

------------------------------------------------------------------------

> **Tamil Voice Co‑Pilot for Smart Farming & Frugal Fabrication**

[![React](https://img.shields.io/badge/React-18-blue)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)]()
[![Firebase](https://img.shields.io/badge/Firebase-Hosting-orange)]()
[![TensorFlow.js](https://img.shields.io/badge/TensorFlow.js-ML-ff6f00)]()

## 🚀 Live Demo

**Firebase Hosting:** https://viva-ai-2cc88.web.app

------------------------------------------------------------------------

## 📌 Overview

VIVA AI is an offline‑first Progressive Web App that helps farmers
with: - Soil classification - Plant disease detection - Crop
recommendations - Weather-aware insights - Mandi prices - Community soil
mapping

It also includes a fabrication assistant for simple design generation
and material guidance.

------------------------------------------------------------------------

## ✨ Features

-   🌱 On-device soil classification (TensorFlow.js)
-   🍃 Plant disease detection
-   🌾 Crop recommendation engine
-   🌦️ Weather integration
-   📈 Mandi price lookup
-   🗺️ Crowd-sourced soil map
-   🗣️ Tamil/English interface
-   🔧 Fabrication assistant
-   ☁️ Firebase Authentication & Firestore
-   📱 Offline-first PWA architecture

------------------------------------------------------------------------

## 🛠️ Tech Stack

-   React
-   TypeScript
-   Vite
-   TensorFlow.js
-   Firebase Authentication
-   Cloud Firestore
-   Firebase Hosting
-   Zustand
-   Tailwind CSS
-   Leaflet

------------------------------------------------------------------------

## Quick start

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

------------------------------------------------------------------------

## Architecture: no backend, by design

| Capability | How it works now |
|---|---|
| Weather | Browser calls OpenWeatherMap's API directly (`src/lib/weather.ts`) |
| Mandi prices | Browser attempts a direct call to data.gov.in/Agmarknet (`src/lib/mandi.ts`) |
| Fabrication intent extraction | Rule-based by default; optionally calls Gemini directly from the browser (`extractIntent.ts`) |
| Auth | Firebase Anonymous Authentication (client SDK) |
| Data storage | Firestore (client SDK) — Spark plan's free quota is generous for a hackathon's traffic |
| Crowd-sourced soil map | Each soil scan rolls itself into a `mapTiles` Firestore document via a client-side transaction — no scheduled server job needed |
| ML inference | TensorFlow.js, fully on-device, no server round-trip ever |

------------------------------------------------------------------------

## Project layout

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

------------------------------------------------------------------------

## Deploying (free tiers only, no Blaze)

**Frontend:** `npm run build` then deploy the `dist/` folder to Vercel,
Netlify, or `firebase deploy --only hosting` — all free tier, no billing
account needed for any of them.

**Firestore rules:** `firebase deploy --only firestore:rules` — review
`firestore.rules` first. It now allows the client to write to `mapTiles`
directly (with shape validation), since there's no server-side Admin SDK
process doing that anymore.

**That's it.** There's no backend deploy step — no Cloud Functions, no
secrets to set, nothing requiring a Blaze upgrade prompt.

------------------------------------------------------------------------

## 🤖 Machine Learning

Real TensorFlow.js models should be placed in:

``` text
public/models/soil_model/
public/models/disease_model/
```

The application automatically falls back to a mock classifier if trained
models are unavailable.

------------------------------------------------------------------------