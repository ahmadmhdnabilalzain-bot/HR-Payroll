import type { Res } from "./test-app";

/** The conformance recorder: calls one route by id. */
export type Hitter = (id: string, token: string | null,
  company: string | null, params?: Record<string, string>, body?: unknown,
  extra?: { query?: string; headers?: Record<string, string> }) =>
  Promise<Res>;

export interface HrFlowCtx {
  /** Owner MFA token; a second owner (MFA) for approvals. */
  owner: string;
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

/** One happy-path call per Plan 8 route, after Plan 3's flow. */
export async function hrFlow(hit: Hitter, f: HrFlowCtx): Promise<void> {
  await tasks(hit, f);
}
