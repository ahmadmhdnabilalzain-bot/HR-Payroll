import { MONEY_MAX_FILS, type ExpenseItemInput } from "@payroll/contract";
import { fils, parseAed, type Fils } from "@payroll/engine";
import type { Db } from "../db/db";
import type { ReqCtx } from "../http/context";
import { ApiError } from "../http/errors";
import { priceItem, type PolicyF } from "./policy";

/** Save-time price: an item with no rate yet is stored at 0, no rate. */
export function savePrice(item: ExpenseItemInput, p: PolicyF)
  : { amount: Fils; vatAmount: Fils; rateApplied: Fils | null } {
  const r = priceItem(item, p);
  return r.ok ? r : { amount: fils(0n), vatAmount: fils(0n),
    rateApplied: null };
}

/**
 * Save-time problems only: each category exists, each receipt belongs
 * to the claimant employee, and VAT is within the amount (the database
 * also checks it) (422 CLAIM_PROBLEMS).
 */
export async function saveProblems(tx: Db, companyId: string,
  employeeId: string, items: ExpenseItemInput[]): Promise<void> {
  const cats = new Set((await tx.query<{ id: string }>(
    "SELECT id FROM expense_categories WHERE company_id = $1",
    [companyId])).map((r) => r.id));
  const mine = new Set((await tx.query<{ id: string }>(
    "SELECT id FROM receipts WHERE company_id = $1 AND employee_id = $2",
    [companyId, employeeId])).map((r) => r.id));
  const problems: string[] = [];
  items.forEach((it, n) => {
    if (it.receiptIds.some((id) => !mine.has(id))) {
      problems.push(`items.${n}:RECEIPT_NOT_FOUND`);
    }
    if (!cats.has(it.categoryId)) {
      problems.push(`items.${n}:CATEGORY_NOT_FOUND`);
    }
    if (it.kind === "receipt" &&
      parseAed(it.vatAmount) > parseAed(it.amount)) {
      problems.push(`items.${n}:VAT_EXCEEDS_AMOUNT`);
    }
  });
  if (problems.length > 0) {
    throw new ApiError("CLAIM_PROBLEMS", undefined, { problems });
  }
}

function columns(it: ExpenseItemInput) {
  const r = it.kind === "receipt" ? it : null;
  return [it.kind, it.categoryId, it.date, it.description,
    r?.supplierName ?? null, r?.supplierTrn ?? null,
    it.kind === "mileage" ? it.distanceKm : null,
    it.kind === "per-diem" ? it.days : null,
    it.kind === "receipt" ? null : it.rateCode,
    it.justification ?? null, r?.originalCurrency ?? null,
    r?.originalAmount ?? null];
}

const INSERT_ITEM = `INSERT INTO expense_items (id, company_id, claim_id,
    revision, idx, amount, vat_amount, rate_applied, kind, category_id,
    date, description, supplier_name, supplier_trn, distance_km, days,
    rate_code, justification, original_currency, original_amount)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
    $15, $16, $17, $18, $19, $20)`;

/** A claim total the wire format cannot carry (999,999,999.99). */
export function totalProblem(total: bigint): string[] {
  return total > MONEY_MAX_FILS ? ["claim:CLAIM_TOTAL_TOO_LARGE"] : [];
}

/** Inserts one revision's items; returns the save-time totals. */
export async function writeItems(ctx: ReqCtx, claimId: string,
  revision: number, items: ExpenseItemInput[], p: PolicyF)
  : Promise<{ total: Fils; vatTotal: Fils }> {
  const c = ctx.tenant!.companyId;
  const prices = items.map((it) => savePrice(it, p));
  const total = prices.reduce((n, x) => n + x.amount, 0n);
  const vat = prices.reduce((n, x) => n + x.vatAmount, 0n);
  const problems = totalProblem(total);
  if (problems.length > 0) {
    throw new ApiError("CLAIM_PROBLEMS", undefined, { problems });
  }
  for (const [n, it] of items.entries()) {
    const id = ctx.deps.newId();
    const price = prices[n]!;
    await ctx.tx.query(INSERT_ITEM, [id, c, claimId, revision, n,
      price.amount, price.vatAmount, price.rateApplied, ...columns(it)]);
    for (const receiptId of new Set(it.receiptIds)) {
      await ctx.tx.query(
        `INSERT INTO expense_item_receipts (company_id, item_id, receipt_id)
         VALUES ($1, $2, $3)`, [c, id, receiptId]);
    }
  }
  return { total: fils(total), vatTotal: fils(vat) };
}
