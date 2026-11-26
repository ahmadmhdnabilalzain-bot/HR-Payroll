import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import {
  call,
  callBytes,
  enableMfa,
  fakePdf,
  makeApp,
  signup,
  upload,
} from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("employee documents (Review Focus 1 and 2)", () => {
  let ctx: Ctx;
  let s: Seeded;
  const get = (u: SeedUser, path: string) =>
    call(ctx.app, u.token, s.companyId, "GET", path);
  const post = (u: SeedUser, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, "POST", path, body);
  /** Uploads a file as `u` and creates a slot for `emp` with it. */
  async function create(u: SeedUser, emp: string, body: object,
    marker = "doc") {
    const f = await upload(ctx.app, u.token, s.companyId, "d.pdf",
      fakePdf(marker));
    return post(u, `/v1/employees/${emp}/documents`, { ...body,
      fileId: f.id });
  }
  async function addVersion(u: SeedUser, id: string, body: object) {
    const f = await upload(ctx.app, u.token, s.companyId, "v.pdf",
      fakePdf("v"));
    return post(u, `/v1/employee-documents/${id}/versions`, { ...body,
      fileId: f.id });
  }
  const alertIds = async (u: SeedUser) =>
    (await get(u, "/v1/document-alerts")).body.items
      .map((a: { documentId: string }) => a.documentId);
  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-11-26T08:00:00.000Z" });
    s = await seedCompany(ctx, "docs");
  });

  it("who sees the number, the expiry and the file", async () => {
    const c = await create(s.hr, s.emp.report, { type: "passport",
      documentNumber: "P7777001", expiryDate: "2030-01-01" }, "SEEFILE");
    expect(c.status, c.text).toBe(201);
    const id = c.body.id as string;
    const self = await get(s.employee, `/v1/employee-documents/${id}`);
    expect(self.body.current.documentNumber).toBe("P7777001");
    const mgr = await get(s.manager, `/v1/employee-documents/${id}`);
    expect(mgr.status).toBe(200);
    expect(mgr.body).toMatchObject({ current: null,
      expiryDate: "2030-01-01", verified: false, versionCount: 1 });
    expect(mgr.text).not.toContain("P7777001");
    expect(mgr.body.versions).toBeUndefined();
    const vId = self.body.current.id as string;
    const dl = `/v1/employee-documents/${id}/versions/${vId}/download`;
    expect((await get(s.manager, dl)).status).toBe(404);
    const other = await signupOther(ctx);
    expect((await call(ctx.app, other.token, other.companyId, "GET",
      `/v1/employee-documents/${id}`)).status).toBe(404);
    const bytes = await callBytes(ctx.app, s.employee.token, s.companyId,
      dl);
    expect(bytes.status).toBe(200);
    expect(bytes.bytes).toEqual(fakePdf("SEEFILE"));
    expect(bytes.headers.get("content-disposition"))
      .toMatch(/^attachment;/);
    expect(bytes.headers.get("x-content-type-options")).toBe("nosniff");
    expect(bytes.headers.get("content-security-policy")).toMatch(/^sandbox/);
  });

  it("the outsider's documents are 404 to the employee", async () => {
    const c = await create(s.hr, s.emp.outsider, { type: "contract" });
    expect(c.status, c.text).toBe(201);
    expect((await get(s.employee,
      `/v1/employee-documents/${c.body.id}`)).status).toBe(404);
    expect((await get(s.employee,
      `/v1/employees/${s.emp.outsider}/documents`)).status).toBe(404);
  });

  it("one slot per statutory type; other may repeat", async () => {
    const again = await create(s.hr, s.emp.report, { type: "passport",
      expiryDate: "2031-01-01" });
    expect([again.status, again.body.error?.code])
      .toEqual([409, "DOCUMENT_SLOT_EXISTS"]);
    for (const label of ["A", "B"]) {
      const o = await create(s.hr, s.emp.report, { type: "other", label });
      expect(o.status, o.text).toBe(201);
    }
  });

  it("renewal_clears_alert", async () => {
    const c = await create(s.hr, s.emp.report2, { type: "passport",
      expiryDate: "2026-12-01" });
    const id = c.body.id as string;
    expect(await alertIds(s.hr)).toContain(id);
    const v2 = await addVersion(s.hr, id, { expiryDate: "2031-12-01" });
    expect(v2.status, v2.text).toBe(201);
    expect(v2.body.versionCount).toBe(2);
    expect(await alertIds(s.hr)).not.toContain(id);
    const v1 = v2.body.versions.find((v: { version: number }) =>
      v.version === 1);
    const r = await callBytes(ctx.app, s.hr.token, s.companyId,
      `/v1/employee-documents/${id}/versions/${v1.id}/download`);
    expect(r.status).toBe(200);
  });

  it("self upload is unverified until hr verifies", async () => {
    const c = await create(s.employee, s.emp.report, { type: "visa",
      expiryDate: "2027-06-01" });
    expect(c.status, c.text).toBe(201);
    expect(c.body.verified).toBe(false);
    const path = `/v1/employee-documents/${c.body.id}/verify`;
    expect((await post(s.employee, path)).status).toBe(403);
    const v = await post(s.hr, path);
    expect(v.status, v.text).toBe(200);
    expect(v.body.verified).toBe(true);
    expect(v.body.current.verifiedBy).toBe(s.hr.userId);
    const colleague = await create(s.employee, s.emp.report2,
      { type: "contract" });
    expect(colleague.status).toBe(404);
  });

  it("manager_own_document", async () => {
    const c = await create(s.manager, s.emp.manager, { type: "emirates-id",
      documentNumber: "E784", expiryDate: "2028-01-01" }, "MINE");
    expect(c.status, c.text).toBe(201);
    expect(c.body.current.documentNumber).toBe("E784");
    const r = await callBytes(ctx.app, s.manager.token, s.companyId,
      `/v1/employee-documents/${c.body.id}/versions/${c.body.current.id}` +
      "/download");
    expect(r.bytes).toEqual(fakePdf("MINE"));
    const forReport = await create(s.manager, s.emp.report,
      { type: "contract" });
    expect(forReport.status).toBe(404);
  });

  it("a claimed file cannot be reused", async () => {
    const f = await upload(ctx.app, s.hr.token, s.companyId, "x.pdf",
      fakePdf("x"));
    const body = { type: "other", fileId: f.id };
    expect((await post(s.hr, `/v1/employees/${s.emp.outsider}/documents`,
      body)).status).toBe(201);
    const r = await post(s.hr, `/v1/employees/${s.emp.outsider}/documents`,
      body);
    expect([r.status, r.body.error.code])
      .toEqual([409, "FILE_NOT_AVAILABLE"]);
  });

  it("alerts_exclude_leavers; scopes for manager and employee", async () => {
    const left = await create(s.hr, s.emp.outsider, { type: "passport",
      expiryDate: "2026-10-01" });
    expect(await alertIds(s.hr)).toContain(left.body.id);
    await call(ctx.app, s.hr.token, s.companyId, "PATCH",
      `/v1/employees/${s.emp.outsider}`, { lastWorkingDate: "2026-11-01" });
    expect(await alertIds(s.hr)).not.toContain(left.body.id);
    await create(s.hr, s.emp.report2, { type: "visa",
      documentNumber: "V7777002", expiryDate: "2026-12-10" });
    const mgr = await get(s.manager, "/v1/document-alerts");
    const emps = new Set(mgr.body.items.map((a: { employeeId: string }) =>
      a.employeeId));
    expect([...emps].every((e) => [s.emp.manager, s.emp.report,
      s.emp.report2].includes(e as string))).toBe(true);
    expect(emps.has(s.emp.report2)).toBe(true);
    expect(mgr.text).not.toContain("documentNumber");
    const mine = await get(s.employee, "/v1/document-alerts");
    for (const a of mine.body.items) expect(a.employeeId).toBe(s.emp.report);
  });

  it("no audit row or stored cipher holds a document number", async () => {
    const rows = await ctx.deps.db.query<{ data: unknown }>(
      "SELECT data FROM audit_events");
    expect(JSON.stringify(rows)).not.toContain("P7777001");
    const enc = await ctx.deps.db.query<{ number_enc: string }>(
      "SELECT number_enc FROM employee_document_versions");
    expect(JSON.stringify(enc)).not.toContain("P7777001");
    expect(enc.some((r) => r.number_enc !== null)).toBe(true);
  });
});

async function signupOther(ctx: Ctx) {
  const b = await signup(ctx.app, `other${ctx.deps.newId().slice(-4)}`);
  const m = await enableMfa(ctx.app, ctx.clock, b);
  return { token: m.token, companyId: b.companyId };
}
