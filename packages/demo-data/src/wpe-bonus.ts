import {
  applyDeductions,
  DEFAULT_PAYROLL_PACKS,
  fils,
  formatAed,
  loadPayrollParams,
  mulDiv,
  selectPack,
  TraceBuilder,
  type Fils,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import { plural } from "./display";
import type { DemoCompany, DemoEmployee } from "./types";
import { appraisalViews } from "./wp2";
import { departmentText, jobTitleText, shortDateText } from "./wp3";

/**
 * WPE bonus: an off-cycle bonus run for a sample of people (map row
 * R13). FICTIONAL. The one typed input is the sample rate table below
 * (a policy choice, like the merit guideline). Every amount is the
 * rate on a person's monthly basic, rounded once by the engine's
 * mulDiv on whole fils; the deductions come from the engine's own
 * applyDeductions (Article 25 caps), never from this file.
 */

export const BONUS_PLAN_ID = "bonus-q3-2026";
export const BONUS_LABEL = "Q3 performance bonus";
/** Paid off-cycle on the pay month's payday (a planned date). */
export const BONUS_PAY_DATE = "2026-10-30";
/** Everyone must have joined before the quarter began. */
export const BONUS_JOINED_BEFORE = "2026-07-01";

/** SAMPLE rates: a share of monthly basic by the mid-year rating. */
export const BONUS_RATES: readonly { rating: number; bps: bigint;
  label: string }[] = [
  { rating: 5, bps: 1500n, label: "Outstanding" },
  { rating: 4, bps: 1000n, label: "Exceeds" },
];

/** SAMPLE scheme scope: the front-line departments only. */
export const BONUS_DEPARTMENTS: readonly string[] = ["retail", "corp",
  "ops"];

export const BONUS_BASIS = "Sample scheme for Retail, Corporate banking " +
  "and Operations: a share of monthly basic by the mid-year 2026 " +
  "rating, 15 percent at 5 and 10 percent at 4. People who joined " +
  "after 30 June, are on probation or have left are left out. Paid " +
  `off-cycle on ${shortDateText(BONUS_PAY_DATE)}, outside the ` +
  "monthly run.";

export const BONUS_NOT_COMPUTED = "Pension for UAE nationals stays not " +
  "computed. No other deduction is requested against a bonus: loan " +
  "instalments and advances are taken in the monthly run.";

const rateOf = (rating: number | null): bigint | null =>
  BONUS_RATES.find((r) => r.rating === rating)?.bps ?? null;

/** The engine's slip for one bonus: gross, deductions, net. */
export interface BonusSlip {
  gross: Fils;
  deductions: Fils;
  net: Fils;
  /** The most Article 25 lets be taken from this slip, in all. */
  overallCap: Fils;
  /** What the engine could not or did not compute, in its words. */
  deferred: number;
}

/**
 * A bonus on its own slip. The engine applies its deduction rules to
 * the bonus as the earned wage; with no deduction requested it takes
 * none, and says what the cap would have been.
 */
export function bonusSlip(e: DemoEmployee, amount: Fils): BonusSlip {
  const p = loadPayrollParams(selectPack(DEFAULT_PAYROLL_PACKS.payroll,
    BONUS_PAY_DATE), undefined);
  const wage = e.allowances.reduce((s, a) => s + a.monthly,
    e.basicMonthly as bigint);
  const r = applyDeductions({ earnedWage: amount,
    contractualWage: fils(wage), gpssaShare: null, requests: [],
    loans: [] }, p, new TraceBuilder());
  return { gross: amount, deductions: r.total,
    net: fils(amount - r.total), overallCap: r.caps.overall,
    deferred: r.deferred.length };
}

export interface BonusRow {
  employeeId: string;
  name: string;
  departmentId: string;
  departmentText: string;
  jobText: string;
  rating: number;
  ratingText: string;
  basic: Fils;
  /** Basis points of basic. */
  bps: bigint;
  bonus: Fils;
  deductions: Fils;
  net: Fils;
  overallCap: Fils;
  national: boolean;
  display: { basic: string; rate: string; bonus: string; net: string };
}

export interface BonusPlan {
  id: string;
  label: string;
  payDateIso: string;
  payDateText: string;
  basis: string;
  notComputed: string;
  rates: { rating: number; label: string; display: string }[];
  rows: BonusRow[];
  /** People not in the plan, grouped by the reason. */
  leftOut: { reason: string; count: number }[];
  scopes: { id: "all" | "top"; label: string; count: number }[];
}

const pct = (bps: bigint): string => `${Number(bps) / 100} percent`;

export function bonusPlan(c: DemoCompany): BonusPlan {
  const mid = appraisalViews(c, { cycleId: "cyc-2026-mid" });
  const ratingOf = new Map(mid.map((a) => [a.employeeId, a.rating]));
  const left = new Map<string, number>();
  const note = (r: string): void => void left.set(r,
    (left.get(r) ?? 0) + 1);
  const rows: BonusRow[] = [];
  for (const e of c.employees) {
    const rating = ratingOf.get(e.id) ?? null;
    const bps = rateOf(rating);
    if (e.leavingDate !== null) note("Has left");
    else if (!BONUS_DEPARTMENTS.includes(e.departmentId.replace(/^dept-/,
      ""))) note("Outside the scheme's departments");
    else if (e.cases.includes("probation") ||
      e.joiningDate >= BONUS_JOINED_BEFORE) note("Joined after 30 June");
    else if (bps === null || rating === null) {
      note("Mid-year rating below 4");
    } else {
      const bonus = mulDiv(e.basicMonthly, bps, 10000n, "HALF_UP");
      const slip = bonusSlip(e, bonus);
      rows.push({ employeeId: e.id, name: e.fullName,
        departmentId: e.departmentId,
        departmentText: departmentText(e.departmentId),
        jobText: jobTitleText(e.jobKey), rating,
        ratingText: `${rating} of 5, ${BONUS_RATES.find((r) =>
          r.rating === rating)!.label}`,
        basic: e.basicMonthly, bps, bonus, deductions: slip.deductions,
        net: slip.net, overallCap: slip.overallCap,
        national: e.workerClass === "uae-national",
        display: { basic: formatAed(e.basicMonthly), rate: pct(bps),
          bonus: formatAed(bonus), net: formatAed(slip.net) } });
    }
  }
  rows.sort((a, b) => b.rating - a.rating || a.name.localeCompare(b.name));
  const top = rows.filter((r) => r.rating === 5).length;
  return { id: BONUS_PLAN_ID, label: BONUS_LABEL, payDateIso: BONUS_PAY_DATE,
    payDateText: shortDateText(BONUS_PAY_DATE), basis: BONUS_BASIS,
    notComputed: BONUS_NOT_COMPUTED,
    rates: BONUS_RATES.map((r) => ({ rating: r.rating, label: r.label,
      display: `${pct(r.bps)} of monthly basic` })),
    rows, leftOut: [...left].map(([reason, count]) => ({ reason, count })),
    scopes: [
      { id: "all", label: `Everyone eligible (${plural(rows.length,
        "person", "people")})`, count: rows.length },
      { id: "top", label: `Outstanding only (${plural(top, "person",
        "people")})`, count: top },
    ] };
}

export interface BonusTotals {
  count: number;
  gross: Fils;
  deductions: Fils;
  net: Fils;
  display: { count: string; gross: string; net: string };
}

/** The run's totals for the people in it, in the plan's order. */
export function bonusTotals(plan: BonusPlan, ids: readonly string[])
  : BonusTotals {
  const rows = plan.rows.filter((r) => ids.includes(r.employeeId));
  const sum = (f: (r: BonusRow) => bigint): Fils =>
    fils(rows.reduce((n, r) => n + f(r), 0n));
  const gross = sum((r) => r.bonus);
  const net = sum((r) => r.net);
  return { count: rows.length, gross, deductions: sum((r) => r.deductions),
    net, display: { count: plural(rows.length, "person", "people"),
      gross: formatAed(gross), net: formatAed(net) } };
}

/** People a scope picks, in the plan's order. */
export function bonusScopeIds(plan: BonusPlan, scope: "all" | "top")
  : string[] {
  return plan.rows.filter((r) => scope === "all" || r.rating === 5)
    .map((r) => r.employeeId);
}

/** The demo's date, so screens need not import the calendar. */
export const BONUS_TODAY = AS_OF;
