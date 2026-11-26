import { describe, expect, it } from "vitest";
import { seedCompany } from "./helpers/seed";
import { call, fakePdf, makeApp, upload } from "./helpers/test-app";

/**
 * Review I-3 (coordinator's ruling): verify names the version it
 * stamps; alerts follow the last verified version, and a newer
 * unverified version adds a "renewal awaiting verification" alert.
 */
describe("verification and expiry alerts", () => {
  it("an employee's own renewal never clears HR's alert", async () => {
    const ctx = await makeApp({ start: "2026-11-26T08:00:00.000Z" });
    const s = await seedCompany(ctx, "r3");
    const req = (u: { token: string }, m: string, p: string, b?: unknown) =>
      call(ctx.app, u.token, s.companyId, m, p, b);
    const file = async (u: { token: string }) => (await upload(ctx.app,
      u.token, s.companyId, "v.pdf", fakePdf("v"))).id;
    const alerts = async () => (await req(s.hr, "GET",
      "/v1/document-alerts")).body.items as { documentId: string;
        status: string; expiryDate: string }[];
    const d = await req(s.hr, "POST", `/v1/employees/${s.emp.report}/` +
      "documents", { type: "visa", expiryDate: "2026-12-05",
      fileId: await file(s.hr) });
    expect(d.status, d.text).toBe(201);
    expect(d.body.verified).toBe(true);
    const id = d.body.id as string;
    const v1 = d.body.current.id as string;
    const v2 = await req(s.employee, "POST",
      `/v1/employee-documents/${id}/versions`,
      { expiryDate: "2031-01-01", fileId: await file(s.employee) });
    expect(v2.status, v2.text).toBe(201);
    expect(v2.body.verified).toBe(false);
    const mine = (await alerts()).filter((a) => a.documentId === id);
    expect(mine.map((a) => [a.status, a.expiryDate]).sort()).toEqual([
      ["due", "2026-12-05"], ["renewal-unverified", "2031-01-01"]]);
    const path = `/v1/employee-documents/${id}/verify`;
    const stale = await req(s.hr, "POST", path, { versionId: v1 });
    expect([stale.status, stale.body.error.code])
      .toEqual([409, "VERSION_NOT_CURRENT"]);
    const ok = await req(s.hr, "POST", path,
      { versionId: v2.body.current.id });
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body).toMatchObject({ verified: true,
      expiryDate: "2031-01-01" });
    expect((await alerts()).filter((a) => a.documentId === id)).toEqual([]);
  });
});
