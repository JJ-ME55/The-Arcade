/**
 * Persistence: a tiny async key-value store on IndexedDB with a localStorage fallback
 * (localStorage is unavailable in some sandboxed/embedded contexts). Versioned schema +
 * migration live in state.ts.
 */

const DB_NAME = 'deeper';
const STORE = 'kv';
let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      if (typeof indexedDB === 'undefined') {
        resolve(null);
        return;
      }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function kvGet<T>(key: string): Promise<T | null> {
  const db = await openDB();
  if (!db) {
    try {
      const raw = localStorage.getItem('deeper:' + key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => resolve((req.result as T) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function kvSet<T>(key: string, value: T): Promise<void> {
  const db = await openDB();
  if (!db) {
    try {
      localStorage.setItem('deeper:' + key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
    return;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function kvDel(key: string): Promise<void> {
  const db = await openDB();
  if (!db) {
    try {
      localStorage.removeItem('deeper:' + key);
    } catch {
      /* ignore */
    }
    return;
  }
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
}
