import { beforeAll, describe, expect, it } from "vitest";
import { addOwner, seedCompany, type Seeded, type SeedUser } from
  "./helpers/seed";
import { call, enableMfa, login, makeApp, PASSWORD, signup } from
  "./helpers/test-app";
import {
  addSubject,
  installTestSubjects,
  openFor,
  testSubjects,
  type TestSubjects,
} from "./helpers/test-subject";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
const CHAIN = "/v1/approval-chains/expense-claim";
const owner = { approver: { kind: "role", role: "owner" },
  minTotal: "0.00" };
const manager = { approver: { kind: "line-manager" }, minTotal: "0.00" };

describe("approval spine (Review Focus 2)", () => {
  let ctx: Ctx;
  let s: Seeded;
  let o2: SeedUser;
  let subj: TestSubjects;
  const as = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  const decide = (u: SeedUser, id: string, action: string, body: unknown) =>
    as(u, "POST", `/v1/approvals/${id}/${action}`, body);
  async function setChain(tiers: unknown[]) {
    const cur = await as(s.owner, "GET", "/v1/approval-chains");
    const version = cur.body.items[0].version as number;
    const r = await as(s.owner, "PUT", CHAIN, { tiers,
      overLimitApprover: "owner", expectedVersion: version });
    expect(r.status, r.text).toBe(200);
  }
  const open = async (who: SeedUser, employeeId: string, total = 10000n) =>
    openFor(ctx.deps, subj, s.companyId, who.userId,
      await addSubject(ctx.deps.db, s.companyId, employeeId, total));

  beforeAll(async () => {
    subj = testSubjects();
    ctx = await makeApp({ subjects: [subj.handler] });
    await installTestSubjects(ctx.deps.db);
    s = await seedCompany(ctx, "spine");
    o2 = await addOwner(ctx, s);
  });

  it("inbox_shows_pending_for_eligible_only", async () => {
    await setChain([manager]);
    const v = await open(s.employee, s.emp.report);
    expect(v.steps[0]!.approver).toEqual({ kind: "line-manager" });
    const m = await as(s.manager, "GET", "/v1/approvals/inbox");
    expect(m.status, m.text).toBe(200);
    const task = m.body.items.find((t: { approvalId: string }) =>
      t.approvalId === v.id);
    expect(task).toMatchObject({ stepOrder: 1, stepCount: 1,
      summary: { total: "100.00" } });
    const h = await as(s.hr, "GET", "/v1/approvals/inbox");
    expect(h.body.items.some((t: { approvalId: string }) =>
      t.approvalId === v.id)).toBe(false);
  });

  it("approve_closes_and_calls_handler", async () => {
    await setChain([manager]);
    const v = await open(s.employee, s.emp.report);
    const r = await decide(s.manager, v.id, "approve", { stepOrder: 1 });
    expect(r.status, r.text).toBe(200);
    expect(r.body.status).toBe("approved");
    expect(r.body.steps[0].decidedBy).toBe(s.manager.userId);
    expect(subj.outcomes).toContainEqual({ subjectId: v.subjectId,
      outcome: "approved" });
    const log = await as(s.owner, "GET", "/v1/audit-events?limit=20");
    const e = log.body.items.find((x: { action: string }) =>
      x.action === "approval.step-approved");
    expect(e?.data).toEqual({ subjectType: "expense-claim", stepOrder: 1 });
  });

  it("claimant_cannot_approve", async () => {
    await ctx.deps.db.query("UPDATE memberships SET employee_id = $3 " +
      "WHERE company_id = $1 AND user_id = $2",
    [s.companyId, s.hr.userId, s.emp.outsider]);
    await setChain([{ approver: { kind: "user", userId: s.hr.userId },
      minTotal: "0.00" }]);
    const v = await open(s.hr, s.emp.outsider);
    expect(v.steps[0]!.approver).toEqual({ kind: "role", role: "owner" });
    const r = await decide(s.hr, v.id, "approve", { stepOrder: 1 });
    expect(r.status, r.text).toBe(403);
    expect(r.body.error.code).toBe("SOD_VIOLATION");
    await setChain([manager]);
    const w = await open(s.employee, s.emp.report);
    const e = await decide(s.employee, w.id, "approve", { stepOrder: 1 });
    expect(e.body.error.code).toBe("SOD_VIOLATION");
  });

  it("same_person_two_tiers_refused", async () => {
    await setChain([owner, owner]);
    const v = await open(s.employee, s.emp.report);
    expect(v.steps.length).toBe(2);
    const a = await decide(o2, v.id, "approve", { stepOrder: 1 });
    expect(a.status, a.text).toBe(200);
    const b = await decide(o2, v.id, "approve", { stepOrder: 2 });
    expect(b.status).toBe(403);
    expect(b.body.error.code).toBe("SOD_VIOLATION");
    const first = await decide(s.owner, v.id, "approve", { stepOrder: 2 });
    expect(first.body.status).toBe("approved");
  });

  it("an approver needed later cannot take an earlier step", async () => {
    await setChain([owner, { approver: { kind: "user",
      userId: s.owner.userId }, minTotal: "0.00" }]);
    const v = await open(s.employee, s.emp.report);
    const r = await decide(s.owner, v.id, "approve", { stepOrder: 1 });
    expect(r.status).toBe(403);
    expect(r.body.error.code).toBe("APPROVER_NEEDED_LATER");
  });

  it("stale_step_refused", async () => {
    await setChain([owner, owner]);
    const v = await open(s.employee, s.emp.report);
    expect((await decide(o2, v.id, "approve", { stepOrder: 1 })).status)
      .toBe(200);
    const r = await decide(s.owner, v.id, "approve", { stepOrder: 1 });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("APPROVAL_STEP_CHANGED");
  });

  it("concurrent_approvals_one_wins", async () => {
    await setChain([owner]);
    const v = await open(s.employee, s.emp.report);
    const rs = await Promise.all([s.owner, o2].map((u) =>
      decide(u, v.id, "approve", { stepOrder: 1 })));
    expect(rs.map((r) => r.status).sort()).toEqual([200, 409]);
    const lost = rs.find((r) => r.status === 409)!;
    expect(["APPROVAL_STEP_CHANGED", "APPROVAL_NOT_PENDING"])
      .toContain(lost.body.error.code);
    const steps = await ctx.deps.db.query<{ decided_by: string | null }>(
      "SELECT decided_by FROM approval_steps WHERE request_id = $1",
      [v.id]);
    expect(steps.filter((x) => x.decided_by !== null).length).toBe(1);
  });

  it("reject_needs_note; return closes too", async () => {
    await setChain([manager]);
    const v = await open(s.employee, s.emp.report);
    const bad = await decide(s.manager, v.id, "reject",
      { stepOrder: 1, note: "ok" });
    expect(bad.status).toBe(400);
    expect(bad.body.error.code).toBe("VALIDATION_FAILED");
    const r = await decide(s.manager, v.id, "reject",
      { stepOrder: 1, note: "missing receipt" });
    expect(r.status, r.text).toBe(200);
    expect(r.body.status).toBe("rejected");
    const again = await decide(s.manager, v.id, "approve", { stepOrder: 1 });
    expect(again.body.error.code).toBe("APPROVAL_NOT_PENDING");
    const w = await open(s.employee, s.emp.report);
    const ret = await decide(s.manager, w.id, "return",
      { stepOrder: 1, note: "split the bill" });
    expect(ret.body.status).toBe("returned");
    expect(subj.outcomes).toContainEqual({ subjectId: w.subjectId,
      outcome: "returned" });
  });

  it("other_company_cannot_decide", async () => {
    await setChain([manager]);
    const v = await open(s.employee, s.emp.report);
    const b = await signup(ctx.app, "spineb");
    const mfa = await enableMfa(ctx.app, ctx.clock, b);
    const other = await call(ctx.app, mfa.token, b.companyId, "POST",
      `/v1/approvals/${v.id}/approve`, { stepOrder: 1 });
    expect(other.status).toBe(404);
  });
});

describe("approval chains (owner with MFA)", () => {
  let ctx: Ctx;
  let s: Seeded;
  beforeAll(async () => {
    ctx = await makeApp();
    s = await seedCompany(ctx, "chains");
  });
  const put = (token: string, body: unknown) =>
    call(ctx.app, token, s.companyId, "PUT", CHAIN, body);

  it("chain_put_needs_owner_mfa", async () => {
    const body = { tiers: [manager], overLimitApprover: "owner",
      expectedVersion: 0 };
    const listed = await call(ctx.app, s.hr.token, s.companyId, "GET",
      "/v1/approval-chains");
    expect(listed.body.items).toEqual([{ subjectType: "expense-claim",
      version: 0, tiers: [manager], overLimitApprover: "owner" }]);
    expect((await put(s.hr.token, body)).body.error.code).toBe("FORBIDDEN");
    const plain = await login(ctx.app, s.owner.email, PASSWORD);
    expect((await put(plain.body.token, body)).body.error.code)
      .toBe("MFA_REQUIRED");
    const ok = await put(s.owner.token, body);
    expect(ok.status, ok.text).toBe(200);
    expect(ok.body.version).toBe(1);
    const stale = await put(s.owner.token, body);
    expect(stale.status).toBe(409);
    expect(stale.body.error.code).toBe("CHAIN_VERSION_CONFLICT");
    const unsorted = await put(s.owner.token, { ...body, expectedVersion: 1,
      tiers: [{ ...owner, minTotal: "100.00" }, manager] });
    expect(unsorted.status).toBe(422);
    expect(unsorted.body.error.code).toBe("CHAIN_INVALID");
  });

  it("a named user must be a member; the first tier starts at 0", async () => {
    const base = { overLimitApprover: "owner", expectedVersion: 1 };
    const stranger = await put(s.owner.token, { ...base, tiers: [{
      approver: { kind: "user",
        userId: "00000000-0000-4000-8000-0000000000ff" },
      minTotal: "0.00" }] });
    expect(stranger.body.error.code).toBe("CHAIN_INVALID");
    const high = await put(s.owner.token, { ...base,
      tiers: [{ ...manager, minTotal: "50.00" }] });
    expect(high.body.error.code).toBe("CHAIN_INVALID");
    const log = await call(ctx.app, s.owner.token, s.companyId, "GET",
      "/v1/audit-events?limit=5");
    const e = log.body.items.find((x: { action: string }) =>
      x.action === "approval-chain.updated");
    expect(e?.data).toEqual({ subjectType: "expense-claim", version: 1,
      tierCount: 1 });
  });
});
