import { createHash } from "node:crypto";
import { RECEIPT_MAX_BYTES } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import type { MemoryBlobStore } from "../src/storage/blob";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import {
  call,
  callBytes,
  enableMfa,
  makeApp,
  signup,
} from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

export function png(size = 64, fill = 7): Uint8Array {
  const b = new Uint8Array(size).fill(fill);
  b.set(PNG_SIG);
  return b;
}
const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64");
const upload = (bytes: Uint8Array, extra: Record<string, unknown> = {}) =>
  ({ fileName: "dinner.png", contentType: "image/png",
    dataBase64: b64(bytes), ...extra });
const sha = (b: Uint8Array) => createHash("sha256").update(b).digest("hex");
const contains = (hay: Uint8Array, needle: number[]) =>
  Buffer.from(hay).includes(Buffer.from(needle));

describe("receipts (Review Focus 3)", () => {
  let ctx: Ctx;
  let s: Seeded;
  const post = (u: SeedUser, body: unknown) =>
    call(ctx.app, u.token, s.companyId, "POST", "/v1/receipts", body);
  const get = (u: SeedUser, path: string) =>
    call(ctx.app, u.token, s.companyId, "GET", path);
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "rcpt");
  });

  it("upload_png_by_employee", async () => {
    const bytes = png(200);
    const r = await post(s.employee, upload(bytes));
    expect(r.status, r.text).toBe(201);
    expect(r.body).toMatchObject({ employeeId: s.emp.report, size: 200,
      sha256: sha(bytes), contentType: "image/png",
      suggestion: { source: "none" }, duplicateOf: [] });
    const stored = [...(ctx.deps.blobs as MemoryBlobStore).dump()];
    expect(stored.length).toBeGreaterThan(0);
    for (const [key, value] of stored) {
      expect(key).toBe(`${s.companyId}/receipts/${key.split("/")[2]}`);
      expect(contains(value, PNG_SIG)).toBe(false);
      expect(Buffer.from(value).toString()).not.toContain(b64(bytes));
    }
  });

  it("html_declared_png_refused", async () => {
    const html = new TextEncoder().encode("<html><script>x</script>");
    const r = await post(s.employee, upload(html));
    expect(r.status).toBe(415);
    expect(r.body.error.code).toBe("RECEIPT_TYPE_NOT_ALLOWED");
  });

  it("pdf_declared_png_refused", async () => {
    const pdf = new TextEncoder().encode("%PDF-1.7\n%%EOF\n");
    const r = await post(s.employee, upload(pdf));
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("RECEIPT_TYPE_MISMATCH");
  });

  it("oversize_refused", async () => {
    const big = await post(s.employee, upload(png(RECEIPT_MAX_BYTES + 1)));
    expect(big.status, big.text).toBe(413);
    expect(big.body.error.code).toBe("RECEIPT_TOO_LARGE");
    const edge = await post(s.employee, upload(png(RECEIPT_MAX_BYTES)));
    expect(edge.status, edge.text).toBe(201);
    const body = upload(png(16), { dataBase64: "A".repeat(7_600_000) });
    const huge = await post(s.employee, body);
    expect(huge.status, huge.text).toBe(413);
    expect(huge.body.error.code).toBe("PAYLOAD_TOO_LARGE");
    const other = await call(ctx.app, s.hr.token, s.companyId, "POST",
      "/v1/departments", { name: "x".repeat(1_100_000) });
    expect(other.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("bad_base64_refused", async () => {
    for (const bad of ["not base64!", "QUJD=", "QQ", "QUJD\nRA=="]) {
      const r = await post(s.employee, upload(png(), { dataBase64: bad }));
      expect(r.status, bad).toBe(400);
      expect(r.body.error.code).toBe("RECEIPT_BASE64_INVALID");
    }
  });

  it("download_headers", async () => {
    const bytes = png(300, 9);
    const up = await post(s.employee, upload(bytes,
      { fileName: "x\".html" }));
    expect(up.status, up.text).toBe(201);
    const r = await callBytes(ctx.app, s.employee.token, s.companyId,
      `/v1/receipts/${up.body.id}/content`);
    expect(r.status).toBe(200);
    expect(r.bytes).toEqual(bytes);
    expect(r.headers.get("content-type")).toBe("image/png");
    const cd = r.headers.get("content-disposition") ?? "";
    expect(cd.startsWith("attachment;")).toBe(true);
    expect(cd).toBe(`attachment; filename="receipt-${up.body.id}.png"`);
    expect(r.headers.get("x-content-type-options")).toBe("nosniff");
    expect(r.headers.get("cache-control")).toBe("no-store");
  });

  it("other_employee_404 (manager of another report too)", async () => {
    const up = await post(s.owner, upload(png(), {
      employeeId: s.emp.report2 }));
    expect(up.status, up.text).toBe(201);
    for (const u of [s.employee, s.manager]) {
      expect((await get(u, `/v1/receipts/${up.body.id}`)).status).toBe(404);
      const c = await callBytes(ctx.app, u.token, s.companyId,
        `/v1/receipts/${up.body.id}/content`);
      expect(c.status).toBe(404);
    }
    expect((await get(s.hr, `/v1/receipts/${up.body.id}`)).status)
      .toBe(200);
  });

  it("an employee uploads only for self", async () => {
    const r = await post(s.employee, upload(png(), {
      employeeId: s.emp.report2 }));
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("FORBIDDEN");
    const noLink = await post(s.hr, upload(png()));
    expect(noLink.body.error.code).toBe("NO_EMPLOYEE_LINK");
  });

  it("other_company_404", async () => {
    const up = await post(s.employee, upload(png(32, 3)));
    const b = await signup(ctx.app, "rcptb");
    const mfa = await enableMfa(ctx.app, ctx.clock, b);
    const meta = await call(ctx.app, mfa.token, b.companyId, "GET",
      `/v1/receipts/${up.body.id}`);
    expect(meta.status).toBe(404);
    const c = await callBytes(ctx.app, mfa.token, b.companyId,
      `/v1/receipts/${up.body.id}/content`);
    expect(c.status).toBe(404);
  });

  it("duplicate_listed", async () => {
    const bytes = png(90, 5);
    const a = await post(s.employee, upload(bytes));
    const b = await post(s.employee, upload(bytes));
    expect(b.body.duplicateOf).toEqual([a.body.id]);
    const again = await get(s.employee, `/v1/receipts/${a.body.id}`);
    expect(again.body.duplicateOf).toEqual([b.body.id]);
  });

  it("audit_has_no_content", async () => {
    const log = await get(s.owner, "/v1/audit-events?limit=100");
    const ups = log.body.items.filter((e: { action: string }) =>
      e.action === "receipt.uploaded");
    expect(ups.length).toBeGreaterThan(0);
    for (const e of ups) {
      expect(Object.keys(e.data).sort()).toEqual(["contentType", "size"]);
    }
    expect(log.body.items.some((e: { action: string }) =>
      e.action === "receipt.downloaded")).toBe(true);
  });
});

describe("receipt reader suggestions", () => {
  const run = async (reader: { read: () => Promise<unknown> }) => {
    const ctx = await makeApp({ reader });
    const s = await seedCompany(ctx, "ocr");
    const r = await call(ctx.app, s.employee.token, s.companyId, "POST",
      "/v1/receipts", upload(png()));
    expect(r.status, r.text).toBe(201);
    return { body: r.body, logs: ctx.logs };
  };

  it("ocr_suggestion_stored_not_applied", async () => {
    const want = { source: "ocr", amount: "12.50",
      supplierTrn: "100000000000003" };
    const ok = await run({ read: async () => want });
    expect(ok.body.suggestion).toEqual(want);
    for (const bad of [async () => ({ amount: 12.5 }), async () => {
      throw new Error("reader saw 12.5");
    }]) {
      const r = await run({ read: bad });
      expect(r.body.suggestion).toEqual({ source: "none" });
      const lines = r.logs.filter((l) => l.event === "receipt.reader.failed");
      expect(lines.length).toBe(1);
      expect(JSON.stringify(r.logs)).not.toContain("12.5");
    }
  });
});
