import {
  addDays,
  calculatePayslip,
  daysBetween,
  DEFAULT_PAYROLL_PACKS,
  fils,
  isValidIsoDate,
  type Allowance,
  type Fils,
  type PayslipInput,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import { plural, type DisplayDate } from "./display";
import { payslipInput } from "./pay-inputs";
import { payslipWithoutPension } from "./pension";
import { BASIC_STEP, GRADE_BASIC, GRADE_TRANSPORT } from "./roster-data";
import type { DemoCompany, DemoEmployee } from "./types";
import {
  departmentText,
  jobTitleText,
  managerIdFor,
  movesDataOf,
  placeText,
  shortDateOf,
  shortDateText,
  type CandidateStage,
  type HiringOffer,
  type OfferStatus,
} from "./wp3";
import { jobCatalogue } from "./wpd-structure";
import { reportMonth } from "./wp7";

/**
 * WPE hiring: the hiring budget (positions management has budgeted,
 * P20 renamed) and hiring requests from "Request a hire" to an open
 * position with a timeline (P10). FICTIONAL. Every seat is one the
 * position list already has (the four requisitions); the two requests
 * still in review ask for new seats, which exist only once the General
 * manager signs them off. Every amount is a payslip worked out by the
 * payroll engine; nothing here types a salary. Internal decisions are
 * "signed off" or "declined". Dates are display strings.
 */

const sum = (xs: readonly bigint[]): bigint => xs.reduce((n, x) => n + x, 0n);
const pad = (n: number): string => String(n).padStart(2, "0");
const isoOk = (s: string): boolean => /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  isValidIsoDate(s);

// ---------------------------------------------------------------
// The cost of a budgeted package (the payroll engine, 12 months)
// ---------------------------------------------------------------

/** The latest start date a request or a budget may name. */
export const HIRING_LAST_START = "2027-12-31";
/** Steps above the foot of a grade's band a budget may allow. */
export const BUDGET_MAX_STEPS = 8;

export interface PackagePart { code: string; label: string; monthly: Fils }

export interface PositionCost {
  grade: number;
  steps: number;
  basic: Fils;
  parts: PackagePart[];
  /** A full month's gross pay. */
  monthly: Fils;
  months: { month: string; label: string; gross: Fils; part: boolean }[];
  /** The first twelve payroll months from the start date. */
  firstYear: Fils;
  startText: string;
}

const PART_TEXT: Record<string, string> = { basic: "Basic salary",
  housing: "Housing allowance", transport: "Transport allowance",
  phone: "Phone allowance" };

/** The roster's own rule: housing 40% of basic, transport by grade. */
export function budgetPackage(grade: number, steps: number): { basic: Fils;
  allowances: Allowance[] } {
  const foot = GRADE_BASIC[grade];
  const transport = GRADE_TRANSPORT[grade];
  if (foot === undefined || transport === undefined) {
    throw new Error(`DEMO_NO_GRADE: ${grade}`);
  }
  const basic = foot + BASIC_STEP * BigInt(steps);
  const allowances: Allowance[] = [
    { code: "housing", kind: "housing", monthly: fils(basic * 40n / 100n) },
    { code: "transport", kind: "conveyance", monthly: fils(transport) }];
  if (grade >= 7) {
    allowances.push({ code: "phone", kind: "other", monthly: fils(50000n) });
  }
  return { basic: fils(basic), allowances };
}

/** The grade's basic pay band: its foot to eight steps above. */
export function salaryBand(grade: number): { min: Fils; max: Fils } {
  const foot = GRADE_BASIC[grade];
  if (foot === undefined) throw new Error(`DEMO_NO_GRADE: ${grade}`);
  return { min: fils(foot),
    max: fils(foot + BASIC_STEP * BigInt(BUDGET_MAX_STEPS)) };
}

function slip(template: DemoEmployee, pkg: { basic: Fils;
  allowances: Allowance[] }, start: string, national: boolean,
year: number, month: number) {
  const base = payslipInput(template, { year, month });
  const input: PayslipInput = { ...base, employee: { ...base.employee,
    workerClass: national ? "uae-national" : "expat-full-time",
    joiningDate: start, leavingDate: null, probationEndDate: null,
    basicMonthly: pkg.basic,
    allowances: pkg.allowances.map((a) => ({ ...a })) },
  absences: [], overtime: [], loans: [], restDayWork: [] };
  return national ? payslipWithoutPension(input).value
    : calculatePayslip(input, DEFAULT_PAYROLL_PACKS).value;
}

/** Twelve payroll months of one package from a start date. */
export function packageCost(c: DemoCompany, pkg: { basic: Fils;
  allowances: Allowance[] }, startIso: string, national = false,
grade = 0, steps = 0): PositionCost {
  if (!isoOk(startIso)) throw new Error(`DEMO_BAD_DATE: ${startIso}`);
  const template = c.employees.find((e) => e.cases.length === 0)!;
  const y0 = Number(startIso.slice(0, 4));
  const m0 = Number(startIso.slice(5, 7));
  const months = Array.from({ length: 12 }, (_, i) => {
    const total = (m0 - 1) + i;
    const year = y0 + Math.floor(total / 12);
    const month = (total % 12) + 1;
    const key = `${year}-${pad(month)}`;
    return { month: key, label: reportMonth(key),
      gross: slip(template, pkg, startIso, national, year, month).gross,
      part: i === 0 && Number(startIso.slice(8, 10)) > 1 };
  });
  const full = slip(template, pkg, "2000-01-01", national, y0, m0);
  return { grade, steps, basic: pkg.basic,
    parts: [{ code: "basic", label: PART_TEXT["basic"]!,
      monthly: pkg.basic }, ...pkg.allowances.map((a) => ({ code: a.code,
      label: PART_TEXT[a.code] ?? a.code, monthly: a.monthly }))],
    monthly: full.gross, months,
    firstYear: fils(sum(months.map((m) => m.gross))),
    startText: shortDateText(startIso) };
}

/** What a budget of grade and steps costs from a start date. */
export const positionCost = (c: DemoCompany, grade: number, steps: number,
  startIso: string): PositionCost =>
  packageCost(c, budgetPackage(grade, steps), startIso, false, grade, steps);

// ---------------------------------------------------------------
// The hiring budget (P20): positions management has budgeted
// ---------------------------------------------------------------

export type BudgetStatus = "budgeted" | "open" | "in-hiring" | "filled";

export const BUDGET_STATUS_TEXT: Record<BudgetStatus, string> = {
  budgeted: "Budgeted", open: "Open", "in-hiring": "In hiring",
  filled: "Filled" };

export type BudgetState = "signed-off" | "waiting";

const OPEN_STAGES: readonly CandidateStage[] = ["interview", "offer"];

/**
 * A seat's status from its requisition and candidates: on hold or no
 * requisition is Budgeted; an accepted offer or a hire is Filled; a
 * candidate at interview or offer is In hiring; else Open.
 */
export function budgetStatusOf(p: { requisition: "open" | "on-hold" |
  "filled" | null; stages: readonly CandidateStage[]; taken: boolean })
  : BudgetStatus {
  if (p.taken || p.requisition === "filled") return "filled";
  if (p.requisition === null || p.requisition === "on-hold") {
    return "budgeted";
  }
  return p.stages.some((s) => OPEN_STAGES.includes(s)) ? "in-hiring"
    : "open";
}

export interface SpendLine { label: string; amount: Fils; who: string }

export interface PositionBudget {
  /** "bud-pos-014": the position's own id after "bud-". */
  id: string;
  positionId: string;
  jobKey: string;
  title: string;
  departmentId: string;
  departmentText: string;
  locationText: string;
  grade: number;
  steps: number;
  gradeText: string;
  ownerId: string;
  ownerName: string;
  requisitionId: string | null;
  requestId: string | null;
  startIso: string;
  start: DisplayDate;
  cost: PositionCost;
  /** Accepted offers and holders: pay the company has agreed to. */
  committed: SpendLine | null;
  /** Offers sent or drafted, not yet accepted. */
  offered: SpendLine | null;
  /** First-year budget less committed and offered (may be below 0). */
  left: Fils;
  status: BudgetStatus;
  budgetState: BudgetState;
  signedOff: { id: string; name: string; on: DisplayDate } | null;
  note: string;
}

interface SeatSpec { positionId: string; requisitionId: string;
  steps: number; start: string | null; requestId: string;
  signedOn: string | null; note: string }

/** One budget per seat the position list has for a requisition. */
const SEATS: readonly SeatSpec[] = [
  { positionId: "", requisitionId: "req-001", steps: 0, start: null,
    requestId: "hreq-001", signedOn: "2026-07-10",
    note: "Filled: the new teller is on the payroll." },
  { positionId: "", requisitionId: "req-002", steps: 4,
    start: "2026-12-01", requestId: "hreq-002", signedOn: "2026-09-18",
    note: "Replaces the relationship manager who left; budgeted four " +
      "steps above the foot of the band for an experienced hire." },
  { positionId: "pos-new-1", requisitionId: "req-003", steps: 1,
    start: "2026-11-16", requestId: "hreq-003", signedOn: "2026-09-04",
    note: "First of two new seats for the 2027 lending plan." },
  { positionId: "pos-new-2", requisitionId: "req-003", steps: 1,
    start: "2026-12-01", requestId: "hreq-003", signedOn: "2026-09-04",
    note: "Second of two new seats for the 2027 lending plan." },
  { positionId: "pos-new-3", requisitionId: "req-004", steps: 0,
    start: "2027-02-01", requestId: "hreq-004", signedOn: null,
    note: "Waiting for the General manager to confirm the 2027 budget." },
];

const offerPackage = (o: HiringOffer) => ({ basic: o.basic,
  allowances: o.allowances.map((a) => ({ ...a })) });

const OFFER_WORD: Record<OfferStatus, string> = { draft: "Offer drafted",
  sent: "Offer sent", accepted: "Offer accepted", declined: "Declined" };

export function hiringBudget(c: DemoCompany): PositionBudget[] {
  const m = movesDataOf(c);
  const gm = c.employees.find((e) => e.jobKey === "general-manager")!;
  const hire = c.employees.find((e) => e.cases.includes("probation"))!;
  const leaver = c.employees.find((e) => e.cases.includes("leaver"))!;
  return SEATS.map((s, i) => {
    const r = m.requisitions.find((x) => x.id === s.requisitionId)!;
    const positionId = s.positionId !== "" ? s.positionId
      : r.positionIds[0]!;
    const offers = m.offers.filter((o) => o.requisitionId === r.id &&
      o.status !== "declined");
    // Seats of one requisition take its live offers in order.
    const sameReq = SEATS.filter((x) => x.requisitionId === r.id);
    const offer = offers[sameReq.indexOf(s)] ?? null;
    const startIso = s.start ?? hire.joiningDate;
    const cost = positionCost(c, r.grade, s.steps, startIso);
    let committed: SpendLine | null = null;
    let offered: SpendLine | null = null;
    if (r.id === "req-001") {
      const pay = packageCost(c, { basic: fils(hire.basicMonthly),
        allowances: hire.allowances.map((a) => ({ ...a })) },
      hire.joiningDate);
      committed = { label: "On the payroll", amount: pay.firstYear,
        who: hire.fullName };
    } else if (offer !== null) {
      const pay = packageCost(c, offerPackage(offer), offer.joiningDate.iso);
      const line = { label: OFFER_WORD[offer.status], amount: pay.firstYear,
        who: offer.candidateName };
      if (offer.status === "accepted") committed = line;
      else offered = line;
    }
    const stages = m.candidates.filter((x) => x.requisitionId === r.id)
      .map((x) => x.stage);
    const taken = r.id === "req-001" || offer?.status === "accepted";
    const status = budgetStatusOf({ requisition: r.status,
      stages: offer === null && sameReq.indexOf(s) > 0 ? [] : stages,
      taken });
    const left = fils(cost.firstYear - (committed?.amount ?? 0n) -
      (offered?.amount ?? 0n));
    return { id: `bud-${positionId}`, positionId, jobKey: r.jobKey,
      title: r.title, departmentId: r.departmentId,
      departmentText: r.departmentText, locationText: r.locationText,
      grade: r.grade, steps: s.steps,
      gradeText: stepText(r.grade, s.steps),
      ownerId: r.hiringManagerId, ownerName: r.hiringManagerName,
      requisitionId: r.id, requestId: s.requestId, startIso,
      start: shortDateOf(startIso), cost, committed, offered, left, status,
      budgetState: s.signedOn === null ? "waiting" : "signed-off",
      signedOff: s.signedOn === null ? null : { id: gm.id,
        name: gm.fullName, on: shortDateOf(s.signedOn) },
      note: i === 1 ? `${s.note} ${leaver.fullName} left on ` +
        `${shortDateText(leaver.leavingDate!)}.` : s.note };
  });
}

export const stepText = (grade: number, steps: number): string =>
  steps === 0 ? `Grade ${grade}, foot of the band`
    : `Grade ${grade}, ${plural(steps, "step", "steps")} up`;

export interface BudgetTotals {
  positions: number;
  firstYear: Fils;
  committed: Fils;
  offered: Fils;
  left: Fils;
}

export function budgetTotals(rows: readonly { cost: { firstYear: Fils };
  committed: SpendLine | null; offered: SpendLine | null }[]): BudgetTotals {
  const firstYear = sum(rows.map((r) => r.cost.firstYear));
  const committed = sum(rows.map((r) => r.committed?.amount ?? 0n));
  const offered = sum(rows.map((r) => r.offered?.amount ?? 0n));
  return { positions: rows.length, firstYear: fils(firstYear),
    committed: fils(committed), offered: fils(offered),
    left: fils(firstYear - committed - offered) };
}

export const HIRING_BUDGET_BASIS = "Each position's budget is set by the " +
  "General manager as a grade and a step in its pay band. The first " +
  "year is twelve payroll months of gross pay from the start date, " +
  "worked out like a payslip; the first month is part of a month when " +
  "the start is not the first. Committed is pay agreed (a holder or an " +
  "accepted offer); offered is an offer not yet accepted. Visa, " +
  "medical, insurance and gratuity are not included. Pension: Not " +
  "computed.";

/** A seeded ask from HR to change a budget, waiting for the GM. */
export interface BudgetAskSeed {
  id: string;
  budgetId: string;
  grade: number;
  steps: number;
  reason: string;
  askedById: string;
  askedByName: string;
  askedOn: DisplayDate;
}

export function budgetAskSeeds(c: DemoCompany): BudgetAskSeed[] {
  const hr = c.employees.find((e) => e.jobKey === "hr-manager")!;
  return [{ id: "bask-001", budgetId: "bud-pos-014", grade: 7, steps: 6,
    reason: "Two candidates asked for more than the budget allows. " +
      "Two more steps keep the strongest in the process.",
    askedById: hr.id, askedByName: hr.fullName,
    askedOn: shortDateOf("2026-10-24") }];
}

// ---------------------------------------------------------------
// Hiring requests (P10): "Request a hire" to an open position
// ---------------------------------------------------------------

export type RequestStatus = "with-hr" | "changes" | "with-gm" | "open" |
  "on-hold" | "declined" | "withdrawn" | "filled";

export const REQUEST_STATUS_TEXT: Record<RequestStatus, string> = {
  "with-hr": "With HR", changes: "Changes asked", "with-gm":
    "Waiting for sign-off", open: "Open position", "on-hold": "On hold",
  declined: "Declined", withdrawn: "Withdrawn", filled: "Filled" };

export type Urgency = "normal" | "high" | "urgent";
export const URGENCY_TEXT: Record<Urgency, string> = { normal: "Normal",
  high: "High", urgent: "Urgent" };

export interface InterviewStage { name: string;
  panel: { id: string; name: string }[] }

export interface RequestEvent {
  id: string;
  byId: string;
  name: string;
  /** "HR manager", "General manager". */
  title: string;
  on: DisplayDate;
  /** The status the step moved to; null for a message. */
  to: RequestStatus | null;
  /** "Raised the request", "Signed off", or the message itself. */
  text: string;
}

export interface HiringRequestView {
  id: string;
  number: string;
  jobKey: string;
  title: string;
  departmentId: string;
  departmentText: string;
  locationText: string;
  /** A budgeted position it fills, or null for a new position. */
  budgetId: string | null;
  requisitionId: string | null;
  reason: "new" | "replacement";
  replacesName: string | null;
  headcount: number;
  startIso: string;
  start: DisplayDate;
  urgency: Urgency;
  timeToFillDays: number;
  grade: number;
  jobDescription: string;
  mustHave: string[];
  niceToHave: string[];
  stages: InterviewStage[];
  raisedById: string;
  raisedByName: string;
  raisedOn: DisplayDate;
  hiringManagerId: string;
  hiringManagerName: string;
  status: RequestStatus;
  /** When the GM signed it off (the timeline counts from here). */
  signedOffIso: string | null;
  /** Steps and messages, oldest first. */
  events: RequestEvent[];
}

const FAMILY: Record<string, string> = { teller: "branch",
  "customer-service-officer": "branch", "branch-manager": "branch",
  "relationship-manager": "corporate", "relationship-officer": "corporate",
  "head-of-corporate": "corporate", "credit-analyst": "credit",
  "credit-risk-manager": "credit", "systems-engineer": "it",
  "it-manager": "it", "operations-officer": "operations",
  "payments-officer": "operations", "operations-manager": "operations",
  "archive-clerk": "operations", "compliance-officer": "compliance",
  "aml-analyst": "compliance", accountant: "finance",
  "finance-manager": "finance", "hr-officer": "hr", "hr-manager": "hr" };

const DUTIES: Record<string, string[]> = {
  branch: ["Serve customers at the counter, in person and by phone.",
    "Handle cash and payments accurately and balance at day end.",
    "Explain accounts and services in plain words."],
  corporate: ["Look after a book of corporate clients.",
    "Prepare credit requests with the credit team.",
    "Meet clients often and keep the client file up to date."],
  credit: ["Analyse financial statements and cash flow.",
    "Write credit papers with a clear recommendation.",
    "Review covenants and flag early warning signs."],
  it: ["Run and patch the bank's servers and core systems.",
    "Look after user access and backups.",
    "Fix incidents and write down what was done."],
  operations: ["Process payments and transfers on time.",
    "Check every instruction against the client's mandate.",
    "Keep the records and the daily reconciliations in order."],
  compliance: ["Review alerts and customer files for risk.",
    "Write clear case notes and escalate where needed.",
    "Keep policies and checklists current."],
  finance: ["Post entries and close the month on time.",
    "Reconcile accounts and explain differences.",
    "Prepare reports for the finance manager."],
  hr: ["Keep employee records and documents current.",
    "Support hiring, joining and leaving.",
    "Answer staff questions in plain words."],
};

const MUST: Record<string, string[]> = {
  branch: ["Two years at a bank counter", "Arabic and English"],
  corporate: ["Five years in corporate banking", "A book of clients"],
  credit: ["Three years of credit analysis", "Strong with spreadsheets"],
  it: ["Three years running Linux and Windows servers",
    "Network basics"],
  operations: ["Two years in bank operations", "Accurate with detail"],
  compliance: ["Three years in compliance or AML",
    "Clear writing in English"],
  finance: ["A degree in accounting", "Two years closing the month"],
  hr: ["Two years in HR", "Knows UAE mainland employment practice"],
};

const NICE: Record<string, string[]> = {
  branch: ["Has sold savings products"],
  corporate: ["Knows trade finance"],
  credit: ["Has worked with SME lending"],
  it: ["Has run a core banking system"],
  operations: ["Knows the salary file process"],
  compliance: ["Has a recognised AML qualification"],
  finance: ["Has worked with payroll journals"],
  hr: ["Has run a payroll"],
};

const familyOf = (jobKey: string): string => FAMILY[jobKey] ?? "operations";

/** The template a job description starts from (editable text). */
export function jobDescriptionTemplate(jobKey: string, departmentId: string)
  : string {
  const title = jobTitleText(jobKey);
  const duties = DUTIES[familyOf(jobKey)]!;
  return [`${title}, ${departmentText(departmentId)}`, "",
    `About the role: you join the ${departmentText(departmentId)} team ` +
    `and report to its head.`, "", "What you will do:",
    ...duties.map((d) => `- ${d}`), "",
    "What we offer: a salary in the grade's band, housing and " +
    "transport allowances, health insurance and annual leave."]
    .join("\n");
}

export function criteriaTemplate(jobKey: string): { mustHave: string[];
  niceToHave: string[] } {
  const f = familyOf(jobKey);
  return { mustHave: [...MUST[f]!], niceToHave: [...NICE[f]!] };
}

/** Screening with HR, the hiring manager, then a final round. */
export function stagesTemplate(c: DemoCompany, hiringManagerId: string)
  : InterviewStage[] {
  const who = (id: string) => ({ id,
    name: c.employees.find((e) => e.id === id)!.fullName });
  const hr = c.employees.find((e) => e.jobKey === "hr-officer")!.id;
  const gm = c.employees.find((e) => e.jobKey === "general-manager")!.id;
  return [{ name: "Screening call", panel: [who(hr)] },
    { name: "Interview with the hiring manager",
      panel: [who(hiringManagerId), who(hr)] },
    { name: "Final interview", panel: hiringManagerId === gm
      ? [who(gm)] : [who(hiringManagerId), who(gm)] }];
}

/** Who leads hiring for a department: its head, else the GM. */
export function hiringManagerFor(c: DemoCompany, departmentId: string)
  : string {
  const top = c.employees.filter((e) => e.departmentId === departmentId &&
    e.leavingDate === null).sort((a, b) => b.grade - a.grade)[0];
  return top?.id ?? c.employees.find((e) =>
    e.jobKey === "general-manager")!.id;
}

interface EventSpec { by: string; on: string; to: RequestStatus | null;
  text: string }

interface RequestSpec { id: string; jobKey: string; dept: string;
  requisitionId: string | null; budgetId: string | null;
  reason: "new" | "replacement"; headcount: number; start: string;
  urgency: Urgency; ttf: number; status: RequestStatus;
  signed: string | null; raisedBy: string; events: EventSpec[] }

const TITLE: Record<string, string> = { hr: "HR manager",
  gm: "General manager" };

function requestSpecs(c: DemoCompany, managerId: string): RequestSpec[] {
  const m = movesDataOf(c);
  const r = (id: string) => m.requisitions.find((x) => x.id === id)!;
  const hr = c.employees.find((e) => e.jobKey === "hr-manager")!.id;
  const gm = c.employees.find((e) => e.jobKey === "general-manager")!.id;
  const mgr = c.employees.find((e) => e.id === managerId)!;
  const hire = c.employees.find((e) => e.cases.includes("probation"))!;
  const compliance = hiringManagerFor(c, "dept-compliance");
  const opsJob = jobCatalogue(c).find((j) =>
    j.departmentIds.includes(mgr.departmentId) && j.gradeMax < mgr.grade)
    ?? jobCatalogue(c).find((j) => j.jobKey === "operations-officer")!;
  const signed = (by: string, sent: string, on: string): EventSpec[] => [
    { by: hr, on: sent, to: "with-gm", text: "Sent for sign-off" },
    { by: gm, on, to: "open", text: "Signed off" }];
  return [
    { id: "hreq-001", jobKey: r("req-001").jobKey,
      dept: r("req-001").departmentId, requisitionId: "req-001",
      budgetId: `bud-${r("req-001").positionIds[0]}`, reason: "new",
      headcount: 1, start: hire.joiningDate, urgency: "normal", ttf: 60,
      status: "filled", signed: "2026-07-10",
      raisedBy: r("req-001").hiringManagerId, events: [
        { by: r("req-001").hiringManagerId, on: "2026-07-08", to: "with-hr",
          text: "Raised the request" },
        ...signed(gm, "2026-07-09", "2026-07-10"),
        { by: hr, on: "2026-08-28", to: "filled",
          text: "Offer accepted; the position is filled" }] },
    { id: "hreq-002", jobKey: r("req-002").jobKey,
      dept: r("req-002").departmentId, requisitionId: "req-002",
      budgetId: `bud-${r("req-002").positionIds[0]}`,
      reason: "replacement", headcount: 1, start: "2026-12-01",
      urgency: "high", ttf: 60, status: "open", signed: "2026-09-18",
      raisedBy: r("req-002").hiringManagerId, events: [
        { by: r("req-002").hiringManagerId, on: "2026-09-16",
          to: "with-hr", text: "Raised the request" },
        { by: r("req-002").hiringManagerId, on: "2026-09-16", to: null,
          text: "The client book needs cover from December. Can we " +
            "use the agency we used last year?" },
        { by: hr, on: "2026-09-17", to: null, text: "Yes. I will post " +
          "it on the job portal and brief the agency once it is " +
          "signed off." },
        ...signed(gm, "2026-09-17", "2026-09-18")] },
    { id: "hreq-003", jobKey: r("req-003").jobKey,
      dept: r("req-003").departmentId, requisitionId: "req-003",
      budgetId: "bud-pos-new-1", reason: "new", headcount: 2,
      start: "2026-11-16", urgency: "normal", ttf: 45, status: "open",
      signed: "2026-09-04", raisedBy: r("req-003").hiringManagerId,
      events: [
        { by: r("req-003").hiringManagerId, on: "2026-09-02",
          to: "with-hr", text: "Raised the request" },
        ...signed(gm, "2026-09-03", "2026-09-04")] },
    { id: "hreq-004", jobKey: r("req-004").jobKey,
      dept: r("req-004").departmentId, requisitionId: "req-004",
      budgetId: "bud-pos-new-3", reason: "new", headcount: 1,
      start: "2027-02-01", urgency: "normal", ttf: 75, status: "on-hold",
      signed: null, raisedBy: r("req-004").hiringManagerId, events: [
        { by: r("req-004").hiringManagerId, on: "2026-10-08",
          to: "with-hr", text: "Raised the request" },
        { by: hr, on: "2026-10-09", to: "with-gm",
          text: "Sent for sign-off" },
        { by: gm, on: "2026-10-12", to: "on-hold",
          text: "Put on hold until the 2027 budget is confirmed" }] },
    { id: "hreq-005", jobKey: opsJob.jobKey, dept: mgr.departmentId,
      requisitionId: null, budgetId: null, reason: "new", headcount: 1,
      start: "2027-01-03", urgency: "high", ttf: 45, status: "with-hr",
      signed: null, raisedBy: managerId, events: [
        { by: managerId, on: "2026-10-22", to: "with-hr",
          text: "Raised the request" },
        { by: managerId, on: "2026-10-22", to: null, text: "Year-end " +
          "volumes are up and the team covers two branches. One more " +
          "person from January would stop the overtime." }] },
    { id: "hreq-006", jobKey: "aml-analyst", dept: "dept-compliance",
      requisitionId: null, budgetId: null, reason: "new", headcount: 1,
      start: "2027-01-17", urgency: "normal", ttf: 60, status: "with-gm",
      signed: null, raisedBy: compliance, events: [
        { by: compliance, on: "2026-10-19", to: "with-hr",
          text: "Raised the request" },
        { by: hr, on: "2026-10-21", to: null, text: "I shortened the " +
          "job description and set the grade at the foot of the band." },
        { by: hr, on: "2026-10-23", to: "with-gm",
          text: "Sent for sign-off" }] },
  ];
}

const NUMBER = (n: number): string => `HR-REQ-2026-${String(n)
  .padStart(4, "0")}`;
export const requestNumber = NUMBER;

function eventsOf(c: DemoCompany, id: string, xs: EventSpec[])
  : RequestEvent[] {
  const gm = c.employees.find((e) => e.jobKey === "general-manager")!.id;
  const hr = c.employees.find((e) => e.jobKey === "hr-manager")!.id;
  return xs.map((x, i) => {
    const e = c.employees.find((y) => y.id === x.by)!;
    return { id: `${id}:e${i + 1}`, byId: x.by, name: e.fullName,
      title: x.by === gm ? TITLE["gm"]! : x.by === hr ? TITLE["hr"]!
        : jobTitleText(e.jobKey), on: shortDateOf(x.on), to: x.to,
      text: x.text };
  });
}

/** The seeded requests, oldest first; `managerId`: the demo manager. */
export function hiringRequests(c: DemoCompany, managerId: string)
  : HiringRequestView[] {
  const m = movesDataOf(c);
  const leaver = c.employees.find((e) => e.cases.includes("leaver"))!;
  const grades = new Map(jobCatalogue(c).map((j) => [j.jobKey, j.gradeMin]));
  return requestSpecs(c, managerId).map((s, i) => {
    const req = m.requisitions.find((r) => r.id === s.requisitionId);
    const boss = req?.hiringManagerId ?? s.raisedBy;
    const grade = req?.grade ?? grades.get(s.jobKey) ?? 4;
    const raiser = c.employees.find((e) => e.id === s.raisedBy)!;
    const crit = criteriaTemplate(s.jobKey);
    return { id: s.id, number: NUMBER(i + 1), jobKey: s.jobKey,
      title: jobTitleText(s.jobKey), departmentId: s.dept,
      departmentText: departmentText(s.dept),
      locationText: req?.locationText ?? placeText(raiser.location),
      budgetId: s.budgetId, requisitionId: s.requisitionId,
      reason: s.reason, replacesName: s.reason === "replacement"
        ? leaver.fullName : null, headcount: s.headcount,
      startIso: s.start, start: shortDateOf(s.start), urgency: s.urgency,
      timeToFillDays: s.ttf, grade,
      jobDescription: jobDescriptionTemplate(s.jobKey, s.dept),
      mustHave: crit.mustHave, niceToHave: crit.niceToHave,
      stages: stagesTemplate(c, boss), raisedById: raiser.id,
      raisedByName: raiser.fullName,
      raisedOn: shortDateOf(s.events[0]!.on), hiringManagerId: boss,
      hiringManagerName: c.employees.find((e) => e.id === boss)!.fullName,
      status: s.status, signedOffIso: s.signed,
      events: eventsOf(c, s.id, s.events) };
  });
}

// ---------------------------------------------------------------
// The timeline of an open position
// ---------------------------------------------------------------

export type MilestoneKey = "posted" | "shortlist" | "interviews" |
  "offer" | "start";

export const MILESTONE_TEXT: Record<MilestoneKey, string> = {
  posted: "Posted", shortlist: "Shortlist", interviews: "Interviews done",
  offer: "Offer made", start: "Starts" };

export type MilestoneState = "done" | "due" | "overdue" | "waiting";

export interface Milestone {
  key: MilestoneKey;
  label: string;
  due: DisplayDate | null;
  state: MilestoneState;
  /** "Done", "Due 4 Nov 2026, in 8 days", "6 days overdue". */
  text: string;
}

export type TimelineProgress = Record<MilestoneKey, boolean>;

const RANK: Record<CandidateStage, number> = { applied: 0, screening: 1,
  interview: 2, offer: 3, hired: 4, rejected: -1, withdrawn: -1 };

/** How far hiring got, from the candidates' stages and the offers. */
export function timelineProgress(p: { published: boolean;
  stages: readonly CandidateStage[]; offers: readonly OfferStatus[];
  filled: boolean }): TimelineProgress {
  const top = Math.max(-1, ...p.stages.map((s) => RANK[s]));
  const offered = p.offers.some((o) => o === "sent" || o === "accepted");
  return { posted: p.published || p.stages.length > 0,
    shortlist: top >= 2, interviews: top >= 3 || offered,
    offer: offered || top >= 4 || p.filled,
    start: top >= 4 || p.filled };
}

/** Targets as a share of the time to fill, from the sign-off date. */
const SHARE: Record<Exclude<MilestoneKey, "start">, number> = {
  posted: 0, shortlist: 0.35, interviews: 0.7, offer: 1 };

/** The milestones of a position, judged on `asOf` (the demo day). */
export function hiringTimeline(p: { signedOffIso: string | null;
  timeToFillDays: number; startIso: string; progress: TimelineProgress },
asOf: string = AS_OF): Milestone[] {
  const keys: MilestoneKey[] = ["posted", "shortlist", "interviews",
    "offer", "start"];
  return keys.map((key) => {
    const dueIso = key === "start" ? p.startIso : p.signedOffIso === null
      ? null : addDays(p.signedOffIso, key === "posted" ? 3
        : Math.round(p.timeToFillDays * SHARE[key]));
    const label = MILESTONE_TEXT[key];
    if (p.progress[key]) {
      return { key, label, due: dueIso === null ? null : shortDateOf(dueIso),
        state: "done", text: "Done" };
    }
    if (dueIso === null) {
      return { key, label, due: null, state: "waiting",
        text: "Starts once signed off" };
    }
    const n = daysBetween(asOf, dueIso);
    const d = shortDateText(dueIso);
    return { key, label, due: shortDateOf(dueIso),
      state: n < 0 ? "overdue" : "due",
      text: n < 0 ? `${plural(-n, "day", "days")} overdue, was due ${d}`
        : n === 0 ? `Due today, ${d}`
          : `Due ${d}, in ${plural(n, "day", "days")}` };
  });
}

/** Days left to the offer target, or null before sign-off. */
export function daysToFillLeft(signedOffIso: string | null, ttf: number,
  asOf: string = AS_OF): number | null {
  return signedOffIso === null ? null
    : daysBetween(asOf, addDays(signedOffIso, ttf));
}

// ---------------------------------------------------------------
// Checking a new request
// ---------------------------------------------------------------

export interface RequestDraft {
  jobKey: string;
  departmentId: string;
  headcount: number;
  startIso: string;
  timeToFillDays: number;
  grade: number;
  jobDescription: string;
  mustHave: readonly string[];
}

/** Plain sentences for what is missing; empty when it can be sent. */
export function checkRequest(c: DemoCompany, d: RequestDraft): string[] {
  const out: string[] = [];
  const job = jobCatalogue(c).find((j) => j.jobKey === d.jobKey);
  if (job === undefined) out.push("Choose a role.");
  if (!c.departments.some((x) => x.id === d.departmentId)) {
    out.push("Choose a department.");
  }
  if (!Number.isInteger(d.headcount) || d.headcount < 1 ||
    d.headcount > 5) out.push("Ask for 1 to 5 people.");
  if (!isoOk(d.startIso)) out.push("Enter a target start date.");
  else if (d.startIso <= AS_OF) {
    out.push(`The start date must be after ${shortDateText(AS_OF)}.`);
  } else if (d.startIso > HIRING_LAST_START) {
    out.push(`Choose a start by ${shortDateText(HIRING_LAST_START)}.`);
  }
  if (!Number.isInteger(d.timeToFillDays) || d.timeToFillDays < 14 ||
    d.timeToFillDays > 120) {
    out.push("Give 14 to 120 days to find someone.");
  }
  if (GRADE_BASIC[d.grade] === undefined) out.push("Choose a grade.");
  if (d.jobDescription.trim().length < 40) {
    out.push("Write the job description (at least a few lines).");
  }
  if (d.mustHave.filter((x) => x.trim() !== "").length === 0) {
    out.push("Add at least one must-have.");
  }
  return out;
}

/** Days from the demo day to the start: tighter than the time to fill? */
export function startTooSoon(startIso: string, ttf: number,
  asOf: string = AS_OF): boolean {
  return isoOk(startIso) && daysBetween(asOf, startIso) < ttf;
}

export const REQUEST_BASIS = "A request goes to HR, who can edit it or " +
  "ask for changes. The General manager signs off the budget; then it " +
  "is an open position. The timeline counts from the sign-off: posted " +
  "in 3 days, a shortlist by about a third of the time to fill, interviews " +
  "done by seven tenths, and an offer by the end of it.";
