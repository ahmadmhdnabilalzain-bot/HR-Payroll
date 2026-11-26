import { beforeAll, describe, expect, it } from "vitest";
import { withTenant } from "../src/db/tenant";
import { seedCompany, type Seeded, type SeedUser } from "./helpers/seed";
import { addMember } from "./helpers/seed-hr";
import { call, makeApp } from "./helpers/test-app";

type Ctx = Awaited<ReturnType<typeof makeApp>>;
let ctx: Ctx;
let s: Seeded;
let mgr2: SeedUser;
let mgr3: SeedUser;
let openReq: string;
let n = 0;

const by = (u: SeedUser, method: string, path: string, body?: unknown) =>
  call(ctx.app, u.token, s.companyId, method, path, body);

async function candidate(email?: string): Promise<string> {
  const body: Record<string, string> = { fullName: `Cand ${n++}`,
    source: "referral" };
  if (email !== undefined) body.email = email;
  const r = await by(s.hr, "POST", "/v1/candidates", body);
  if (r.status !== 201) throw new Error(r.text);
  return r.body.id;
}

async function application(): Promise<string> {
  const r = await by(s.hr, "POST", "/v1/applications",
    { requisitionId: openReq, candidateId: await candidate() });
  if (r.status !== 201) throw new Error(r.text);
  return r.body.id;
}

const slot = { startsAt: "2026-03-05T06:00:00.000Z",
  endsAt: "2026-03-05T07:00:00.000Z" };
const card = { criteria: [{ key: "skills", rating: 4, note: null }],
  recommendation: "yes" };

beforeAll(async () => {
  ctx = await makeApp();
  s = await seedCompany(ctx, "apps");
  mgr2 = await addMember(ctx, s, "mgr2.apps@example.com", "manager");
  mgr3 = await addMember(ctx, s, "mgr3.apps@example.com", "manager");
  const r = await by(s.manager, "POST", "/v1/requisitions",
    { title: "Clerk", headcount: 2 });
  await by(s.owner, "POST", `/v1/requisitions/${r.body.id}/decision`,
    { approve: true });
  openReq = r.body.id;
});

describe("applications", () => {
  it("app_requires_open_requisition", async () => {
    const p = await by(s.manager, "POST", "/v1/requisitions",
      { title: "Pending", headcount: 1 });
    const a = await by(s.hr, "POST", "/v1/applications",
      { requisitionId: p.body.id, candidateId: await candidate() });
    expect(a.status).toBe(409);
    expect(a.body.error.code).toBe("REQUISITION_NOT_OPEN");
  });

  it("app_duplicate_409", async () => {
    const c = await candidate();
    const body = { requisitionId: openReq, candidateId: c };
    expect((await by(s.hr, "POST", "/v1/applications", body)).status)
      .toBe(201);
    const dup = await by(s.hr, "POST", "/v1/applications", body);
    expect(dup.status).toBe(409);
    expect(dup.body.error.code).toBe("APPLICATION_EXISTS");
  });

  it("app_stage_moves_and_history", async () => {
    const id = await application();
    for (const stage of ["screening", "interview", "screening"]) {
      const r = await by(s.manager, "POST", `/v1/applications/${id}/stage`,
        { stage });
      expect(r.status, r.text).toBe(200);
    }
    const g = await by(s.hr, "GET", `/v1/applications/${id}`);
    expect(g.body.history.map((h: { stage: string }) => h.stage))
      .toEqual(["applied", "screening", "interview", "screening"]);
    expect(g.body.stage).toBe("screening");
  });

  it("app_stage_hired_rejected_by_schema", async () => {
    const id = await application();
    const r = await by(s.hr, "POST", `/v1/applications/${id}/stage`,
      { stage: "hired" });
    expect(r.status).toBe(400);
    expect(r.body.error.code).toBe("VALIDATION_FAILED");
  });

  it("app_closed_after_rejected", async () => {
    const id = await application();
    await by(s.hr, "POST", `/v1/applications/${id}/stage`,
      { stage: "rejected" });
    const r = await by(s.hr, "POST", `/v1/applications/${id}/stage`,
      { stage: "screening" });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("APPLICATION_CLOSED");
  });

  it("scorecard_one_per_interviewer", async () => {
    const id = await application();
    const p = `/v1/applications/${id}/scorecards`;
    expect((await by(s.manager, "POST", p, card)).status).toBe(201);
    const again = await by(s.manager, "POST", p, card);
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("SCORECARD_EXISTS");
  });

  it("scorecard_visibility_interviewer_own_only", async () => {
    const id = await application();
    const outsider = await by(mgr2, "POST",
      `/v1/applications/${id}/scorecards`, card);
    expect(outsider.status).toBe(404);
    const iv = await by(s.hr, "POST", `/v1/applications/${id}/interviews`,
      { ...slot, interviewerUserIds: [mgr2.userId, mgr3.userId] });
    expect(iv.status, iv.text).toBe(201);
    for (const m of [mgr2, mgr3]) {
      const r = await by(m, "POST", `/v1/applications/${id}/scorecards`,
        card);
      expect(r.status, r.text).toBe(201);
    }
    for (const m of [mgr2, mgr3]) {
      const g = await by(m, "GET", `/v1/applications/${id}`);
      expect(g.body.scorecards.length).toBe(1);
      expect(g.body.scorecards[0].interviewerUserId).toBe(m.userId);
    }
    const h = await by(s.hr, "GET", `/v1/applications/${id}`);
    expect(h.body.scorecards.length).toBe(2);
  });

  it("interview_end_before_start_422", async () => {
    const id = await application();
    const r = await by(s.hr, "POST", `/v1/applications/${id}/interviews`,
      { startsAt: slot.endsAt, endsAt: slot.startsAt,
        interviewerUserIds: [s.manager.userId] });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("INTERVIEW_TIMES");
  });

  it("interview_employee_interviewer_422", async () => {
    const id = await application();
    const r = await by(s.hr, "POST", `/v1/applications/${id}/interviews`,
      { ...slot, interviewerUserIds: [s.employee.userId] });
    expect(r.status).toBe(422);
    expect(r.body.error.code).toBe("INTERVIEWER_ROLE");
  });

  it("interview_calendar_not_connected", async () => {
    const id = await application();
    const r = await by(s.hr, "POST", `/v1/applications/${id}/interviews`,
      { ...slot, interviewerUserIds: [s.manager.userId] });
    expect(r.body.interviews[0].calendar).toEqual(
      { status: "not-connected", externalRef: null });
    const c = await by(s.manager, "POST",
      `/v1/interviews/${r.body.interviews[0].id}/cancel`);
    expect(c.status, c.text).toBe(200);
    expect(c.body.status).toBe("cancelled");
  });

  it("candidate_duplicate_email_409", async () => {
    await candidate("A@x.com");
    const r = await by(s.hr, "POST", "/v1/candidates",
      { fullName: "Dup", email: "a@x.com", source: "agency" });
    expect(r.status).toBe(409);
    expect(r.body.error.code).toBe("CANDIDATE_EXISTS");
  });

  it("candidate_hidden_from_employee", async () => {
    const r = await by(s.employee, "GET", "/v1/candidates");
    expect(r.status).toBe(403);
    await candidate("private.person@example.com");
    const text = JSON.stringify(await withTenant(ctx.deps.db,
      { companyId: s.companyId, userId: null }, (tx) => tx.query(
        "SELECT data FROM audit_events WHERE action = 'candidate.created'")));
    expect(text).not.toContain("private.person");
  });
});

describe("calendar port failure", () => {
  it("interview_calendar_port_throws_recorded_failed", async () => {
    const c2 = await makeApp({ calendar: { proposeEvent: async () => {
      throw new Error("calendar down");
    } } });
    const s2 = await seedCompany(c2, "cal");
    const as = (u: SeedUser, m: string, p: string, b?: unknown) =>
      call(c2.app, u.token, s2.companyId, m, p, b);
    const req = await as(s2.hr, "POST", "/v1/requisitions",
      { title: "X", headcount: 1, hiringManagerUserId: s2.manager.userId });
    await as(s2.owner, "POST", `/v1/requisitions/${req.body.id}/decision`,
      { approve: true });
    const cand = await as(s2.hr, "POST", "/v1/candidates",
      { fullName: "C", source: "direct" });
    const app = await as(s2.hr, "POST", "/v1/applications",
      { requisitionId: req.body.id, candidateId: cand.body.id });
    const r = await as(s2.hr, "POST",
      `/v1/applications/${app.body.id}/interviews`,
      { ...slot, interviewerUserIds: [s2.manager.userId] });
    expect(r.status, r.text).toBe(201);
    expect(r.body.interviews[0].calendar.status).toBe("failed");
  });
});
