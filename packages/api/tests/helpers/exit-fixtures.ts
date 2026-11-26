import { EMPLOYMENT_PACKS } from "@payroll/engine";
import type { App } from "../../src/http/context";
import { salaryOf, type Seeded, type SeedUser } from "./seed";
import { addMember } from "./seed-hr";
import { call, type Clock } from "./test-app";

type Ctx = { app: App; clock: Clock };

export const MIN_NOTICE = EMPLOYMENT_PACKS[0]!.params.empNoticeMinDays!
  .value as number;

/** Exit fixtures for one seeded company. */
export function exitFixtures(ctx: Ctx, s: Seeded) {
  let n = 500;
  const by = (u: SeedUser, method: string, path: string, body?: unknown) =>
    call(ctx.app, u.token, s.companyId, method, path, body);
  async function must(p: ReturnType<typeof by>, want = 200) {
    const r = await p;
    if (r.status !== want) throw new Error(`${r.status} ${r.text}`);
    return r.body;
  }
  /** An employee (joined 2019) with salary and zero-month terms. */
  async function staff(): Promise<string> {
    const e = await must(by(s.hr, "POST", "/v1/employees", {
      number: `L-${n++}`, fullName: "Leaver", jobTitle: "Clerk",
      nationality: "IN", workerClass: "expat-full-time",
      joiningDate: "2019-01-01", managerId: s.emp.manager }), 201);
    await must(by(s.hr, "PUT", `/v1/employees/${e.id}/salary`,
      salaryOf("4000.00")));
    await must(by(s.hr, "PUT", `/v1/employees/${e.id}/terms`,
      { probationMonths: 0, contractNoticeDays: MIN_NOTICE }));
    return e.id;
  }
  /** A staff member with an employee-role login linked to them. */
  async function withLogin(role = "employee") {
    const employeeId = await staff();
    const user = await addMember(ctx, s, `leaver${n++}@example.com`, role,
      employeeId);
    return { employeeId, user };
  }
  /** A resignation by hr, approved by the owner. */
  async function approvedExit(employeeId: string,
    noticeGivenDate = "2026-03-01"): Promise<any> {
    const x = await must(by(s.hr, "POST", "/v1/exits", { employeeId,
      kind: "resignation", noticeGivenDate }), 201);
    return must(by(s.owner, "POST", `/v1/exits/${x.id}/decision`,
      { approve: true }));
  }
  const settle = (exitId: string) => must(by(s.hr, "POST",
    `/v1/exits/${exitId}/settlement`,
    { unusedLeaveDays: 3, serviceUnpaidLeaveDays: 0 }));
  /** Marks every open task of the exit done (as hr). */
  async function clearTasks(exitId: string): Promise<void> {
    const t = await must(by(s.hr, "GET",
      `/v1/tasks?flowType=exit&flowId=${exitId}`));
    for (const task of t.items) {
      if (task.status === "done" || task.status === "cancelled") continue;
      await must(by(s.hr, "PATCH", `/v1/tasks/${task.id}`,
        { status: "done" }));
    }
  }
  return { by, must, staff, withLogin, approvedExit, settle, clearTasks };
}
