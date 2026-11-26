import type { App } from "../../src/http/context";
import type { Seeded } from "./seed";
import { call, type Clock } from "./test-app";

type Ctx = { app: App; clock: Clock };

/** What `seedHr` made; later Plan 8 tasks add fields. */
export interface HrSeeded {
  /** A manual task by hr, assigned to the seeded employee user. */
  taskId: string;
}

async function must(p: Promise<{ status: number; text: string; body: any }>,
  want: number) {
  const r = await p;
  if (r.status !== want) throw new Error(`${r.status} ${r.text}`);
  return r.body;
}

/** Plan 8 fixtures on top of `seedCompany`. */
export async function seedHr(ctx: Ctx, s: Seeded): Promise<HrSeeded> {
  const task = await must(call(ctx.app, s.hr.token, s.companyId, "POST",
    "/v1/tasks", { title: "Upload signed contract",
      assigneeUserId: s.employee.userId, employeeId: s.emp.report }), 201);
  return { taskId: task.id };
}
