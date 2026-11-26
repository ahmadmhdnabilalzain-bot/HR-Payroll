import type { Res } from "./test-app";

/** The conformance recorder: calls one route by id. */
export type Hitter = (id: string, token: string | null,
  company: string | null, params?: Record<string, string>, body?: unknown,
  extra?: { query?: string; headers?: Record<string, string> }) =>
  Promise<Res>;

export interface HrFlowCtx {
  /** Owner MFA token and user id; a second owner (MFA). */
  owner: string;
  ownerId: string;
  owner2: string;
  /** The employee user's token and user id, and its employee id. */
  emp: string;
  empUserId: string;
  employeeId: string;
  c: string;
}

async function tasks(hit: Hitter, f: HrFlowCtx): Promise<void> {
  const t = await hit("createTask", f.owner, f.c, {}, { title: "Sign",
    assigneeUserId: f.empUserId, checklist: ["Read"] });
  const id = t.body.id as string;
  await hit("listTasks", f.emp, f.c, {}, undefined,
    { query: "?mine=true" });
  await hit("getTask", f.emp, f.c, { id });
  await hit("updateTask", f.emp, f.c, { id }, { status: "in-progress" });
  await hit("addTaskComment", f.emp, f.c, { id }, { body: "On it" });
  await hit("updateChecklistItem", f.emp, f.c,
    { id, itemId: t.body.checklist[0].id }, { done: true });
  await hit("updateTask", f.emp, f.c, { id }, { status: "bogus" });
}

async function requisitions(hit: Hitter, f: HrFlowCtx) {
  const r = await hit("createRequisition", f.owner, f.c, {},
    { title: "Accountant", headcount: 1 });
  const id = r.body.id as string;
  await hit("listRequisitions", f.owner, f.c);
  await hit("getRequisition", f.owner, f.c, { id });
  await hit("decideRequisition", f.owner2, f.c, { id }, { approve: true });
  const x = await hit("createRequisition", f.owner, f.c, {},
    { title: "Spare", headcount: 1 });
  await hit("closeRequisition", f.owner, f.c, { id: x.body.id },
    { reason: "Not needed" });
  return id;
}

/** The hiring flow up to an application at stage `offer`. */
export async function hiring(hit: Hitter, f: HrFlowCtx) {
  const requisitionId = await requisitions(hit, f);
  const cand = await hit("createCandidate", f.owner, f.c, {},
    { fullName: "Conf Candidate", source: "website" });
  await hit("listCandidates", f.owner, f.c);
  const a = await hit("createApplication", f.owner, f.c, {},
    { requisitionId, candidateId: cand.body.id });
  const id = a.body.id as string;
  await hit("listApplications", f.owner, f.c, {}, undefined,
    { query: `?requisitionId=${requisitionId}` });
  await hit("getApplication", f.owner, f.c, { id });
  const iv = await hit("scheduleInterview", f.owner, f.c, { id }, {
    startsAt: "2026-03-05T06:00:00.000Z",
    endsAt: "2026-03-05T07:00:00.000Z", interviewerUserIds: [f.ownerId] });
  await hit("submitScorecard", f.owner, f.c, { id }, { recommendation:
    "yes", criteria: [{ key: "skills", rating: 5, note: null }] });
  await hit("cancelInterview", f.owner, f.c,
    { id: iv.body.interviews[0].id });
  await hit("moveApplicationStage", f.owner, f.c, { id },
    { stage: "offer" });
  return { applicationId: id, requisitionId };
}

/** One happy-path call per Plan 8 route, after Plan 3's flow. */
export async function hrFlow(hit: Hitter, f: HrFlowCtx): Promise<void> {
  await tasks(hit, f);
  await hiring(hit, f);
}
