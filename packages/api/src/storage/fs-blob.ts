import { link, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CodedError } from "../coded-error";
import type { BlobStore } from "./blob";

/**
 * `<companyId>/receipts/<id>` or `<companyId>/inbound/<id>` (Plan 13
 * email-in), nothing else (no `..`, no `/`).
 */
const KEY = /^[0-9a-f-]{36}\/(receipts|inbound)\/[0-9a-f-]{36}$/;

function pathOf(dir: string, key: string): string {
  if (!KEY.test(key)) {
    throw new CodedError("BLOB_KEY_INVALID", "blob key is not a receipt key");
  }
  return join(dir, key);
}

const missing = (e: unknown) => (e as { code?: string }).code === "ENOENT";

/**
 * Local-disk blobs under `dir`. A write goes to `<path>.part`
 * (created exclusively) and is hard-linked into place, so a reader never
 * sees half a file; an existing blob is never overwritten.
 */
export function fsBlobStore(dir: string): BlobStore {
  return {
    async put(key, bytes) {
      const path = pathOf(dir, key);
      await mkdir(dirname(path), { recursive: true, mode: 0o700 });
      const part = `${path}.part`;
      await writeFile(part, bytes, { flag: "wx", mode: 0o600 });
      try {
        // link() fails when `path` exists: atomic and never overwrites.
        await link(part, path);
      } finally {
        await rm(part, { force: true });
      }
    },
    async get(key) {
      const path = pathOf(dir, key);
      try {
        return new Uint8Array(await readFile(path));
      } catch (e) {
        if (missing(e)) return null;
        throw e;
      }
    },
  };
}
