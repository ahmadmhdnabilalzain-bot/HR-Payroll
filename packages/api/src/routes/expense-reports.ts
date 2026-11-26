import {
  REIMBURSEMENT_WPS_NOTE,
  VAT_STATEMENT,
  type Payouts,
  type PayoutsQuery,
  type SummaryQuery,
  type SummaryReport,
  type VatRegister,
  type VatRegisterQuery,
} from "@payroll/contract";
import type { AppDeps } from "../deps";
import {
  agingReport,
  payoutsReport,
  unpaidReport,
} from "../expenses/reports-payroll";
import { summaryReport, vatRegister } from "../expenses/reports";
import { CsvReply, register, type App, type ReqCtx } from "../http/context";
import { toCsv } from "../http/csv";

const summaryCsv = (r: SummaryReport) => toCsv(VAT_STATEMENT,
  ["key", "label", "claimCount", "itemCount", "total", "vatTotal"],
  r.rows.map((x) => [x.key, x.label, String(x.claimCount),
    String(x.itemCount), x.total, x.vatTotal]));

const vatCsv = (r: VatRegister) => toCsv(VAT_STATEMENT,
  ["claimId", "itemId", "employeeNumber", "employeeName", "date",
    "categoryCode", "supplierName", "supplierTrn", "amount", "vatAmount",
    "netOfVat", "receiptCount", "status"],
  r.rows.map((x) => [x.claimId, x.itemId, x.employeeNumber,
    x.employeeName, x.date, x.categoryCode, x.supplierName ?? "",
    x.supplierTrn ?? "", x.amount, x.vatAmount, x.netOfVat,
    String(x.receiptCount), x.status]));

const payoutsCsv = (r: Payouts) => toCsv(REIMBURSEMENT_WPS_NOTE,
  ["employeeNumber", "employeeName", "employeeId", "claimIds", "total"],
  r.rows.map((x) => [x.employeeNumber, x.employeeName, x.employeeId,
    x.claimIds.join(" "), x.total]));

/** JSON by default; CSV (with its statement line) when format=csv. */
function csvOptional<Q extends { format?: "json" | "csv" | undefined }, R>(
  build: (ctx: ReqCtx<unknown, Q>) => Promise<R>,
  csv: (r: R) => string, fileName: string) {
  return async (ctx: ReqCtx<unknown, Q>) => {
    const r = await build(ctx);
    return ctx.query.format === "csv" ? new CsvReply(csv(r), fileName) : r;
  };
}

export function registerExpenseReportRoutes(app: App, deps: AppDeps)
  : void {
  register(app, deps, "expenseSummary", csvOptional<SummaryQuery,
    SummaryReport>(summaryReport, summaryCsv, "expense-summary.csv"));
  register(app, deps, "expenseVatRegister", csvOptional<VatRegisterQuery,
    VatRegister>(vatRegister, vatCsv, "expense-vat-register.csv"));
  register(app, deps, "expensePayouts", csvOptional<PayoutsQuery,
    Payouts>(payoutsReport, payoutsCsv, "expense-payouts.csv"));
  register(app, deps, "expenseAging", async (ctx) =>
    ({ items: await agingReport(ctx) }));
  register(app, deps, "expenseUnpaid", async (ctx) =>
    ({ items: await unpaidReport(ctx) }));
}
