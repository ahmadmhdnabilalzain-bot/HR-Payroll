import { beforeAll, describe, expect, it } from "vitest";
import {
  approvedClaim,
  claimAction,
  createClaim,
  drive,
  EXPENSE_START,
  meal,
  setLimits,
  setupExpenses,
  submitted,
  type Cats,
} from "./helpers/expense-fixtures";
import { seedCompany, type Seeded } from "./helpers/seed";
import { call, enableMfa, makeApp, signup } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const lim = (cats: Cats, over: Record<string, unknown>) => ({
  categoryId: cats.meals, role: null, perItemMax: null, monthlyMax: null,
  receiptRequiredAbove: null, overLimit: "block", ...over });

describe("submitting expense claims", () => {
  let ctx: Ctx;
  let s: Seeded;
  let cats: Cats;
  beforeAll(async () => {
    ctx = await makeApp({ start: EXPENSE_START });
    s = await seedCompany(ctx, "submit");
    cats = await setupExpenses(ctx, s);
  });

  it("submit_opens_approval_to_manager", async () => {
    const c = await submitted(ctx, s.employee, s, [meal(cats, "80.00")]);
    expect(c).toMatchObject({ status: "submitted", policyVersion: 1,
      total: "80.00" });
    expect(c.submittedAt).not.toBeNull();
    expect(c.approval.steps).toEqual([{ order: 1,
      approver: { kind: "line-manager" }, status: "pending",
      decidedBy: null, decidedAt: null, note: null }]);
    const inbox = await call(ctx.app, s.manager.token, s.companyId, "GET",
      "/v1/approvals/inbox");
    const task = inbox.body.items.find((t: { subjectId: string }) =>
      t.subjectId === c.id);
    expect(task.summary).toMatchObject({ total: "80.00", title: "Trip",
      employeeName: "Person 2", flagCodes: [] });
    const again = await claimAction(ctx, s.employee, s, c.id, "submit");
    expect(again.body.error.code).toBe("CLAIM_NOT_EDITABLE");
  });

  it("submit_reports_all_problems", async () => {
    await setLimits(ctx, s, [lim(cats, { receiptRequiredAbove: "50.00" })]);
    const c = await createClaim(ctx, s.employee, s, [
      meal(cats, "10.00", { date: "2026-03-21" }), meal(cats, "60.00")]);
    const r = await claimAction(ctx, s.employee, s, c.body.id, "submit");
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("CLAIM_PROBLEMS");
    expect(r.body.error.detail.problems).toEqual([
      "items.0:EXPENSE_DATE_IN_FUTURE", "items.1:RECEIPT_REQUIRED"]);
    const still = await call(ctx.app, s.employee.token, s.companyId, "GET",
      `/v1/expense-claims/${c.body.id}`);
    expect(still.body.status).toBe("draft");
  });

  it("submit_flag_limit_adds_owner_tier", async () => {
    await setLimits(ctx, s, [lim(cats, { perItemMax: "100.00",
      overLimit: "flag" })]);
    const c = await submitted(ctx, s.employee, s, [meal(cats, "150.00", {
      justification: "Four guests from the client" })]);
    expect(c.approval.steps.map((x: { approver: unknown }) => x.approver))
      .toEqual([{ kind: "line-manager" }, { kind: "role", role: "owner" }]);
    expect(c.flags).toEqual([{ code: "OVER_LIMIT", itemId: c.items[0].id,
      message: expect.any(String) }]);
    expect(c.items[0].overLimit).toBe(true);
  });

  it("submit_monthly_limit_counts_other_claims", async () => {
    await setLimits(ctx, s, []);
    await approvedClaim(ctx, s.employee, s.manager, s,
      [meal(cats, "400.00", { date: "2026-03-05" })]);
    await setLimits(ctx, s, [lim(cats, { monthlyMax: "500.00" })]);
    const c = await createClaim(ctx, s.employee, s, [meal(cats, "150.00")]);
    const r = await claimAction(ctx, s.employee, s, c.body.id, "submit");
    expect(r.status).toBe(422);
    expect(r.body.error.detail.problems).toEqual(
      ["items.0:EXPENSE_OVER_LIMIT"]);
  });

  it("submit_without_rate_refused", async () => {
    await setLimits(ctx, s, []);
    const c = await createClaim(ctx, s.employee, s,
      [drive(cats, 10, "2025-12-31")]);
    const r = await claimAction(ctx, s.employee, s, c.body.id, "submit");
    expect(r.body.error.detail.problems).toEqual(
      ["items.0:RATE_NOT_FOUND"]);
  });

  it("submit_by_single_owner_refused", async () => {
    const a = await signup(ctx.app, "solo");
    const mfa = await enableMfa(ctx.app, ctx.clock, a);
    const as = (method: string, path: string, body?: unknown) =>
      call(ctx.app, mfa.token, a.companyId, method, path, body);
    const e = await as("POST", "/v1/employees", { number: "E-1",
      fullName: "Solo Owner", jobTitle: "Owner", nationality: "AE",
      workerClass: "uae-national", joiningDate: "2020-01-01" });
    const cat = await as("POST", "/v1/expense-categories",
      { code: "meals", name: "Meals", kind: "receipt" });
    const c = await as("POST", "/v1/expense-claims", { title: "Lunch",
      employeeId: e.body.id, items: [{ ...meal(cats, "20.00"),
        categoryId: cat.body.id }] });
    expect(c.status, c.text).toBe(201);
    const r = await as("POST", `/v1/expense-claims/${c.body.id}/submit`);
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("NO_ELIGIBLE_APPROVER");
    const still = await as("GET", `/v1/expense-claims/${c.body.id}`);
    expect(still.body.status).toBe("draft");
  });
});
