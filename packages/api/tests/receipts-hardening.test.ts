import { RECEIPT_QUOTA_DEFAULT } from "@payroll/contract";
import { describe, expect, it } from "vitest";
import { memoryBlobStore, type BlobStore } from "../src/storage/blob";
import { decodeStrict } from "../src/receipts/base64";
import {
  meal,
  setLimits,
  setupExpenses,
  submitted,
} from "./helpers/expense-fixtures";
import { seedCompany } from "./helpers/seed";
import { call, makeApp } from "./helpers/test-app";
import { EXPENSE_START } from "./helpers/expense-fixtures";

/** Security review I-2, M-4 and mutants M12, M17, M18. */
const PNG = (n: number) => Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d,
  0x0a, 0x1a, 0x0a, n, n]).toString("base64");
const body = (n: number, extra: Record<string, unknown> = {}) => ({
  fileName: "r.png", contentType: "image/png", dataBase64: PNG(n),
  ...extra });

async function setup(opts: { blobs?: BlobStore;
  reader?: { read: () => Promise<unknown> } } = {}) {
  const ctx = await makeApp({ start: EXPENSE_START, ...opts });
  const s = await seedCompany(ctx, "harden");
  const up = (u: typeof s.employee, b: unknown) => call(ctx.app, u.token,
    s.companyId, "POST", "/v1/receipts", b);
  return { ctx, s, up };
}

describe("receipt hardening", () => {
  it("NUL and bidi file names are refused before anything is stored",
    async () => {
      const store = memoryBlobStore();
      const { s, up } = await setup({ blobs: store });
      for (let i = 0; i < 3; i++) {
        const r = await up(s.employee, body(i, { fileName: "x\u0000.png" }));
        expect(r.status, r.text).toBe(400);
      }
      const bidi = await up(s.employee, body(4,
        { fileName: "‮gnp.exe" }));
      expect(bidi.status).toBe(400);
      expect(store.dump().size).toBe(0);
    });

  it("a failed request leaves no orphan file", async () => {
    const inner = memoryBlobStore();
    const failing: BlobStore & { dump: () => Map<string, Uint8Array> } = {
      ...inner,
      put: async (k, b) => {
        await inner.put(k, b);
        throw new Error("disk went away after writing");
      },
      dump: inner.dump,
    };
    const { s, up } = await setup({ blobs: failing });
    const r = await up(s.employee, body(5));
    expect(r.status).toBe(500);
    expect(inner.dump().size).toBe(0);
  });

  it("uploads per user and per company per day are capped", async () => {
    const { ctx, s, up } = await setup();
    const cur = await call(ctx.app, s.hr.token, s.companyId, "GET",
      "/v1/expense-policy");
    expect(cur.body.receiptQuota).toEqual(RECEIPT_QUOTA_DEFAULT);
    await setLimits(ctx, s, [], null, { perUserPerDay: 2,
      perCompanyPerDay: 3 });
    expect((await up(s.employee, body(1))).status).toBe(201);
    expect((await up(s.employee, body(2))).status).toBe(201);
    const third = await up(s.employee, body(3));
    expect(third.status).toBe(429);
    expect(third.body.error).toMatchObject({ code: "RECEIPT_QUOTA_EXCEEDED",
      detail: { scope: "user" } });
    expect((await up(s.manager, body(4))).status).toBe(201);
    const co = await up(s.hr, body(5, { employeeId: s.emp.report2 }));
    expect(co.body.error.detail.scope).toBe("company");
  });

  it("duplicateOf shows other employees' copies to owner and hr only",
    async () => {
      const { ctx, s, up } = await setup();
      const theirs = await up(s.hr, body(7, { employeeId: s.emp.report2 }));
      const mine = await up(s.employee, body(7));
      expect(mine.body.duplicateOf).toEqual([]);
      const hr = await call(ctx.app, s.hr.token, s.companyId, "GET",
        `/v1/receipts/${mine.body.id}`);
      expect(hr.body.duplicateOf).toEqual([theirs.body.id]);
    });

  it("the uploader keeps seeing an upload after a role change",
    async () => {
      const { ctx, s, up } = await setup();
      const r = await up(s.hr, body(8, { employeeId: s.emp.report2 }));
      const d = await call(ctx.app, s.owner.token, s.companyId, "PATCH",
        `/v1/users/${s.hr.userId}`, { role: "employee" });
      expect(d.status, d.text).toBe(200);
      const got = await call(ctx.app, s.hr.token, s.companyId, "GET",
        `/v1/receipts/${r.body.id}`);
      expect(got.status).toBe(200);
    });

  it("non-canonical base64 padding is refused", async () => {
    expect(decodeStrict("QR==")).toBeNull();
    expect(decodeStrict("QQ==")).toEqual(new Uint8Array([0x41]));
    const { s, up } = await setup();
    const png = PNG(9);
    // Set a padding bit in the last data character ("XY==" -> "XZ==").
    const bad = png.slice(0, -3) + String.fromCharCode(
      png.charCodeAt(png.length - 3) + 1) + "==";
    const r = await up(s.employee, body(9, { dataBase64: bad }));
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("RECEIPT_BASE64_INVALID");
  });

  it("downloads carry a sandbox CSP and same-origin CORP", async () => {
    const { ctx, s, up } = await setup();
    const r = await up(s.employee, body(10));
    const d = await ctx.app.request(`/v1/receipts/${r.body.id}/content`, {
      headers: { authorization: `Bearer ${s.employee.token}`,
        "x-company-id": s.companyId } });
    expect(d.headers.get("content-security-policy"))
      .toBe("sandbox; default-src 'none'");
    expect(d.headers.get("cross-origin-resource-policy"))
      .toBe("same-origin");
  });

  it("NUL in reader text or an approval note is refused, not a 500",
    async () => {
      const { ctx, s, up } = await setup({ reader: { read: async () =>
        ({ source: "ocr", supplierName: "Cafe\u0000" }) } });
      const r = await up(s.employee, body(11));
      expect(r.status, r.text).toBe(201);
      expect(r.body.suggestion).toEqual({ source: "none" });
      const cats = await setupExpenses(ctx, s);
      const c = await submitted(ctx, s.employee, s, [meal(cats, "5.00")]);
      const n = await call(ctx.app, s.manager.token, s.companyId, "POST",
        `/v1/approvals/${c.approval.id}/reject`,
        { stepOrder: 1, note: "no\u0000pe" });
      expect(n.status).toBe(400);
    });
});
