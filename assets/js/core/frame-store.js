/**
 * IndexedDB-backed still-frame storage.
 * Large image data stays out of localStorage's small synchronous quota.
 */
const DATABASE = "phoenixframe-media";
const VERSION = 1;
const STORE = "frames";

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in globalThis)) return reject(new Error("IndexedDB is unavailable."));
    const request = indexedDB.open(DATABASE, VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Could not open frame storage."));
    request.onblocked = () => reject(new Error("Frame storage is blocked by another tab."));
  });
}

export function createFrameStore() {
  async function transact(mode, work) {
    const db = await openDatabase();
    try {
      return await new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE, mode);
        const store = transaction.objectStore(STORE);
        let result;
        try { result = work(store); } catch (error) { reject(error); return; }
        transaction.oncomplete = () => resolve(result);
        transaction.onerror = () => reject(transaction.error || new Error("Frame storage transaction failed."));
        transaction.onabort = () => reject(transaction.error || new Error("Frame storage transaction was aborted."));
      });
    } finally { db.close(); }
  }

  return {
    async load() {
      const db = await openDatabase();
      try {
        return await new Promise((resolve, reject) => {
          const request = db.transaction(STORE, "readonly").objectStore(STORE).getAll();
          request.onsuccess = () => resolve((request.result || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0)));
          request.onerror = () => reject(request.error || new Error("Could not read saved frames."));
        });
      } finally { db.close(); }
    },
    async saveAll(frames) {
      return transact("readwrite", store => {
        store.clear();
        frames.forEach((frame, order) => store.put({ ...frame, order }));
      });
    },
    async clear() { return transact("readwrite", store => store.clear()); }
  };
}
