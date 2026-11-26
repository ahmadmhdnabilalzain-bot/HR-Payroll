import { calculateSettlement, GRATUITY_PACKS, parseAed } from
  "@payroll/engine";
import { describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { MIN_NOTICE } from "./helpers/exit-fixtures";
import { salaryOf, seedCompany, type Seeded, type SeedUser } from
  "./helpers/seed";
import { OFFER_SENTINEL } from "./helpers/seed-hr";
import { call, makeApp, PASSWORD } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;

/**
 * Plan 8 end to end. The clock never moves (sessions last 8 hours);
 * dates are back-dated instead: the joiner starts on 2025-06-01, so
 * probation is long over, and resigns on 2026-01-15, so the last
 * working day has passed by "today" (2026-03-01).
 */
async function flow(ctx: Ctx, s: Seeded) {
  const go = async (u: SeedUser | string, method: string, path: string,
    body?: unknown, want = 200) => {
    const token = typeof u === "string" ? u : u.token;
    const r = await call(ctx.app, token, s.companyId, method, path, body);
    expect(r.status, `${method} ${path}: ${r.text}`).toBe(want);
    return r.body;
  };
  const req = await go(s.manager, "POST", "/v1/requisitions",
    { title: "Analyst", headcount: 1 }, 201);
  await go(s.owner, "POST", `/v1/requisitions/${req.id}/decision`,
    { approve: true });
  const cand = await go(s.hr, "POST", "/v1/candidates",
    { fullName: "Mira Flow", email: "mira@example.com", source: "website" },
    201);
  const app = await go(s.hr, "POST", "/v1/applications",
    { requisitionId: req.id, candidateId: cand.id }, 201);
  await go(s.hr, "POST", `/v1/applications/${app.id}/stage`,
    { stage: "offer" });
  const offer = await go(s.hr, "POST", "/v1/offers", { applicationId:
    app.id, jobTitle: "Analyst", startDate: "2025-06-01",
    salary: salaryOf(OFFER_SENTINEL).components, probationMonths: 3,
    contractNoticeDays: MIN_NOTICE, managerId: s.emp.manager }, 201);
  await go(s.owner, "POST", `/v1/offers/${offer.id}/decision`,
    { approve: true });
  await go(s.hr, "POST", `/v1/offers/${offer.id}/response`,
    { accepted: true, respondedOn: "2025-05-20" });
  const hire = await go(s.hr, "POST", `/v1/offers/${offer.id}/hire`,
    { number: "F-1", nationality: "IN", workerClass: "expat-full-time",
      email: "mira@example.com" }, 201);
  return { go, hire };
}

describe("hr flow end to end", () => {
  it("hr_flow_end_to_end", async () => {
    const ctx = await makeApp();
    const s = await seedCompany(ctx, "flow");
    const { go, hire } = await flow(ctx, s);
    const empId = hire.employee.id as string;
    const inv = await go(s.owner, "POST", "/v1/users/invite",
      { email: "mira@example.com", role: "employee", employeeId: empId },
      201);
    const acc = await call(ctx.app, null, null, "POST",
      "/v1/auth/accept-invite", { setupToken: inv.setupToken,
        password: PASSWORD, displayName: "Mira" });
    expect(acc.status).toBe(200);
    const mira = acc.body.token as string;
    for (const t of hire.tasks) {
      await go(s.hr, "PATCH", `/v1/tasks/${t.id}`, { status: "done" });
    }
    const x = await go(mira, "POST", "/v1/exits", { kind: "resignation",
      noticeGivenDate: "2026-01-15", reason: "Further study" }, 201);
    expect(x.inProbation).toBe(false);
    await go(s.hr, "POST", `/v1/exits/${x.id}/decision`, { approve: true });
    const st = await go(s.hr, "POST", `/v1/exits/${x.id}/settlement`,
      { unusedLeaveDays: 4, serviceUnpaidLeaveDays: 0 });
    const settlement = st.settlement.settlement;
    expect(settlement.status).toBe("computed");
    const engine = calculateSettlement({ gratuity: {
      joiningDate: "2025-06-01", lastWorkingDate: x.lastWorkingDate,
      unpaidLeaveDays: 0, lastBasicMonthly: parseAed(OFFER_SENTINEL),
      workerClass: "expat-full-time" }, unusedLeaveDays: 4 },
    GRATUITY_PACKS);
    expect(settlement.notComputed).toEqual(engine.value.notComputed);
    const docs = await go(s.hr, "POST", `/v1/exits/${x.id}/documents`,
      { kinds: ["experience-certificate", "settlement-statement"],
        lang: "en" });
    expect(docs.documents.every((d: { status: string }) =>
      d.status === "not-configured")).toBe(true);
    const access = await go(s.hr, "POST", `/v1/exits/${x.id}/revoke-access`);
    expect(access.inApp).toBe("revoked");
    const tasks = await go(s.hr, "GET",
      `/v1/tasks?flowType=exit&flowId=${x.id}`);
    for (const t of tasks.items) {
      await go(s.hr, "PATCH", `/v1/tasks/${t.id}`, { status: "done" });
    }
    const closed = await go(s.hr, "POST", `/v1/exits/${x.id}/close`);
    expect(closed.status).toBe("closed");
    const v = await go(s.owner, "GET", "/v1/audit-events/verify");
    expect(v.ok).toBe(true);
    const audit = JSON.stringify(await withTenant(ctx.deps.db,
      { companyId: s.companyId, userId: null }, (tx) =>
        tx.query("SELECT data FROM audit_events")));
    expect(audit).not.toContain(OFFER_SENTINEL);
    expect(audit).not.toContain(settlement.total);
  });
});
