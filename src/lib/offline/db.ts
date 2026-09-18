"use client";

/**
 * Local store for offline billing.
 *
 * IndexedDB rather than localStorage: this holds a few thousand stock rows and
 * every unsent sale, which is well past localStorage's few megabytes, and
 * localStorage is synchronous — blocking the main thread mid-scan is exactly
 * what a till must not do.
 *
 * Two stores:
 *   stock  a snapshot of what is sellable, refreshed whenever the POS loads
 *          online. Read-only as far as the till is concerned.
 *   queue  sales taken while offline, waiting to be replayed. The ONLY copy
 *          of that sale until it syncs, so nothing here is deleted until the
 *          server has confirmed it.
 */

const DB_NAME = "pharmadaily";
const DB_VERSION = 1;

export const STOCK_STORE = "stock";
export const QUEUE_STORE = "queue";

export type CachedBatch = {
  branch_stock_id: string;
  medicine_id: string;
  medicine_name: string;
  generic_name: string | null;
  strength: string | null;
  unit: string | null;
  dosage_form: string | null;
  manufacturer: string | null;
  barcode: string | null;
  prescription_required: boolean;
  controlled_drug: boolean;
  batch_no: string;
  expiry_date: string;
  available: number;
  selling_price: number;
  mrp: number;
};

export type QueuedSale = {
  /**
   * Minted on the client BEFORE the sale is taken, and reused on every retry.
   *
   * This is what makes replay safe: if the response to a sync is lost, the
   * till cannot tell whether the sale committed, and retrying is the natural
   * thing to do. Because the id is fixed, the retry is either a fresh insert
   * or a duplicate that the server recognises as already recorded — rather
   * than a second sale, a second stock deduction and a second charge.
   */
  id: string;
  branch_id: string;
  payload: {
    customer_id: string | null;
    discount: number;
    items: { branch_stock_id: string; quantity: number }[];
    payments: { method: string; amount: number; reference: string | null }[];
  };
  /** When the sale was actually made, not when it syncs. */
  occurred_at: string;
  status: "pending" | "failed";
  error?: string;
  attempts: number;
  /** Cached for the receipt, since the server round trip has not happened. */
  summary: { itemCount: number; total: number };
};

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(STOCK_STORE)) {
        db.createObjectStore(STOCK_STORE, { keyPath: "branch_stock_id" });
      }

      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const store = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        store.createIndex("occurred_at", "occurred_at");
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  return dbPromise;
}

async function tx<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(store, mode);
    const request = fn(transaction.objectStore(store));

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// ---------------------------------------------------------------------------
// Stock snapshot
// ---------------------------------------------------------------------------

/** Replaces the cached snapshot wholesale — a partial merge would keep batches that have since sold out elsewhere. */
export async function cacheStock(batches: CachedBatch[]): Promise<void> {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STOCK_STORE, "readwrite");
    const store = transaction.objectStore(STOCK_STORE);

    store.clear();
    for (const batch of batches) store.put(batch);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function readCachedStock(): Promise<CachedBatch[]> {
  try {
    return await tx<CachedBatch[]>(STOCK_STORE, "readonly", (store) => store.getAll());
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Queue
// ---------------------------------------------------------------------------

export async function enqueueSale(sale: QueuedSale): Promise<void> {
  await tx(QUEUE_STORE, "readwrite", (store) => store.put(sale));
}

export async function readQueue(): Promise<QueuedSale[]> {
  try {
    const rows = await tx<QueuedSale[]>(QUEUE_STORE, "readonly", (store) => store.getAll());
    // Replayed oldest first, so stock is consumed in the order it was sold.
    return rows.sort((a, b) => a.occurred_at.localeCompare(b.occurred_at));
  } catch {
    return [];
  }
}

/** Removed only once the server has confirmed the sale — this is its only copy. */
export async function dequeueSale(id: string): Promise<void> {
  await tx(QUEUE_STORE, "readwrite", (store) => store.delete(id));
}

export async function markQueuedFailure(id: string, error: string): Promise<void> {
  const existing = await tx<QueuedSale | undefined>(QUEUE_STORE, "readonly", (store) =>
    store.get(id),
  );

  if (!existing) return;

  await tx(QUEUE_STORE, "readwrite", (store) =>
    store.put({ ...existing, status: "failed", error, attempts: existing.attempts + 1 }),
  );
}

export async function isSupported(): Promise<boolean> {
  if (typeof indexedDB === "undefined") return false;
  try {
    await openDb();
    return true;
  } catch {
    return false;
  }
}
