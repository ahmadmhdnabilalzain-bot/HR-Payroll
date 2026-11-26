import { EMPLOYMENT_PACKS } from "@payroll/engine";
import type { App } from "../../src/http/context";
import { salaryOf, type Seeded, type SeedUser } from "./seed";
import { call, PASSWORD, type Clock } from "./test-app";

type Ctx = { app: App; clock: Clock };

/** What `seedHr` made; later Plan 8 tasks add fields. */
export interface HrSeeded {
  /** A manual task by hr, assigned to the seeded employee user. */
  taskId: string;
  /** Open, hiring manager the seeded manager user, headcount 1. */
  requisitionId: string;
  candidateId: string;
  /** On the requisition above, at stage `offer`. */
  applicationId: string;
  /** Offer on that application (basic OFFER_SENTINEL), now hired. */
  offerId: string;
  hiredEmployeeId: string;
  onboardingFlowId: string;
}

async function must(p: Promise<{ status: number; text: string; body: any }>,
  want: number) {
  const r = await p;
  if (r.status !== want) throw new Error(`${r.status} ${r.text}`);
  return r.body;
}

/**
 * Invites and accepts one more user (no MFA). Returns its token and
 * user id.
 */
export async function addMember(ctx: Ctx, s: Seeded, email: string,
  role: string, employeeId?: string): Promise<SeedUser> {
  const body: Record<string, string> = { email, role };
  if (employeeId !== undefined) body.employeeId = employeeId;
  const inv = await must(call(ctx.app, s.owner.token, s.companyId, "POST",
    "/v1/users/invite", body), 201);
  const acc = await must(call(ctx.app, null, null, "POST",
    "/v1/auth/accept-invite", { setupToken: inv.setupToken,
      password: PASSWORD, displayName: role }), 200);
  return { token: acc.token, userId: acc.user.id, email };
}

/** Candidate contact data: only owner and hr may ever see it. */
export const CANDIDATE_EMAIL_SENTINEL = "cand.sentinel@example.com";

async function hiring(ctx: Ctx, s: Seeded) {
  const hit = (u: SeedUser, path: string, body: unknown, want = 201) =>
    must(call(ctx.app, u.token, s.companyId, "POST", path, body), want);
  const req = await hit(s.hr, "/v1/requisitions", { title: "Accountant",
    headcount: 1, hiringManagerUserId: s.manager.userId });
  await hit(s.owner, `/v1/requisitions/${req.id}/decision`,
    { approve: true }, 200);
  const cand = await hit(s.hr, "/v1/candidates", { fullName: "Hana Seed",
    email: CANDIDATE_EMAIL_SENTINEL, source: "referral" });
  const app = await hit(s.hr, "/v1/applications",
    { requisitionId: req.id, candidateId: cand.id });
  await hit(s.hr, `/v1/applications/${app.id}/stage`,
    { stage: "offer" }, 200);
  return { requisitionId: req.id as string,
    candidateId: cand.id as string, applicationId: app.id as string };
}

/** The seeded offer's basic salary: only owner and hr may see it. */
export const OFFER_SENTINEL = "8888.01";

/** An offer by hr, approved by the owner (MFA) and accepted. */
async function offer(ctx: Ctx, s: Seeded, applicationId: string) {
  const hit = (u: SeedUser, path: string, body: unknown, want = 200) =>
    must(call(ctx.app, u.token, s.companyId, "POST", path, body), want);
  const o = await hit(s.hr, "/v1/offers", { applicationId,
    jobTitle: "Accountant", startDate: "2026-04-01",
    salary: salaryOf(OFFER_SENTINEL).components, probationMonths: 3,
    contractNoticeDays: EMPLOYMENT_PACKS[0]!.params.empNoticeMinDays!
      .value, managerId: s.emp.manager }, 201);
  await hit(s.owner, `/v1/offers/${o.id}/decision`, { approve: true });
  await hit(s.hr, `/v1/offers/${o.id}/response`,
    { accepted: true, respondedOn: "2026-03-01" });
  return o.id as string;
}

/** Zero-month terms for the four seeded people (joined 2019). */
async function terms(ctx: Ctx, s: Seeded) {
  const days = EMPLOYMENT_PACKS[0]!.params.empNoticeMinDays!.value;
  for (const id of Object.values(s.emp)) {
    await must(call(ctx.app, s.hr.token, s.companyId, "PUT",
      `/v1/employees/${id}/terms`, { probationMonths: 0,
        contractNoticeDays: days }), 200);
  }
}

/** Plan 8 fixtures on top of `seedCompany`. */
export async function seedHr(ctx: Ctx, s: Seeded): Promise<HrSeeded> {
  const task = await must(call(ctx.app, s.hr.token, s.companyId, "POST",
    "/v1/tasks", { title: "Upload signed contract",
      assigneeUserId: s.employee.userId, employeeId: s.emp.report }), 201);
  const hired = await hiring(ctx, s);
  const offerId = await offer(ctx, s, hired.applicationId);
  const h = await must(call(ctx.app, s.hr.token, s.companyId, "POST",
    `/v1/offers/${offerId}/hire`, { number: "E-90", nationality: "IN",
      workerClass: "expat-full-time" }), 201);
  await terms(ctx, s);
  return { taskId: task.id, ...hired, offerId,
    hiredEmployeeId: h.employee.id, onboardingFlowId: h.flowId };
}
