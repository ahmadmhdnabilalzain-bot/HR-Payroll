import { describe, expect, it } from "vitest";
import { claimAction, createClaim, meal } from "./helpers/expense-fixtures";
import { as, world } from "./helpers/reimb-world";

/**
 * Security review M-2: an approver sees a claim only from the moment
 * their step is pending (or once they decided it), never for a step
 * that was never reached or a request that was cancelled.
 */
describe("approver visibility", () => {
  it("follows the steps that were reached", async () => {
    const w = await world("seen");
    const cur = await as(w, w.s.owner, "GET", "/v1/approval-chains");
    const put = await as(w, w.s.owner, "PUT",
      "/v1/approval-chains/expense-claim", { tiers: [
        { approver: { kind: "line-manager" }, minTotal: "0.00" },
        { approver: { kind: "user", userId: w.s.employee.userId },
          minTotal: "0.00" }], overLimitApprover: "owner",
      expectedVersion: cur.body.items[0].version });
    expect(put.status, put.text).toBe(200);
    const c = await createClaim(w.ctx, w.s.hr, w.s, [meal(w.cats, "8.00")],
      { employeeId: w.s.emp.report2 });
    const sub = await claimAction(w.ctx, w.s.hr, w.s, c.body.id, "submit");
    expect(sub.status, sub.text).toBe(200);
    const path = `/v1/expense-claims/${c.body.id}`;
    expect((await as(w, w.s.employee, "GET", path)).status).toBe(404);
    const a = await as(w, w.s.manager, "POST",
      `/v1/approvals/${sub.body.approval.id}/approve`, { stepOrder: 1 });
    expect(a.status, a.text).toBe(200);
    expect((await as(w, w.s.employee, "GET", path)).status).toBe(200);

    const d = await createClaim(w.ctx, w.s.hr, w.s, [meal(w.cats, "9.00")],
      { employeeId: w.s.emp.report2 });
    await claimAction(w.ctx, w.s.hr, w.s, d.body.id, "submit");
    await claimAction(w.ctx, w.s.hr, w.s, d.body.id, "cancel");
    const gone = await as(w, w.s.manager, "GET",
      `/v1/expense-claims/${d.body.id}`);
    expect(gone.status).toBe(200);
    expect((await as(w, w.s.employee, "GET",
      `/v1/expense-claims/${d.body.id}`)).status).toBe(404);
  });
});
