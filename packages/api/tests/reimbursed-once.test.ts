import { describe, expect, it } from "vitest";
import {
  claimAction,
  meal,
  submitted,
} from "./helpers/expense-fixtures";
import {
  APRIL,
  as,
  claim,
  claimFor,
  claimOf,
  MARCH,
  slipOf,
  world,
  type World,
} from "./helpers/reimb-world";
import { postRun } from "./helpers/seed";

const run = (w: World, key: string, body: unknown = MARCH) =>
  postRun(w.ctx, w.s.hr, w.s, key, body);
const linked = async (w: World) => (await w.ctx.deps.db.query<{
  n: number }>(`SELECT count(*)::int AS n FROM expense_claims
  WHERE company_id = $1 AND pay_run_id IS NOT NULL`, [w.s.companyId]))[0]!.n;

describe("reimbursed_exactly_once (Review Focus 1)", () => {
  it("(a) a claim approved after the draft waits; void releases", async () => {
    const w = await world("once-a");
    const c1 = await claimOf(w, "100.00");
    const draft = await run(w, "a-1");
    expect(draft.body.claimCount).toBe(1);
    const c2 = await claimOf(w, "40.00");
    expect((await claim(w, c2)).body.payRunId).toBeNull();
    const v = await as(w, w.s.hr, "POST", `/v1/pay-runs/${draft.body.id}/void`);
    expect(v.status, v.text).toBe(200);
    expect((await claim(w, c1)).body.payRunId).toBeNull();
    const again = await run(w, "a-2");
    expect(again.body).toMatchObject({ claimCount: 2,
      reimbursementTotal: "140.00" });
    const p = await slipOf(w, again.body.id, w.s.emp.report);
    expect(p.reimbursements.map((r: { claimId: string }) => r.claimId)
      .sort()).toEqual([c1, c2].sort());
    const log = await as(w, w.s.owner, "GET", "/v1/audit-events?limit=100");
    const released = log.body.items.filter((e: { action: string }) =>
      e.action === "expense-claim.released");
    expect(released.map((e: { entityId: string }) => e.entityId))
      .toEqual([c1]);
  });

  it("(b) a replay returns the original run and links nothing", async () => {
    const w = await world("once-b");
    await claimOf(w, "100.00");
    const first = await run(w, "b-1");
    const c3 = await claimOf(w, "30.00");
    const replay = await run(w, "b-1");
    expect(replay.status).toBe(200);
    expect(replay.body).toEqual(first.body);
    expect((await claim(w, c3)).body.payRunId).toBeNull();
    expect(await linked(w)).toBe(1);
  });

  it("(c) March and April at once: each claim in one run", async () => {
    const w = await world("once-c");
    const ids = [await claimOf(w, "10.00"), await claimOf(w, "20.00")];
    const [m, a] = await Promise.all([run(w, "c-m"),
      run(w, "c-a", APRIL)]);
    expect(m.status, m.text).toBe(201);
    expect(a.status, a.text).toBe(201);
    expect(m.body.claimCount + a.body.claimCount).toBe(2);
    expect(await linked(w)).toBe(2);
    const inM = (await slipOf(w, m.body.id, w.s.emp.report)).reimbursements;
    const inA = (await slipOf(w, a.body.id, w.s.emp.report)).reimbursements;
    const all = [...inM, ...inA].map((r: { claimId: string }) => r.claimId);
    expect(all.sort()).toEqual(ids.sort());
  });
});

describe("which claims join a run", () => {
  it("exclude_claim; only approved unlinked claims can be excluded",
    async () => {
      const w = await world("excl");
      const c = await claimOf(w, "70.00");
      const sub = await submitted(w.ctx, w.s.employee, w.s,
        [meal(w.cats, "5.00")]);
      const bad = await run(w, "x-0", { ...MARCH,
        excludeClaimIds: [sub.id] });
      expect(bad.status).toBe(422);
      expect(bad.body.error.code).toBe("EXCLUDED_CLAIM_INVALID");
      expect(bad.body.error.detail.claimIds).toEqual([sub.id]);
      const r = await run(w, "x-1", { ...MARCH, excludeClaimIds: [c] });
      expect(r.status, r.text).toBe(201);
      expect(r.body).toMatchObject({ claimCount: 0, pendingClaimCount: 1 });
      const after = await claim(w, c);
      expect(after.body).toMatchObject({ status: "approved",
        payRunId: null });
    });

  it("claim_of_out_of_scope_employee_waits (Review Focus 5)", async () => {
    const w = await world("leaver");
    const c = await claimFor(w, w.s.emp.outsider, "60.00", "2026-02-10");
    const p = await as(w, w.s.hr, "PATCH",
      `/v1/employees/${w.s.emp.outsider}`, { lastWorkingDate: "2026-02-28" });
    expect(p.status, p.text).toBe(200);
    const r = await run(w, "l-1");
    expect(r.status, r.text).toBe(201);
    expect(r.body.claimCount).toBe(0);
    expect((await claim(w, c)).body).toMatchObject({ status: "approved",
      payRunId: null });
  });

  it("leaver_settlement_unchanged", async () => {
    const w = await world("settle");
    await as(w, w.s.hr, "PATCH", `/v1/employees/${w.s.emp.outsider}`,
      { lastWorkingDate: "2026-03-31" });
    const c = await claimFor(w, w.s.emp.outsider, "80.00");
    const body = { ...MARCH, entries: [{ employeeId: w.s.emp.outsider,
      unusedLeaveDays: 5, serviceUnpaidLeaveDays: 0 }] };
    const withClaim = await run(w, "s-1", body);
    expect(withClaim.body.claimCount).toBe(1);
    const a = await slipOf(w, withClaim.body.id, w.s.emp.outsider);
    await as(w, w.s.hr, "POST", `/v1/pay-runs/${withClaim.body.id}/void`);
    const without = await run(w, "s-2", { ...body, excludeClaimIds: [c] });
    const b = await slipOf(w, without.body.id, w.s.emp.outsider);
    expect(a.settlement.status).toBe("computed");
    expect(a.settlement).toEqual(b.settlement);
    expect(a.gross).toBe(b.gross);
    expect(a.net).not.toBe(b.net);
  });

  it("pending_claims_counted; the run is still created", async () => {
    const w = await world("pending");
    await submitted(w.ctx, w.s.employee, w.s, [meal(w.cats, "9.00")]);
    const r = await run(w, "p-1");
    expect(r.status, r.text).toBe(201);
    expect(r.body.pendingClaimCount).toBe(1);
    const x = await claimAction(w.ctx, w.s.employee, w.s,
      (await as(w, w.s.employee, "GET", "/v1/expense-claims")).body
        .items[0].id, "cancel");
    expect(x.status).toBe(200);
  });
});
