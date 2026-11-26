import { ACK_STATEMENT } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { call, callBytes, fakePdf, makeApp, upload } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

describe("company library and receipts (Review Focus 2)", () => {
  let ctx: Ctx;
  let s: Seeded;
  let dept: string;
  let doc: string;
  const req = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  const ids = async (u: SeedUser) => (await req(u, "GET", "/v1/library"))
    .body.items.map((d: { id: string }) => d.id);
  const receipts = async () => (await req(s.hr, "GET",
    `/v1/library/${doc}/receipts`)).body;
  const rowOf = (r: { rows: { employeeId: string; status: string }[] },
    e: string) =>
    r.rows.find((x) => x.employeeId === e);
  const current = async () => (await req(s.hr, "GET", `/v1/library/${doc}`))
    .body.current.id as string;
  const ack = (u: SeedUser, versionId: string) =>
    req(u, "POST", `/v1/library/${doc}/acknowledge`, { versionId });
  beforeAll(async () => {
    ctx = await makeApp({ start: "2026-11-26T08:00:00.000Z" });
    s = await seedCompany(ctx, "lib");
    dept = (await req(s.owner, "POST", "/v1/departments",
      { name: "Ops" })).body.id;
    for (const e of [s.emp.report, s.emp.report2]) {
      await req(s.hr, "PATCH", `/v1/employees/${e}`, { departmentId: dept });
    }
    const f = await upload(ctx.app, s.hr.token, s.companyId, "policy.pdf",
      fakePdf("LIBFILE"));
    const r = await req(s.hr, "POST", "/v1/library", { title: "Leave policy",
      category: "policy", fileId: f.id, requiresAck: true,
      audience: { allStaff: false, departmentIds: [dept], employeeIds: [],
        roles: [] } });
    expect(r.status, r.text).toBe(201);
    doc = r.body.id;
  });

  it("only the audience sees it; owner sees the audience", async () => {
    const mine = await req(s.employee, "GET", "/v1/library");
    expect(mine.body.items).toMatchObject([{ id: doc, audience: null }]);
    expect(await ids(s.manager)).not.toContain(doc);
    for (const [m, p] of [["GET", ""], ["GET", "/download"],
      ["POST", "/acknowledge"]] as const) {
      const r = await req(s.manager, m, `/v1/library/${doc}${p}`,
        m === "POST" ? { versionId: await current() } : undefined);
      expect(r.status, p).toBe(404);
    }
    const own = await req(s.owner, "GET", "/v1/library");
    expect(own.body.items[0].audience.departmentIds).toEqual([dept]);
  });

  it("download marks viewed; acknowledge marks acknowledged", async () => {
    const dl = await callBytes(ctx.app, s.employee.token, s.companyId,
      `/v1/library/${doc}/download`);
    expect(dl.bytes).toEqual(fakePdf("LIBFILE"));
    expect(rowOf(await receipts(), s.emp.report)?.status).toBe("viewed");
    const a = await ack(s.employee, await current());
    expect(a.status, a.text).toBe(200);
    expect(a.body.statement).toBe(ACK_STATEMENT);
    expect(a.text).not.toMatch(/sign/i);
    const r = await receipts();
    expect(rowOf(r, s.emp.report)?.status).toBe("acknowledged");
    expect(r.counts).toEqual({ acknowledged: 1, viewed: 0, pending: 1 });
    expect((await req(s.employee, "GET", `/v1/library/${doc}/receipts`))
      .status).toBe(403);
  });

  it("a new version starts new receipts; one row under a race",
    async () => {
      const v1 = await current();
      const f = await upload(ctx.app, s.hr.token, s.companyId, "v2.pdf",
        fakePdf("v2"));
      const v = await req(s.hr, "POST", `/v1/library/${doc}/versions`,
        { fileId: f.id, requiresAck: true, note: "Updated" });
      expect(v.status, v.text).toBe(201);
      const stale = await ack(s.employee, v1);
      expect([stale.status, stale.body.error.code])
        .toEqual([409, "VERSION_NOT_CURRENT"]);
      expect(rowOf(await receipts(), s.emp.report)?.status).toBe("pending");
      const v2 = await current();
      const [x, y] = await Promise.all([ack(s.employee, v2),
        ack(s.employee, v2)]);
      expect(x.body.acknowledgedAt).toBe(y.body.acknowledgedAt);
      const rows = await ctx.deps.db.query(
        "SELECT 1 FROM library_receipts WHERE version_id = $1", [v2]);
      expect(rows.length).toBe(1);
    });

  it("receipts_exclude_leavers; new hires are pending", async () => {
    await req(s.hr, "PATCH", `/v1/employees/${s.emp.report2}`,
      { lastWorkingDate: "2026-11-01" });
    const hire = await req(s.hr, "POST", "/v1/employees", { number: "E-9",
      fullName: "New Hire", jobTitle: "Clerk", nationality: "IN",
      workerClass: "expat-full-time", joiningDate: "2026-11-25",
      departmentId: dept });
    expect(hire.status, hire.text).toBe(201);
    const r = await receipts();
    expect(rowOf(r, s.emp.report2)).toBeUndefined();
    expect(rowOf(r, hire.body.id)?.status).toBe("pending");
  });

  it("an empty audience hides it; receipts stay", async () => {
    const before = (await ctx.deps.db.query(
      "SELECT 1 FROM library_receipts")).length;
    const put = await req(s.hr, "PUT", `/v1/library/${doc}/audience`,
      { allStaff: false, departmentIds: [], employeeIds: [], roles: [] });
    expect(put.status, put.text).toBe(200);
    expect(await ids(s.employee)).not.toContain(doc);
    expect((await ctx.deps.db.query("SELECT 1 FROM library_receipts"))
      .length).toBe(before);
  });
});
