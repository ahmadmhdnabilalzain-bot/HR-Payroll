import type { ClaimFlagCode, ExpenseItemInput, Role } from "@payroll/contract";
import { fils, type Fils } from "@payroll/engine";
import { CodedError } from "../coded-error";
import type { ReqCtx } from "../http/context";
import type { CheckItem } from "./check";
import type { ClaimRow, ItemRow } from "./claim-view";
import { priceItem, type PolicyF } from "./policy";

/** Shown with each flag (code-driven; never an amount or a name). */
export const FLAG_MESSAGES: Record<ClaimFlagCode, string> = {
  OVER_LIMIT: "Over the policy limit; a justification is attached",
  POSSIBLE_DUPLICATE: "Same category, date and amount as another expense",
  DUPLICATE_RECEIPT: "The same receipt file is used on another expense",
  VAT_WITHOUT_TRN: "VAT is entered without a supplier TRN",
  FOREIGN_CURRENCY: "Paid in another currency; the AED amount is as entered",
};

/** The stored item as pricing input (only the priced fields matter). */
function asInput(i: ItemRow): ExpenseItemInput {
  const common = { categoryId: i.category_id, date: i.date,
    description: i.description, receiptIds: i.receipt_ids };
  if (i.kind === "mileage") {
    return { ...common, kind: "mileage", distanceKm: i.distance_km!,
      rateCode: i.rate_code! };
  }
  if (i.kind === "per-diem") {
    return { ...common, kind: "per-diem", days: i.days!,
      rateCode: i.rate_code! };
  }
  return { ...common, kind: "receipt", amount: "0.00", vatAmount: "0.00",
    supplierName: null, supplierTrn: null };
}

/** Reprices rated items with the current policy and stores the result. */
export async function reprice(ctx: ReqCtx, items: ItemRow[], p: PolicyF)
  : Promise<Map<string, boolean>> {
  const ok = new Map<string, boolean>();
  for (const i of items) {
    if (i.kind === "receipt") {
      ok.set(i.id, true);
      continue;
    }
    const r = priceItem(asInput(i), p);
    ok.set(i.id, r.ok);
    i.amount = r.ok ? r.amount : fils(0n);
    i.rate_applied = r.ok ? r.rateApplied : null;
    await ctx.tx.query(
      `UPDATE expense_items SET amount = $3, rate_applied = $4
       WHERE company_id = $1 AND id = $2`,
      [ctx.tenant!.companyId, i.id, i.amount, i.rate_applied]);
  }
  return ok;
}

export async function receiptHashes(ctx: ReqCtx, ids: string[])
  : Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = await ctx.tx.query<{ sha256: string }>(
    `SELECT sha256 FROM receipts WHERE company_id = $1
       AND id = ANY ($2::uuid[]) ORDER BY id`,
    [ctx.tenant!.companyId, `{${ids.join(",")}}`]);
  return rows.map((r) => r.sha256);
}

export async function checkItems(ctx: ReqCtx, items: ItemRow[],
  ok: Map<string, boolean>): Promise<CheckItem[]> {
  const out: CheckItem[] = [];
  for (const i of items) {
    out.push({ index: i.idx, categoryId: i.category_id, kind: i.kind,
      date: i.date, amount: fils(BigInt(i.amount)),
      vatAmount: fils(BigInt(i.vat_amount)), supplierTrn: i.supplier_trn,
      receiptCount: i.receipt_ids.length,
      receiptHashes: await receiptHashes(ctx, i.receipt_ids),
      justification: i.justification,
      originalCurrency: i.original_currency, priced: ok.get(i.id)! });
  }
  return out;
}

export interface Others {
  monthToDate: Map<string, Fils>;
  signatures: Set<string>;
  hashes: Set<string>;
  companyHashes: Set<string>;
}

/** Receipt hashes on other employees' live claims (company-wide). */
async function companyHashes(ctx: ReqCtx, employeeId: string)
  : Promise<Set<string>> {
  const rows = await ctx.tx.query<{ sha256: string }>(
    `SELECT DISTINCT rc.sha256 FROM expense_item_receipts x
     JOIN receipts rc ON rc.company_id = x.company_id
       AND rc.id = x.receipt_id
     JOIN expense_items i ON i.company_id = x.company_id AND i.id = x.item_id
     JOIN expense_claims c ON c.company_id = i.company_id
       AND c.id = i.claim_id AND c.revision = i.revision
     WHERE x.company_id = $1 AND c.employee_id <> $2
       AND c.status IN ('submitted', 'approved', 'reimbursed')`,
    [ctx.tenant!.companyId, employeeId]);
  return new Set(rows.map((r) => r.sha256));
}

/** The employee's other submitted, approved and reimbursed items. */
export async function otherClaims(ctx: ReqCtx,
  r: Pick<ClaimRow, "id" | "employee_id">)
  : Promise<Others> {
  const rows = await ctx.tx.query<{ category_id: string; date: string;
    amount: bigint; hashes: string[] }>(
    `SELECT i.category_id, i.date, i.amount, coalesce((SELECT
       json_agg(rc.sha256) FROM expense_item_receipts x JOIN receipts rc
       ON rc.company_id = x.company_id AND rc.id = x.receipt_id
       WHERE x.company_id = i.company_id AND x.item_id = i.id), '[]'::json)
       AS hashes
     FROM expense_items i JOIN expense_claims c ON c.company_id =
       i.company_id AND c.id = i.claim_id AND i.revision = c.revision
     WHERE c.company_id = $1 AND c.employee_id = $2 AND c.id <> $3
       AND c.status IN ('submitted', 'approved', 'reimbursed')`,
    [ctx.tenant!.companyId, r.employee_id, r.id]);
  const out: Others = { monthToDate: new Map(), signatures: new Set(),
    hashes: new Set(), companyHashes: await companyHashes(ctx,
      r.employee_id) };
  for (const x of rows) {
    const key = `${x.category_id}|${x.date.slice(0, 7)}`;
    out.monthToDate.set(key,
      fils((out.monthToDate.get(key) ?? 0n) + BigInt(x.amount)));
    out.signatures.add(`${x.category_id}|${x.date}|${BigInt(x.amount)}`);
    for (const h of x.hashes) out.hashes.add(h);
  }
  return out;
}

/**
 * The claimant's membership role; `employee` with no membership. One
 * employee links to at most one user (unique index, migration 013), so
 * there is nothing to guess.
 */
export async function claimantRole(ctx: ReqCtx, employeeId: string)
  : Promise<Role> {
  const rows = await ctx.tx.query<{ role: Role }>(
    `SELECT role FROM memberships WHERE company_id = $1
       AND employee_id = $2`, [ctx.tenant!.companyId, employeeId]);
  if (rows.length > 1) {
    throw new CodedError("EMPLOYEE_LINKED_TWICE",
      "an employee is linked to two users");
  }
  return rows[0]?.role ?? "employee";
}
