import { EMPLOYMENT_PACKS } from "@payroll/engine";
import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { salaryOf, seedCompany, type Seeded, type SeedUser } from
  "./helpers/seed";
import { OFFER_SENTINEL } from "./helpers/seed-hr";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
let ctx: Ctx;
let s: Seeded;
let n = 0;

const MIN_NOTICE = EMPLOYMENT_PACKS[0]!.params.empNoticeMinDays!
  .value as number;

const by = (u: SeedUser, method: string, path: string, body?: unknown) =>
  call(ctx.app, u.token, s.companyId, method, path, body);

const db = <T>(sql: string, args: unknown[] = []) => withTenant(
  ctx.deps.db, { companyId: s.companyId, userId: null },
  (tx) => tx.query<T>(sql, args));

async function must(p: ReturnType<typeof by>, want = 200) {
  const r = await p;
  if (r.status !== want) throw new Error(`${r.status} ${r.text}`);
  return r.body;
}

async function openReq(headcount: number): Promise<string> {
  const r = await must(by(s.hr, "POST", "/v1/requisitions", { title: "Ops",
    headcount, hiringManagerUserId: s.manager.userId }), 201);
  await must(by(s.owner, "POST", `/v1/requisitions/${r.id}/decision`,
    { approve: true }));
  return r.id;
}

/** An offer at `upTo` (approved or accepted) on a new application. */
async function offer(req: string, upTo = "accepted"): Promise<string> {
  const c = await must(by(s.hr, "POST", "/v1/candidates",
    { fullName: `Joiner ${n++}`, source: "direct" }), 201);
  const a = await must(by(s.hr, "POST", "/v1/applications",
    { requisitionId: req, candidateId: c.id }), 201);
  await must(by(s.hr, "POST", `/v1/applications/${a.id}/stage`,
    { stage: "offer" }));
  const o = await must(by(s.hr, "POST", "/v1/offers", {
    applicationId: a.id, jobTitle: "Analyst", startDate: "2026-04-01",
    salary: salaryOf(OFFER_SENTINEL).components, probationMonths: 3,
    contractNoticeDays: MIN_NOTICE, managerId: s.emp.manager }), 201);
  await must(by(s.owner, "POST", `/v1/offers/${o.id}/decision`,
    { approve: true }));
  if (upTo === "accepted") {
    await must(by(s.hr, "POST", `/v1/offers/${o.id}/response`,
      { accepted: true, respondedOn: "2026-03-01" }));
  }
  return o.id;
}

const hireBody = () => ({ number: `H-${n++}`, nationality: "IN",
  workerClass: "expat-full-time" });

let bigReq: string;
beforeAll(async () => {
  ctx = await makeApp();
  s = await seedCompany(ctx, "hire");
  bigReq = await openReq(20);
});

describe("offer to hire", () => {
  it("hire_creates_employee_salary_terms_tasks", async () => {
    const id = await offer(bigReq);
    const r = await by(s.hr, "POST", `/v1/offers/${id}/hire`, hireBody());
    expect(r.status, r.text).toBe(201);
    const e = r.body.employee;
    expect(e.joiningDate).toBe("2026-04-01");
    expect(e.managerId).toBe(s.emp.manager);
    const basic = e.salary.find((c: { code: string }) => c.code === "basic");
    expect(basic.amount).toBe(OFFER_SENTINEL);
    const o = await must(by(s.hr, "GET", `/v1/offers/${id}`));
    expect(r.body.terms.probationEndDate).toBe(o.probationEndDate);
    expect(r.body.terms.contractNoticeDays).toBe(o.contractNoticeDays);
    const tpl = await must(by(s.hr, "GET", "/v1/checklist-templates"));
    const items = tpl.items.find((t: { kind: string }) =>
      t.kind === "onboarding").items.length;
    expect(r.body.tasks.length).toBe(items + 2);
    for (const t of r.body.tasks) {
      expect(t.flow).toEqual({ type: "onboarding", id: r.body.flowId });
      expect(t.employeeId).toBe(e.id);
    }
    expect(o.status).toBe("hired");
    expect(o.employeeId).toBe(e.id);
    const a = await must(by(s.hr, "GET",
      `/v1/applications/${o.applicationId}`));
    expect(a.stage).toBe("hired");
  });

  it("hire_twice_concurrently_one_employee", async () => {
    const id = await offer(bigReq);
    const body = hireBody();
    const [a, b] = await Promise.all([
      by(s.hr, "POST", `/v1/offers/${id}/hire`, body),
      by(s.hr, "POST", `/v1/offers/${id}/hire`, body)]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.employee.id).toBe(b.body.employee.id);
    expect(a.body.flowId).toBe(b.body.flowId);
    const emps = await db("SELECT id FROM employees WHERE number = $1",
      [body.number]);
    expect(emps.length).toBe(1);
    const flows = await db(
      "SELECT id FROM onboarding_flows WHERE offer_id = $1", [id]);
    expect(flows.length).toBe(1);
  });

  it("hire_requires_accepted_offer", async () => {
    const id = await offer(bigReq, "approved");
    const r = await by(s.hr, "POST", `/v1/offers/${id}/hire`, hireBody());
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("OFFER_NOT_ACCEPTED");
  });

  it("hire_duplicate_number_rolls_back", async () => {
    const id = await offer(bigReq);
    const tasks = await db("SELECT id FROM tasks");
    const r = await by(s.hr, "POST", `/v1/offers/${id}/hire`,
      { ...hireBody(), number: "E-1" });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("EMPLOYEE_NUMBER_TAKEN");
    expect(await db("SELECT 1 FROM offer_hires WHERE offer_id = $1", [id]))
      .toEqual([]);
    const o = await must(by(s.hr, "GET", `/v1/offers/${id}`));
    expect(o.status).toBe("accepted");
    expect((await db("SELECT id FROM tasks")).length).toBe(tasks.length);
  });

  it("hire_copies_every_component", async () => {
    const id = await offer(bigReq);
    const o = await must(by(s.hr, "GET", `/v1/offers/${id}`));
    const r = await must(by(s.hr, "POST", `/v1/offers/${id}/hire`,
      hireBody()), 201);
    expect(r.employee.salary).toEqual(o.salary);
  });

  it("hire_refused_when_application_closed", async () => {
    const id = await offer(bigReq);
    const o = await must(by(s.hr, "GET", `/v1/offers/${id}`));
    await must(by(s.hr, "POST", `/v1/applications/${o.applicationId}/stage`,
      { stage: "withdrawn" }));
    const r = await by(s.hr, "POST", `/v1/offers/${id}/hire`, hireBody());
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("APPLICATION_CLOSED");
  });

  it("hire_fills_requisition_at_headcount", async () => {
    const req = await openReq(1);
    const id = await offer(req);
    await must(by(s.hr, "POST", `/v1/offers/${id}/hire`, hireBody()), 201);
    const r = await must(by(s.hr, "GET", `/v1/requisitions/${req}`));
    expect(r.status).toBe("filled");
    expect(r.hiredCount).toBe(1);
  });

  it("hire_audit_no_amounts", async () => {
    const rows = await db("SELECT action, data FROM audit_events");
    expect(rows.some((x: any) => x.action === "offer.hired")).toBe(true);
    expect(rows.some((x: any) => x.action === "onboarding.started"))
      .toBe(true);
    expect(JSON.stringify(rows)).not.toContain(OFFER_SENTINEL);
  });
});
