import type {
  ChecklistItemUpdate,
  TaskStatus,
  TaskUpdate,
} from "@payroll/contract";
import type { AuditData } from "../audit/audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import type { TaskRow } from "./task-rows";
import {
  assertAssignable,
  companyOf,
  fullTask,
  owned,
  viewerOf,
  visibleTask,
} from "./task-api";
import { addChecklistItems, auditTask } from "./tasks";
import { assertTransition, canEditTask, canWorkTask } from "./visibility";

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

const EDIT_FIELDS = ["title", "description", "assigneeUserId", "dueDate",
  "addChecklist"] as const;
const COLUMN: Record<string, string> = { title: "title",
  description: "description", assigneeUserId: "assignee_user_id",
  dueDate: "due_date" };

function changedKeys(b: TaskUpdate): string[] {
  return Object.keys(b).filter((k) =>
    b[k as keyof TaskUpdate] !== undefined).sort();
}

async function checkRights(ctx: IdCtx<TaskUpdate>, r: TaskRow,
  changed: string[]): Promise<void> {
  const v = viewerOf(ctx);
  // The leaver cannot work their own clearance tasks (review I-4).
  if (r.flow_type === "exit" && r.employee_id !== null &&
    ctx.tenant!.employeeId === r.employee_id) {
    throw new ApiError("FORBIDDEN");
  }
  const edits = changed.some((k) =>
    (EDIT_FIELDS as readonly string[]).includes(k));
  if (edits && !canEditTask(v, owned(r))) throw new ApiError("FORBIDDEN");
  if (ctx.body.status !== undefined) {
    if (!canWorkTask(v, owned(r))) throw new ApiError("FORBIDDEN");
    assertTransition(v, r.status, ctx.body.status, r.flow_type !== null);
  }
  const a = ctx.body.assigneeUserId;
  if (a !== undefined && a !== null) await assertAssignable(ctx, a);
}

async function setStatus(ctx: IdCtx, r: TaskRow, to: TaskStatus) {
  if (to === r.status) return;
  const at = to === "done" ? ctx.deps.now().toISOString() : null;
  await ctx.tx.query(
    `UPDATE tasks SET status = $3, completed_at = $4 WHERE company_id = $1
     AND id = $2`, [companyOf(ctx), r.id, to, at]);
}

async function setFields(ctx: IdCtx<TaskUpdate>, id: string) {
  for (const [k, col] of Object.entries(COLUMN)) {
    const v = ctx.body[k as keyof TaskUpdate];
    if (v === undefined) continue;
    await ctx.tx.query(
      `UPDATE tasks SET ${col} = $3 WHERE company_id = $1 AND id = $2`,
      [companyOf(ctx), id, v]);
  }
}

export async function updateTask(ctx: IdCtx<TaskUpdate>) {
  const r = await visibleTask(ctx);
  const changed = changedKeys(ctx.body);
  await checkRights(ctx, r, changed);
  await setFields(ctx, r.id);
  if (ctx.body.status !== undefined) {
    await setStatus(ctx, r, ctx.body.status);
  }
  if (ctx.body.addChecklist !== undefined) {
    await addChecklistItems(ctx.tx, ctx.deps, companyOf(ctx), r.id,
      ctx.body.addChecklist);
  }
  const data: AuditData = { changed };
  if (ctx.body.status !== undefined) data.status = ctx.body.status;
  await auditTask(ctx.tx, ctx.deps, companyOf(ctx), ctx.user!.id,
    "task.updated", r.id, data);
  return fullTask(ctx, r.id);
}

type ItemCtx = ReqCtx<ChecklistItemUpdate, unknown,
  { id: string; itemId: string }>;

/** Ticks or removes one checklist item (never deleted). */
export async function updateChecklistItem(ctx: ItemCtx) {
  const r = await visibleTask(ctx);
  if (!canWorkTask(viewerOf(ctx), owned(r))) {
    throw new ApiError("FORBIDDEN");
  }
  const [item] = await ctx.tx.query<{ id: string }>(
    `SELECT id FROM task_checklist_items WHERE company_id = $1
     AND task_id = $2 AND id = $3`,
    [companyOf(ctx), r.id, ctx.params.itemId]);
  if (item === undefined) throw new ApiError("NOT_FOUND");
  await applyItem(ctx, item.id);
  await auditTask(ctx.tx, ctx.deps, companyOf(ctx), ctx.user!.id,
    "task.updated", r.id, { changed: ["checklist"] });
  return fullTask(ctx, r.id);
}

async function applyItem(ctx: ItemCtx, itemId: string) {
  const b = ctx.body;
  if (b.done !== undefined) {
    await ctx.tx.query(
      `UPDATE task_checklist_items SET done = $3, done_by = $4,
         done_at = $5 WHERE company_id = $1 AND id = $2`,
      [companyOf(ctx), itemId, b.done, b.done ? ctx.user!.id : null,
        b.done ? ctx.deps.now().toISOString() : null]);
  }
  if (b.removed === true) {
    await ctx.tx.query(
      `UPDATE task_checklist_items SET status = 'removed'
       WHERE company_id = $1 AND id = $2`, [companyOf(ctx), itemId]);
  }
}
