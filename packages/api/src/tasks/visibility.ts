import type { Role, TaskStatus } from "@payroll/contract";
import { ApiError } from "../http/errors";

export interface TaskViewer {
  role: Role;
  userId: string;
}

interface Owned {
  assigneeUserId: string | null;
  createdBy: string;
}

const payroll = (v: TaskViewer) => v.role === "owner" || v.role === "hr";

/** Owner and hr see every task; others what they own or created. */
export function canSeeTask(v: TaskViewer, t: Owned): boolean {
  return payroll(v) || t.assigneeUserId === v.userId ||
    t.createdBy === v.userId;
}

/** Title, description, assignee, due date and checklist additions. */
export function canEditTask(v: TaskViewer, t: Owned): boolean {
  return payroll(v) || t.createdBy === v.userId;
}

/** Status and checklist ticks: editors and the assignee. */
export function canWorkTask(v: TaskViewer, t: Owned): boolean {
  return canEditTask(v, t) || t.assigneeUserId === v.userId;
}

const NEXT: Record<TaskStatus, readonly TaskStatus[]> = {
  "open": ["in-progress", "done", "cancelled"],
  "in-progress": ["open", "done", "cancelled"],
  "done": ["open"],
  "cancelled": ["open"],
};

/**
 * Throws unless `from` may become `to` for this viewer: 409
 * TASK_TRANSITION for a move the table forbids; 403 FORBIDDEN when
 * only owner or hr may make it (reopening a cancelled task, cancelling
 * a task the system linked to a flow).
 */
export function assertTransition(v: TaskViewer, from: TaskStatus,
  to: TaskStatus, flowLinked: boolean): void {
  if (from === to) return;
  if (!NEXT[from].includes(to)) throw new ApiError("TASK_TRANSITION");
  const hrOnly = from === "cancelled" || (to === "cancelled" && flowLinked);
  if (hrOnly && !payroll(v)) throw new ApiError("FORBIDDEN");
}
