import type {
  AuditData,
  ClaimCancel,
  ExpenseClaim,
  ExpenseClaimCreate,
  ExpenseClaimQuery,
  ExpenseClaimUpdate,
} from "@payroll/contract";
import { cancelRequest } from "../approvals/requests";
import { appendAudit } from "../audit/audit";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { loadEmployee } from "../people/employees";
import {
  CLAIM_SELECT,
  claimView,
  isPayroll,
  viewer,
  visibleClaim,
  VISIBLE,
  type ClaimRow,
} from "./claim-view";
import { saveProblems, writeItems } from "./items";
import { toPolicyF } from "./policy";
import { getPolicy } from "./policy-store";

const EDITABLE = ["draft", "returned"];

/** The claim's creation date in Dubai (UTC+4, no daylight saving). */
const DUBAI_DAY =
  "((c.created_at AT TIME ZONE 'UTC') + interval '4 hours')::date";

export function claimAudit(ctx: ReqCtx, action: string, id: string,
  data: AuditData) {
  return appendAudit(ctx.tx, { companyId: ctx.tenant!.companyId,
    at: ctx.deps.now().toISOString(), actorUserId: ctx.user!.id,
    action: `expense-claim.${action}`, entityType: "expense-claim",
    entityId: id, data });
}

/** The claimant's user or the creator. */
export const isEditor = (ctx: ReqCtx, r: ClaimRow) =>
  r.created_by === ctx.user!.id || r.employee_id === ctx.tenant!.employeeId;

/** A visible claim the caller may edit now (403, 409 otherwise). */
export async function editableClaim(ctx: ReqCtx, id: string)
  : Promise<ClaimRow> {
  const r = await visibleClaim(ctx, id, true);
  if (!isEditor(ctx, r)) throw new ApiError("FORBIDDEN");
  if (!EDITABLE.includes(r.status)) throw new ApiError("CLAIM_NOT_EDITABLE");
  return r;
}

async function claimant(ctx: ReqCtx, asked: string | undefined) {
  const own = ctx.tenant!.employeeId;
  const id = asked ?? own;
  if (id === null) throw new ApiError("NO_EMPLOYEE_LINK");
  if (id !== own && !isPayroll(ctx)) throw new ApiError("FORBIDDEN");
  await loadEmployee(ctx.tx, ctx.deps, ctx.tenant!.companyId, id);
  return id;
}

/** POST /v1/expense-claims: a draft (save-time checks only). */
export async function createClaim(ctx: ReqCtx<ExpenseClaimCreate>)
  : Promise<ExpenseClaim> {
  const c = ctx.tenant!.companyId;
  const employeeId = await claimant(ctx, ctx.body.employeeId);
  await saveProblems(ctx.tx, c, employeeId, ctx.body.items);
  const id = ctx.deps.newId();
  await ctx.tx.query(
    `INSERT INTO expense_claims (id, company_id, employee_id, title, status,
       revision, created_by, created_at, total, vat_total, flags)
     VALUES ($1, $2, $3, $4, 'draft', 1, $5, $6, 0, 0, '[]')`,
    [id, c, employeeId, ctx.body.title, ctx.user!.id,
      ctx.deps.now().toISOString()]);
  const policy = toPolicyF(await getPolicy(ctx.tx, c));
  const t = await writeItems(ctx, id, 1, ctx.body.items, policy);
  await ctx.tx.query(`UPDATE expense_claims SET total = $3, vat_total = $4
    WHERE company_id = $1 AND id = $2`, [c, id, t.total, t.vatTotal]);
  await claimAudit(ctx, "created", id, { itemCount: ctx.body.items.length });
  return claimView(ctx, await visibleClaim(ctx, id));
}

/** PATCH: new items go in under the next revision. */
export async function updateClaim(ctx: ReqCtx<ExpenseClaimUpdate,
  unknown, { id: string }>): Promise<ExpenseClaim> {
  const c = ctx.tenant!.companyId;
  const r = await editableClaim(ctx, ctx.params.id);
  const b = ctx.body;
  if (b.title !== undefined) {
    await ctx.tx.query(`UPDATE expense_claims SET title = $3
      WHERE company_id = $1 AND id = $2`, [c, r.id, b.title]);
  }
  if (b.items !== undefined) {
    await saveProblems(ctx.tx, c, r.employee_id, b.items);
    const policy = toPolicyF(await getPolicy(ctx.tx, c));
    const t = await writeItems(ctx, r.id, r.revision + 1, b.items, policy);
    await ctx.tx.query(`UPDATE expense_claims SET revision = $3,
      total = $4, vat_total = $5, flags = '[]'
      WHERE company_id = $1 AND id = $2`,
    [c, r.id, r.revision + 1, t.total, t.vatTotal]);
  }
  await claimAudit(ctx, "updated", r.id, { changed: Object.keys(b).sort() });
  return claimView(ctx, await visibleClaim(ctx, r.id));
}

type CancelMode = "own" | "payroll";

function cancelMode(ctx: ReqCtx<ClaimCancel>, r: ClaimRow): CancelMode {
  const own = ["draft", "returned", "submitted"].includes(r.status);
  if (own && isEditor(ctx, r)) return "own";
  if (r.status === "approved" && r.pay_run_id === null) {
    if (!isPayroll(ctx)) throw new ApiError("FORBIDDEN");
    if (ctx.body.note === undefined) {
      throw new ApiError("CANCEL_NOTE_REQUIRED");
    }
    return "payroll";
  }
  if (own) throw new ApiError("FORBIDDEN");
  throw new ApiError("CLAIM_NOT_CANCELLABLE");
}

/** Withdraw (claimant, creator) or cancel an unpaid approval (hr). */
export async function cancelClaim(ctx: ReqCtx<ClaimCancel, unknown,
  { id: string }>): Promise<ExpenseClaim> {
  const c = ctx.tenant!.companyId;
  const r = await visibleClaim(ctx, ctx.params.id, true);
  cancelMode(ctx, r);
  if (r.status === "submitted" && r.approval_id !== null) {
    await cancelRequest(ctx, r.approval_id);
  }
  await ctx.tx.query(
    `UPDATE expense_claims SET status = 'cancelled', cancel_note = $3
     WHERE company_id = $1 AND id = $2`, [c, r.id, ctx.body.note ?? null]);
  await claimAudit(ctx, "cancelled", r.id, { from: r.status });
  return claimView(ctx, await visibleClaim(ctx, r.id));
}

export async function getClaim(ctx: ReqCtx, id: string)
  : Promise<ExpenseClaim> {
  return claimView(ctx, await visibleClaim(ctx, id));
}

/** Claims the caller may see, newest first (filters by Dubai date). */
export async function listClaims(ctx: ReqCtx<unknown, ExpenseClaimQuery>)
  : Promise<ExpenseClaim[]> {
  const q = ctx.query;
  const rows = await ctx.tx.query<ClaimRow>(`${CLAIM_SELECT}
    WHERE c.company_id = $4 AND ${VISIBLE}
      AND ($5::uuid IS NULL OR c.employee_id = $5::uuid)
      AND ($6::text IS NULL OR c.status = $6::text)
      AND ($7::date IS NULL OR ${DUBAI_DAY} >= $7::date)
      AND ($8::date IS NULL OR ${DUBAI_DAY} <= $8::date)
    ORDER BY c.created_at DESC, c.id DESC`,
  [...viewer(ctx), ctx.tenant!.companyId, q.employeeId ?? null,
    q.status ?? null, q.from ?? null, q.to ?? null]);
  const out: ExpenseClaim[] = [];
  for (const r of rows) out.push(await claimView(ctx, r));
  return out;
}
