import { describe, expect, it } from "vitest";
import {
  approvedClaim,
  claimAction,
  createClaim,
  drive,
  meal,
} from "./helpers/expense-fixtures";
import { as, MARCH, world } from "./helpers/reimb-world";
import { postRun } from "./helpers/seed";

/** Money review M-1 and M-8: amounts the wire cannot carry are
 * problems, never 500s; reimbursement marks exactly the run's claims. */
describe("wire cap and counts", () => {
  it("a claim total above 999,999,999.99 is refused at save", async () => {
    const w = await world("capsave");
    const items = Array.from({ length: 50 }, () =>
      meal(w.cats, "30000000.00"));
    const r = await createClaim(w.ctx, w.s.employee, w.s, items);
    expect(r.status).toBe(422);
    expect(r.body.error.detail.problems)
      .toEqual(["claim:CLAIM_TOTAL_TOO_LARGE"]);
  });

  it("and at submit, after repricing with a new rate", async () => {
    const w = await world("capsubmit");
    const c = await createClaim(w.ctx, w.s.employee, w.s,
      [drive(w.cats, 5000, "2026-03-10")]);
    expect(c.status, c.text).toBe(201);
    const cur = await as(w, w.s.hr, "GET", "/v1/expense-policy");
    const put = await as(w, w.s.hr, "PUT", "/v1/expense-policy", {
      claimWindowDays: null, limits: [], perDiemRates: [],
      mileageRates: [{ code: "car", label: "Car", perKm: "300000.00",
        effectiveFrom: "2026-03-01" }], expectedVersion: cur.body.version });
    expect(put.status, put.text).toBe(200);
    const s = await claimAction(w.ctx, w.s.employee, w.s, c.body.id,
      "submit");
    expect(s.status).toBe(422);
    expect(s.body.error.detail.problems)
      .toEqual(["claim:CLAIM_TOTAL_TOO_LARGE"]);
  });

  it("a payslip net above the cap is a run problem, not a 500", async () => {
    const w = await world("capnet");
    for (let i = 0; i < 2; i++) {
      await approvedClaim(w.ctx, w.s.employee, w.s.manager, w.s,
        [meal(w.cats, "600000000.00", { date: `2026-03-1${i}` })]);
    }
    const r = await postRun(w.ctx, w.s.hr, w.s, "cap-1", MARCH);
    expect(r.status, r.text).toBe(422);
    expect(r.body.error.code).toBe("PAY_RUN_PROBLEMS");
    expect(r.body.error.detail.problems).toContainEqual({
      employeeId: w.s.emp.report, code: "VALIDATION_FAILED",
      missing: ["net"] });
  });

  it("approval refuses when the claims to mark differ from the run",
    async () => {
      const w = await world("capcount");
      await approvedClaim(w.ctx, w.s.employee, w.s.manager, w.s,
        [meal(w.cats, "10.00")]);
      const run = await postRun(w.ctx, w.s.hr, w.s, "cnt-1", MARCH);
      await w.ctx.deps.db.query("UPDATE pay_runs SET claim_count = 2 " +
        "WHERE id = $1", [run.body.id]);
      const a = await as(w, w.o2, "POST",
        `/v1/pay-runs/${run.body.id}/approve`);
      expect(a.status).toBe(409);
      expect(a.body.error.code).toBe("RUN_INPUTS_CHANGED");
    });
});
