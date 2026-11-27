import { fils, formatAed, mulDiv, type Fils } from "@payroll/engine";
import { plural } from "./display";
import type { DemoCompany, DemoEmployee } from "./types";
import { bonusSlip } from "./wpe-bonus";
import { departmentText, jobTitleText } from "./wp3";

/**
 * WPE commission: the monthly sales commission statement of each
 * salesperson (map row P66). FICTIONAL, and every input that is a
 * sales figure is a SAMPLE: the target by job, what each seat booked
 * in October (as a share of its target) and the one September sale
 * that was cancelled. The rest is worked out here on whole fils: the
 * tier bands, the commission, the clawback and what is left to pay.
 * The pay that results goes through the engine's deduction rules
 * (bonusSlip), so a statement shows the engine's net.
 */

export const COMMISSION_MONTH = "2026-10";
export const COMMISSION_MONTH_TEXT = "October 2026";
export const COMMISSION_PAID_WITH = "the November salary run";
export const COMMISSION_JOBS: readonly string[] = ["relationship-manager",
  "relationship-officer", "payments-officer"];

/** SAMPLE monthly sales targets, in whole AED, by job. */
const TARGET_AED: Record<string, bigint> = {
  "relationship-manager": 600000n, "relationship-officer": 300000n,
  "payments-officer": 200000n };

/** SAMPLE results by seat (people sorted by name), in basis points of
 * the target: sales booked in October, and a September sale that was
 * cancelled in October. */
const BOOKED_BPS: readonly bigint[] = [11800n, 9600n, 13100n, 7400n,
  10500n, 8800n];
const REVERSED_BPS: readonly bigint[] = [0n, 300n, 0n, 0n, 200n, 0n];

export interface Tier { id: string; fromBps: bigint; toBps: bigint | null;
  rateBps: bigint; label: string; rateText: string }

/** SAMPLE tiers: each band of the target pays its own rate. */
export const COMMISSION_TIERS: readonly Tier[] = [
  { id: "t0", fromBps: 0n, toBps: 8000n, rateBps: 0n,
    label: "Up to 80%", rateText: "0%" },
  { id: "t1", fromBps: 8000n, toBps: 10000n, rateBps: 150n,
    label: "80% to 100% of target", rateText: "1.5%" },
  { id: "t2", fromBps: 10000n, toBps: 12000n, rateBps: 300n,
    label: "100% to 120% of target", rateText: "3%" },
  { id: "t3", fromBps: 12000n, toBps: null, rateBps: 450n,
    label: "Above 120% of target", rateText: "4.5%" },
];

/** A cancelled sale gives back commission at the first paying rate. */
export const CLAWBACK_BPS = 150n;
export const CLAWBACK_WINDOW_TEXT = "a sale cancelled within 60 days";

export const COMMISSION_BASIS = "Sample plan. Each salesperson has a " +
  "monthly sales target. Sales up to 80% of target pay nothing; " +
  "each band above pays its own rate (1.5, 3 and 4.5%). A sale " +
  `cancelled later (${CLAWBACK_WINDOW_TEXT}) gives back commission at ` +
  "1.5%, taken from the next statement. The sales figures here " +
  "are sample figures, not from a sales system.";

export const COMMISSION_NOT_COMPUTED = "Pension for UAE nationals stays " +
  "not computed. Commission is paid with the salary; no other " +
  "deduction is requested against it.";

const pctText = (bps: bigint): string => `${Number(bps) / 100}%`;

export interface CommissionBand {
  id: string;
  label: string;
  rateText: string;
  rateBps: bigint;
  /** Sales that fall in this band. */
  sales: Fils;
  commission: Fils;
}

export interface CommissionStatement {
  employeeId: string;
  name: string;
  jobText: string;
  departmentText: string;
  national: boolean;
  target: Fils;
  booked: Fils;
  attainmentBps: bigint;
  attainmentText: string;
  bands: CommissionBand[];
  /** Before the clawback. */
  commission: Fils;
  reversedSales: Fils;
  clawback: Fils;
  /** Clawback beyond the commission, carried to the next statement. */
  carried: Fils;
  /** Commission less clawback, never below nothing. */
  payable: Fils;
  /** What the engine's deduction rules leave of it. */
  deductions: Fils;
  net: Fils;
  display: { target: string; booked: string; attainment: string;
    commission: string; clawback: string; payable: string; net: string };
}

export interface CommissionPlan {
  month: string;
  monthText: string;
  paidWith: string;
  basis: string;
  notComputed: string;
  tiers: readonly Tier[];
  statements: CommissionStatement[];
}

const seatsOf = (c: DemoCompany): DemoEmployee[] => c.employees
  .filter((e) => COMMISSION_JOBS.includes(e.jobKey) &&
    e.leavingDate === null)
  .sort((a, b) => a.fullName.localeCompare(b.fullName));

/** Sales in each tier band: the bands add up to the sales booked. */
export function commissionBands(target: Fils, booked: Fils)
  : CommissionBand[] {
  return COMMISSION_TIERS.map((t) => {
    const lo = mulDiv(target, t.fromBps, 10000n, "HALF_UP");
    const hi = t.toBps === null ? booked
      : mulDiv(target, t.toBps, 10000n, "HALF_UP");
    const top = booked < hi ? booked : hi;
    const sales = fils(top > lo ? top - lo : 0n);
    return { id: t.id, label: t.label, rateText: t.rateText,
      rateBps: t.rateBps, sales,
      commission: mulDiv(sales, t.rateBps, 10000n, "HALF_UP") };
  });
}

export function commissionPlan(c: DemoCompany): CommissionPlan {
  const statements = seatsOf(c).map((e, i): CommissionStatement => {
    const target = fils(TARGET_AED[e.jobKey]! * 100n);
    const bps = BOOKED_BPS[i % BOOKED_BPS.length]!;
    const booked = mulDiv(target, bps, 10000n, "HALF_UP");
    const reversed = mulDiv(target, REVERSED_BPS[i % REVERSED_BPS.length]!,
      10000n, "HALF_UP");
    const bands = commissionBands(target, booked);
    const commission = fils(bands.reduce((n, b) => n + b.commission, 0n));
    const clawback = mulDiv(reversed, CLAWBACK_BPS, 10000n, "HALF_UP");
    const payable = fils(commission > clawback ? commission - clawback
      : 0n);
    const carried = fils(clawback > commission ? clawback - commission
      : 0n);
    const slip = bonusSlip(e, payable);
    return { employeeId: e.id, name: e.fullName,
      jobText: jobTitleText(e.jobKey),
      departmentText: departmentText(e.departmentId),
      national: e.workerClass === "uae-national", target, booked,
      attainmentBps: bps, attainmentText: pctText(bps), bands, commission,
      reversedSales: reversed, clawback, carried, payable,
      deductions: slip.deductions, net: slip.net,
      display: { target: formatAed(target), booked: formatAed(booked),
        attainment: pctText(bps), commission: formatAed(commission),
        clawback: formatAed(clawback), payable: formatAed(payable),
        net: formatAed(slip.net) } };
  });
  return { month: COMMISSION_MONTH, monthText: COMMISSION_MONTH_TEXT,
    paidWith: COMMISSION_PAID_WITH, basis: COMMISSION_BASIS,
    notComputed: COMMISSION_NOT_COMPUTED, tiers: COMMISSION_TIERS,
    statements };
}

export interface CommissionTotals {
  count: number;
  commission: Fils;
  clawback: Fils;
  net: Fils;
  display: { count: string; commission: string; clawback: string;
    net: string };
}

export function commissionTotals(p: CommissionPlan): CommissionTotals {
  const sum = (f: (s: CommissionStatement) => bigint): Fils =>
    fils(p.statements.reduce((n, s) => n + f(s), 0n));
  const commission = sum((s) => s.commission);
  const clawback = sum((s) => s.clawback);
  const net = sum((s) => s.net);
  return { count: p.statements.length, commission, clawback, net,
    display: { count: plural(p.statements.length, "person", "people"),
      commission: formatAed(commission), clawback: formatAed(clawback),
      net: formatAed(net) } };
}
