import { RETENTION_NOTICE } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { call, fakePdf, makeApp, upload } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const CLASSES = ["emirates-id", "visa", "passport", "labour-card",
  "contract", "other", "letter"];

describe("document settings and retention", () => {
  let ctx: Ctx;
  let s: Seeded;
  const req = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  async function passport(emp: string, expiryDate: string) {
    const f = await upload(ctx.app, s.hr.token, s.companyId, "p.pdf",
      fakePdf("p"));
    const r = await req(s.hr, "POST", `/v1/employees/${emp}/documents`,
      { type: "passport", expiryDate, fileId: f.id });
    expect(r.status, r.text).toBe(201);
    return r.body.id as string;
  }
  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-11-26T08:00:00.000Z" });
    s = await seedCompany(ctx, "dset");
  });

  it("lead days change the stage; only the owner may change them",
    async () => {
      const id = await passport(s.emp.report, "2027-03-26");
      const before = await req(s.hr, "GET", "/v1/document-alerts");
      expect(before.body.items.map((a: { documentId: string }) =>
        a.documentId)).not.toContain(id);
      const cur = (await req(s.hr, "GET", "/v1/document-settings")).body;
      const next = { ...cur, leadDays: { ...cur.leadDays,
        passport: [180, 90, 30], "emirates-id": [90, 30] } };
      expect((await req(s.hr, "PUT", "/v1/document-settings", next))
        .status).toBe(403);
      const put = await req(s.owner, "PUT", "/v1/document-settings", next);
      expect(put.status, put.text).toBe(200);
      const after = await req(s.hr, "GET", "/v1/document-alerts");
      expect(after.body.items.find((a: { documentId: string }) =>
        a.documentId === id)).toMatchObject({ stageDays: 180,
        daysLeft: 120 });
      const [row] = await ctx.deps.db.query<{ data: unknown }>(
        `SELECT data FROM audit_events WHERE company_id = $1 AND
          action = 'document.settings.updated'`, [s.companyId]);
      expect(row!.data).toEqual({ settingsChanged: ["leadDays.emirates-id",
        "leadDays.passport"] });
    });

  it("retention has no default and deletes nothing", async () => {
    const empty = await req(s.hr, "GET", "/v1/document-retention");
    expect(empty.status, empty.text).toBe(200);
    expect(empty.body).toEqual({ asOf: "2026-11-26", due: [],
      unsetClasses: CLASSES, notice: RETENTION_NOTICE });
    const leaverDoc = await passport(s.emp.outsider, "2030-01-01");
    const activeDoc = await passport(s.emp.report2, "2030-01-01");
    await req(s.hr, "PATCH", `/v1/employees/${s.emp.outsider}`,
      { lastWorkingDate: "2024-10-31" });
    const cur = (await req(s.hr, "GET", "/v1/document-settings")).body;
    await req(s.owner, "PUT", "/v1/document-settings", { ...cur,
      retention: { ...cur.retention,
        passport: { months: 24, from: "employment-end" } } });
    const count = async () => (await ctx.deps.db.query(
      "SELECT 1 FROM employee_documents")).length;
    const n = await count();
    const due = await req(s.hr, "GET", "/v1/document-retention");
    expect(due.body.due).toEqual([{ kind: "employee-document",
      id: leaverDoc, employeeId: s.emp.outsider, retentionClass: "passport",
      retainUntil: "2026-10-31" }]);
    expect(JSON.stringify(due.body)).not.toContain(activeDoc);
    expect(due.body.unsetClasses).not.toContain("passport");
    expect(await count()).toBe(n);
  });
});
