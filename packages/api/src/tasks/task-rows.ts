import type {
  ChecklistItem,
  FlowType,
  Role,
  Task,
  TaskComment,
  TaskSource,
  TaskStatus,
  TaskSummary,
  TraceLine,
} from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";

export interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  assignee_user_id: string | null;
  assignee_role: Role | null;
  due_date: string | null;
  employee_id: string | null;
  flow_type: FlowType | null;
  flow_id: string | null;
  source: TaskSource;
  rule: TraceLine | null;
  created_by: string;
  created_at: string;
  completed_at: string | null;
  checklist_done: number;
  checklist_total: number;
  comment_count: number;
}

/** Tasks with their counts; callers add WHERE after `t.company_id`. */
export const TASK_SELECT = `SELECT t.*,
  (SELECT count(*) FROM task_checklist_items i WHERE i.company_id =
    t.company_id AND i.task_id = t.id AND i.status = 'active'
    AND i.done)::int AS checklist_done,
  (SELECT count(*) FROM task_checklist_items i WHERE i.company_id =
    t.company_id AND i.task_id = t.id AND i.status = 'active')::int
    AS checklist_total,
  (SELECT count(*) FROM task_comments c WHERE c.company_id =
    t.company_id AND c.task_id = t.id)::int AS comment_count
  FROM tasks t WHERE t.company_id = $1`;

export const TASK_ORDER =
  "ORDER BY t.due_date ASC NULLS LAST, t.created_at, t.id";

const live = (s: TaskStatus) => s === "open" || s === "in-progress";

/** Summary of a row; `today` is the Dubai date for `overdue`. */
export function toSummary(r: TaskRow, today: string): TaskSummary {
  return {
    id: r.id, title: r.title, status: r.status,
    assigneeUserId: r.assignee_user_id, assigneeRole: r.assignee_role,
    dueDate: r.due_date,
    overdue: live(r.status) && r.due_date !== null && r.due_date < today,
    employeeId: r.employee_id,
    flow: r.flow_type === null || r.flow_id === null ? null
      : { type: r.flow_type, id: r.flow_id },
    source: r.source, rule: r.rule,
    checklistDone: r.checklist_done, checklistTotal: r.checklist_total,
    commentCount: r.comment_count, createdBy: r.created_by,
    createdAt: r.created_at, completedAt: r.completed_at,
  };
}

/** One task row of the company; 404 when absent. */
export async function taskRow(tx: Db, companyId: string,
  id: string): Promise<TaskRow> {
  const [r] = await tx.query<TaskRow>(`${TASK_SELECT} AND t.id = $2`,
    [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

interface ItemRow {
  id: string; label: string; done: boolean; done_by: string | null;
  done_at: string | null; status: "active" | "removed";
}

interface CommentRow {
  id: string; author_user_id: string; body: string; created_at: string;
}

async function details(tx: Db, companyId: string, id: string) {
  const items = await tx.query<ItemRow>(
    `SELECT id, label, done, done_by, done_at, status
     FROM task_checklist_items WHERE company_id = $1 AND task_id = $2
     ORDER BY position, id`, [companyId, id]);
  const comments = await tx.query<CommentRow>(
    `SELECT id, author_user_id, body, created_at FROM task_comments
     WHERE company_id = $1 AND task_id = $2 ORDER BY created_at, id`,
    [companyId, id]);
  return { items, comments };
}

/** The full task (checklist and comments). */
export async function toTask(tx: Db, companyId: string, r: TaskRow,
  today: string): Promise<Task> {
  const d = await details(tx, companyId, r.id);
  const checklist: ChecklistItem[] = d.items.map((i) => ({ id: i.id,
    label: i.label, done: i.done, doneBy: i.done_by, doneAt: i.done_at,
    status: i.status }));
  const comments: TaskComment[] = d.comments.map((c) => ({ id: c.id,
    authorUserId: c.author_user_id, body: c.body,
    createdAt: c.created_at }));
  return { ...toSummary(r, today), description: r.description, checklist,
    comments };
}
