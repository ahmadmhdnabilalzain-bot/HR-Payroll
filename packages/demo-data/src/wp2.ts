import {
  calculateProbation,
  daysBetween,
  addDays,
  EMPLOYMENT_PACKS,
  fils,
  formatAed,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import { plural, type DisplayDate } from "./display";
import { BACK_PAY_RAISE } from "./roster";
import { BASIC_STEP, GRADE_BASIC, LOCATIONS } from "./roster-data";
import { costByDepartment } from "./selectors";
import type { DemoCompany, DemoEmployee } from "./types";
import {
  departmentText,
  jobTitleText,
  managerIdFor,
  movesDataOf,
  placeText,
  positionIdOf,
  requisitionViews,
  shortDateOf,
  shortDateText,
  vacancyViews,
  type MoneyText,
} from "./wp3";

/**
 * WP2: team and growth. FICTIONAL org chart, positions, appraisals,
 * goals and probation evaluations for the same 31 people. The chart
 * follows the demo's approval rule (`managerIdFor`), the seats follow
 * the WP3 requisitions, and every date and amount is derived from the
 * employee records, so it holds for every seed.
 */

const moneyText = (v: bigint): MoneyText =>
  ({ value: fils(v), display: formatAed(fils(v)) });

const activeOn = (e: DemoEmployee, d: string) => e.joiningDate <= d &&
  (e.leavingDate === null || e.leavingDate >= d);

export interface OrgChartNode {
  employeeId: string;
  name: string;
  title: string;
  departmentText: string;
  locationText: string;
  grade: number;
  children: OrgChartNode[];
}

export interface OrgPerson { employeeId: string; name: string;
  title: string }

export type PositionStatus = "filled" | "vacant" | "on-hold";

export interface StaffPosition {
  id: string;
  jobKey: string;
  title: string;
  departmentId: string;
  departmentText: string;
  location: string;
  locationText: string;
  grade: number;
  status: PositionStatus;
  statusText: string;
  incumbentId: string | null;
  incumbentName: string | null;
  formerIncumbentName: string | null;
  reportsToPositionId: string | null;
  requisitionId: string | null;
  basicMin: MoneyText;
  basicMax: MoneyText;
  vacantSince: DisplayDate | null;
  /** An accepted offer waiting for the start date, in words. */
  pendingHire: string | null;
  summary: string;
}

export interface DepartmentSeats {
  departmentId: string;
  departmentText: string;
  budgeted: number;
  filled: number;
  vacant: number;
  onHold: number;
  text: string;
}

export interface SiteStaff {
  location: string;
  locationText: string;
  headcount: number;
  byDepartment: { departmentId: string; departmentText: string;
    count: number }[];
  text: string;
}

export interface CostCentreView {
  code: string;
  departmentId: string;
  departmentText: string;
  /** Payslips on the October run (the leaver is on it). */
  payslips: number;
  monthlyGross: MoneyText;
}

export interface PeopleOverview {
  asOf: DisplayDate;
  headcount: number;
  headcountText: string;
  uaeNationals: number;
  onProbation: number;
  joinedThisMonth: { employeeId: string; name: string;
    on: DisplayDate }[];
  leftThisMonth: { employeeId: string; name: string; on: DisplayDate }[];
  openVacancies: number;
  upcomingJoiners: number;
  byNationality: { nationality: string; count: number }[];
  text: string;
}

export type CycleStatus = "open" | "closed";
export type AppraisalStatus = "not-started" | "self-done" | "finalised";

export interface AppraisalCycleView {
  id: string;
  name: string;
  status: CycleStatus;
  periodStart: DisplayDate;
  periodEnd: DisplayDate;
  opensOn: DisplayDate;
  selfDueOn: DisplayDate;
  managerDueOn: DisplayDate;
  closesOn: DisplayDate;
  eligibleJoinedBy: DisplayDate;
  eligible: number;
  selfDone: number;
  finalised: number;
  progressText: string;
}

export interface SalaryOutcome {
  from: MoneyText;
  to: MoneyText;
  increase: MoneyText;
  effectiveOn: DisplayDate;
  text: string;
}

export interface AppraisalView {
  id: string;
  cycleId: string;
  employeeId: string;
  employeeName: string;
  title: string;
  reviewerId: string | null;
  reviewerName: string;
  status: AppraisalStatus;
  statusText: string;
  selfRating: number | null;
  rating: number | null;
  ratingText: string;
  finalisedOn: DisplayDate | null;
  comment: string;
  /** Only where a pay change was recorded (the back-pay case). */
  salaryOutcome: SalaryOutcome | null;
}

export type GoalKind = "individual" | "department" | "probation";
export type GoalStatus = "done" | "on-track" | "at-risk";

export interface GoalView {
  id: string;
  kind: GoalKind;
  employeeId: string | null;
  employeeName: string | null;
  departmentId: string;
  departmentText: string;
  title: string;
  unit: string;
  target: number;
  current: number;
  progressPct: number;
  progressText: string;
  status: GoalStatus;
  statusText: string;
  weight: number;
  dueOn: DisplayDate;
}

export interface DepartmentPerformance {
  departmentId: string;
  departmentText: string;
  headcount: number;
  rated: number;
  averageRating: number;
  averageText: string;
  goals: number;
  goalsDone: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  text: string;
}

export interface ProbationScores { attendance: number; quality: number;
  teamwork: number; learning: number }

export interface ProbationEvaluationView {
  id: string;
  employeeId: string;
  employeeName: string;
  title: string;
  joiningDate: DisplayDate;
  probationEnd: DisplayDate;
  /** The engine's last day for the employer's probation notice. */
  decideBy: DisplayDate;
  status: "confirmed" | "in-progress";
  statusText: string;
  evaluatorId: string | null;
  evaluatorName: string;
  scores: ProbationScores | null;
  averageText: string | null;
  evaluatedOn: DisplayDate | null;
  nextStep: DisplayDate | null;
  nextStepText: string;
  notes: string[];
}

export interface TeamData {
  chart: OrgChartNode;
  positions: StaffPosition[];
  cycles: AppraisalCycleView[];
  appraisals: AppraisalView[];
  goals: GoalView[];
  probation: ProbationEvaluationView[];
}

const GM_JOB = "general-manager";
const BOARD_TEXT = "Board chair (outside this demo)";

const nameOf = (es: readonly DemoEmployee[], id: string | null): string =>
  id === null ? BOARD_TEXT : es.find((e) => e.id === id)!.fullName;

function chartOf(es: readonly DemoEmployee[]): OrgChartNode {
  const live = es.filter((e) => activeOn(e, AS_OF));
  const kids = new Map<string, DemoEmployee[]>();
  for (const e of live) {
    const m = managerIdFor(es, e);
    if (m !== null) kids.set(m, [...(kids.get(m) ?? []), e]);
  }
  const node = (e: DemoEmployee): OrgChartNode => ({ employeeId: e.id,
    name: e.fullName, title: jobTitleText(e.jobKey),
    departmentText: departmentText(e.departmentId),
    locationText: placeText(e.location), grade: e.grade,
    children: (kids.get(e.id) ?? []).sort((a, b) => b.grade - a.grade ||
      (a.id < b.id ? -1 : 1)).map(node) });
  return node(live.find((e) => e.jobKey === GM_JOB)!);
}

function positionsOf(c: DemoCompany): StaffPosition[] {
  const es = c.employees;
  const band = (g: number) => ({ basicMin: moneyText(GRADE_BASIC[g]!),
    basicMax: moneyText(GRADE_BASIC[g]! + 8n * BASIC_STEP) });
  const mk = (p: Omit<StaffPosition, "title" | "departmentText" |
    "locationText" | "basicMin" | "basicMax" | "statusText" |
    "summary">): StaffPosition => {
    const title = jobTitleText(p.jobKey);
    const statusText = { filled: "Filled", vacant: "Vacant",
      "on-hold": "On hold" }[p.status];
    return { ...p, title, departmentText: departmentText(p.departmentId),
      locationText: placeText(p.location), ...band(p.grade), statusText,
      summary: `${title}, ${placeText(p.location)}: ` +
        statusText.toLowerCase() + (p.incumbentName !== null
          ? ` (${p.incumbentName})` : p.formerIncumbentName !== null
            ? ` (was ${p.formerIncumbentName})` : "") };
  };
  const seats = es.map((e) => {
    const gone = e.leavingDate !== null && e.leavingDate < AS_OF;
    const boss = managerIdFor(es, e);
    const req = gone ? requisitionViews(c).find((r) =>
      r.replacesEmployeeId === e.id) : undefined;
    return mk({ id: positionIdOf(e.id), jobKey: e.jobKey,
      departmentId: e.departmentId, location: e.location, grade: e.grade,
      status: gone ? "vacant" : "filled",
      incumbentId: gone ? null : e.id,
      incumbentName: gone ? null : e.fullName,
      formerIncumbentName: gone ? e.fullName : null,
      reportsToPositionId: boss === null ? null : positionIdOf(boss),
      requisitionId: req?.id ?? null,
      vacantSince: gone ? shortDateOf(addDays(e.leavingDate!, 1)) : null,
      pendingHire: null });
  });
  const added = requisitionViews(c).flatMap((r) => r.positionIds
    .filter((id) => id.startsWith("pos-new-")).map((id, i) => {
      const offer = movesDataOf(c).offers.find((o) =>
        o.requisitionId === r.id && o.status === "accepted");
      const join = offer !== undefined && i === 0;
      return mk({ id, jobKey: r.jobKey, departmentId: r.departmentId,
        location: r.location, grade: r.grade,
        status: r.status === "on-hold" ? "on-hold" : "vacant",
        incumbentId: null, incumbentName: null, formerIncumbentName: null,
        reportsToPositionId: positionIdOf(r.hiringManagerId),
        requisitionId: r.id, vacantSince: null,
        pendingHire: join ? `${offer.candidateName} joins on ` +
          offer.joiningDate.display : null });
    }));
  return [...seats, ...added];
}

const RATING_TEXT = ["", "Needs improvement", "Partly meets expectations",
  "Meets expectations", "Exceeds expectations", "Outstanding"];
const COMMENTS = ["", "A plan to improve is agreed with the manager.",
  "Some goals met; support agreed for the rest.",
  "Steady work, goals met.", "Goals met and some exceeded.",
  "Goals clearly exceeded; a role model for the team."];

/** A fixed pattern from the roster position: no randomness. */
const ratingOf = (i: number, salt: number): number => {
  const r = (i * 7 + salt * 5) % 20;
  return r < 1 ? 2 : r < 8 ? 3 : r < 17 ? 4 : 5;
};

interface CycleSpec { id: string; name: string; start: string; end: string;
  opens: string; selfDue: string; mgrDue: string; closes: string;
  joinedBy: string; open: boolean; salt: number }

const CYCLES: readonly CycleSpec[] = [
  { id: "cyc-2025", name: "Annual review 2025", start: "2025-01-01",
    end: "2025-12-31", opens: "2026-01-12", selfDue: "2026-01-30",
    mgrDue: "2026-02-13", closes: "2026-02-27", joinedBy: "2025-06-30",
    open: false, salt: 1 },
  { id: "cyc-2026-mid", name: "Mid-year review 2026", start: "2026-01-01",
    end: "2026-06-30", opens: "2026-07-01", selfDue: "2026-07-17",
    mgrDue: "2026-07-24", closes: "2026-07-31", joinedBy: "2025-12-31",
    open: false, salt: 2 },
  { id: "cyc-2026", name: "Annual review 2026", start: "2026-01-01",
    end: "2026-12-31", opens: "2026-10-01", selfDue: "2026-11-13",
    mgrDue: "2026-12-04", closes: "2026-12-18", joinedBy: "2026-06-30",
    open: true, salt: 3 }];

const inCycle = (e: DemoEmployee, cy: CycleSpec): boolean =>
  e.joiningDate <= cy.joinedBy &&
  (e.leavingDate === null || e.leavingDate > cy.end);

function appraisalsOf(es: readonly DemoEmployee[]): AppraisalView[] {
  return CYCLES.flatMap((cy) => es.filter((e) => inCycle(e, cy))
    .map((e) => {
      const i = es.indexOf(e);
      const boss = managerIdFor(es, e);
      const base = { id: `apr-${cy.id}-${e.id}`, cycleId: cy.id,
        employeeId: e.id, employeeName: e.fullName,
        title: jobTitleText(e.jobKey), reviewerId: boss,
        reviewerName: nameOf(es, boss) };
      if (cy.open) {
        const done = i % 5 < 3;
        return { ...base, status: done ? "self-done" as const
          : "not-started" as const,
        statusText: done ? "Self-assessment sent, waiting for the manager"
          : "Self-assessment not started",
        selfRating: done ? ratingOf(i, 9) : null, rating: null,
        ratingText: "Not rated yet", finalisedOn: null, comment: "",
        salaryOutcome: null };
      }
      const raise = cy.id === "cyc-2026-mid" &&
        e.cases.includes("back-pay");
      const rating = raise ? 5 : ratingOf(i, cy.salt);
      const done = addDays(cy.closes, -(i % 7));
      const outcome: SalaryOutcome | null = raise ? {
        from: moneyText(e.basicMonthly - BACK_PAY_RAISE),
        to: moneyText(e.basicMonthly),
        increase: moneyText(BACK_PAY_RAISE),
        effectiveOn: shortDateOf("2026-09-01"),
        text: `Basic salary up by ${formatAed(fils(BACK_PAY_RAISE))} ` +
          "from 1 Sep 2026; entered after the September run (see back pay)",
      } : null;
      return { ...base, status: "finalised" as const,
        statusText: `Finalised on ${shortDateText(done)}`,
        selfRating: Math.min(5, rating + (i % 2)), rating,
        ratingText: RATING_TEXT[rating]!, finalisedOn: shortDateOf(done),
        comment: COMMENTS[rating]!, salaryOutcome: outcome };
    }));
}

function cyclesOf(rows: AppraisalView[]): AppraisalCycleView[] {
  return CYCLES.map((cy) => {
    const mine = rows.filter((a) => a.cycleId === cy.id);
    const fin = mine.filter((a) => a.status === "finalised").length;
    const self = mine.filter((a) => a.status !== "not-started").length;
    return { id: cy.id, name: cy.name,
      status: cy.open ? "open" : "closed",
      periodStart: shortDateOf(cy.start), periodEnd: shortDateOf(cy.end),
      opensOn: shortDateOf(cy.opens), selfDueOn: shortDateOf(cy.selfDue),
      managerDueOn: shortDateOf(cy.mgrDue), closesOn: shortDateOf(cy.closes),
      eligibleJoinedBy: shortDateOf(cy.joinedBy), eligible: mine.length,
      selfDone: self, finalised: fin,
      progressText: `${self} of ${mine.length} self-assessments in, ` +
        `${fin} finalised` };
  });
}

/** [title, target, unit]: three yearly goals for each department. */
const GOAL_TEMPLATES: Record<string, [string, number, string][]> = {
  "dept-exec": [["Management reports on time", 100, "%"],
    ["Regulator queries answered in 5 days", 95, "%"],
    ["Staff engagement score", 75, "%"]],
  "dept-retail": [["Customer queries solved the same day", 95, "%"],
    ["New savings accounts opened", 600, "accounts"],
    ["Counter errors corrected the same day", 98, "%"]],
  "dept-corp": [["New corporate clients onboarded", 18, "clients"],
    ["Client reviews held on schedule", 90, "%"],
    ["Credit applications sent complete", 95, "%"]],
  "dept-ops": [["Payments sent before the daily cut-off", 99, "%"],
    ["Reconciliation breaks cleared in 2 days", 95, "%"],
    ["Archive requests answered in a day", 90, "%"]],
  "dept-credit": [["Credit files reviewed within 5 days", 92, "%"],
    ["Watch-list accounts reviewed each month", 100, "%"],
    ["Model data checks completed", 4, "checks"]],
  "dept-compliance": [["AML alerts closed within 3 days", 95, "%"],
    ["Staff trained on AML rules", 100, "%"],
    ["Regulatory returns filed on time", 100, "%"]],
  "dept-fin": [["Month-end closes within 5 working days", 95, "%"],
    ["Supplier invoices paid on time", 97, "%"],
    ["Budget variances explained", 100, "%"]],
  "dept-hr": [["Pay runs signed off before the cut-off", 100, "%"],
    ["Joiner checklists done within 30 days", 95, "%"],
    ["Appraisal forms finished on time", 100, "%"]],
  "dept-it": [["Core system availability", 99, "%"],
    ["Access requests closed in 2 days", 95, "%"],
    ["Security patches applied on time", 100, "%"]] };

/** Whole days into 2026 as a share of the year, as a percentage. */
const PACE_PCT = Math.floor(daysBetween("2026-01-01", AS_OF) * 100 / 364);
const PACE_SLACK = 10;
const YEAR_END = "2026-12-31";

const statusOf = (pct: number): GoalStatus => pct >= 100 ? "done"
  : pct >= PACE_PCT - PACE_SLACK ? "on-track" : "at-risk";
const STATUS_TEXT: Record<GoalStatus, string> = { done: "Done",
  "on-track": "On track", "at-risk": "At risk" };

function progressText(current: number, target: number, unit: string) {
  return unit === "%" ? `${current}% against a target of ${target}%`
    : `${current} of ${target} ${unit}`;
}

function goalOf(id: string, kind: GoalKind, e: DemoEmployee | null,
  dept: string, tpl: [string, number, string], p: number, weight: number,
  dueOn: string): GoalView {
  const [title, target, unit] = tpl;
  const current = Math.floor(target * p / 100);
  const pct = Math.min(100, Math.floor(current * 100 / target));
  const status = statusOf(pct);
  return { id, kind, employeeId: e?.id ?? null,
    employeeName: e?.fullName ?? null, departmentId: dept,
    departmentText: departmentText(dept), title, unit, target, current,
    progressPct: pct, progressText: progressText(current, target, unit),
    status, statusText: STATUS_TEXT[status], weight,
    dueOn: shortDateOf(dueOn) };
}

function goalsOf(es: readonly DemoEmployee[],
  c: DemoCompany): GoalView[] {
  const depts = c.departments.map((d) => d.id);
  const dept = depts.flatMap((d, di) => GOAL_TEMPLATES[d]!.map((t, k) =>
    goalOf(`goal-${d.slice(5)}-${k + 1}`, "department", null, d, t,
      62 + ((di * 17 + k * 31) % 39), 0, YEAR_END)));
  const cy = CYCLES[2]!;
  const mine = es.filter((e) => inCycle(e, cy)).flatMap((e) => {
    const i = es.indexOf(e);
    const a = i % 3;
    return [a, (a + 1) % 3].map((t, k) => goalOf(`goal-${e.id}-${k + 1}`,
      "individual", e, e.departmentId, GOAL_TEMPLATES[e.departmentId]![t]!,
      62 + ((i * 13 + k * 29) % 39), k === 0 ? 60 : 40, YEAR_END));
  });
  return [...dept, ...mine, ...probationGoals(es)];
}

function probationGoals(es: readonly DemoEmployee[]): GoalView[] {
  const e = es.find((x) => x.cases.includes("probation"))!;
  const j = e.joiningDate;
  const mk = (k: number, title: string, current: number, due: string,
    done: boolean): GoalView => {
    const status: GoalStatus = done ? "done" : due >= AS_OF ? "on-track"
      : "at-risk";
    return { id: `goal-${e.id}-p${k}`, kind: "probation", employeeId: e.id,
      employeeName: e.fullName, departmentId: e.departmentId,
      departmentText: departmentText(e.departmentId), title, unit: "step",
      target: 1, current, progressPct: current * 100,
      progressText: progressText(current, 1, "step"), status,
      statusText: STATUS_TEXT[status], weight: 50,
      dueOn: shortDateOf(due) };
  };
  return [mk(1, "Finish the branch induction", 1, addDays(j, 4), true),
    mk(2, "Pass the teller system test", 0, addDays(j, 30), false)];
}

function probationOf(c: DemoCompany): ProbationEvaluationView[] {
  const es = c.employees;
  return es.filter((e) => e.probationEndDate !== null).map((e) => {
    const i = es.indexOf(e);
    const end = e.probationEndDate!;
    const boss = managerIdFor(es, e);
    const engine = calculateProbation({ joiningDate: e.joiningDate,
      probationMonths: e.probationMonths }, EMPLOYMENT_PACKS).value;
    const base = { id: `prob-${e.id}`, employeeId: e.id,
      employeeName: e.fullName, title: jobTitleText(e.jobKey),
      joiningDate: shortDateOf(e.joiningDate),
      probationEnd: shortDateOf(end),
      decideBy: shortDateOf(engine.employerNoticeDeadline!),
      evaluatorId: boss, evaluatorName: nameOf(es, boss) };
    if (end < AS_OF) {
      const s = (k: number) => 3 + ((i * 5 + k * 3 + 1) % 3);
      const scores = { attendance: s(1), quality: s(2), teamwork: s(3),
        learning: s(4) };
      const avg = (scores.attendance + scores.quality + scores.teamwork +
        scores.learning) / 4;
      const on = addDays(end, -7);
      return { ...base, status: "confirmed" as const,
        statusText: `Confirmed on ${shortDateText(on)}`, scores,
        averageText: `${avg.toFixed(2)} out of 5`,
        evaluatedOn: shortDateOf(on), nextStep: null,
        nextStepText: "Nothing to do: probation ended on " +
          shortDateText(end), notes: [] };
    }
    const check = addDays(e.joiningDate, 30);
    const sick = c.leaveRequests.find((r) => r.employeeId === e.id &&
      r.leaveTypeId === "lt-sick" && r.status === "approved");
    const ts = c.timesheets.find((t) => t.employeeId === e.id);
    return { ...base, status: "in-progress" as const,
      statusText: "In probation, no evaluation yet", scores: null,
      averageText: null, evaluatedOn: null, nextStep: shortDateOf(check),
      nextStepText: "30-day check-in with the line manager on " +
        shortDateText(check),
      notes: [
        ...(ts === undefined ? [] : [`October so far: ${ts.presentDays} ` +
          `days present, ${plural(ts.leaveDays, "day", "days")} on leave`]),
        ...(sick === undefined ? [] : [`1 sick day on ` +
          `${shortDateText(sick.startDate)}, unpaid in probation (see ` +
          "the pay run)"]),
        `Decide by ${shortDateText(engine.employerNoticeDeadline!)}: ` +
        "after that the employer's notice period applies (Decree-Law " +
        "33/2021 Art 9, as read in our notes)"] };
  });
}

const cache = new WeakMap<object, TeamData>();

/** All WP2 data for one demo company (built once, then reused). */
export function teamDataOf(c: DemoCompany): TeamData {
  const hit = cache.get(c);
  if (hit !== undefined) return hit;
  const appraisals = appraisalsOf(c.employees);
  const data = { chart: chartOf(c.employees),
    positions: positionsOf(c), cycles: cyclesOf(appraisals),
    appraisals, goals: goalsOf(c.employees, c),
    probation: probationOf(c) };
  cache.set(c, data);
  return data;
}

export const orgChart = (c: DemoCompany): OrgChartNode =>
  teamDataOf(c).chart;

function find(n: OrgChartNode, id: string): OrgChartNode | null {
  if (n.employeeId === id) return n;
  for (const k of n.children) {
    const hit = find(k, id);
    if (hit !== null) return hit;
  }
  return null;
}

const personOf = (n: OrgChartNode): OrgPerson =>
  ({ employeeId: n.employeeId, name: n.name, title: n.title });

export function directReportsOf(c: DemoCompany, employeeId: string)
  : OrgPerson[] {
  return (find(orgChart(c), employeeId)?.children ?? []).map(personOf);
}

/** From the person's own manager up to the General Manager. */
export function reportingLineOf(c: DemoCompany, employeeId: string)
  : OrgPerson[] {
  const path: OrgChartNode[] = [];
  const walk = (n: OrgChartNode, trail: OrgChartNode[]): boolean => {
    if (n.employeeId === employeeId) {
      path.push(...trail);
      return true;
    }
    return n.children.some((k) => walk(k, [n, ...trail]));
  };
  walk(orgChart(c), []);
  return path.map(personOf);
}

export const positionViews = (c: DemoCompany): StaffPosition[] =>
  teamDataOf(c).positions;

export function positionsByDepartment(c: DemoCompany): DepartmentSeats[] {
  const ps = positionViews(c);
  return c.departments.map((d) => {
    const mine = ps.filter((p) => p.departmentId === d.id);
    const n = (s: PositionStatus) => mine.filter((p) =>
      p.status === s).length;
    const [filled, vacant, onHold] = [n("filled"), n("vacant"),
      n("on-hold")];
    return { departmentId: d.id, departmentText: departmentText(d.id),
      budgeted: filled + vacant, filled, vacant, onHold,
      text: `${filled} filled, ${vacant} vacant` +
        (onHold === 0 ? "" : `, ${onHold} on hold`) };
  });
}

export function staffAcrossSites(c: DemoCompany): SiteStaff[] {
  const live = c.employees.filter((e) => activeOn(e, AS_OF));
  return LOCATIONS.map((location) => {
    const here = live.filter((e) => e.location === location);
    const byDepartment = c.departments.map((d) => ({ departmentId: d.id,
      departmentText: departmentText(d.id),
      count: here.filter((e) => e.departmentId === d.id).length }))
      .filter((x) => x.count > 0);
    return { location, locationText: placeText(location),
      headcount: here.length, byDepartment,
      text: `${plural(here.length, "person", "people")} in ` +
        `${plural(byDepartment.length, "department", "departments")}` };
  });
}

/** One cost centre per department; the gross is the run's own. */
export function costCentreViews(c: DemoCompany): CostCentreView[] {
  return costByDepartment(c).map((d, i) => ({ code: `CC-${100 + i * 10}`,
    departmentId: d.departmentId, departmentText:
    departmentText(d.departmentId), payslips: d.headcount,
    monthlyGross: moneyText(d.gross) }));
}

export function peopleOverview(c: DemoCompany): PeopleOverview {
  const es = c.employees;
  const month = AS_OF.slice(0, 7);
  const who = (e: DemoEmployee, iso: string) => ({ employeeId: e.id,
    name: e.fullName, on: shortDateOf(iso) });
  const joined = es.filter((e) => e.joiningDate.startsWith(month) &&
    e.joiningDate <= AS_OF).map((e) => who(e, e.joiningDate));
  const left = es.filter((e) => e.leavingDate !== null &&
    e.leavingDate.startsWith(month) && e.leavingDate <= AS_OF)
    .map((e) => who(e, e.leavingDate!));
  const probation = es.filter((e) => activeOn(e, AS_OF) &&
    e.probationEndDate !== null && e.probationEndDate >= AS_OF).length;
  const vac = vacancyViews(c).length;
  const upcoming = movesDataOf(c).joiners.filter((j) =>
    j.joiningDate.iso > AS_OF).length;
  return { asOf: shortDateOf(AS_OF), headcount: c.nationalities.headcount,
    headcountText: c.nationalities.headcountText,
    uaeNationals: c.nationalities.uaeNationals, onProbation: probation,
    joinedThisMonth: joined, leftThisMonth: left, openVacancies: vac,
    upcomingJoiners: upcoming,
    byNationality: c.nationalities.byNationality.map((x) => ({ ...x })),
    text: `${c.nationalities.headcountText}; ${plural(joined.length,
      "joiner", "joiners")} and ${plural(left.length, "leaver",
      "leavers")} this month, ${plural(vac, "open vacancy",
      "open vacancies")}` };
}

export const appraisalCycleViews = (c: DemoCompany): AppraisalCycleView[] =>
  teamDataOf(c).cycles;

export function appraisalViews(c: DemoCompany, f: { cycleId?: string;
  employeeId?: string } = {}): AppraisalView[] {
  return teamDataOf(c).appraisals.filter((a) =>
    (f.cycleId === undefined || a.cycleId === f.cycleId) &&
    (f.employeeId === undefined || a.employeeId === f.employeeId));
}

export function goalViews(c: DemoCompany, f: { kind?: GoalKind;
  employeeId?: string; departmentId?: string } = {}): GoalView[] {
  return teamDataOf(c).goals.filter((g) =>
    (f.kind === undefined || g.kind === f.kind) &&
    (f.employeeId === undefined || g.employeeId === f.employeeId) &&
    (f.departmentId === undefined || g.departmentId === f.departmentId));
}

/** Mid-year 2026 ratings and this year's goals, per department. */
export function departmentPerformance(c: DemoCompany)
  : DepartmentPerformance[] {
  const mid = appraisalViews(c, { cycleId: "cyc-2026-mid" });
  const deptOf = new Map(c.employees.map((e) => [e.id, e.departmentId]));
  return c.departments.map((d) => {
    const rated = mid.filter((a) => deptOf.get(a.employeeId) === d.id);
    const sum = rated.reduce((n, a) => n + a.rating!, 0);
    const avg = rated.length === 0 ? 0
      : Math.round(sum * 100 / rated.length) / 100;
    const goals = teamDataOf(c).goals.filter((g) =>
      g.departmentId === d.id && g.kind !== "probation");
    const n = (s: GoalStatus) => goals.filter((g) => g.status === s).length;
    const head = c.employees.filter((e) => e.departmentId === d.id &&
      activeOn(e, AS_OF)).length;
    const averageText = rated.length === 0 ? "No ratings yet"
      : `${avg.toFixed(2)} out of 5`;
    return { departmentId: d.id, departmentText: departmentText(d.id),
      headcount: head, rated: rated.length, averageRating: avg,
      averageText, goals: goals.length, goalsDone: n("done"),
      goalsOnTrack: n("on-track"), goalsAtRisk: n("at-risk"),
      text: `${averageText} (mid-year), ${n("at-risk")} of ` +
        `${goals.length} goals at risk` };
  });
}

export const probationEvaluationViews = (c: DemoCompany)
  : ProbationEvaluationView[] => teamDataOf(c).probation;

/** A manager's people in probation or just confirmed (E11, P19). */
export function teamProbationOf(c: DemoCompany, managerId: string)
  : ProbationEvaluationView[] {
  return probationEvaluationViews(c).filter((x) =>
    x.evaluatorId === managerId).sort((a, b) =>
    (a.status === b.status ? 0 : a.status === "in-progress" ? -1 : 1));
}
