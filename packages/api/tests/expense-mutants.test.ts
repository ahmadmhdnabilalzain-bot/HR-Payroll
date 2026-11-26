import { fils } from "@payroll/engine";
import { describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { checkClaim, type CheckInput, type CheckItem } from
  "../src/expenses/check";
import { unpaidReason } from "../src/expenses/reports-payroll";
import {
  claimAction,
  meal,
  setLimits,
  submitted,
} from "./helpers/expense-fixtures";
import { as, claimOf, MARCH, world } from "./helpers/reimb-world";
import { postRun } from "./helpers/seed";

/** Money review M-9: tests that kill the surviving boundary mutants. */
const CAT = "cat";
const item = (over: Partial<CheckItem> = {}, index = 0): CheckItem => ({
  index, categoryId: CAT, kind: "receipt", date: "2026-03-10",
  amount: fils(1000n), vatAmount: fils(0n), supplierTrn: null,
  receiptCount: 1, receiptHashes: [], justification: null,
  originalCurrency: null, priced: true, ...over });
const input = (items: CheckItem[], perItemMax: bigint | null,
  monthlyMax: bigint | null): CheckInput => ({ items, role: "employee",
  today: "2026-03-20", joiningDate: "2025-01-01", claimWindowDays: 90,
  categories: new Map([[CAT, { kind: "receipt", active: true }]]),
  limits: () => ({ categoryId: CAT, role: null,
    perItemMax: perItemMax === null ? null : fils(perItemMax),
    monthlyMax: monthlyMax === null ? null : fils(monthlyMax),
    receiptRequiredAbove: null, overLimit: "block" }),
  monthToDate: new Map(), otherSignatures: new Set(),
  otherHashes: new Set(), companyHashes: new Set() });

describe("boundaries", () => {
  it("an amount equal to a limit is within it", () => {
    expect(checkClaim(input([item({ amount: fils(10000n) })], 10000n, null))
      .problems).toEqual([]);
    expect(checkClaim(input([item({ amount: fils(6000n) }),
      item({ amount: fils(4000n), date: "2026-03-11" }, 1)], null, 10000n))
      .problems).toEqual([]);
  });
  it("an expense dated today is accepted", () => {
    expect(checkClaim(input([item({ date: "2026-03-20" })], null, null))
      .problems).toEqual([]);
  });
  it("the unpaid reasons switch exactly at their days", () => {
    const open = "2026-03-01";
    expect(unpaidReason(false, "2026-03-20", "2026-03-20", open))
      .toBe("awaiting-pay-run");
    expect(unpaidReason(false, "2026-03-19", "2026-03-20", open))
      .toBe("final-run-pending");
    expect(unpaidReason(false, "2026-03-01", "2026-03-20", open))
      .toBe("final-run-pending");
    expect(unpaidReason(false, "2026-02-28", "2026-03-20", open))
      .toBe("employee-left");
    expect(unpaidReason(false, "2026-02-28", "2026-03-20", null))
      .toBe("final-run-pending");
    expect(unpaidReason(true, "2026-02-28", "2026-03-20", open))
      .toBe("in-draft-run");
  });
});

describe("reimbursed claims count", () => {
  it("in the monthly limit and in the summary; final states stay final",
    async () => {
      const w = await world("mut");
      const paid = await claimOf(w, "400.00");
      const run = await postRun(w.ctx, w.s.hr, w.s, "mut-1", MARCH);
      const ok = await as(w, w.o2, "POST",
        `/v1/pay-runs/${run.body.id}/approve`);
      expect(ok.status, ok.text).toBe(200);
      const sum = await as(w, w.s.hr, "GET", "/v1/expense-reports/summary" +
        "?from=2026-03-01&to=2026-03-31&groupBy=status");
      expect(sum.body.rows).toEqual([expect.objectContaining({
        key: "reimbursed", total: "400.00" })]);
      await setLimits(w.ctx, w.s, [{ categoryId: w.cats.meals, role: null,
        perItemMax: null, monthlyMax: "500.00", receiptRequiredAbove: null,
        overLimit: "block" }]);
      const c = await submitted(w.ctx, w.s.employee, w.s,
        [meal(w.cats, "100.00")]);
      expect(c.status).toBe("submitted");
      const over = await claimAction(w.ctx, w.s.employee, w.s,
        (await as(w, w.s.employee, "POST", "/v1/expense-claims", {
          title: "More", items: [meal(w.cats, "1.00")] })).body.id,
        "submit");
      expect(over.body.error.detail.problems)
        .toEqual(["items.0:EXPENSE_OVER_LIMIT"]);
      const asApp = (sql: string) => withTenant(w.ctx.deps.db,
        { companyId: w.s.companyId, userId: w.s.hr.userId },
        (tx) => tx.query(sql, [paid]));
      await expect(asApp("UPDATE expense_claims SET cancel_note = 'x' " +
        "WHERE id = $1")).rejects.toThrow(/is reimbursed/);
    });
});
