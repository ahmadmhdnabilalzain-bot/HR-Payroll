import { mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { fsBlobStore } from "../src/storage/fs-blob";
import { memoryBlobStore } from "../src/storage/blob";

const dir = mkdtempSync(join(tmpdir(), "plan6-blobs-"));
const C = "00000000-0000-4000-8000-00000000000a";
const R = "00000000-0000-4000-8000-000000000001";
const KEY = `${C}/receipts/${R}`;

describe("fsBlobStore", () => {
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const store = fsBlobStore(dir);

  it("put then get round-trips; a missing key is null", async () => {
    await store.put(KEY, new Uint8Array([1, 2, 3]));
    expect(await store.get(KEY)).toEqual(new Uint8Array([1, 2, 3]));
    expect(await store.get(`${C}/receipts/${C}`)).toBeNull();
    expect(readdirSync(join(dir, C, "receipts"))).toEqual([R]);
  });

  it("refuses keys outside the receipts layout", async () => {
    for (const bad of ["../x", `${C}/../${R}`, `${C}/receipts/../../x`,
      `/${KEY}`, `${KEY}/x`]) {
      await expect(store.put(bad, new Uint8Array(1)), bad).rejects
        .toThrow(/BLOB_KEY_INVALID/);
      await expect(store.get(bad), bad).rejects.toThrow(/BLOB_KEY_INVALID/);
    }
  });

  it("never overwrites a stored blob", async () => {
    await expect(store.put(KEY, new Uint8Array([9]))).rejects.toThrow();
    expect(await store.get(KEY)).toEqual(new Uint8Array([1, 2, 3]));
  });
});

describe("memoryBlobStore", () => {
  it("round-trips and copies the bytes", async () => {
    const m = memoryBlobStore();
    const b = new Uint8Array([4, 5]);
    await m.put(KEY, b);
    b[0] = 0;
    expect(await m.get(KEY)).toEqual(new Uint8Array([4, 5]));
    expect(await m.get("nope")).toBeNull();
  });
});
