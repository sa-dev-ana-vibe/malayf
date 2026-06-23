// IndexedDB isn't implemented in jsdom — fake-indexeddb provides a real,
// in-memory implementation so photoStore/storage tests run unchanged.
import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { Blob as NodeBlob } from "node:buffer";

// Blob round-trips through IndexedDB. fake-indexeddb persists values via the
// structured-clone algorithm, but Node's structuredClone can't serialize a
// jsdom Blob (it degrades to a plain `{}`, losing size/type/bytes), so a stored
// photo would come back unusable. Node's own Blob *does* clone losslessly, so
// install it as the global Blob. Then provide a tiny FileReader whose
// readAsDataURL/readAsArrayBuffer accept that Blob (jsdom's FileReader rejects
// anything that isn't a jsdom Blob). Together these let photoStore/storage —
// which create Blobs and read them back as data-URLs — run unchanged.
Object.defineProperty(globalThis, "Blob", {
  value: NodeBlob,
  configurable: true,
  writable: true,
});

class NodeBlobFileReader {
  result: string | ArrayBuffer | null = null;
  error: DOMException | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;

  private read(
    blob: Blob,
    toResult: (buf: ArrayBuffer) => string | ArrayBuffer,
  ): void {
    void blob
      .arrayBuffer()
      .then((buf) => {
        this.result = toResult(buf);
        this.onload?.();
      })
      .catch(() => {
        this.error = new DOMException("read failed");
        this.onerror?.();
      });
  }

  readAsDataURL(blob: Blob): void {
    this.read(blob, (buf) => {
      const bytes = new Uint8Array(buf);
      let bin = "";
      for (const b of bytes) bin += String.fromCharCode(b);
      const type = blob.type === "" ? "application/octet-stream" : blob.type;
      return `data:${type};base64,${btoa(bin)}`;
    });
  }

  readAsArrayBuffer(blob: Blob): void {
    this.read(blob, (buf) => buf);
  }
}

Object.defineProperty(globalThis, "FileReader", {
  value: NodeBlobFileReader,
  configurable: true,
  writable: true,
});

// jsdom under Node 26 doesn't expose a usable `localStorage` (Node's gated native
// one shadows it), so install a minimal in-memory Storage for tests.
function installLocalStorage() {
  try {
    globalThis.localStorage.setItem("__probe__", "1");
    globalThis.localStorage.removeItem("__probe__");
    return; // a working implementation already exists
  } catch {
    /* fall through and install a mock */
  }
  const store = new Map<string, string>();
  const mock = {
    get length() {
      return store.size;
    },
    clear: () => store.clear(),
    getItem: (k: string) => (store.has(k) ? (store.get(k) ?? null) : null),
    key: (i: number) => [...store.keys()][i] ?? null,
    removeItem: (k: string) => {
      store.delete(k);
    },
    setItem: (k: string, v: string) => {
      store.set(k, String(v));
    },
  } satisfies Storage;
  Object.defineProperty(globalThis, "localStorage", {
    value: mock,
    configurable: true,
    writable: true,
  });
}
installLocalStorage();

afterEach(() => {
  cleanup();
  localStorage.clear();
});
