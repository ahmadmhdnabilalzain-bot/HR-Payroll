import {
  REIMBURSEMENT_WPS_NOTE,
  type AgingRow,
  type ApproverSpec,
  type Payouts,
  type PayoutsQuery,
  type UnpaidRow,
} from "@payroll/contract";
import { fils } from "@payroll/engine";
import { ageDays } from "../approvals/requests";
import { toMoney } from "../db/money";
import type { ReqCtx } from "../http/context";
import { loadRun } from "../payroll/pay-runs";
import { dubaiDate } from "../time/dubai";

const money = (n: bigint) => toMoney(fils(BigInt(n)));

interface AgingDb { approval_id: string; claim_id: string;
  full_name: string; total: bigint; step_order: number;
  approver: ApproverSpec; created_at: string }

/** Pending expense steps, oldest first, aged in Dubai days from the
 * claim's submission. */
export async function agingReport(ctx: ReqCtx): Promise<AgingRow[]> {
  const rows = await ctx.tx.query<AgingDb>(
    `SELECT r.id AS approval_id, c.id AS claim_id, e.full_name, c.total,
       s.step_order, s.approver, c.submitted_at AS created_at
     FROM approval_requests r
     JOIN approval_steps s ON s.company_id = r.company_id
       AND s.request_id = r.id AND s.status = 'pending'
     JOIN expense_claims c ON c.company_id = r.company_id
       AND c.id = r.subject_id
     JOIN employees e ON e.company_id = c.company_id AND e.id = c.employee_id
     WHERE r.company_id = $1 AND r.status = 'pending'
       AND r.subject_type = 'expense-claim'
     ORDER BY c.submitted_at, r.id`, [ctx.tenant!.companyId]);
  const today = dubaiDate(ctx.deps.now());
  return rows.map((r) => ({ approvalId: r.approval_id,
    claimId: r.claim_id, employeeName: r.full_name, total: money(r.total),
    stepOrder: r.step_order, approver: r.approver,
    submittedAt: r.created_at, ageDays: ageDays(r.created_at, today) }));
}

interface UnpaidDb { id: string; employee_id: string; full_name: string;
  total: bigint; decided_at: string; pay_run_id: string | null;
  last_working_date: string | null }

/**
 * The first day of the month after the latest approved run, or null
 * with no approved run: the earliest month a new run can still pay.
 */
async function firstOpenDay(ctx: ReqCtx): Promise<string | null> {
  const [r] = await ctx.tx.query<{ y: number | null; m: number | null }>(
    `SELECT year AS y, month AS m FROM pay_runs WHERE company_id = $1
       AND status = 'approved' ORDER BY year DESC, month DESC LIMIT 1`,
    [ctx.tenant!.companyId]);
  if (r === undefined || r.y === null || r.m === null) return null;
  const y = r.m === 12 ? r.y + 1 : r.y;
  const m = r.m === 12 ? 1 : r.m + 1;
  return `${y}-${String(m).padStart(2, "0")}-01`;
}

type Reason = UnpaidRow["reason"];

/**
 * Why an approved claim is unpaid. `employee-left` only when no run
 * can pay it any more (the employee's last day is before the first
 * month a new run can cover); a leaver whose final run is still open
 * is `final-run-pending`, so HR does not pay it twice by hand.
 */
export function unpaidReason(linked: boolean, lastDay: string | null,
  today: string, firstOpen: string | null): Reason {
  if (linked) return "in-draft-run";
  if (lastDay === null || lastDay >= today) return "awaiting-pay-run";
  return firstOpen !== null && lastDay < firstOpen ? "employee-left"
    : "final-run-pending";
}

/** Approved, unpaid claims with why they wait. */
export async function unpaidReport(ctx: ReqCtx): Promise<UnpaidRow[]> {
  const rows = await ctx.tx.query<UnpaidDb>(
    `SELECT c.id, c.employee_id, e.full_name, c.total, c.decided_at,
       c.pay_run_id, e.last_working_date
     FROM expense_claims c JOIN employees e ON e.company_id = c.company_id
       AND e.id = c.employee_id
     WHERE c.company_id = $1 AND c.status = 'approved'
     ORDER BY c.decided_at, c.id`, [ctx.tenant!.companyId]);
  const today = dubaiDate(ctx.deps.now());
  const open = await firstOpenDay(ctx);
  return rows.map((r) => ({ claimId: r.id, employeeId: r.employee_id,
    employeeName: r.full_name, total: money(r.total),
    decidedAt: r.decided_at, reason: unpaidReason(r.pay_run_id !== null,
      r.last_working_date, today, open) }));
}

interface PayoutDb { employee_id: string; full_name: string;
  number: string; claim_ids: string[]; total: bigint }

/** Per-employee totals of a run's claims: a list, not a bank file. */
export async function payoutsReport(ctx: ReqCtx<unknown, PayoutsQuery>)
  : Promise<Payouts> {
  const c = ctx.tenant!.companyId;
  const run = await loadRun(ctx.tx, c, ctx.query.payRunId);
  const rows = await ctx.tx.query<PayoutDb>(
    `SELECT c.employee_id, e.full_name, e.number,
       json_agg(c.id ORDER BY c.id) AS claim_ids, sum(c.total) AS total
     FROM expense_claims c JOIN employees e ON e.company_id = c.company_id
       AND e.id = c.employee_id
     WHERE c.company_id = $1 AND c.pay_run_id = $2
     GROUP BY c.employee_id, e.full_name, e.number
     ORDER BY e.number, c.employee_id`, [c, run.id]);
  const total = rows.reduce((n, r) => n + BigInt(r.total), 0n);
  return { payRunId: run.id, runStatus: run.status,
    rows: rows.map((r) => ({ employeeId: r.employee_id,
      employeeName: r.full_name, employeeNumber: r.number,
      claimIds: r.claim_ids, total: money(r.total) })),
    total: money(total), note: REIMBURSEMENT_WPS_NOTE };
}
