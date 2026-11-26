import { VAT_STATEMENT } from "@payroll/contract";
import { beforeAll, describe, expect, it } from "vitest";
import {
  createClaim,
  drive,
  EXPENSE_START,
  meal,
  setupExpenses,
  type Cats,
} from "./helpers/expense-fixtures";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { call, enableMfa, makeApp, signup } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  1, 2, 3]).toString("base64");

describe("expense claims: drafts, edits, visibility", () => {
  let ctx: Ctx;
  let s: Seeded;
  let cats: Cats;
  const as = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  beforeAll(async () => {
    ctx = await makeApp({ start: EXPENSE_START });
    s = await seedCompany(ctx, "claims");
    cats = await setupExpenses(ctx, s);
  });

  it("employee_creates_draft", async () => {
    const r = await createClaim(ctx, s.employee, s, [drive(cats, 120),
      meal(cats, "45.50", { vatAmount: "2.17" })]);
    expect(r.status, r.text).toBe(201);
    expect(r.body).toMatchObject({ status: "draft",
      employeeId: s.emp.report, createdBy: s.employee.userId,
      vatRecoverability: "not-assessed", vatStatement: VAT_STATEMENT,
      approval: null, payRunId: null,
      total: "135.50", vatTotal: "2.17" });
    expect(r.body.items[0]).toMatchObject({ kind: "mileage",
      amount: "90.00", vatAmount: "0.00", rateApplied: "0.75",
      supplierTrn: null, overLimit: false });
    const got = await as(s.employee, "GET", `/v1/expense-claims/${r.body.id}`);
    expect(got.body).toEqual(r.body);
  });

  it("a mileage item with no rate yet is stored at 0.00", async () => {
    const r = await createClaim(ctx, s.employee, s,
      [drive(cats, 10, "2025-12-31")]);
    expect(r.status, r.text).toBe(201);
    expect(r.body.items[0]).toMatchObject({ amount: "0.00",
      rateApplied: null });
  });

  it("employee_cannot_file_for_other; hr may", async () => {
    const bad = await createClaim(ctx, s.employee, s, [meal(cats, "10.00")],
      { employeeId: s.emp.report2 });
    expect(bad.status).toBe(403);
    expect(bad.body.error.code).toBe("FORBIDDEN");
    const ok = await createClaim(ctx, s.hr, s, [meal(cats, "10.00")],
      { employeeId: s.emp.report });
    expect(ok.status, ok.text).toBe(201);
    expect(ok.body.createdBy).toBe(s.hr.userId);
    expect(ok.body.employeeId).toBe(s.emp.report);
  });

  it("foreign_receipt_refused; unknown category too", async () => {
    const up = await as(s.owner, "POST", "/v1/receipts", { fileName: "r.png",
      contentType: "image/png", dataBase64: PNG,
      employeeId: s.emp.report2 });
    expect(up.status, up.text).toBe(201);
    const r = await createClaim(ctx, s.employee, s, [
      meal(cats, "10.00", { receiptIds: [up.body.id] }),
      meal(cats, "10.00", { categoryId: s.emp.report })]);
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("CLAIM_PROBLEMS");
    expect(r.body.error.detail.problems).toEqual([
      "items.0:RECEIPT_NOT_FOUND", "items.1:CATEGORY_NOT_FOUND"]);
  });

  it("edit_creates_revision", async () => {
    const c = await createClaim(ctx, s.employee, s, [meal(cats, "10.00")]);
    const p = await as(s.employee, "PATCH", `/v1/expense-claims/${c.body.id}`,
      { title: "Dinner", items: [meal(cats, "20.00"), drive(cats, 4)] });
    expect(p.status, p.text).toBe(200);
    expect(p.body.title).toBe("Dinner");
    expect(p.body.items.map((i: { amount: string }) => i.amount))
      .toEqual(["20.00", "3.00"]);
    const rows = await ctx.deps.db.query<{ revision: number }>(
      "SELECT revision FROM expense_items WHERE claim_id = $1 " +
      "ORDER BY revision, idx", [c.body.id]);
    expect(rows.map((x) => x.revision)).toEqual([1, 2, 2]);
    const other = await as(s.manager, "PATCH",
      `/v1/expense-claims/${c.body.id}`, { title: "Mine" });
    // A draft is invisible to the manager (404), never editable.
    expect(other.status).toBe(404);
  });

  it("visibility", async () => {
    const mine = await createClaim(ctx, s.employee, s, [meal(cats, "5.00")]);
    const theirs = await createClaim(ctx, s.hr, s, [meal(cats, "6.00")],
      { employeeId: s.emp.report2 });
    // A draft is the employee's own work: the manager sees it only
    // once submitted (security review M-2).
    const path = `/v1/expense-claims/${mine.body.id}`;
    expect((await as(s.manager, "GET", path)).status).toBe(404);
    await as(s.employee, "POST", `${path}/submit`);
    expect((await as(s.manager, "GET", path)).status).toBe(200);
    expect((await as(s.employee, "GET",
      `/v1/expense-claims/${theirs.body.id}`)).status).toBe(404);
    const list = await as(s.employee, "GET", "/v1/expense-claims");
    const ids = list.body.items.map((c: { id: string }) => c.id);
    expect(ids).toContain(mine.body.id);
    expect(ids).not.toContain(theirs.body.id);
    const b = await signup(ctx.app, "claimsb");
    const mfa = await enableMfa(ctx.app, ctx.clock, b);
    const other = await call(ctx.app, mfa.token, b.companyId, "GET",
      `/v1/expense-claims/${mine.body.id}`);
    expect(other.status).toBe(404);
    const filtered = await as(s.hr, "GET",
      `/v1/expense-claims?employeeId=${s.emp.report2}&status=draft`);
    expect(filtered.body.items.map((c: { id: string }) => c.id))
      .toEqual([theirs.body.id]);
  });

  it("audit_trail_no_amounts", async () => {
    await createClaim(ctx, s.employee, s, [meal(cats, "77.31", {
      vatAmount: "3.68", supplierName: "Secret Bistro",
      supplierTrn: "100000000000003" })]);
    const log = await as(s.owner, "GET", "/v1/audit-events?limit=200");
    const data = JSON.stringify(log.body.items.filter(
      (e: { action: string }) => e.action.startsWith("expense-claim."))
      .map((e: { data: unknown }) => e.data));
    expect(data.length).toBeGreaterThan(10);
    for (const bad of ["77.31", "3.68", "Secret", "100000000000003"]) {
      expect(data).not.toContain(bad);
    }
  });
});
