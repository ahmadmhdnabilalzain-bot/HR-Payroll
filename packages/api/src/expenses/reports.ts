import {
  VAT_STATEMENT,
  type ClaimStatus,
  type SummaryQuery,
  type SummaryReport,
  type VatRegister,
  type VatRegisterQuery,
} from "@payroll/contract";
import { fils } from "@payroll/engine";
import { toMoney } from "../db/money";
import type { ReqCtx } from "../http/context";

/**
 * Owner and hr reports over approved and reimbursed claims, filtered
 * by item dates. VAT is as entered; recovery is never assessed.
 */
const money = (n: bigint) => toMoney(fils(BigInt(n)));

export const ITEMS_FROM = `FROM expense_items i
  JOIN expense_claims c ON c.company_id = i.company_id
    AND c.id = i.claim_id AND c.revision = i.revision
  JOIN employees e ON e.company_id = c.company_id AND e.id = c.employee_id
  JOIN expense_categories k ON k.company_id = i.company_id
    AND k.id = i.category_id
  LEFT JOIN departments d ON d.company_id = e.company_id
    AND d.id = e.department_id`;

const PAID = "c.status IN ('approved', 'reimbursed')";

const GROUPS: Record<SummaryQuery["groupBy"], [string, string]> = {
  category: ["k.id::text", "k.name"],
  employee: ["e.id::text", "e.full_name"],
  department: ["coalesce(d.id::text, 'none')",
    "coalesce(d.name, 'No department')"],
  status: ["c.status", "c.status"],
};

interface SumRow { key: string; label: string; claims: number;
  items: number; total: bigint; vat: bigint }

export async function summaryReport(ctx: ReqCtx<unknown, SummaryQuery>)
  : Promise<SummaryReport> {
  const q = ctx.query;
  const [key, label] = GROUPS[q.groupBy];
  const rows = await ctx.tx.query<SumRow>(
    `SELECT ${key} AS key, ${label} AS label,
       count(DISTINCT c.id)::int AS claims, count(*)::int AS items,
       sum(i.amount) AS total, sum(i.vat_amount) AS vat
     ${ITEMS_FROM}
     WHERE i.company_id = $1 AND ${PAID} AND i.date BETWEEN $2 AND $3
       AND ($4::uuid IS NULL OR c.pay_run_id = $4::uuid)
     GROUP BY 1, 2 ORDER BY 2, 1`,
    [ctx.tenant!.companyId, q.from, q.to, q.payRunId ?? null]);
  const total = rows.reduce((n, r) => n + BigInt(r.total), 0n);
  const vat = rows.reduce((n, r) => n + BigInt(r.vat), 0n);
  return { rows: rows.map((r) => ({ key: r.key, label: r.label,
    claimCount: r.claims, itemCount: r.items, total: money(r.total),
    vatTotal: money(r.vat) })), total: money(total), vatTotal: money(vat),
  statement: VAT_STATEMENT };
}

interface VatRow { claim_id: string; item_id: string; number: string;
  full_name: string; date: string; code: string;
  supplier_name: string | null; supplier_trn: string | null;
  amount: bigint; vat_amount: bigint; receipts: number;
  status: ClaimStatus }

/** Items with VAT or a supplier TRN; netOfVat = amount - VAT. */
export async function vatRegister(ctx: ReqCtx<unknown, VatRegisterQuery>)
  : Promise<VatRegister> {
  const rows = await ctx.tx.query<VatRow>(
    `SELECT c.id AS claim_id, i.id AS item_id, e.number, e.full_name,
       i.date, k.code, i.supplier_name, i.supplier_trn, i.amount,
       i.vat_amount, c.status, (SELECT count(*)::int FROM
       expense_item_receipts x WHERE x.company_id = i.company_id
         AND x.item_id = i.id) AS receipts
     ${ITEMS_FROM}
     WHERE i.company_id = $1 AND ${PAID} AND i.date BETWEEN $2 AND $3
       AND (i.vat_amount > 0 OR i.supplier_trn IS NOT NULL)
     ORDER BY i.date, c.id, i.idx`,
    [ctx.tenant!.companyId, ctx.query.from, ctx.query.to]);
  return { statement: VAT_STATEMENT, vatRecoverability: "not-assessed",
    rows: rows.map((r) => ({ claimId: r.claim_id, itemId: r.item_id,
      employeeNumber: r.number, employeeName: r.full_name, date: r.date,
      categoryCode: r.code, supplierName: r.supplier_name,
      supplierTrn: r.supplier_trn, amount: money(r.amount),
      vatAmount: money(r.vat_amount),
      netOfVat: money(BigInt(r.amount) - BigInt(r.vat_amount)),
      receiptCount: r.receipts, status: r.status })) };
}
