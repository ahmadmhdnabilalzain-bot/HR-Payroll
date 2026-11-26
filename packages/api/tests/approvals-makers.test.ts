import { beforeAll, describe, expect, it } from "vitest";
import {
  claimAction,
  createClaim,
  meal,
  submitted,
} from "./helpers/expense-fixtures";
import { as, world, type World } from "./helpers/reimb-world";
import type { SeedUser } from "./helpers/seed";

/**
 * Security review I-1 and M-3: the claim's makers (creator, editors),
 * every user linked to the claimant, and a demoted approver never
 * approve. Creator, submitter and claimant are different people here.
 */
const CHAIN = "/v1/approval-chains/expense-claim";
const tier = (role: "owner" | "hr") =>
  ({ approver: { kind: "role", role }, minTotal: "0.00" });

describe("makers and linked users never approve", () => {
  let w: World;
  const decide = (u: SeedUser, id: string, action = "approve",
    body: unknown = { stepOrder: 1 }) =>
    as(w, u, "POST", `/v1/approvals/${id}/${action}`, body);
  async function chain(tiers: unknown[]) {
    const cur = await as(w, w.s.owner, "GET", "/v1/approval-chains");
    const r = await as(w, w.s.owner, "PUT", CHAIN, { tiers,
      overLimitApprover: "owner",
      expectedVersion: cur.body.items[0].version });
    expect(r.status, r.text).toBe(200);
  }
  /** `maker` files a claim for `employeeId`; `submitter` submits it. */
  async function filed(maker: SeedUser, submitter: SeedUser,
    employeeId: string) {
    const c = await createClaim(w.ctx, maker, w.s, [meal(w.cats, "77.00")],
      { employeeId });
    expect(c.status, c.text).toBe(201);
    const s = await claimAction(w.ctx, submitter, w.s, c.body.id, "submit");
    expect(s.status, s.text).toBe(200);
    return s.body;
  }
  beforeAll(async () => {
    w = await world("makers");
  });

  it("the creator is excluded: hr files, the manager submits", async () => {
    const c = await filed(w.s.hr, w.s.manager, w.s.emp.manager);
    expect(c.approval.steps[0].approver).toEqual(tier("owner").approver);
    const r = await decide(w.s.hr, c.approval.id);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("SOD_VIOLATION");
  });

  it("creator, claimant and approver are three people", async () => {
    await chain([tier("owner")]);
    const c = await filed(w.s.owner, w.s.employee, w.s.emp.report);
    expect((await decide(w.s.owner, c.approval.id)).body.error.code)
      .toBe("SOD_VIOLATION");
    const ok = await decide(w.o2, c.approval.id);
    expect(ok.status, ok.text).toBe(200);
    await chain([tier("hr")]);
  });

  it("return, the creator edits, resubmit: still excluded", async () => {
    await chain([tier("owner")]);
    const c = await filed(w.s.hr, w.s.manager, w.s.emp.manager);
    const ret = await decide(w.o2, c.approval.id, "return",
      { stepOrder: 1, note: "split the bill" });
    expect(ret.status, ret.text).toBe(200);
    const p = await as(w, w.s.hr, "PATCH", `/v1/expense-claims/${c.id}`,
      { items: [meal(w.cats, "9999.00")] });
    expect(p.status, p.text).toBe(200);
    const again = await claimAction(w.ctx, w.s.manager, w.s, c.id,
      "submit");
    expect(again.status, again.text).toBe(200);
    await chain([tier("hr")]);
    expect((await decide(w.s.hr, again.body.approval.id)).body.error.code)
      .toBe("SOD_VIOLATION");
  });

  it("a user linked to the claimant after submit is refused", async () => {
    const c = await submitted(w.ctx, w.s.employee, w.s,
      [meal(w.cats, "12.00")]);
    const db = w.ctx.deps.db;
    await db.query("UPDATE memberships SET employee_id = NULL WHERE " +
      "company_id = $1 AND user_id = $2", [w.s.companyId,
      w.s.employee.userId]);
    await db.query("UPDATE memberships SET employee_id = $3 WHERE " +
      "company_id = $1 AND user_id = $2", [w.s.companyId, w.s.hr.userId,
      w.s.emp.report]);
    const r = await decide(w.s.hr, c.approval.id);
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("SOD_VIOLATION");
    await db.query("UPDATE memberships SET employee_id = NULL WHERE " +
      "company_id = $1 AND user_id = $2", [w.s.companyId, w.s.hr.userId]);
    await db.query("UPDATE memberships SET employee_id = $3 WHERE " +
      "company_id = $1 AND user_id = $2", [w.s.companyId,
      w.s.employee.userId, w.s.emp.report]);
  });

  it("a submitter forced into the eligible list is still refused",
    async () => {
      const c = await submitted(w.ctx, w.s.employee, w.s,
        [meal(w.cats, "13.00")]);
      await w.ctx.deps.db.query("UPDATE approval_steps SET eligible = " +
        "eligible || $2::uuid WHERE request_id = $1",
      [c.approval.id, w.s.employee.userId]);
      const r = await decide(w.s.employee, c.approval.id);
      expect(r.status).toBe(403);
      expect(r.body.error.code).toBe("SOD_VIOLATION");
    });

  it("a colleague with a stale step order gets 404, not 409", async () => {
    const c = await filed(w.s.hr, w.s.hr, w.s.emp.report2);
    const r = await decide(w.s.employee, c.approval.id, "approve",
      { stepOrder: 9 });
    expect(r.status).toBe(404);
  });

  it("a demoted approver no longer decides (Ruling 11 revised)",
    async () => {
      const c = await submitted(w.ctx, w.s.employee, w.s,
        [meal(w.cats, "14.00")]);
      expect(c.approval.steps[0].approver).toEqual(tier("hr").approver);
      const d = await as(w, w.s.owner, "PATCH",
        `/v1/users/${w.s.hr.userId}`, { role: "employee" });
      expect(d.status, d.text).toBe(200);
      const inbox = await as(w, w.s.hr, "GET", "/v1/approvals/inbox");
      expect(inbox.body.items.some((t: { approvalId: string }) =>
        t.approvalId === c.approval.id)).toBe(false);
      const r = await decide(w.s.hr, c.approval.id);
      expect(r.status).toBe(403);
      expect(r.body.error.code).toBe("NOT_AN_APPROVER");
    });
});
