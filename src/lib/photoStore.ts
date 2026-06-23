// ─────────────────────────────────────────────────────────────────────────
// Photo storage on IndexedDB.
//
// Photos are the only heavy data in the app, so they live here as native
// Blobs (no base64 inflation, quota = a share of disk rather than the ~5 MB
// localStorage cap). Visits reference photos by id. An in-memory cache of
// object-URLs keeps rendering cheap for the session; deleting a photo revokes
// its URL. See requestPersistentStorage() for durability on mobile.
// ─────────────────────────────────────────────────────────────────────────

import { uid } from "./format";

const DB_NAME = "malayf";
const DB_VERSION = 1;
const STORE = "photos";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error("IndexedDB open failed"));
  });
  return dbPromise;
}

function tx<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = run(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error ?? new Error("IndexedDB request failed"));
      }),
  );
}

// ── object-URL cache ─────────────────────────────────────────────────────

const urlCache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();

/** Resolve a photo id to a renderable object-URL (cached for the session). */
export function getPhotoUrl(id: string): Promise<string | null> {
  const hit = urlCache.get(id);
  if (hit) return Promise.resolve(hit);
  const inflight = pending.get(id);
  if (inflight) return inflight;
  const p = tx<Blob | undefined>(
    "readonly",
    (s) => s.get(id) as IDBRequest<Blob | undefined>,
  )
    .then((blob) => {
      pending.delete(id);
      if (!blob) return null;
      const url = URL.createObjectURL(blob);
      urlCache.set(id, url);
      return url;
    })
    .catch(() => {
      pending.delete(id);
      return null;
    });
  pending.set(id, p);
  return p;
}

export function getPhotoBlob(id: string): Promise<Blob | undefined> {
  return tx<Blob | undefined>(
    "readonly",
    (s) => s.get(id) as IDBRequest<Blob | undefined>,
  );
}

/** Store a blob under a fresh id and return that id. */
export async function putPhoto(blob: Blob): Promise<string> {
  const id = "ph_" + uid();
  await tx("readwrite", (s) => s.put(blob, id));
  return id;
}

/** Store a blob under a known id (used by import). */
export async function putPhotoWithId(id: string, blob: Blob): Promise<void> {
  await tx("readwrite", (s) => s.put(blob, id));
}

export async function deletePhoto(id: string): Promise<void> {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  await tx("readwrite", (s) => s.delete(id));
}

export async function deletePhotos(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => deletePhoto(id)));
}

// ── resize pipeline (ported from the prototype's addPhoto) ───────────────

const MAX_DIM = 1000;
const JPEG_QUALITY = 0.7;

/** Load a Blob into an HTMLImageElement, preferring createImageBitmap. */
async function loadImage(
  blob: Blob,
): Promise<{ width: number; height: number; draw: (c: CanvasRenderingContext2D, w: number, h: number) => void; cleanup: () => void }> {
  if ("createImageBitmap" in window) {
    try {
      const bmp = await createImageBitmap(blob);
      return {
        width: bmp.width,
        height: bmp.height,
        draw: (c, w, h) => c.drawImage(bmp, 0, 0, w, h),
        cleanup: () => bmp.close(),
      };
    } catch {
      /* fall through */
    }
  }
  const url = URL.createObjectURL(blob);
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = url;
  });
  return {
    width: img.naturalWidth,
    height: img.naturalHeight,
    draw: (c, w, h) => c.drawImage(img, 0, 0, w, h),
    cleanup: () => URL.revokeObjectURL(url),
  };
}

/** Downscale to ≤1000px on the long edge and re-encode as JPEG q0.7. */
export async function resizeToBlob(file: Blob): Promise<Blob> {
  try {
    const src = await loadImage(file);
    let w = src.width,
      h = src.height;
    if (w > h && w > MAX_DIM) {
      h = Math.round((h * MAX_DIM) / w);
      w = MAX_DIM;
    } else if (h > MAX_DIM) {
      w = Math.round((w * MAX_DIM) / h);
      h = MAX_DIM;
    }
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      src.cleanup();
      return file;
    }
    src.draw(ctx, w, h);
    src.cleanup();
    const out = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
    );
    return out ?? file;
  } catch {
    return file;
  }
}

// ── data-URL <-> Blob (export/import portability) ────────────────────────

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(typeof r.result === "string" ? r.result : "");
    r.onerror = () => reject(r.error ?? new Error("file read failed"));
    r.readAsDataURL(blob);
  });
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [head, body] = dataUrl.split(",");
  const mimeMatch = /data:([^;]+)/.exec(head);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  if (head.includes(";base64")) {
    const bin = atob(body);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  }
  return new Blob([decodeURIComponent(body)], { type: mime });
}

// ── persistence + quota (the "more storage on mobile" lever) ─────────────

/** Ask the browser to make storage durable (won't be evicted under pressure). */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (navigator.storage?.persist) {
      if (await navigator.storage.persisted?.()) return true;
      return await navigator.storage.persist();
    }
  } catch {
    /* ignore */
  }
  return false;
}

export interface StorageEstimate {
  usage: number;
  quota: number;
  persisted: boolean;
}

export async function estimateStorage(): Promise<StorageEstimate | null> {
  try {
    if (!navigator.storage?.estimate) return null;
    const est = await navigator.storage.estimate();
    const persisted = (await navigator.storage.persisted?.()) ?? false;
    return { usage: est.usage ?? 0, quota: est.quota ?? 0, persisted };
  } catch {
    return null;
  }
}
