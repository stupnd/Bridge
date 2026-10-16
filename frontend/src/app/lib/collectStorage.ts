/**
 * IndexedDB autosave for the Collect page. Frame data quickly exceeds localStorage's ~5 MB cap,
 * so everything is stored as one record in a tiny key-value store.
 */
import type { CollectData } from "./collectData";

const DB_NAME = "bridge-collect";
const STORE = "kv";
const DATA_KEY = "collect-data";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function loadCollectData(): Promise<CollectData | null> {
  const saved = (await withStore("readonly", (s) => s.get(DATA_KEY))) as CollectData | undefined;
  if (!saved || !Array.isArray(saved.sessions) || !Array.isArray(saved.samples)) return null;
  return saved;
}

export async function saveCollectData(data: CollectData): Promise<void> {
  await withStore("readwrite", (s) => s.put(data, DATA_KEY));
}
