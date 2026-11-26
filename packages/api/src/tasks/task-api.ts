import type {
  CommentCreate,
  Task,
  TaskCreate,
  TaskQuery,
} from "@payroll/contract";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { employeeInScope } from "../people/employee-scope";
import { dubaiDate } from "../time/dubai";
import {
  TASK_ORDER,
  TASK_SELECT,
  taskRow,
  toSummary,
  toTask,
  type TaskRow,
} from "./task-rows";
import {
  addComment,
  auditTask,
  createTasks,
  isActiveMember,
} from "./tasks";
import { canSeeTask, type TaskViewer } from "./visibility";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

export const companyOf = (ctx: ReqCtx) => ctx.tenant!.companyId;
const today = (ctx: ReqCtx) => dubaiDate(ctx.deps.now());

export function viewerOf(ctx: ReqCtx): TaskViewer {
  return { role: ctx.tenant!.role, userId: ctx.user!.id };
}

export const owned = (r: TaskRow) => ({
  assigneeUserId: r.assignee_user_id, createdBy: r.created_by });

/** A task the caller may see; otherwise 404. */
export async function visibleTask(ctx: IdCtx): Promise<TaskRow> {
  const r = await taskRow(ctx.tx, companyOf(ctx), ctx.params.id);
  if (!canSeeTask(viewerOf(ctx), owned(r))) throw new ApiError("NOT_FOUND");
  return r;
}

export async function fullTask(ctx: ReqCtx, id: string): Promise<Task> {
  const r = await taskRow(ctx.tx, companyOf(ctx), id);
  return toTask(ctx.tx, companyOf(ctx), r, today(ctx));
}

function filters(ctx: ReqCtx<unknown, TaskQuery>) {
  const q = ctx.query;
  const where: string[] = [];
  const args: unknown[] = [companyOf(ctx)];
  const add = (sql: string, v: unknown) => {
    args.push(v);
    where.push(sql.replaceAll("?", `$${args.length}`));
  };
  const v = viewerOf(ctx);
  if (v.role !== "owner" && v.role !== "hr") {
    add("(t.assignee_user_id = ? OR t.created_by = ?)", v.userId);
  }
  if (q.mine === "true") add("t.assignee_user_id = ?", v.userId);
  if (q.employeeId !== undefined) add("t.employee_id = ?", q.employeeId);
  if (q.flowType !== undefined) add("t.flow_type = ?", q.flowType);
  if (q.flowId !== undefined) add("t.flow_id = ?", q.flowId);
  if (q.status !== undefined) add("t.status = ?", q.status);
  if (q.dueBefore !== undefined) add("t.due_date < ?", q.dueBefore);
  return { sql: where.map((w) => ` AND ${w}`).join(""), args };
}

export async function listTasks(ctx: ReqCtx<unknown, TaskQuery>) {
  const f = filters(ctx);
  const rows = await ctx.tx.query<TaskRow>(
    `${TASK_SELECT}${f.sql} ${TASK_ORDER}`, f.args);
  return { items: rows.map((r) => toSummary(r, today(ctx))) };
}

/** Throws 422 unless the user is an active member of this company. */
export async function assertAssignable(ctx: ReqCtx, userId: string) {
  if (!await isActiveMember(ctx.tx, companyOf(ctx), userId)) {
    throw new ApiError("ASSIGNEE_NOT_MEMBER");
  }
}

export async function createTask(ctx: ReqCtx<TaskCreate>) {
  const b = ctx.body;
  const me = ctx.user!.id;
  const assignee = b.assigneeUserId ?? me;
  if (ctx.tenant!.role === "employee" && assignee !== me) {
    throw new ApiError("FORBIDDEN");
  }
  await assertAssignable(ctx, assignee);
  if (b.employeeId !== undefined) {
    await employeeInScope(ctx.tx, companyOf(ctx), ctx.tenant!,
      b.employeeId);
  }
  const [t] = await createTasks(ctx.tx, ctx.deps, companyOf(ctx), me, [{
    title: b.title, description: b.description ?? null,
    assigneeUserId: assignee, assigneeRole: null,
    dueDate: b.dueDate ?? null, employeeId: b.employeeId ?? null,
    flow: null, source: "manual", rule: null, checklist: b.checklist ?? [],
  }]);
  return fullTask(ctx, t!.id);
}

export async function commentTask(ctx: IdCtx<CommentCreate>) {
  const r = await visibleTask(ctx);
  await addComment(ctx.tx, ctx.deps, companyOf(ctx), r.id, ctx.user!.id,
    ctx.body.body);
  await auditTask(ctx.tx, ctx.deps, companyOf(ctx), ctx.user!.id,
    "task.commented", r.id);
  return fullTask(ctx, r.id);
}
