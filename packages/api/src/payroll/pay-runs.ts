import {
  NOT_COMPUTED_PAY,
  type PayRun,
  type PayRunCreate,
} from "@payroll/contract";
import { fils } from "@payroll/engine";
import { appendAudit } from "../audit/audit";
import { canonicalJson, sha256Hex } from "../audit/canonical";
import type { Db } from "../db/db";
import { toMoney } from "../db/money";
import { Reply, type ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import {
  linkClaims,
  markReimbursed,
  pendingClaimCount,
  releaseClaims,
} from "../expenses/run-claims";
import { computePayRun, type RunSnapshot } from "./compute";
import { storePayslips } from "./payslips";
import {
  buildSnapshot,
  openSnapshot,
  sealSnapshot,
  snapshotHash,
} from "./snapshot";

export interface RunRow {
  id: string;
  year: number;
  month: number;
  status: PayRun["status"];
  idempotency_key: string;
  request_hash: string;
  input_hash: string;
  snapshot_enc: string;
  gross: bigint;
  employee_count: number;
  created_by: string;
  created_at: string;
  approved_by: string | null;
  approved_at: string | null;
  sif_file_id: string | null;
  reimbursement_total: bigint;
  claim_count: number;
  pending_claim_count: number;
}

/**
 * The run with its SIF file id (one per run), derived by a join so an
 * approved run row is never updated for it.
 */
export const RUN_SELECT = `SELECT r.*, (SELECT s.id FROM sif_files s
    WHERE s.company_id = r.company_id AND s.pay_run_id = r.id) AS sif_file_id
  FROM pay_runs r`;

export const toPayRun = (r: RunRow): PayRun => ({
  id: r.id, period: { year: r.year, month: r.month }, status: r.status,
  createdBy: r.created_by, approvedBy: r.approved_by,
  createdAt: r.created_at, approvedAt: r.approved_at,
  inputHash: r.input_hash, employeeCount: r.employee_count,
  gross: toMoney(fils(BigInt(r.gross))), notComputed: [...NOT_COMPUTED_PAY],
  sifFileId: r.sif_file_id,
  reimbursementTotal: toMoney(fils(BigInt(r.reimbursement_total))),
  claimCount: r.claim_count, pendingClaimCount: r.pending_claim_count });

export async function loadRun(tx: Db, companyId: string, id: string,
  lock = false): Promise<RunRow> {
  const [r] = await tx.query<RunRow>(`${RUN_SELECT}
    WHERE r.company_id = $1 AND r.id = $2 ${lock ? "FOR UPDATE OF r" : ""}`,
  [companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

async function byKey(tx: Db, companyId: string, key: string) {
  const [r] = await tx.query<RunRow>(`${RUN_SELECT}
    WHERE r.company_id = $1 AND r.idempotency_key = $2`, [companyId, key]);
  return r ?? null;
}

/** Same key and body: the stored run (200), even if it was voided. */
function replay(r: RunRow, requestHash: string): Reply {
  if (r.request_hash !== requestHash) {
    throw new ApiError("IDEMPOTENCY_KEY_REUSED");
  }
  return new Reply(200, toPayRun(r));
}

async function liveRunExists(tx: Db, companyId: string, b: PayRunCreate) {
  const r = await tx.query(
    `SELECT 1 FROM pay_runs WHERE company_id = $1 AND year = $2
     AND month = $3 AND status <> 'void'`,
    [companyId, b.period.year, b.period.month]);
  return r.length > 0;
}

function problemsError(ps: ReturnType<typeof computePayRun>["problems"]) {
  return new ApiError("PAY_RUN_PROBLEMS", "The run cannot be computed yet",
    { problems: ps.map((p) => ({ employeeId: p.employeeId, code: p.code,
      missing: p.missing })) });
}

/** No conflict target: the key and the one-live-run index both count. */
const INSERT_RUN = `INSERT INTO pay_runs (id, company_id, year, month,
    status, idempotency_key, request_hash, input_hash, snapshot_enc, gross,
    employee_count, created_by, created_at, reimbursement_total,
    claim_count, pending_claim_count)
  VALUES ($1, $2, $3, $4, 'draft', $5, $6, $7, $8, $9, $10, $11, $12, $13,
    $14, $15)
  ON CONFLICT DO NOTHING RETURNING id`;

type Computed = ReturnType<typeof computePayRun>;

/** The insert; null when the key or the month was taken meanwhile. */
async function insertRun(ctx: ReqCtx<PayRunCreate>, key: string,
  requestHash: string, snap: RunSnapshot, out: Computed) {
  const { tx, deps, body } = ctx;
  const c = ctx.tenant!.companyId;
  const id = deps.newId();
  const at = deps.now().toISOString();
  const inputHash = snapshotHash(snap);
  const reimbursed = snap.reimbursements.reduce((n, r) => n + r.amount, 0n);
  const pending = await pendingClaimCount(tx, c,
    snap.employees.map((e) => e.employeeId));
  const inserted = await tx.query(INSERT_RUN,
    [id, c, body.period.year, body.period.month, key, requestHash,
      inputHash, await sealSnapshot(tx, deps, c, id, snap),
      out.gross.toString(), out.payslips.length, ctx.user!.id, at,
      reimbursed.toString(), snap.reimbursements.length, pending]);
  return inserted.length === 0 ? null : { id, at, inputHash };
}

/**
 * Idempotent create. The key is looked up first (a retry after inputs
 * changed still gets its run); the insert uses ON CONFLICT DO NOTHING
 * on the key and on the one-live-run-per-month index, and a loser
 * re-reads by key. No SQL error is caught inside the transaction.
 * Approved expense claims are linked only after the insert succeeds,
 * so a replay or a conflict never links a claim.
 */
export async function createPayRun(ctx: ReqCtx<PayRunCreate>, key: string)
  : Promise<Reply> {
  const { tx, deps, body } = ctx;
  const c = ctx.tenant!.companyId;
  const requestHash = sha256Hex(canonicalJson(body));
  const prior = await byKey(tx, c, key);
  if (prior !== null) return replay(prior, requestHash);
  if (await liveRunExists(tx, c, body)) {
    throw new ApiError("RUN_EXISTS_FOR_PERIOD");
  }
  const snap = await buildSnapshot(tx, deps, c, body, { newRun: true });
  const out = computePayRun(snap);
  if (out.problems.length > 0) throw problemsError(out.problems);
  const run = await insertRun(ctx, key, requestHash, snap, out);
  if (run === null) {
    const winner = await byKey(tx, c, key);
    if (winner !== null) return replay(winner, requestHash);
    throw new ApiError("RUN_EXISTS_FOR_PERIOD");
  }
  await storePayslips(tx, deps, c, run.id, out.payslips);
  await linkClaims(ctx, run.id, snap.reimbursements);
  await appendAudit(tx, { companyId: c, at: run.at,
    actorUserId: ctx.user!.id, action: "pay-run.created",
    entityType: "pay-run", entityId: run.id, data: { period: body.period,
      employeeCount: out.payslips.length, inputHash: run.inputHash } });
  return new Reply(201, toPayRun(await loadRun(tx, c, run.id)));
}

/**
 * Owner with an MFA session, not the creator, draft only; and the
 * inputs (salaries, unpaid leave) must still hash to the run's
 * inputHash, so a stale draft is never approved.
 */
export async function approvePayRun(ctx: ReqCtx<unknown, unknown,
  { id: string }>): Promise<PayRun> {
  const { tx, deps } = ctx;
  const c = ctx.tenant!.companyId;
  const r = await loadRun(tx, c, ctx.params.id, true);
  if (r.status !== "draft") throw new ApiError("RUN_NOT_DRAFT");
  if (r.created_by === ctx.user!.id) throw new ApiError("SOD_VIOLATION");
  const stored = await openSnapshot(tx, deps, c, r.id, r.snapshot_enc);
  const now = await buildSnapshot(tx, deps, c,
    { period: stored.period, entries: stored.entries }, { runId: r.id });
  if (snapshotHash(now) !== r.input_hash) {
    throw new ApiError("RUN_INPUTS_CHANGED");
  }
  const at = deps.now().toISOString();
  await tx.query(
    `UPDATE pay_runs SET status = 'approved', approved_by = $3,
       approved_at = $4 WHERE company_id = $1 AND id = $2`,
    [c, r.id, ctx.user!.id, at]);
  await appendAudit(tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "pay-run.approved", entityType: "pay-run", entityId: r.id,
    data: { period: { year: r.year, month: r.month } } });
  await markReimbursed(ctx, r.id);
  return toPayRun(await loadRun(tx, c, r.id));
}

export async function voidPayRun(ctx: ReqCtx<unknown, unknown,
  { id: string }>): Promise<PayRun> {
  const c = ctx.tenant!.companyId;
  const r = await loadRun(ctx.tx, c, ctx.params.id, true);
  if (r.status !== "draft") throw new ApiError("RUN_NOT_DRAFT");
  const at = ctx.deps.now().toISOString();
  await ctx.tx.query("UPDATE pay_runs SET status = 'void', voided_at = $3 " +
    "WHERE company_id = $1 AND id = $2", [c, r.id, at]);
  await appendAudit(ctx.tx, { companyId: c, at, actorUserId: ctx.user!.id,
    action: "pay-run.voided", entityType: "pay-run", entityId: r.id,
    data: { period: { year: r.year, month: r.month } } });
  await releaseClaims(ctx, r.id);
  return toPayRun(await loadRun(ctx.tx, c, r.id));
}
