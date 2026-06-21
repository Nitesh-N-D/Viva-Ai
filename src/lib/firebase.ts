/**
 * lib/firebase.ts
 *
 * Spark (free) tier only — Authentication (Anonymous) + Firestore, no
 * Cloud Functions anywhere in this file. Reads config from VITE_-prefixed
 * env vars so no key ever needs to be hardcoded.
 *
 * This file degrades gracefully if .env.local isn't filled in: every
 * exported function checks `db`/`auth` for null and no-ops or returns an
 * empty/safe value instead of throwing, so the app works in a fully
 * local "offline demo mode" with zero Firebase project configured.
 */
import { initializeApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  type Auth,
} from "firebase/auth";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  limit,
  query,
  doc,
  runTransaction,
  type Firestore,
} from "firebase/firestore";
import type { MapTile } from "../types";

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(config.apiKey && config.projectId);

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { app, auth, db };

/**
 * Reads the pre-aggregated, non-identifying soil map data. This used to
 * be written by a scheduled Cloud Function (Blaze-only feature); on the
 * Spark plan there's no scheduler available, so instead each soil scan
 * updates its own map tile directly via `recordSoilScanOnMap` below, in
 * real time, the moment it syncs — no waiting for an hourly batch job,
 * and no server required at all.
 *
 * Returns an empty array — never throws — if Firebase isn't configured
 * or no scans have synced yet; the caller (SoilMap.tsx) falls back to
 * illustrative sample points in that case.
 */
export async function getMapTiles(): Promise<MapTile[]> {
  if (!db) return [];
  try {
    const snap = await getDocs(query(collection(db, "mapTiles"), limit(500)));
    return snap.docs.map((d) => d.data() as MapTile);
  } catch {
    return [];
  }
}

/**
 * Rolls one anonymized soil scan into its geoTile's running tally using a
 * Firestore transaction — read-modify-write, safe even if two farmers in
 * the same ~1km tile sync at the same moment. This is the client-side
 * replacement for the old `crowdDataAggregate` Cloud Function: every
 * device does its own tiny piece of the aggregation instead of a server
 * doing it all in a batch, which is exactly the kind of workload
 * Firestore's free Spark quota is meant for.
 */
async function recordSoilScanOnMap(geoTile: string, soilType: string): Promise<void> {
  if (!db) throw new Error("Firestore not configured");
  const tileRef = doc(db, "mapTiles", geoTile);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(tileRef);
    const existing = snap.exists() ? (snap.data() as MapTile) : null;
    const soilCounts: Record<string, number> = { ...(existing?.soilCounts ?? {}) };
    soilCounts[soilType] = (soilCounts[soilType] ?? 0) + 1;

    const dominantSoilType = Object.entries(soilCounts).sort((a, b) => b[1] - a[1])[0][0];
    const scanCount = Object.values(soilCounts).reduce((sum, n) => sum + n, 0);

    tx.set(tileRef, {
      geoTile,
      soilCounts,
      dominantSoilType,
      scanCount,
      updatedAt: Date.now(),
    } satisfies MapTile);
  });
}

/**
 * Used by shared/offline-sync/SyncQueue.ts as the "writer" for queued
 * records. Throws if Firebase isn't configured so the queue marks the
 * item `retry` instead of silently dropping it — it'll flush once a real
 * Firebase project is wired up.
 *
 * Special-cases `soilScans`: alongside writing the raw anonymized record,
 * it also rolls the scan into the live `mapTiles` aggregate (see
 * `recordSoilScanOnMap` above) so the crowd-sourced soil map updates in
 * real time with zero backend involved.
 */
export async function writeQueuedItem(
  collectionName: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!db) throw new Error("Firestore not configured");
  await addDoc(collection(db, collectionName), payload);

  if (collectionName === "soilScans") {
    const geoTile = payload.geoTile as string | undefined;
    const soilType = payload.soilType as string | undefined;
    if (geoTile && soilType) {
      // Don't let a map-tile aggregation hiccup mark the whole soil-scan
      // sync as failed — the raw record above already succeeded.
      await recordSoilScanOnMap(geoTile, soilType).catch(() => {});
    }
  }
}

/** Resolves once anonymous auth completes, or immediately if Firebase isn't configured. */
export function ensureAnonymousAuth(): Promise<string | null> {
  if (!auth) return Promise.resolve(null);
  return new Promise((resolve) => {
    onAuthStateChanged(auth!, (user) => {
      if (user) {
        resolve(user.uid);
      } else {
        signInAnonymously(auth!)
          .then((cred) => resolve(cred.user.uid))
          .catch(() => resolve(null));
      }
    });
  });
}
