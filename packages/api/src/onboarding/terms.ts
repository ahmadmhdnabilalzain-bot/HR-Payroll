import type {
  EmploymentTerms,
  TaskSummary,
  TermsPut,
  TraceLine,
} from "@payroll/contract";
import { auditFor } from "../audit/hr-audit";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { employeeInScope } from "../people/employee-scope";
import { cancelTasksWhere, createTasks, type Flow } from "../tasks/tasks";
import { dubaiDate } from "../time/dubai";
import { engineTerms } from "./engine-terms";
import { probationTasks } from "./expand";

interface TermsRow {
  employee_id: string; probation_months: number;
  probation_end_date: string | null;
  employer_notice_deadline: string | null; contract_notice_days: number;
  trace: TraceLine[]; updated_at: string;
}

const co = (ctx: ReqCtx) => ctx.tenant!.companyId;

function toTerms(r: TermsRow): EmploymentTerms {
  return { employeeId: r.employee_id, probationMonths: r.probation_months,
    probationEndDate: r.probation_end_date,
    employerNoticeDeadline: r.employer_notice_deadline,
    contractNoticeDays: r.contract_notice_days, trace: r.trace,
    updatedAt: r.updated_at };
}

export async function loadTerms(tx: Db, companyId: string,
  employeeId: string): Promise<EmploymentTerms | null> {
  const [r] = await tx.query<TermsRow>(
    `SELECT * FROM employment_terms WHERE company_id = $1
     AND employee_id = $2`, [companyId, employeeId]);
  return r === undefined ? null : toTerms(r);
}

/** The login linked to an employee in this company, if any. */
export async function userOfEmployee(tx: Db, companyId: string,
  employeeId: string | null): Promise<string | null> {
  if (employeeId === null) return null;
  const [r] = await tx.query<{ user_id: string }>(
    `SELECT user_id FROM memberships WHERE company_id = $1
     AND employee_id = $2 AND revoked_at IS NULL
     ORDER BY created_at LIMIT 1`,
    [companyId, employeeId]);
  return r?.user_id ?? null;
}

async function employeeFacts(ctx: ReqCtx, id: string) {
  const [e] = await ctx.tx.query<{ joining_date: string;
    manager_id: string | null }>(
    `SELECT joining_date, manager_id FROM employees WHERE company_id = $1
     AND id = $2`, [co(ctx), id]);
  if (e === undefined) throw new ApiError("NOT_FOUND");
  return e;
}

function changedOf(old: EmploymentTerms | null, next: EmploymentTerms) {
  const keys = ["probationMonths", "contractNoticeDays",
    "probationEndDate", "employerNoticeDeadline"] as const;
  return keys.filter((k) => old === null || old[k] !== next[k]);
}

async function upsert(ctx: ReqCtx, id: string, body: TermsPut,
  t: ReturnType<typeof engineTerms>): Promise<EmploymentTerms> {
  const p = t.probation.value;
  const [r] = await ctx.tx.query<TermsRow>(
    `INSERT INTO employment_terms (company_id, employee_id,
       probation_months, probation_end_date, employer_notice_deadline,
       contract_notice_days, trace, updated_by, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (company_id, employee_id) DO UPDATE SET
       probation_months = EXCLUDED.probation_months,
       probation_end_date = EXCLUDED.probation_end_date,
       employer_notice_deadline = EXCLUDED.employer_notice_deadline,
       contract_notice_days = EXCLUDED.contract_notice_days,
       trace = EXCLUDED.trace, updated_by = EXCLUDED.updated_by,
       updated_at = EXCLUDED.updated_at RETURNING *`,
    [co(ctx), id, body.probationMonths, p.probationEndDate,
      p.employerNoticeDeadline, body.contractNoticeDays,
      JSON.stringify(t.trace), ctx.user!.id, ctx.deps.now().toISOString()]);
  return toTerms(r!);
}

/**
 * Stores the engine's dates. The contract notice is checked against
 * the pack in force on the later of the joining date and today. When
 * the dates change, open probation reminders are cancelled with a
 * comment and new ones made (Ruling 14). Returns the new reminders.
 */
export async function saveTerms(ctx: ReqCtx, employeeId: string,
  body: TermsPut, flow: Flow | null = null) {
  const e = await employeeFacts(ctx, employeeId);
  const today = dubaiDate(ctx.deps.now());
  const t = engineTerms(e.joining_date, body.probationMonths,
    body.contractNoticeDays, e.joining_date > today ? e.joining_date
      : today);
  const old = await loadTerms(ctx.tx, co(ctx), employeeId);
  const terms = await upsert(ctx, employeeId, body, t);
  const changed = changedOf(old, terms);
  let tasks: TaskSummary[] = [];
  if (changed.some((k) => k.endsWith("Date") || k.endsWith("Deadline"))) {
    await cancelTasksWhere(ctx.tx, ctx.deps, co(ctx), ctx.user!.id,
      { employeeId, source: "probation-reminder" },
      "re-dated: employment terms changed");
    const mgr = await userOfEmployee(ctx.tx, co(ctx), e.manager_id);
    tasks = await createTasks(ctx.tx, ctx.deps, co(ctx), ctx.user!.id,
      probationTasks(t.probation, employeeId, mgr, flow));
  }
  await auditFor(ctx, "employee", "terms.updated", employeeId,
    { changed: [...changed] });
  return { terms, tasks };
}

type IdCtx<B = unknown> = ReqCtx<B, unknown, { id: string }>;

export async function putTerms(ctx: IdCtx<TermsPut>) {
  return (await saveTerms(ctx, ctx.params.id, ctx.body)).terms;
}

/** Everyone in scope (Plan 3 `viewerScope`); none stored: 404. */
export async function getTerms(ctx: IdCtx) {
  await employeeInScope(ctx.tx, co(ctx), ctx.tenant!, ctx.params.id);
  const t = await loadTerms(ctx.tx, co(ctx), ctx.params.id);
  if (t === null) throw new ApiError("NOT_FOUND");
  return t;
}
