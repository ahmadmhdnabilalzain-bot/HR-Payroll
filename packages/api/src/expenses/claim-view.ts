import type {
  ApprovalView,
  ClaimFlag,
  ClaimStatus,
  ExpenseClaim,
  ExpenseItem,
  ExpenseKind,
} from "@payroll/contract";
import { fils } from "@payroll/engine";
import { viewFor } from "../approvals/requests";
import type { Db } from "../db/db";
import { toMoney } from "../db/money";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";

export interface ClaimRow {
  id: string;
  employee_id: string;
  employee_name: string;
  title: string;
  status: ClaimStatus;
  revision: number;
  created_by: string;
  created_at: string;
  submitted_at: string | null;
  decided_at: string | null;
  approval_id: string | null;
  pay_run_id: string | null;
  policy_version: number | null;
  total: bigint;
  vat_total: bigint;
  flags: ClaimFlag[];
  /** Users who saved a revision after creation (makers). */
  editors: string[];
}

export interface ItemRow {
  id: string;
  idx: number;
  kind: ExpenseKind;
  category_id: string;
  date: string;
  description: string;
  amount: bigint;
  vat_amount: bigint;
  supplier_name: string | null;
  supplier_trn: string | null;
  distance_km: number | null;
  days: number | null;
  rate_code: string | null;
  rate_applied: bigint | null;
  justification: string | null;
  original_currency: string | null;
  original_amount: string | null;
  over_limit: boolean;
  receipt_ids: string[];
}

const money = (n: bigint) => toMoney(fils(BigInt(n)));

/**
 * Who may see a claim, as SQL over `c` (expense_claims) and `e` (the
 * claimant employee): owner and hr ($3); the claimant's user ($2 =
 * the caller's employee id); the creator; the line manager once the
 * claim is no longer a draft; an approver ($1 = user) of a step that
 * was reached (pending or decided) or that they decided themselves.
 */
export const VISIBLE = `($3::boolean OR c.created_by = $1::uuid
  OR c.employee_id = $2::uuid
  OR (e.manager_id = $2::uuid AND c.status <> 'draft')
  OR EXISTS (SELECT 1 FROM approval_requests r JOIN approval_steps s
    ON s.company_id = r.company_id AND s.request_id = r.id
    WHERE r.company_id = c.company_id AND r.subject_type = 'expense-claim'
      AND r.subject_id = c.id
      AND ((s.status IN ('pending', 'approved', 'rejected', 'returned')
          AND $1::uuid = ANY (s.eligible))
        OR s.decided_by = $1::uuid)))`;

export const isPayroll = (ctx: ReqCtx) =>
  ctx.tenant!.role === "owner" || ctx.tenant!.role === "hr";

/** The three visibility parameters ($1, $2, $3) of `VISIBLE`. */
export const viewer = (ctx: ReqCtx) =>
  [ctx.user!.id, ctx.tenant!.employeeId, isPayroll(ctx)];

export const CLAIM_SELECT = `SELECT c.*, e.full_name AS employee_name,
    array_to_json(c.editors) AS editors
  FROM expense_claims c JOIN employees e
    ON e.company_id = c.company_id AND e.id = c.employee_id`;

/** A claim the caller may see (locked when asked), else 404. */
export async function visibleClaim(ctx: ReqCtx, id: string, lock = false)
  : Promise<ClaimRow> {
  const [r] = await ctx.tx.query<ClaimRow>(`${CLAIM_SELECT}
    WHERE c.company_id = $4 AND c.id = $5 AND ${VISIBLE}
    ${lock ? "FOR UPDATE OF c" : ""}`,
  [...viewer(ctx), ctx.tenant!.companyId, id]);
  if (r === undefined) throw new ApiError("NOT_FOUND");
  return r;
}

export async function itemsOf(tx: Db, companyId: string, claim: ClaimRow)
  : Promise<ItemRow[]> {
  return tx.query<ItemRow>(
    `SELECT i.*, coalesce((SELECT json_agg(x.receipt_id ORDER BY x.receipt_id)
       FROM expense_item_receipts x WHERE x.company_id = i.company_id
         AND x.item_id = i.id), '[]'::json) AS receipt_ids
     FROM expense_items i WHERE i.company_id = $1 AND i.claim_id = $2
       AND i.revision = $3 ORDER BY i.idx`,
    [companyId, claim.id, claim.revision]);
}

function baseItem(i: ItemRow) {
  const out = { id: i.id, categoryId: i.category_id, date: i.date,
    description: i.description, receiptIds: i.receipt_ids,
    amount: money(i.amount), overLimit: i.over_limit,
    rateApplied: i.rate_applied === null ? null : money(i.rate_applied) };
  return i.justification === null ? out
    : { ...out, justification: i.justification };
}

export function toItem(i: ItemRow): ExpenseItem {
  const b = baseItem(i);
  if (i.kind === "mileage") {
    return { ...b, kind: "mileage", distanceKm: i.distance_km!,
      rateCode: i.rate_code!, vatAmount: "0.00", supplierTrn: null };
  }
  if (i.kind === "per-diem") {
    return { ...b, kind: "per-diem", days: i.days!, rateCode: i.rate_code!,
      vatAmount: "0.00", supplierTrn: null };
  }
  const extra: Record<string, string> = {};
  if (i.original_currency !== null) {
    extra.originalCurrency = i.original_currency;
  }
  if (i.original_amount !== null) extra.originalAmount = i.original_amount;
  return { ...b, kind: "receipt", vatAmount: money(i.vat_amount),
    supplierName: i.supplier_name, supplierTrn: i.supplier_trn, ...extra };
}

/** The only claim serialiser. VAT recovery is never assessed. */
export function toClaimView(r: ClaimRow, items: ItemRow[],
  approval: ApprovalView | null): ExpenseClaim {
  return { id: r.id, employeeId: r.employee_id,
    employeeName: r.employee_name, title: r.title, status: r.status,
    items: items.map(toItem), total: money(r.total),
    vatTotal: money(r.vat_total), flags: r.flags, createdBy: r.created_by,
    submittedAt: r.submitted_at, decidedAt: r.decided_at,
    payRunId: r.pay_run_id, policyVersion: r.policy_version, approval,
    vatRecoverability: "not-assessed" };
}

export async function claimView(ctx: ReqCtx, r: ClaimRow)
  : Promise<ExpenseClaim> {
  const c = ctx.tenant!.companyId;
  const approval = r.approval_id === null ? null
    : await viewFor(ctx.tx, c, r.approval_id);
  return toClaimView(r, await itemsOf(ctx.tx, c, r), approval);
}
