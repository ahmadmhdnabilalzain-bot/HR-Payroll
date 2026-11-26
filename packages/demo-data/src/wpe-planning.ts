import {
  calculatePayslip,
  DEFAULT_PAYROLL_PACKS,
  fils,
  formatAed,
  type Fils,
  type PayslipInput,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import { plural } from "./display";
import { payslipInput } from "./pay-inputs";
import { employedIn } from "./payroll";
import { payslipWithoutPension } from "./pension";
import { BASIC_STEP, GRADE_BASIC } from "./roster-data";
import type { DemoCompany, DemoEmployee } from "./types";
import {
  appraisalViews,
  positionsByDepartment,
  positionViews,
} from "./wp2";
import {
  candidateBoard,
  departmentText,
  jobTitleText,
  offerViews,
  requisitionViews,
  shortDateText,
} from "./wp3";
import { payrollHistory, reportMonth } from "./wp7";

/**
 * WPE planning: the 2027 merit guideline, the workforce plan, the 2026
 * payroll budget against actual, and the November and December
 * forecast. FICTIONAL. Every money figure is a payslip the engine
 * works out (calculatePayslip, or its steps without pension for UAE
 * nationals), a pay-scale step, or a sum of those; nothing is typed.
 * The one typed input is the sample steps-per-rating table below.
 * Forecasts are estimates and say so. Unlocks map rows P67, P68, X13
 * and X35.
 */

export const PLAN_YEAR = 2027;
export const PLAN_EFFECTIVE = "2027-01-01";

/** One pay-scale step: AED 250 of monthly basic (the roster's step). */
export const PLAN_STEP: Fils = fils(BASIC_STEP);

/**
 * SAMPLE merit guideline: pay-scale steps by mid-year rating (out of
 * 5). The one input in this file that is a policy choice, not derived.
 */
export const MERIT_GUIDELINE: readonly { rating: number; steps: number;
  label: string }[] = [
  { rating: 1, steps: 0, label: "Does not yet meet" },
  { rating: 2, steps: 0, label: "Partly meets" },
  { rating: 3, steps: 1, label: "Meets" },
  { rating: 4, steps: 2, label: "Exceeds" },
  { rating: 5, steps: 3, label: "Outstanding" },
];

/** The rating whose step sets each department's pool. */
export const POOL_RATING = 3;

export const MERIT_BASIS = "Sample guideline, in pay-scale steps of " +
  `${formatAed(PLAN_STEP)} a month, by the mid-year 2026 rating. A ` +
  "person's increase stops at the top of their grade's pay band. Each " +
  "department's pool is every eligible person at the Meets step. " +
  `Increases take effect on ${shortDateText(PLAN_EFFECTIVE)}.`;

export const stepsToFils = (n: number): Fils => fils(BASIC_STEP * BigInt(n));

const money = (v: bigint): { value: Fils; display: string } =>
  ({ value: fils(v), display: formatAed(fils(v)) });
const sum = (xs: readonly bigint[]): bigint => xs.reduce((n, x) => n + x, 0n);

const isNational = (e: DemoEmployee): boolean =>
  e.workerClass === "uae-national";

function grossOf(input: PayslipInput, national: boolean): bigint {
  const r = national ? payslipWithoutPension(input)
    : calculatePayslip(input, DEFAULT_PAYROLL_PACKS);
  return r.value.gross;
}

/** A person's pay for a calendar month as the engine works it out. */
function monthlyGross(e: DemoEmployee, year: number, month: number)
  : bigint {
  return grossOf(payslipInput(e, { year, month }), isNational(e));
}

/** A clean full month (the leaver's package, as if they stayed). */
function fullMonthGross(e: DemoEmployee): bigint {
  return monthlyGross({ ...e, leavingDate: null }, 2026, 11);
}

/** An accepted offer whose person is not yet on the staff list. */
export interface PendingJoiner {
  offerId: string;
  name: string;
  requisitionId: string;
  departmentId: string;
  departmentText: string;
  title: string;
  joiningIso: string;
  joiningText: string;
  national: boolean;
}

export function pendingJoiners(c: DemoCompany): PendingJoiner[] {
  const reqs = requisitionViews(c);
  return offerViews(c, "accepted").filter((o) => o.employeeId === null &&
    o.joiningDate.iso > AS_OF).map((o) => {
    const r = reqs.find((x) => x.id === o.requisitionId)!;
    const nat = /^(AE|ARE)$/.test(candidateNationality(c, o.candidateId));
    return { offerId: o.id, name: o.candidateName,
      requisitionId: r.id, departmentId: r.departmentId,
      departmentText: r.departmentText, title: o.title,
      joiningIso: o.joiningDate.iso,
      joiningText: shortDateText(o.joiningDate.iso), national: nat };
  });
}

function candidateNationality(c: DemoCompany, id: string): string {
  const b = candidateBoard(c);
  const all = [...b.columns.flatMap((x) => x.candidates), ...b.closed];
  return all.find((x) => x.id === id)?.nationality ?? "";
}

/** The pay a pending joiner would get in a month, by the engine. */
function joinerGross(c: DemoCompany, j: PendingJoiner, year: number,
  month: number): bigint {
  const offer = offerViews(c).find((o) => o.id === j.offerId)!;
  const template = c.employees.find((e) => e.cases.length === 0)!;
  const base = payslipInput(template, { year, month });
  const input: PayslipInput = { ...base, employee: { ...base.employee,
    workerClass: j.national ? "uae-national" : "expat-full-time",
    joiningDate: j.joiningIso, leavingDate: null, probationEndDate: null,
    basicMonthly: offer.basic,
    allowances: offer.allowances.map((a) => ({ ...a })) },
  absences: [], overtime: [], loans: [] };
  return j.joiningIso > `${year}-${String(month).padStart(2, "0")}-31` ? 0n
    : grossOf(input, j.national);
}

// ---------------------------------------------------------------
// Merit guideline (P67)
// ---------------------------------------------------------------

export interface MeritRow {
  employeeId: string;
  name: string;
  departmentId: string;
  departmentText: string;
  jobText: string;
  grade: number;
  rating: number | null;
  ratingText: string;
  basic: Fils;
  /** Steps the guideline gives for the rating, before the band cap. */
  guidelineSteps: number;
  /** Steps allowed after the cap at the top of the grade's band. */
  allowedSteps: number;
  /** Why no increase can be proposed, in words; null when one can. */
  noneReason: string | null;
  display: { basic: string; guideline: string };
}

export interface MeritPool {
  departmentId: string;
  departmentText: string;
  eligible: number;
  poolSteps: number;
  pool: Fils;
  display: { pool: string; eligible: string };
}

export interface MeritPlan {
  year: number;
  effectiveText: string;
  basis: string;
  step: Fils;
  guideline: readonly { rating: number; steps: number; label: string;
    display: string }[];
  rows: MeritRow[];
  pools: MeritPool[];
  /** People left out of the plan, with the reason. */
  left: { name: string; reason: string }[];
}

export function meritPlan(c: DemoCompany): MeritPlan {
  const mid = appraisalViews(c, { cycleId: "cyc-2026-mid" });
  const ratingOf = new Map(mid.map((a) => [a.employeeId, a.rating]));
  const staying = c.employees.filter((e) => e.leavingDate === null);
  const rows = staying.map((e): MeritRow => {
    const rating = ratingOf.get(e.id) ?? null;
    const steps = MERIT_GUIDELINE.find((g) => g.rating === rating)
      ?.steps ?? 0;
    const top = GRADE_BASIC[e.grade]! + BASIC_STEP * 8n;
    const room = top > e.basicMonthly
      ? Number((top - e.basicMonthly) / BASIC_STEP) : 0;
    const allowed = Math.min(steps, room);
    const noneReason = rating === null
      ? "Not rated yet (joined after the mid-year cycle)"
      : steps === 0 ? "The guideline gives no increase at this rating"
        : allowed === 0 ? "Already at the top of the grade's pay band"
          : null;
    return { employeeId: e.id, name: e.fullName,
      departmentId: e.departmentId,
      departmentText: departmentText(e.departmentId),
      jobText: jobTitleText(e.jobKey), grade: e.grade, rating,
      ratingText: rating === null ? "Not rated"
        : `${rating} of 5, ${MERIT_GUIDELINE.find((g) =>
          g.rating === rating)?.label ?? ""}`,
      basic: e.basicMonthly, guidelineSteps: steps, allowedSteps: allowed,
      noneReason, display: { basic: formatAed(e.basicMonthly),
        guideline: noneReason !== null ? noneReason
          : `Up to ${plural(allowed, "step", "steps")}` } };
  });
  const poolStepsOf = MERIT_GUIDELINE.find((g) =>
    g.rating === POOL_RATING)!.steps;
  const pools = c.departments.map((d): MeritPool => {
    const n = rows.filter((r) => r.departmentId === d.id &&
      r.rating !== null).length;
    const steps = n * poolStepsOf;
    return { departmentId: d.id, departmentText: departmentText(d.id),
      eligible: n, poolSteps: steps, pool: stepsToFils(steps),
      display: { pool: formatAed(stepsToFils(steps)),
        eligible: plural(n, "person", "people") } };
  });
  return { year: PLAN_YEAR, effectiveText: shortDateText(PLAN_EFFECTIVE),
    basis: MERIT_BASIS, step: PLAN_STEP,
    guideline: MERIT_GUIDELINE.map((g) => ({ ...g,
      display: g.steps === 0 ? "No increase"
        : `${plural(g.steps, "step", "steps")}, ` +
          formatAed(stepsToFils(g.steps)) })),
    rows, pools,
    left: c.employees.filter((e) => e.leavingDate !== null).map((e) =>
      ({ name: e.fullName, reason: "Left on " +
        shortDateText(e.leavingDate!) })) };
}

// ---------------------------------------------------------------
// Workforce plan (P68) and the 2027 budget
// ---------------------------------------------------------------

export interface WorkforceRow {
  departmentId: string;
  departmentText: string;
  seats: number;
  filled: number;
  vacant: number;
  onHold: number;
  startOfYear: number;
  joinedThisYear: number;
  leftThisYear: number;
  now: number;
  joinersComing: number;
  yearEnd: number;
  /** Seats against the people we expect at the year end. */
  gap: number;
  budget: { filled: Fils; backfill: Fils; newHires: Fils; total: Fils };
  /** Vacant seats with no accepted offer and no leaver to replace. */
  unpriced: number;
  display: { gap: string; total: string; seats: string };
}

export interface WorkforcePlan {
  year: number;
  asOfText: string;
  rows: WorkforceRow[];
  totals: { seats: number; filled: number; vacant: number; onHold: number;
    now: number; yearEnd: number; leftThisYear: number;
    budget: Fils; unpriced: number };
  basis: string;
  leavers: { name: string; departmentText: string; lastDay: string;
    seatText: string }[];
  joiners: { name: string; departmentText: string; joins: string }[];
}

export const WORKFORCE_BASIS = `The ${PLAN_YEAR} payroll budget is an ` +
  "estimate (sample): twelve months of gross pay for each seat, from the " +
  "engine. A filled seat is its holder's pay for a full month. A seat " +
  "being backfilled is the leaver's pay package. A new seat is the " +
  "accepted offer for it. A seat with no accepted offer is not priced, " +
  "and a seat on hold is left out until it is confirmed. Pay increases " +
  "and employer costs are not included.";

const heldOn = (e: DemoEmployee, on: string): boolean =>
  e.joiningDate <= on && (e.leavingDate === null || e.leavingDate > on);

export function workforcePlan(c: DemoCompany): WorkforcePlan {
  const seats = positionsByDepartment(c);
  const positions = positionViews(c);
  const reqs = requisitionViews(c);
  const joiners = pendingJoiners(c);
  const rows = c.departments.map((d): WorkforceRow => {
    const s = seats.find((x) => x.departmentId === d.id)!;
    const mine = c.employees.filter((e) => e.departmentId === d.id);
    const live = mine.filter((e) => heldOn(e, AS_OF));
    const coming = joiners.filter((j) => j.departmentId === d.id);
    const filledPay = sum(positions.filter((p) => p.departmentId === d.id &&
      p.status === "filled").map((p) => {
      const e = mine.find((x) => x.id === p.incumbentId);
      return e === undefined || e.leavingDate !== null ? 0n
        : monthlyGross(e, 2026, 11) * 12n;
    }));
    let backfill = 0n;
    let hires = 0n;
    let unpriced = 0;
    const offersLeft = new Map<string, number>(coming.map((j) =>
      [j.requisitionId, 0]));
    for (const j of coming) {
      offersLeft.set(j.requisitionId,
        (offersLeft.get(j.requisitionId) ?? 0) + 1);
    }
    for (const p of positions.filter((x) => x.departmentId === d.id &&
      x.status === "vacant")) {
      const r = reqs.find((x) => x.id === p.requisitionId);
      const gone = r?.replacesEmployeeId === null ||
        r?.replacesEmployeeId === undefined ? undefined
        : c.employees.find((e) => e.id === r.replacesEmployeeId);
      const j = coming.find((x) => x.requisitionId === p.requisitionId &&
        (offersLeft.get(x.requisitionId) ?? 0) > 0);
      if (gone !== undefined) backfill += fullMonthGross(gone) * 12n;
      else if (j !== undefined) {
        offersLeft.set(j.requisitionId, offersLeft.get(j.requisitionId)! - 1);
        hires += joinerGross(c, j, 2026, 12) * 12n;
      } else unpriced += 1;
    }
    const left = mine.filter((e) => e.leavingDate !== null &&
      e.leavingDate > "2026-01-01" && e.leavingDate <= AS_OF).length;
    const now = live.length;
    const yearEnd = now + coming.length;
    const total = filledPay + backfill + hires;
    const gap = s.filled + s.vacant - yearEnd;
    return { departmentId: d.id, departmentText: departmentText(d.id),
      seats: s.budgeted, filled: s.filled, vacant: s.vacant,
      onHold: s.onHold, startOfYear: mine.filter((e) =>
        heldOn(e, "2026-01-01")).length,
      joinedThisYear: mine.filter((e) => e.joiningDate > "2026-01-01" &&
        e.joiningDate <= AS_OF).length, leftThisYear: left, now,
      joinersComing: coming.length, yearEnd, gap,
      budget: { filled: fils(filledPay), backfill: fils(backfill),
        newHires: fils(hires), total: fils(total) }, unpriced,
      display: { gap: gap === 0 ? "Seats and people match"
        : `${plural(gap, "seat", "seats")} still to fill`,
      total: formatAed(fils(total)),
      seats: `${s.filled} filled, ${s.vacant} vacant` +
        (s.onHold === 0 ? "" : `, ${s.onHold} on hold`) } };
  });
  const n = (f: (r: WorkforceRow) => number): number =>
    rows.reduce((a, r) => a + f(r), 0);
  return { year: PLAN_YEAR, asOfText: shortDateText(AS_OF), rows,
    totals: { seats: n((r) => r.seats), filled: n((r) => r.filled),
      vacant: n((r) => r.vacant), onHold: n((r) => r.onHold),
      now: n((r) => r.now), yearEnd: n((r) => r.yearEnd),
      leftThisYear: n((r) => r.leftThisYear),
      budget: fils(sum(rows.map((r) => r.budget.total))),
      unpriced: n((r) => r.unpriced) },
    basis: WORKFORCE_BASIS,
    leavers: c.employees.filter((e) => e.leavingDate !== null).map((e) => ({
      name: e.fullName, departmentText: departmentText(e.departmentId),
      lastDay: shortDateText(e.leavingDate!),
      seatText: reqs.some((r) => r.replacesEmployeeId === e.id)
        ? "Seat open for a replacement" : "Seat closed" })),
    joiners: joiners.map((j) => ({ name: j.name,
      departmentText: j.departmentText, joins: j.joiningText })) };
}

// ---------------------------------------------------------------
// Cost and budget, and the forecast (X13, X35)
// ---------------------------------------------------------------

export interface BudgetMonth {
  /** "2026-03". */
  month: string;
  label: string;
  kind: "actual" | "estimate";
  budget: Fils;
  amount: Fils;
  /** Amount minus budget: positive is over budget. */
  difference: Fils;
}

export interface BudgetRow {
  departmentId: string;
  departmentText: string;
  months: BudgetMonth[];
  budgetYear: Fils;
  actualToDate: Fils;
  budgetToDate: Fils;
  yearEnd: Fils;
  display: { budgetYear: string; actualToDate: string; yearEnd: string };
}

export interface ForecastDriver { label: string; amount: Fils;
  people: string[] }

export interface CostBudget {
  year: number;
  rows: BudgetRow[];
  total: BudgetRow;
  months: { month: string; label: string; kind: "actual" | "estimate";
    /** An actual month whose run is paid; false: still waiting. */
    paid: boolean }[];
  basis: string;
  forecastNote: string;
  /** From October to November, then November to December. */
  bridge: { from: string; to: string; fromAmount: Fils; toAmount: Fils;
    drivers: ForecastDriver[] }[];
}

export const BUDGET_BASIS = "The 2026 budget is the January payroll, " +
  "kept for twelve months (sample): what the year's starting staff cost " +
  "in the engine. Growth seats opened during the year are not in it, so " +
  "they show as over budget. January to October are the engine's own " +
  "runs, worked out again from today's pay and joining dates.";

export const FORECAST_NOTE = "November and December are estimates. They " +
  "work the engine out again for everyone employed in the month: the " +
  "leaver is out, the October hire has a full month, accepted offers " +
  "start on their joining dates, and October's back pay, overtime and " +
  "unpaid leave do not repeat. No overtime or unpaid leave is assumed, " +
  "and the 2027 increases start on " +
  `${shortDateText(PLAN_EFFECTIVE)}, after both months.`;

const MONTH_KEYS = Array.from({ length: 12 }, (_, i) =>
  `2026-${String(i + 1).padStart(2, "0")}`);

export function costBudget(c: DemoCompany): CostBudget {
  const hist = payrollHistory(c);
  const deptOf = new Map(c.employees.map((e) => [e.id, e.departmentId]));
  const joiners = pendingJoiners(c);
  const actual = (month: string, dept: string): bigint => sum(hist
    .find((m) => m.month === month)!.lines.filter((l) =>
      deptOf.get(l.employeeId) === dept).map((l) => l.gross));
  const estimate = (m: number, dept: string): bigint =>
    sum(c.employees.filter((e) => e.departmentId === dept &&
      employedIn(e, 2026, m)).map((e) => monthlyGross(e, 2026, m))) +
    sum(joiners.filter((j) => j.departmentId === dept).map((j) =>
      joinerGross(c, j, 2026, m)));
  const lastActual = hist.length;
  const months = MONTH_KEYS.map((month, i) => ({ month,
    label: reportMonth(month),
    kind: (i < lastActual ? "actual" : "estimate") as "actual" | "estimate",
    paid: hist[i]?.status === "paid" }));
  const build = (id: string, text: string, depts: string[]): BudgetRow => {
    const budget = sum(depts.map((d) => actual(MONTH_KEYS[0]!, d)));
    const cells = months.map((m, i): BudgetMonth => {
      const amount = sum(depts.map((d) => m.kind === "actual"
        ? actual(m.month, d) : estimate(i + 1, d)));
      return { month: m.month, label: m.label, kind: m.kind,
        budget: fils(budget), amount: fils(amount),
        difference: fils(amount - budget) };
    });
    const act = sum(cells.filter((x) => x.kind === "actual")
      .map((x) => x.amount));
    const yearEnd = sum(cells.map((x) => x.amount));
    return { departmentId: id, departmentText: text, months: cells,
      budgetYear: fils(budget * 12n), actualToDate: fils(act),
      budgetToDate: fils(budget * BigInt(lastActual)),
      yearEnd: fils(yearEnd), display: { budgetYear: formatAed(
        fils(budget * 12n)), actualToDate: formatAed(fils(act)),
      yearEnd: formatAed(fils(yearEnd)) } };
  };
  const rows = c.departments.map((d) =>
    build(d.id, departmentText(d.id), [d.id]));
  const total = build("all", "Whole company", c.departments.map((d) => d.id));
  return { year: 2026, rows, total, months, basis: BUDGET_BASIS,
    forecastNote: FORECAST_NOTE, bridge: bridgeOf(c) };
}

/** What moves the payroll from one month to the next, by cause. */
function bridgeOf(c: DemoCompany): CostBudget["bridge"] {
  const hist = payrollHistory(c);
  const oct = new Map(hist[hist.length - 1]!.lines.map((l) =>
    [l.employeeId, l.gross]));
  const joiners = pendingJoiners(c);
  const step = (fromM: number, toM: number, fromOf: (e: DemoEmployee) =>
    bigint, label: string[]): CostBudget["bridge"][number] => {
    const gone: DemoEmployee[] = [];
    const hired: DemoEmployee[] = [];
    const other: DemoEmployee[] = [];
    let moved = 0n;
    let goneSum = 0n;
    let hiredSum = 0n;
    let otherSum = 0n;
    for (const e of c.employees) {
      const before = fromOf(e);
      const now = employedIn(e, 2026, toM) ? monthlyGross(e, 2026, toM) : 0n;
      const d = now - before;
      if (d === 0n) continue;
      if (now === 0n) { gone.push(e); goneSum += d; }
      else if (e.joiningDate.startsWith(MONTH_KEYS[fromM - 1]!)) {
        hired.push(e); hiredSum += d;
      } else { other.push(e); otherSum += d; }
      moved += d;
    }
    const jsum = sum(joiners.map((j) => joinerGross(c, j, 2026, toM) -
      joinerGross(c, j, 2026, fromM)));
    const drivers: ForecastDriver[] = [];
    if (goneSum !== 0n) drivers.push({ label: "Leavers drop out",
      amount: fils(goneSum), people: gone.map((e) => e.fullName) });
    if (hiredSum !== 0n) drivers.push({ label: "New hires, full month",
      amount: fils(hiredSum), people: hired.map((e) => e.fullName) });
    if (jsum !== 0n) drivers.push({ label: "Accepted offers start",
      amount: fils(jsum), people: joiners.map((j) =>
        `${j.name} from ${j.joiningText}`) });
    if (otherSum !== 0n) drivers.push({ label: "One-offs that do not " +
      "repeat: back pay, overtime, unpaid leave", amount: fils(otherSum),
    people: other.map((e) => e.fullName) });
    const from = sum(c.employees.map(fromOf)) +
      sum(joiners.map((j) => joinerGross(c, j, 2026, fromM)));
    return { from: label[0]!, to: label[1]!, fromAmount: fils(from),
      toAmount: fils(from + moved + jsum), drivers };
  };
  return [
    step(10, 11, (e) => oct.get(e.id) ?? 0n,
      [reportMonth("2026-10"), reportMonth("2026-11")]),
    step(11, 12, (e) => employedIn(e, 2026, 11) ? monthlyGross(e, 2026, 11)
      : 0n, [reportMonth("2026-11"), reportMonth("2026-12")]),
  ];
}
