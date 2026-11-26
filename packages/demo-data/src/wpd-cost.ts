import {
  calculateSettlement,
  fils,
  formatAed,
  GRATUITY_PACKS,
  type Fils,
  type GratuityOutcome,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import { plural } from "./display";
import { EMPLOYER_PENSION_NOT_COMPUTED } from "./pension";
import type { DemoCompany } from "./types";
import { departmentText, jobTitleText, shortDateText } from "./wp3";

/**
 * WPD cost: gratuity provision and employer cost. FICTIONAL. Every
 * figure is read from the engine (calculateSettlement for gratuity,
 * the October payslips for cost); none is typed. Where the engine
 * does not compute something (a UAE national's pension, and the
 * Labour Law gratuity that does not apply to nationals) the row says
 * so in words and is never a silent AED 0.00. Unlocks map rows R33,
 * X07 and X04.
 */

export const GRATUITY_BASIS = "As if each person left on " +
  `${shortDateText(AS_OF)}, with basic salary as in the October pay run. ` +
  "Unpaid leave is counted as 0 days in this sample. Labour Law " +
  "gratuity only: leave pay, notice pay and other dues are not in it.";

export interface GratuityProvisionRow {
  employeeId: string;
  name: string;
  jobText: string;
  departmentId: string;
  departmentText: string;
  outcome: GratuityOutcome;
  /** Fils when the outcome is "paid"; null otherwise (never AED 0.00). */
  amount: Fils | null;
  reason: string;
  display: { amount: string; service: string };
}

export interface GratuitySettled {
  employeeId: string;
  name: string;
  amount: Fils;
  display: { amount: string; note: string };
}

export interface GratuityProvision {
  asOf: string;
  basis: string;
  rows: GratuityProvisionRow[];
  total: Fils;
  byDepartment: { departmentId: string; departmentText: string;
    amount: Fils; display: { amount: string } }[];
  counts: Record<GratuityOutcome, number>;
  /** The leaver's gratuity from the October settlement, not counted. */
  settlement: GratuitySettled[];
  display: { total: string; counts: string };
}

/** Gratuity per person through calculateSettlement, as of the demo day. */
export function gratuityProvision(c: DemoCompany): GratuityProvision {
  const leaving = new Set(c.payRun.settlements.map((s) => s.employeeId));
  const rows = c.employees.filter((e) => !leaving.has(e.id) &&
    e.leavingDate === null).map((e): GratuityProvisionRow => {
    const g = calculateSettlement({ gratuity: { joiningDate: e.joiningDate,
      lastWorkingDate: AS_OF, unpaidLeaveDays: 0,
      lastBasicMonthly: e.basicMonthly, workerClass: e.workerClass },
    unusedLeaveDays: 0 }, GRATUITY_PACKS).value;
    const paid = g.outcome === "paid";
    return { employeeId: e.id, name: e.fullName,
      jobText: jobTitleText(e.jobKey), departmentId: e.departmentId,
      departmentText: departmentText(e.departmentId), outcome: g.outcome,
      amount: paid ? g.gratuity : null, reason: g.reason,
      display: { amount: paid ? formatAed(g.gratuity)
        : g.outcome === "not-eligible" ? "Not yet eligible"
          : "Not applicable (UAE national)",
      service: `Joined ${shortDateText(e.joiningDate)}` } };
  });
  const sum = (xs: GratuityProvisionRow[]): Fils =>
    fils(xs.reduce((n, r) => n + (r.amount ?? 0n), 0n));
  const counts: Record<GratuityOutcome, number> = { paid: 0,
    "not-eligible": 0, "not-applicable": 0 };
  for (const r of rows) counts[r.outcome] += 1;
  const total = sum(rows);
  return { asOf: AS_OF, basis: GRATUITY_BASIS, rows, total,
    byDepartment: c.departments.map((d) => {
      const mine = rows.filter((r) => r.departmentId === d.id);
      const amount = sum(mine);
      return { departmentId: d.id, departmentText:
        departmentText(d.id), amount, display: { amount:
          mine.some((r) => r.amount !== null) ? formatAed(amount)
            : "None counted" } };
    }),
    counts,
    settlement: c.payRun.settlements.map((s) => {
      const e = c.employees.find((x) => x.id === s.employeeId)!;
      return { employeeId: e.id, name: e.fullName,
        amount: s.result.gratuity, display: {
          amount: formatAed(s.result.gratuity),
          note: "In the final settlement, outside the provision total" } };
    }),
    display: { total: formatAed(total), counts: `${counts.paid} counted, ` +
      `${counts["not-eligible"]} not yet eligible, ` +
      `${counts["not-applicable"]} not applicable` } };
}

export interface EmployerCostRow {
  employeeId: string;
  name: string;
  departmentId: string;
  gross: Fils;
  /** "computed" carries the engine's amount; "not-computed" none. */
  employer: { status: "computed"; amount: Fils } |
    { status: "not-computed"; note: string };
  display: { gross: string; employer: string; total: string };
}

export interface EmployerCost {
  period: string;
  rows: EmployerCostRow[];
  gross: Fils;
  employerComputed: Fils;
  /** Gross plus the employer amounts the engine computed: partial. */
  partialTotal: Fils;
  notComputedCount: number;
  byDepartment: { departmentId: string; departmentText: string;
    headcount: number; gross: Fils; employerComputed: Fils;
    notComputed: number; display: { gross: string; total: string;
      note: string } }[];
  caveat: string;
  display: { gross: string; partialTotal: string; headline: string };
}

/** October cost to the bank per person and department; partial. */
export function employerCostView(c: DemoCompany): EmployerCost {
  const rows = c.payRun.payslips.map((s): EmployerCostRow => {
    const e = c.employees.find((x) => x.id === s.employeeId)!;
    const gross = s.payslip.gross;
    return { employeeId: e.id, name: e.fullName,
      departmentId: e.departmentId, gross, employer: s.employer,
      display: { gross: formatAed(gross),
        employer: s.employer.status === "computed"
          ? formatAed(s.employer.amount) : "Not computed (pension)",
        total: s.employer.status === "computed"
          ? formatAed(fils(gross + s.employer.amount))
          : `${formatAed(gross)} plus pension not computed` } };
  });
  const add = (xs: EmployerCostRow[], f: (r: EmployerCostRow) => bigint)
    : Fils => fils(xs.reduce((n, r) => n + f(r), 0n));
  const comp = (r: EmployerCostRow): bigint => r.employer.status ===
    "computed" ? r.employer.amount : 0n;
  const gross = add(rows, (r) => r.gross);
  const employerComputed = add(rows, comp);
  const missing = rows.filter((r) => r.employer.status ===
    "not-computed").length;
  const partialTotal = fils(gross + employerComputed);
  const caveat = `${EMPLOYER_PENSION_NOT_COMPUTED} This total is partial: ` +
    `${plural(missing, "UAE national", "UAE nationals")} have no ` +
    "employer pension figure, and ILOE, insurance and other employer " +
    "costs are not computed.";
  return { period: "October 2026", rows, gross, employerComputed,
    partialTotal, notComputedCount: missing,
    byDepartment: c.departments.map((d) => {
      const mine = rows.filter((r) => r.departmentId === d.id);
      const g = add(mine, (r) => r.gross);
      const m = mine.filter((r) => r.employer.status ===
        "not-computed").length;
      const ec = add(mine, comp);
      return { departmentId: d.id, departmentText: departmentText(d.id),
        headcount: mine.length, gross: g, employerComputed: ec,
        notComputed: m, display: { gross: formatAed(g),
          total: formatAed(fils(g + ec)), note: m === 0 ? "Complete"
            : `Pension not computed for ${m}` } };
    }),
    caveat, display: { gross: formatAed(gross),
      partialTotal: formatAed(partialTotal),
      headline: `${formatAed(partialTotal)}, partial` } };
}
