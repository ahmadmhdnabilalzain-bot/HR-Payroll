import type { ApprovalTask, SubjectType } from "@payroll/contract";
import type { Fils } from "@payroll/engine";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";

/** What the spine needs to know about one subject (a claim, ...). */
export interface SubjectFacts {
  claimantEmployeeId: string;
  claimantUserId: string | null;
  /** Every user linked to the claimant employee (all are excluded). */
  claimantUserIds: string[];
  /** Who wrote the subject (creator, editors): never its approver. */
  makerUserIds: string[];
  lineManagerUserId: string | null;
  total: Fils;
  overLimit: boolean;
  summary: ApprovalTask["summary"];
}

export type Outcome = "approved" | "rejected" | "returned";

/** One subject type's side of the spine. */
export interface SubjectHandler {
  type: SubjectType;
  facts(tx: Db, companyId: string, subjectId: string): Promise<SubjectFacts>;
  canView(ctx: ReqCtx, subjectId: string): Promise<boolean>;
  onClosed(ctx: ReqCtx, subjectId: string, outcome: Outcome): Promise<void>;
}

export type SubjectHandlers = ReadonlyMap<SubjectType, SubjectHandler>;

export function handlerMap(list: readonly SubjectHandler[])
  : SubjectHandlers {
  return new Map(list.map((h) => [h.type, h]));
}

/**
 * The users linked to an employee and to their line manager. When two
 * users link one employee the first by id is the claimant; decisions
 * exclude all of them (see `linkedUsers`).
 */
export async function employeeUsers(tx: Db, companyId: string,
  employeeId: string): Promise<{ claimantUserId: string | null;
  claimantUserIds: string[]; lineManagerUserId: string | null }> {
  const [r] = await tx.query<{ claimant: string | null;
    manager: string | null }>(
    `SELECT
       (SELECT m.user_id FROM memberships m WHERE m.company_id = e.company_id
          AND m.employee_id = e.id ORDER BY m.user_id LIMIT 1) AS claimant,
       (SELECT m.user_id FROM memberships m WHERE m.company_id = e.company_id
          AND m.employee_id = e.manager_id ORDER BY m.user_id LIMIT 1)
         AS manager
     FROM employees e WHERE e.company_id = $1 AND e.id = $2`,
    [companyId, employeeId]);
  return { claimantUserId: r?.claimant ?? null,
    claimantUserIds: await linkedUsers(tx, companyId, employeeId),
    lineManagerUserId: r?.manager ?? null };
}

/** Every user now linked to the employee (all are the claimant). */
export async function linkedUsers(tx: Db, companyId: string,
  employeeId: string): Promise<string[]> {
  const rows = await tx.query<{ user_id: string }>(
    `SELECT user_id FROM memberships
     WHERE company_id = $1 AND employee_id = $2`, [companyId, employeeId]);
  return rows.map((r) => r.user_id);
}
