import type {
  FlowType,
  Role,
  TaskSource,
  TaskSummary,
  TraceLine,
} from "@payroll/contract";
import { hrAudit } from "../audit/hr-audit";
import type { AuditData } from "../audit/audit";
import type { Db } from "../db/db";
import type { HandlerDeps } from "../deps";
import { dubaiDate } from "../time/dubai";
import { taskRow, toSummary } from "./task-rows";

export interface Flow {
  type: FlowType;
  id: string;
}

export interface NewTaskInput {
  title: string;
  description: string | null;
  assigneeUserId: string | null;
  assigneeRole: Role | null;
  dueDate: string | null;
  employeeId: string | null;
  flow: Flow | null;
  source: TaskSource;
  rule: TraceLine | null;
  checklist: string[];
}

/** One audit event on a task, through the Plan 8 audit gate. */
export async function auditTask(tx: Db, deps: HandlerDeps,
  companyId: string, actorUserId: string, action: string, taskId: string,
  data: AuditData = {}): Promise<void> {
  await hrAudit(tx, { companyId, at: deps.now().toISOString(),
    actorUserId, action, entityType: "task", entityId: taskId, data });
}

async function insertTask(tx: Db, deps: HandlerDeps, companyId: string,
  actor: string, t: NewTaskInput): Promise<string> {
  const id = deps.newId();
  await tx.query(
    `INSERT INTO tasks (id, company_id, title, description, status,
       assignee_user_id, assignee_role, due_date, employee_id, flow_type,
       flow_id, source, rule, created_by, created_at)
     VALUES ($1, $2, $3, $4, 'open', $5, $6, $7, $8, $9, $10, $11, $12,
       $13, $14)`,
    [id, companyId, t.title, t.description, t.assigneeUserId,
      t.assigneeRole, t.dueDate, t.employeeId, t.flow?.type ?? null,
      t.flow?.id ?? null, t.source,
      t.rule === null ? null : JSON.stringify(t.rule), actor,
      deps.now().toISOString()]);
  await addChecklistItems(tx, deps, companyId, id, t.checklist);
  return id;
}

/** Appends checklist items after the task's current last position. */
export async function addChecklistItems(tx: Db, deps: HandlerDeps,
  companyId: string, taskId: string, labels: string[]): Promise<void> {
  const [m] = await tx.query<{ n: number }>(
    `SELECT coalesce(max(position), -1)::int AS n
     FROM task_checklist_items WHERE company_id = $1 AND task_id = $2`,
    [companyId, taskId]);
  for (const [i, label] of labels.entries()) {
    await tx.query(
      `INSERT INTO task_checklist_items (id, company_id, task_id, label,
         status, position) VALUES ($1, $2, $3, $4, 'active', $5)`,
      [deps.newId(), companyId, taskId, label, m!.n + 1 + i]);
  }
}

/** Creates tasks (one `task.created` audit each); used by flows too. */
export async function createTasks(tx: Db, deps: HandlerDeps,
  companyId: string, actorUserId: string,
  items: NewTaskInput[]): Promise<TaskSummary[]> {
  const today = dubaiDate(deps.now());
  const out: TaskSummary[] = [];
  for (const t of items) {
    const id = await insertTask(tx, deps, companyId, actorUserId, t);
    const data: AuditData = { source: t.source };
    if (t.flow !== null) data.flowType = t.flow.type;
    await auditTask(tx, deps, companyId, actorUserId, "task.created", id,
      data);
    out.push(toSummary(await taskRow(tx, companyId, id), today));
  }
  return out;
}

/** Adds an append-only comment. */
export async function addComment(tx: Db, deps: HandlerDeps,
  companyId: string, taskId: string, authorUserId: string,
  body: string): Promise<void> {
  await tx.query(
    `INSERT INTO task_comments (id, company_id, task_id, author_user_id,
       body, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
    [deps.newId(), companyId, taskId, authorUserId, body,
      deps.now().toISOString()]);
}

async function cancelIds(tx: Db, deps: HandlerDeps, companyId: string,
  actor: string, ids: string[], why: string): Promise<string[]> {
  for (const id of ids) {
    await tx.query(
      `UPDATE tasks SET status = 'cancelled' WHERE company_id = $1
       AND id = $2`, [companyId, id]);
    await addComment(tx, deps, companyId, id, actor, why);
    await auditTask(tx, deps, companyId, actor, "task.updated", id,
      { changed: ["status"], status: "cancelled" });
  }
  return ids;
}

const LIVE = "status IN ('open', 'in-progress')";

/** Ids of the flow's open and in-progress tasks. */
export async function openFlowTaskIds(tx: Db, companyId: string,
  flow: Flow): Promise<string[]> {
  const rows = await tx.query<{ id: string }>(
    `SELECT id FROM tasks WHERE company_id = $1 AND flow_type = $2
     AND flow_id = $3 AND ${LIVE} ORDER BY created_at, id`,
    [companyId, flow.type, flow.id]);
  return rows.map((r) => r.id);
}

/** Cancels the flow's live tasks with a comment `why`. */
export async function cancelFlowTasks(tx: Db, deps: HandlerDeps,
  companyId: string, actorUserId: string, flow: Flow,
  why: string): Promise<string[]> {
  const ids = await openFlowTaskIds(tx, companyId, flow);
  return cancelIds(tx, deps, companyId, actorUserId, ids, why);
}

/** Cancels an employee's live tasks of one source, with a comment. */
export async function cancelTasksWhere(tx: Db, deps: HandlerDeps,
  companyId: string, actorUserId: string,
  f: { employeeId: string; source: TaskSource },
  why: string): Promise<string[]> {
  const rows = await tx.query<{ id: string }>(
    `SELECT id FROM tasks WHERE company_id = $1 AND employee_id = $2
     AND source = $3 AND ${LIVE} ORDER BY created_at, id`,
    [companyId, f.employeeId, f.source]);
  return cancelIds(tx, deps, companyId, actorUserId,
    rows.map((r) => r.id), why);
}

/** A membership of this company exists for the user. */
export async function isActiveMember(tx: Db, companyId: string,
  userId: string): Promise<boolean> {
  const rows = await tx.query(
    "SELECT 1 FROM memberships WHERE company_id = $1 AND user_id = $2",
    [companyId, userId]);
  return rows.length > 0;
}
