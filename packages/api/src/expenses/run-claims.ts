import { fils } from "@payroll/engine";
import { appendAudit } from "../audit/audit";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import type { SnapshotReimbursement } from "../payroll/compute";

/**
 * The payroll side of expense claims. A claim joins exactly one run:
 * it is read `FOR UPDATE` while still `approved` and unlinked, and the
 * link is written only for rows that are still unlinked.
 */
interface Row { id: string; employee_id: string; title: string;
  total: bigint }

const toSnap = (r: Row): SnapshotReimbursement => ({
  employeeId: r.employee_id, claimId: r.id, title: r.title,
  amount: fils(BigInt(r.total)) });

const uuids = (ids: string[]) => `{${ids.join(",")}}`;

/** Each excluded id must be an approved, unlinked, in-scope claim. */
async function checkExcluded(tx: Db, companyId: string,
  employeeIds: string[], exclude: string[]): Promise<void> {
  if (exclude.length === 0) return;
  const ok = new Set((await tx.query<{ id: string }>(
    `SELECT id FROM expense_claims WHERE company_id = $1
       AND id = ANY ($2::uuid[]) AND status = 'approved'
       AND pay_run_id IS NULL AND employee_id = ANY ($3::uuid[])`,
    [companyId, uuids(exclude), uuids(employeeIds)])).map((r) => r.id));
  const bad = [...new Set(exclude)].filter((id) => !ok.has(id));
  if (bad.length > 0) {
    throw new ApiError("EXCLUDED_CLAIM_INVALID", undefined,
      { claimIds: bad });
  }
}

/**
 * Approved, unlinked claims of in-scope employees, minus `exclude`,
 * locked in id order. A concurrent run that linked a claim first makes
 * PostgreSQL re-check `pay_run_id IS NULL`, so the claim is skipped.
 */
export async function claimsForNewRun(tx: Db, companyId: string,
  employeeIds: string[], exclude: string[])
  : Promise<SnapshotReimbursement[]> {
  await checkExcluded(tx, companyId, employeeIds, exclude);
  const rows = await tx.query<Row>(
    `SELECT id, employee_id, title, total FROM expense_claims
     WHERE company_id = $1 AND status = 'approved' AND pay_run_id IS NULL
       AND employee_id = ANY ($2::uuid[]) AND NOT (id = ANY ($3::uuid[]))
     ORDER BY id FOR UPDATE`,
    [companyId, uuids(employeeIds), uuids(exclude)]);
  return rows.map(toSnap);
}

/** The claims a run is paying (to rebuild its snapshot at approval). */
export async function claimsOfRun(tx: Db, companyId: string,
  runId: string): Promise<SnapshotReimbursement[]> {
  const rows = await tx.query<Row>(
    `SELECT id, employee_id, title, total FROM expense_claims
     WHERE company_id = $1 AND pay_run_id = $2 ORDER BY id`,
    [companyId, runId]);
  return rows.map(toSnap);
}

/** Submitted claims of in-scope employees (a warning, never a block). */
export async function pendingClaimCount(tx: Db, companyId: string,
  employeeIds: string[]): Promise<number> {
  const [r] = await tx.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM expense_claims WHERE company_id = $1
       AND status = 'submitted' AND employee_id = ANY ($2::uuid[])`,
    [companyId, uuids(employeeIds)]);
  return r?.n ?? 0;
}

async function auditEach(ctx: ReqCtx, action: string, ids: string[],
  runId: string): Promise<void> {
  for (const id of ids) {
    await appendAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
      at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id,
      action: `expense-claim.${action}`, entityType: "expense-claim",
      entityId: id, data: { payRunId: runId } });
  }
}

/** Links the snapshot's claims to a new run; all must still be free. */
export async function linkClaims(ctx: ReqCtx, runId: string,
  claims: SnapshotReimbursement[]): Promise<void> {
  if (claims.length === 0) return;
  const ids = claims.map((c) => c.claimId);
  const done = await ctx.tx.query<{ id: string }>(
    `UPDATE expense_claims SET pay_run_id = $2 WHERE company_id = $1
       AND id = ANY ($3::uuid[]) AND status = 'approved'
       AND pay_run_id IS NULL RETURNING id`,
    [ctx.tenant!.companyId, runId, uuids(ids)]);
  if (done.length !== ids.length) throw new ApiError("RUN_INPUTS_CHANGED");
  await auditEach(ctx, "scheduled", ids, runId);
}

/**
 * Run approved: its claims are paid. Exactly the run's `claim_count`
 * must move, else the approval rolls back (409 RUN_INPUTS_CHANGED).
 */
export async function markReimbursed(ctx: ReqCtx, runId: string,
  expected: number): Promise<void> {
  const done = await ctx.tx.query<{ id: string }>(
    `UPDATE expense_claims SET status = 'reimbursed' WHERE company_id = $1
       AND pay_run_id = $2 AND status = 'approved' RETURNING id`,
    [ctx.tenant!.companyId, runId]);
  if (done.length !== expected) throw new ApiError("RUN_INPUTS_CHANGED");
  await auditEach(ctx, "reimbursed", done.map((r) => r.id).sort(), runId);
}

/** Run voided: its claims wait for the next run again. */
export async function releaseClaims(ctx: ReqCtx, runId: string)
  : Promise<void> {
  const done = await ctx.tx.query<{ id: string }>(
    `UPDATE expense_claims SET pay_run_id = NULL WHERE company_id = $1
       AND pay_run_id = $2 AND status = 'approved' RETURNING id`,
    [ctx.tenant!.companyId, runId]);
  await auditEach(ctx, "released", done.map((r) => r.id).sort(), runId);
}
