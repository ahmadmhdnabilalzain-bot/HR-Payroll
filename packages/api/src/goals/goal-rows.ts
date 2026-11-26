import type { Goal, GoalStatus } from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";

export interface GoalRow {
  id: string; employee_id: string; manager_id: string | null;
  title: string; description: string | null; measure: string | null;
  target: string | null; due_date: string | null; status: GoalStatus;
  created_by: string; created_at: string;
  last_progress: number | null; last_at: string | null;
}

/** Goals with the employee's manager and the latest check-in. */
export const GOAL_SELECT = `SELECT g.*, e.manager_id,
    l.progress AS last_progress, l.at AS last_at
  FROM goals g
  JOIN employees e ON e.company_id = g.company_id AND e.id = g.employee_id
  LEFT JOIN LATERAL (SELECT c.progress, c.at FROM goal_check_ins c
    WHERE c.company_id = g.company_id AND c.goal_id = g.id
    ORDER BY c.seq DESC LIMIT 1) l ON true
  WHERE g.company_id = $1`;

export async function goalRow(tx: Db, companyId: string,
  id: string): Promise<GoalRow> {
  const [r] = await tx.query<GoalRow>(`${GOAL_SELECT} AND g.id = $2`,
    [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export function toGoal(r: GoalRow, checkIns: Goal["checkIns"] = []): Goal {
  return { id: r.id, employeeId: r.employee_id, title: r.title,
    description: r.description, measure: r.measure, target: r.target,
    dueDate: r.due_date, status: r.status, createdBy: r.created_by,
    createdAt: r.created_at,
    lastCheckIn: r.last_progress === null || r.last_at === null ? null
      : { progress: r.last_progress, at: r.last_at },
    checkIns };
}

export async function checkInsOf(tx: Db, companyId: string,
  goalId: string): Promise<Goal["checkIns"]> {
  const rows = await tx.query<{ id: string; author_user_id: string;
    progress: number; note: string | null; at: string }>(
    `SELECT id, author_user_id, progress, note, at FROM goal_check_ins
     WHERE company_id = $1 AND goal_id = $2 ORDER BY seq`,
    [companyId, goalId]);
  return rows.map((c) => ({ id: c.id, authorUserId: c.author_user_id,
    progress: c.progress, note: c.note, at: c.at }));
}
