/**
 * IndexedDB implementation of GamePersistence.
 * This is an internal module — consumers import from persistence.ts.
 */

import type { GamePersistence, PersistedState } from "./persistence";
import { DEFAULTS } from "./persistence";

const DB_NAME = "signal-game";
const DB_VERSION = 1;
const STORE_NAME = "state";

const KEYS = ["progress", "stats", "unlocks", "settings", "library"] as const;
type StoreKey = (typeof KEYS)[number];

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet<T>(db: IDBDatabase, key: string): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(db: IDBDatabase, key: string, value: unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const req = tx.objectStore(STORE_NAME).put(value, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export function createIDBPersistence(): GamePersistence {
  let dbPromise: Promise<IDBDatabase> | null = null;

  function getDB(): Promise<IDBDatabase> {
    if (!dbPromise) dbPromise = openDB();
    return dbPromise;
  }

  return {
    async load(): Promise<PersistedState> {
      try {
        const db = await getDB();
        const [progress, stats, unlocks, settings, library] = await Promise.all(
          KEYS.map((k) => idbGet(db, k))
        );
        return {
          progress: (progress as PersistedState["progress"]) ?? DEFAULTS.progress,
          stats: (stats as PersistedState["stats"]) ?? DEFAULTS.stats,
          unlocks: (unlocks as PersistedState["unlocks"]) ?? DEFAULTS.unlocks,
          settings: (settings as PersistedState["settings"]) ?? DEFAULTS.settings,
          library: (library as PersistedState["library"]) ?? DEFAULTS.library,
        };
      } catch {
        return { ...DEFAULTS };
      }
    },

    async save(partial: Partial<PersistedState>): Promise<void> {
      try {
        const db = await getDB();
        const ops: Promise<void>[] = [];
        for (const key of KEYS) {
          if (key in partial) {
            ops.push(idbSet(db, key, partial[key as StoreKey]));
          }
        }
        await Promise.all(ops);
      } catch {
        // IDB unavailable — silently fail
      }
    },

    async reset(): Promise<void> {
      try {
        const db = await getDB();
        await Promise.all(KEYS.map((k) => idbSet(db, k, DEFAULTS[k as StoreKey])));
      } catch {
        // silently fail
      }
    },
  };
}
