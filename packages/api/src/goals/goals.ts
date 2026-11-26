import type {
  CheckInCreate,
  GoalCreate,
  GoalStatus,
  GoalUpdate,
} from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { employeeInScope } from "../people/employee-scope";
import { inScope, viewerScope } from "../people/redact";
import {
  checkInsOf,
  GOAL_SELECT,
  goalRow,
  toGoal,
  type GoalRow,
} from "./goal-rows";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;
type ListCtx = ReqCtx<unknown, { employeeId?: string;
  status?: GoalStatus }>;

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;
const payroll = (ctx: ReqCtx) =>
  ctx.tenant!.role === "owner" || ctx.tenant!.role === "hr";
const isManagerOf = (ctx: ReqCtx, g: GoalRow) =>
  ctx.tenant!.employeeId !== null && g.manager_id === ctx.tenant!.employeeId;
const isSubject = (ctx: ReqCtx, g: GoalRow) =>
  ctx.tenant!.employeeId === g.employee_id;

const seen = (ctx: ReqCtx, g: GoalRow) => inScope(viewerScope(ctx.tenant!),
  { id: g.employee_id, managerId: g.manager_id });

async function visibleGoal(ctx: IdCtx): Promise<GoalRow> {
  const g = await goalRow(ctx.tx, co(ctx), ctx.params.id);
  if (!seen(ctx, g)) throw new ApiError("NOT_FOUND");
  return g;
}

async function full(ctx: ReqCtx, id: string) {
  return toGoal(await goalRow(ctx.tx, co(ctx), id),
    await checkInsOf(ctx.tx, co(ctx), id));
}

export async function listGoals(ctx: ListCtx) {
  const rows = await ctx.tx.query<GoalRow>(
    `${GOAL_SELECT} ORDER BY g.created_at, g.id`, [co(ctx)]);
  const q = ctx.query;
  return { items: rows.filter((g) => seen(ctx, g) &&
    (q.employeeId === undefined || g.employee_id === q.employeeId) &&
    (q.status === undefined || g.status === q.status))
    .map((g) => toGoal(g)) };
}

export async function getGoal(ctx: IdCtx) {
  return full(ctx, (await visibleGoal(ctx)).id);
}

/** Employees only for themselves; others anyone in their scope. */
export async function createGoal(ctx: ReqCtx<GoalCreate>) {
  const b = ctx.body;
  const own = ctx.tenant!.employeeId;
  const target = b.employeeId ?? own;
  if (ctx.tenant!.role === "employee" && target !== own) {
    throw new ApiError("FORBIDDEN");
  }
  if (target === null) throw new ApiError("NO_EMPLOYEE_LINK");
  await employeeInScope(ctx.tx, co(ctx), ctx.tenant!, target);
  const id = ctx.deps.newId();
  await ctx.tx.query(
    `INSERT INTO goals (id, company_id, employee_id, title, description,
       measure, target, due_date, status, created_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', $9, $10)`,
    [id, co(ctx), target, b.title, b.description ?? null,
      b.measure ?? null, b.target ?? null, b.dueDate ?? null, ctx.user!.id,
      ctx.deps.now().toISOString()]);
  await auditFor(ctx, "goal", "goal.created", id);
  return full(ctx, id);
}

const COLUMN: Record<string, string> = { title: "title",
  description: "description", measure: "measure", target: "target",
  dueDate: "due_date", status: "status" };

/** The creator, owner, hr or the employee's manager. */
export async function updateGoal(ctx: IdCtx<GoalUpdate>) {
  const g = await visibleGoal(ctx);
  if (!payroll(ctx) && g.created_by !== ctx.user!.id &&
    !isManagerOf(ctx, g)) throw new ApiError("FORBIDDEN");
  const changed: string[] = [];
  for (const [k, col] of Object.entries(COLUMN)) {
    const v = ctx.body[k as keyof GoalUpdate];
    if (v === undefined) continue;
    changed.push(k);
    await ctx.tx.query(
      `UPDATE goals SET ${col} = $3 WHERE company_id = $1 AND id = $2`,
      [co(ctx), g.id, v]);
  }
  await auditFor(ctx, "goal", "goal.updated", g.id, { changed });
  return full(ctx, g.id);
}

/** The employee, their manager, owner or hr; active goals only. */
export async function addCheckIn(ctx: IdCtx<CheckInCreate>) {
  const g = await visibleGoal(ctx);
  if (!payroll(ctx) && !isSubject(ctx, g) && !isManagerOf(ctx, g)) {
    throw new ApiError("FORBIDDEN");
  }
  if (g.status !== "active") throw new ApiError("GOAL_CLOSED");
  // Parallel check-ins queue on the goal row for the next seq.
  await ctx.tx.query(
    "SELECT 1 FROM goals WHERE company_id = $1 AND id = $2 FOR UPDATE",
    [co(ctx), g.id]);
  await ctx.tx.query(
    `INSERT INTO goal_check_ins (id, company_id, goal_id, seq,
       author_user_id, progress, note, at)
     SELECT $1, $2, $3, coalesce(max(seq), 0) + 1, $4, $5, $6, $7
     FROM goal_check_ins WHERE company_id = $2 AND goal_id = $3`,
    [ctx.deps.newId(), co(ctx), g.id, ctx.user!.id, ctx.body.progress,
      ctx.body.note ?? null, ctx.deps.now().toISOString()]);
  await auditFor(ctx, "goal", "goal.checked-in", g.id,
    { progress: ctx.body.progress });
  return full(ctx, g.id);
}
