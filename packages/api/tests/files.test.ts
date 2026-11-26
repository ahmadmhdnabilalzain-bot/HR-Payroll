import { createHash } from "node:crypto";
import { MAX_UPLOAD_BYTES } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { claimFile, readFile, type FileCtx } from "../src/files/files";
import type { MemoryBlobStore } from "../src/storage/blob";
import { fsBlobStore } from "../src/storage/fs-blob";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import {
  call,
  enableMfa,
  fakePdf,
  makeApp,
  signup,
  upload,
} from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const png = () => { const b = new Uint8Array(40).fill(1); b.set(PNG);
  return b; };
const text = (s: string) => new TextEncoder().encode(s);
const T = (n: number) => `test:00000000-0000-4000-8000-00000000f00${n}`;

describe("file upload and storage (Review Focus 5)", () => {
  let ctx: Ctx;
  let s: Seeded;
  const post = (u: SeedUser, name: string, contentBase64: string) =>
    call(ctx.app, u.token, s.companyId, "POST", "/v1/files",
      { name, contentBase64 });
  /** Runs `fn` as `u` inside company `c`'s tenant transaction. */
  const as = <T>(u: SeedUser, c: string, role: string,
    fn: (f: FileCtx) => Promise<T>) =>
    withTenant(ctx.deps.db, { companyId: c, userId: u.userId },
      (tx) => fn({ tx, deps: ctx.deps, user: { id: u.userId },
        tenant: { companyId: c, role, employeeId: null } } as
        unknown as FileCtx));
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "files");
  });

  it("stores a PDF and answers its reference", async () => {
    const bytes = fakePdf("x");
    const r = await post(s.hr, "policy.pdf", b64(bytes));
    expect(r.status, r.text).toBe(201);
    expect(r.body).toMatchObject({ name: "policy.pdf",
      mime: "application/pdf", size: bytes.length, sha256: sha(bytes) });
  });

  it("files_sniff_ignores_name", async () => {
    for (const bad of ["<html><body>x</body></html>",
      "<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>", "MZ\x90\x00"]) {
      const r = await post(s.employee, "policy.pdf", b64(text(bad)));
      expect(r.status, bad).toBe(415);
      expect(r.body.error.code).toBe("FILE_TYPE_NOT_ALLOWED");
    }
    const r = await post(s.employee, "notes.txt", b64(png()));
    expect(r.status, r.text).toBe(201);
    expect(r.body.mime).toBe("image/png");
  });

  it("bad base64, empty and oversize files are refused", async () => {
    const bad = await post(s.hr, "a.pdf", "abc");
    expect(bad.body.error.code).toBe("FILE_BASE64_INVALID");
    expect(bad.status).toBe(400);
    const empty = await post(s.hr, "a.pdf", "");
    expect([empty.status, empty.body.error.code])
      .toEqual([400, "FILE_EMPTY"]);
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1).fill(32);
    big.set(text("%PDF-"));
    const over = await post(s.hr, "big.pdf", b64(big));
    expect([over.status, over.body.error.code])
      .toEqual([413, "FILE_TOO_LARGE"]);
    const ok = await post(s.hr, "max.pdf", b64(big.subarray(0,
      MAX_UPLOAD_BYTES)));
    expect(ok.status, ok.text).toBe(201);
  });

  it("stored blobs are encrypted; audit and logs carry no name", async () => {
    const f = await upload(ctx.app, s.hr.token, s.companyId,
      "SECRET-NAME.pdf", fakePdf("SENTINEL-FILE"));
    const blobs = [...(ctx.deps.blobs as MemoryBlobStore).dump()];
    const mine = blobs.find(([k]) => k === `${s.companyId}/files/${f.id}`);
    expect(mine).toBeDefined();
    for (const [, v] of blobs) {
      expect(Buffer.from(v).toString("latin1")).not.toContain(
        "SENTINEL-FILE");
    }
    const audit = await ctx.deps.db.query<{ data: unknown }>(
      "SELECT data FROM audit_events WHERE action = 'file.uploaded' " +
      "AND entity_id = $1", [f.id]);
    expect(audit.length).toBe(1);
    expect(audit[0]!.data).toEqual({ fileId: f.id, mime: "application/pdf",
      size: fakePdf("SENTINEL-FILE").length });
    const logs = JSON.stringify(ctx.logs);
    expect(logs).not.toContain("SENTINEL-FILE");
    expect(logs).not.toContain("SECRET-NAME");
  });

  it("another company cannot read or decrypt a file", async () => {
    const f = await upload(ctx.app, s.hr.token, s.companyId, "a.pdf",
      fakePdf("tenant"));
    await as(s.hr, s.companyId, "hr", (x) => claimFile(x, f.id,
      `test:${f.id}`));
    const b = await signup(ctx.app, "filesb");
    const bm = await enableMfa(ctx.app, ctx.clock, b);
    const bUser = { token: bm.token, userId: b.userId, email: b.email };
    await expect(as(bUser, b.companyId, "owner", (x) =>
      readFile(x, f.id, `test:${f.id}`))).rejects.toMatchObject({
      code: "NOT_FOUND" });
    const [row] = await ctx.deps.db.query<{ dek_wrapped: string }>(
      "SELECT dek_wrapped FROM companies WHERE id = $1", [b.companyId]);
    const keyB = ctx.deps.keyring.companyKey(row!.dek_wrapped, b.companyId);
    const stored = await ctx.deps.blobs.get(`${s.companyId}/files/${f.id}`);
    expect(() => keyB.decryptBytes(`${s.companyId}:files:blob:${f.id}`,
      stored!)).toThrow();
    const back = await as(s.hr, s.companyId, "hr", (x) =>
      readFile(x, f.id, `test:${f.id}`));
    expect(back.bytes).toEqual(fakePdf("tenant"));
    await expect(as(s.hr, s.companyId, "hr", (x) =>
      readFile(x, f.id, T(6)))).rejects.toMatchObject({
      code: "NOT_FOUND" });
  });

  it("a file is claimed once, by its uploader only", async () => {
    const f = await upload(ctx.app, s.hr.token, s.companyId, "c.pdf",
      fakePdf("claim"));
    const ref = await as(s.hr, s.companyId, "hr", (x) =>
      claimFile(x, f.id, T(0)));
    expect(ref.id).toBe(f.id);
    await expect(as(s.hr, s.companyId, "hr", (x) =>
      claimFile(x, f.id, T(1)))).rejects.toMatchObject({
      code: "FILE_NOT_AVAILABLE" });
    const e = await upload(ctx.app, s.employee.token, s.companyId, "e.pdf",
      fakePdf("mine"));
    await expect(as(s.hr, s.companyId, "hr", (x) =>
      claimFile(x, e.id, T(2)))).rejects.toMatchObject({
      code: "FILE_NOT_AVAILABLE" });
    await expect(as(s.hr, s.companyId, "hr", (x) =>
      claimFile(x, ctx.deps.newId(), T(3)))).rejects
      .toMatchObject({ code: "NOT_FOUND" });
  });

  it("the database keeps attached_to write-once", async () => {
    const f = await upload(ctx.app, s.hr.token, s.companyId, "w.pdf",
      fakePdf("once"));
    await as(s.hr, s.companyId, "hr", (x) => claimFile(x, f.id, T(4)));
    await expect(ctx.deps.db.query(
      "UPDATE files SET attached_to = $2 WHERE id = $1", [f.id, T(6)]))
      .rejects.toThrow(/write-once/);
    await expect(ctx.deps.db.query(
      "UPDATE files SET name = 'x.pdf' WHERE id = $1", [f.id]))
      .rejects.toThrow(/write-once/);
  });
});

describe("fsBlobStore keys", () => {
  it("accepts a files key and refuses other layouts", async () => {
    const { mkdtempSync, rmSync } = await import("node:fs");
    const { tmpdir } = await import("node:os");
    const { join } = await import("node:path");
    const dir = mkdtempSync(join(tmpdir(), "plan7-blobs-"));
    const store = fsBlobStore(dir);
    const C = "00000000-0000-4000-8000-00000000000a";
    const F = "00000000-0000-4000-8000-000000000001";
    await store.put(`${C}/files/${F}`, new Uint8Array([1]));
    expect(await store.get(`${C}/files/${F}`)).toEqual(new Uint8Array([1]));
    await expect(store.put(`${C}/other/${F}`, new Uint8Array(1))).rejects
      .toThrow(/BLOB_KEY_INVALID/);
    rmSync(dir, { recursive: true, force: true });
  });
});
