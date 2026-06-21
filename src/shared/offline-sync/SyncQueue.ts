/**
 * shared/offline-sync/SyncQueue.ts
 *
 * Section 7.2 of the spec: every screen writes here FIRST, never directly
 * to Firestore. This is what makes "offline-first" the only code path
 * instead of a special case bolted on afterward.
 */
import { openDB, type IDBPDatabase } from "idb";

export type QueueCollection =
  | "soilScans"
  | "fabricationRequests"
  | "growthUpdates";

interface QueueItem {
  id?: number;
  collection: QueueCollection;
  payload: Record<string, unknown>;
  status: "pending" | "synced" | "retry";
  createdAt: number;
}

const DB_NAME = "viva-ai-sync";
const STORE_NAME = "queue";

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDb() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 1, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("status", "status");
      },
    });
  }
  return dbPromise;
}

/**
 * Queue a record for sync. Returns immediately — the caller's UI should
 * never block on network for this call, which is the whole point.
 */
export async function enqueue(
  collection: QueueCollection,
  payload: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  const item: QueueItem = {
    collection,
    payload,
    status: "pending",
    createdAt: Date.now(),
  };
  await db.add(STORE_NAME, item);
}

/**
 * Attempt to flush all pending/retry items to Firestore via the given
 * writer function. Call this on `online` events and on a periodic timer.
 * Network failures mark the item `retry` rather than throwing, so a flaky
 * 2G connection never crashes the app.
 */
export async function flushQueue(
  writer: (collection: QueueCollection, payload: Record<string, unknown>) => Promise<void>
): Promise<{ synced: number; failed: number }> {
  const db = await getDb();
  const all = (await db.getAll(STORE_NAME)) as QueueItem[];
  const pending = all.filter((i) => i.status !== "synced");

  let synced = 0;
  let failed = 0;

  for (const item of pending) {
    try {
      await writer(item.collection, item.payload);
      await db.put(STORE_NAME, { ...item, status: "synced" });
      synced++;
    } catch {
      await db.put(STORE_NAME, { ...item, status: "retry" });
      failed++;
    }
  }
  return { synced, failed };
}

export async function pendingCount(): Promise<number> {
  const db = await getDb();
  const all = (await db.getAll(STORE_NAME)) as QueueItem[];
  return all.filter((i) => i.status !== "synced").length;
}

/** Call once at app startup so a reconnect after offline use syncs automatically. */
export function registerAutoFlush(
  writer: (collection: QueueCollection, payload: Record<string, unknown>) => Promise<void>
) {
  window.addEventListener("online", () => {
    flushQueue(writer).catch(() => {
      /* swallow — next online event or periodic tick will retry */
    });
  });
  // Periodic tick covers the "online but Firestore briefly unreachable" case.
  setInterval(() => {
    if (navigator.onLine) flushQueue(writer).catch(() => {});
  }, 60_000);
}
