/**
 * Where encrypted receipt files live. Memory in tests, local disk in
 * development (`fsBlobStore`), object storage in a later plan. Callers
 * pass bytes that are already encrypted.
 */
export interface BlobStore {
  put(key: string, bytes: Uint8Array): Promise<void>;
  get(key: string): Promise<Uint8Array | null>;
}

export interface MemoryBlobStore extends BlobStore {
  /** Test access to what is stored (copies). */
  dump(): Map<string, Uint8Array>;
}

export function memoryBlobStore(): MemoryBlobStore {
  const m = new Map<string, Uint8Array>();
  return {
    async put(key, bytes) {
      if (m.has(key)) throw new Error(`blob ${key} exists`);
      m.set(key, new Uint8Array(bytes));
    },
    async get(key) {
      const b = m.get(key);
      return b === undefined ? null : new Uint8Array(b);
    },
    dump: () => new Map([...m].map(([k, v]) => [k, new Uint8Array(v)])),
  };
}
