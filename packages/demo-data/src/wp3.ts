import {
  addDays,
  daysBetween,
  fils,
  formatAed,
  parseIsoDate,
  type Allowance,
  type Fils,
} from "@payroll/engine";
import { AS_OF, SETTLEMENT_DUE_DAYS } from "./calendar";
import { plural, type DisplayDate } from "./display";
import { DEMO_LABELS_EN, type DemoLabelKey } from "./labels-en";
import {
  BASIC_STEP,
  GRADE_BASIC,
  GRADE_TRANSPORT,
} from "./roster-data";
import type { DemoCompany, DemoEmployee } from "./types";

/**
 * WP3: hiring, joining and leaving. FICTIONAL candidates, offers,
 * checklists, transfers and one re-join, all derived from the 31
 * employees: nothing here restates a joining date or a salary, so the
 * data holds for every seed. The two fixed people are the new hire
 * (case "probation") and the leaver (case "leaver").
 */

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug",
  "Sep", "Oct", "Nov", "Dec"];

/** "27 Oct 2026": every date the WP2, WP3 and WP10 screens show. */
export function shortDateText(iso: string): string {
  const d = parseIsoDate(iso);
  return `${d.d} ${MON[d.m - 1]} ${d.y}`;
}

export const shortDateOf = (iso: string): DisplayDate =>
  ({ iso, display: shortDateText(iso) });

/** "Due 4 Nov 2026, in 8 days" or "Was due 19 Oct 2026, 8 days ago". */
export function dueTextOf(iso: string, asOf: string = AS_OF): string {
  const n = daysBetween(asOf, iso);
  const d = shortDateText(iso);
  if (n === 0) return `Due today, ${d}`;
  return n > 0 ? `Due ${d}, in ${plural(n, "day", "days")}`
    : `Was due ${d}, ${plural(-n, "day", "days")} ago`;
}

const label = (key: string): string =>
  DEMO_LABELS_EN[key as DemoLabelKey] ?? key;
export const jobTitleText = (jobKey: string): string =>
  label(`job.${jobKey}`);
export const departmentText = (departmentId: string): string =>
  label(`dept.${departmentId.replace(/^dept-/, "")}`);
export const placeText = (location: string): string =>
  label(`location.${location}`).replace(" (fictional)", "");

export interface MoneyText { value: Fils; display: string }
const money = (v: bigint): MoneyText =>
  ({ value: fils(v), display: formatAed(fils(v)) });

const pad = (n: number, w: number) => String(n).padStart(w, "0");
/** One seat per employee; new seats are pos-new-1, pos-new-2, ... */
export const positionIdOf = (employeeId: string): string =>
  `pos-${employeeId.slice(4)}`;
export const newPositionId = (n: number): string => `pos-new-${n}`;

/**
 * The line manager: the most senior person with a higher grade in the
 * same department and place, else in the department, else the General
 * Manager (null for the General Manager). The same rule as the demo's
 * approval checker, so the two cannot differ.
 */
export function managerIdFor(es: readonly DemoEmployee[], p: {
  id?: string; departmentId: string; location: string; grade: number;
}): string | null {
  const senior = es.filter((x) => x.departmentId === p.departmentId &&
    x.grade > p.grade && x.id !== p.id && x.leavingDate === null)
    .sort((a, b) => b.grade - a.grade);
  const local = senior.filter((x) => x.location === p.location);
  const gm = es.find((x) => x.jobKey === "general-manager")!.id;
  const top = (local[0] ?? senior[0])?.id ?? gm;
  return top === p.id ? null : top;
}

export type RequisitionStatus = "open" | "on-hold" | "filled";
export type CandidateStage = "applied" | "screening" | "interview" |
  "offer" | "hired" | "rejected" | "withdrawn";
export type InterviewOutcome = "pass" | "fail" | "scheduled" |
  "awaiting-feedback";
export type OfferStatus = "draft" | "sent" | "accepted" | "declined";
export type OwnerRole = "hr" | "it" | "finance" | "manager" | "employee";

export interface HiringRequisition {
  id: string;
  jobKey: string;
  title: string;
  departmentId: string;
  departmentText: string;
  location: string;
  locationText: string;
  grade: number;
  openings: number;
  openingsLeft: number;
  status: RequisitionStatus;
  statusText: string;
  reason: "backfill" | "growth";
  replacesEmployeeId: string | null;
  positionIds: string[];
  hiringManagerId: string;
  hiringManagerName: string;
  openedOn: DisplayDate;
  /** The grade's band in the bank's pay scale, one step = AED 250. */
  basicMin: MoneyText;
  basicMax: MoneyText;
  published: boolean;
  note: string;
  summary: string;
}

export interface HiringInterview {
  date: DisplayDate;
  outcome: InterviewOutcome;
  outcomeText: string;
  panel: { employeeId: string; name: string }[];
  note: string;
}

export interface HiringCandidate {
  id: string;
  name: string;
  nationality: string;
  requisitionId: string;
  requisitionTitle: string;
  stage: CandidateStage;
  stageText: string;
  appliedOn: DisplayDate;
  source: string;
  interviews: HiringInterview[];
  offerId: string | null;
  /** Set once the person is on the staff list. */
  employeeId: string | null;
  formerEmployee: boolean;
  note: string;
  nextStep: string;
}

export interface CandidateBoard {
  columns: { stage: CandidateStage; label: string; count: number;
    candidates: HiringCandidate[] }[];
  closed: HiringCandidate[];
  text: string;
}

export interface HiringOffer {
  id: string;
  number: string;
  candidateId: string;
  candidateName: string;
  requisitionId: string;
  jobKey: string;
  title: string;
  grade: number;
  status: OfferStatus;
  statusText: string;
  basic: Fils;
  allowances: Allowance[];
  gross: Fils;
  basicText: string;
  grossText: string;
  probationMonths: number;
  preparedOn: DisplayDate;
  sentOn: DisplayDate | null;
  respondedOn: DisplayDate | null;
  validUntil: DisplayDate | null;
  joiningDate: DisplayDate;
  approvedBy: { employeeId: string; name: string; on: DisplayDate } | null;
  employeeId: string | null;
  note: string;
}

export interface MoveChecklistItem {
  key: string;
  label: string;
  ownerRole: OwnerRole;
  ownerText: string;
  dueOn: DisplayDate;
  doneOn: DisplayDate | null;
  state: "done" | "open" | "overdue";
  dueText: string;
  note: string | null;
}

export interface JoinerChecklistView {
  id: string;
  employeeId: string | null;
  candidateId: string | null;
  personName: string;
  title: string;
  joiningDate: DisplayDate;
  items: MoveChecklistItem[];
  progressText: string;
}

export interface LeaverChecklistView {
  id: string;
  employeeId: string;
  personName: string;
  title: string;
  lastWorkingDay: DisplayDate;
  items: MoveChecklistItem[];
  progressText: string;
  /** From the run's settlement; outside the pay run and the SIF. */
  settlement: { total: MoneyText; dueOn: DisplayDate; basis: string;
    statusText: string };
}

export interface EmploymentEndView {
  employeeId: string;
  personName: string;
  kind: "resignation";
  submittedOn: DisplayDate;
  lastWorkingDay: DisplayDate;
  noticeDays: number;
  noticeText: string;
  acceptedBy: { employeeId: string; name: string; on: DisplayDate };
  reason: string;
}

export interface MoveSeat { departmentId: string; location: string;
  jobKey: string; grade: number; text: string }

export interface StaffMove {
  id: string;
  kind: "transfer" | "rejoin";
  status: "completed" | "approved";
  statusText: string;
  /** null for a former colleague who is not on the staff list yet. */
  employeeId: string | null;
  personName: string;
  effectiveOn: DisplayDate;
  from: MoveSeat;
  to: MoveSeat;
  payChangeText: string;
  previousService: { from: DisplayDate; to: DisplayDate;
    text: string } | null;
  offerId: string | null;
  note: string;
  summary: string;
}

export interface HiringSummary {
  openRequisitions: number;
  openings: number;
  candidatesInProcess: number;
  offersOut: number;
  upcomingJoiners: number;
  text: string;
}

export interface MovesData {
  requisitions: HiringRequisition[];
  candidates: HiringCandidate[];
  offers: HiringOffer[];
  joiners: JoinerChecklistView[];
  leavers: LeaverChecklistView[];
  endings: EmploymentEndView[];
  moves: StaffMove[];
}

const STAGE_TEXT: Record<CandidateStage, string> = {
  applied: "Applied", screening: "Screening", interview: "Interview",
  offer: "Offer", hired: "Hired", rejected: "Not taken forward",
  withdrawn: "Withdrew" };
const OUTCOME_TEXT: Record<InterviewOutcome, string> = {
  pass: "Passed", fail: "Not taken forward", scheduled: "Booked",
  "awaiting-feedback": "Waiting for the panel's feedback" };
const OFFER_TEXT: Record<OfferStatus, string> = { draft: "Draft",
  sent: "Sent, waiting for an answer", accepted: "Accepted",
  declined: "Declined" };
const OWNER_TEXT: Record<OwnerRole, string> = { hr: "HR", it: "IT",
  finance: "Finance", manager: "Line manager", employee: "The employee" };

const ALLOWANCE_TEXT: Record<string, string> = {
  housing: "Housing allowance", transport: "Transport allowance",
  phone: "Phone allowance" };

const isoIn = (base: string, days: number) => addDays(base, days);

/** The pay package at the foot of a grade: the band floor. */
function entryPackage(grade: number): { basic: bigint;
  allowances: Allowance[] } {
  const basic = GRADE_BASIC[grade]!;
  const allowances: Allowance[] = [
    { code: "housing", kind: "housing", monthly: fils(basic * 40n / 100n) },
    { code: "transport", kind: "conveyance",
      monthly: fils(GRADE_TRANSPORT[grade]!) }];
  if (grade >= 7) {
    allowances.push({ code: "phone", kind: "other", monthly: fils(50000n) });
  }
  return { basic, allowances };
}

interface ReqSpec { id: string; jobKey: string; dept: string;
  location: string; grade: number; openings: number;
  status: RequisitionStatus; reason: "backfill" | "growth";
  replaces?: string; positions: string[]; openedOn: string;
  published: boolean; note: string }

function reqSpecs(es: readonly DemoEmployee[]): ReqSpec[] {
  const leaver = es.find((e) => e.cases.includes("leaver"))!;
  const hire = es.find((e) => e.cases.includes("probation"))!;
  return [
    { id: "req-001", jobKey: hire.jobKey, dept: hire.departmentId,
      location: hire.location, grade: hire.grade, openings: 1,
      status: "filled", reason: "growth",
      positions: [positionIdOf(hire.id)], openedOn: "2026-07-13",
      published: false, note: "Filled: the new teller joined on " +
      `${shortDateText(hire.joiningDate)}.` },
    { id: "req-002", jobKey: leaver.jobKey, dept: leaver.departmentId,
      location: leaver.location, grade: leaver.grade, openings: 1,
      status: "open", reason: "backfill", replaces: leaver.id,
      positions: [positionIdOf(leaver.id)], openedOn: "2026-09-21",
      published: true, note: "Replaces the resigning relationship " +
      "manager; the client portfolio was handed over before the last day." },
    { id: "req-003", jobKey: "credit-analyst", dept: "dept-credit",
      location: "hq-abu-dhabi", grade: 5, openings: 2, status: "open",
      reason: "growth", positions: [newPositionId(1), newPositionId(2)],
      openedOn: "2026-09-07", published: true,
      note: "Two new seats for the 2027 lending plan (sample)." },
    { id: "req-004", jobKey: "systems-engineer", dept: "dept-it",
      location: "hq-abu-dhabi", grade: 5, openings: 1, status: "on-hold",
      reason: "growth", positions: [newPositionId(3)],
      openedOn: "2026-10-12", published: false,
      note: "On hold until the 2027 budget is confirmed." }];
}

interface CandSpec { id: string; req: string; name: string; nat: string;
  stage: CandidateStage; applied: string; source: string;
  interviews: [string, InterviewOutcome, string][]; offer?: string;
  former?: boolean; note: string }

const CANDS: readonly CandSpec[] = [
  { id: "cand-001", req: "req-001", name: "", nat: "", stage: "hired",
    applied: "2026-07-20", source: "Job portal", offer: "offer-001",
    interviews: [["2026-07-29", "pass", "Good with customers"],
      ["2026-08-05", "pass", "Counted cash without errors"]],
    note: "Joined as a teller after the offer was accepted." },
  { id: "cand-002", req: "req-001", name: "Hana Mustafa", nat: "EG",
    stage: "rejected", applied: "2026-07-22", source: "Job portal",
    interviews: [["2026-07-30", "fail", "Asked for a head office role"]],
    note: "Preferred a head office seat." },
  { id: "cand-003", req: "req-001", name: "Tariq Bashir", nat: "PK",
    stage: "withdrawn", applied: "2026-07-24", source: "Walk-in",
    interviews: [], note: "Took another job before the first call." },
  { id: "cand-004", req: "req-002", name: "Daniel Okafor", nat: "NG",
    stage: "offer", applied: "2026-10-01", source: "Agency",
    offer: "offer-002", interviews: [
      ["2026-10-08", "pass", "Strong corporate book"],
      ["2026-10-15", "pass", "Panel agreed with the GM"]],
    note: "Offer sent, waiting for his answer." },
  { id: "cand-005", req: "req-002", name: "Layla Barakat", nat: "LB",
    stage: "interview", applied: "2026-10-05", source: "Referral",
    interviews: [["2026-10-14", "pass", "First round"],
      ["2026-10-29", "scheduled", "Second round with the hiring manager"]],
    note: "Second round booked." },
  { id: "cand-006", req: "req-002", name: "Peter Lindqvist", nat: "SE",
    stage: "screening", applied: "2026-10-20", source: "Job portal",
    interviews: [], note: "CV under review." },
  { id: "cand-007", req: "req-002", name: "Reem Al Blooshi", nat: "AE",
    stage: "interview", applied: "2026-10-07", source: "Referral",
    interviews: [["2026-10-23", "awaiting-feedback", "Panel of two"]],
    note: "UAE national; the panel has not sent its feedback yet." },
  { id: "cand-008", req: "req-003", name: "Faisal Chaudhry", nat: "PK",
    stage: "offer", applied: "2026-09-14", source: "Former staff",
    offer: "offer-003", former: true, interviews: [
      ["2026-09-22", "pass", "Knows the bank's credit forms"]],
    note: "Worked here before; offer accepted, joins again in November." },
  { id: "cand-009", req: "req-003", name: "Mona Elsayed", nat: "EG",
    stage: "withdrawn", applied: "2026-09-10", source: "Agency",
    offer: "offer-004", interviews: [
      ["2026-09-18", "pass", "Strong on ratios"]],
    note: "Declined the offer: accepted a counter-offer." },
  { id: "cand-010", req: "req-003", name: "Anika Rao", nat: "IN",
    stage: "offer", applied: "2026-09-30", source: "Job portal",
    offer: "offer-005", interviews: [
      ["2026-10-13", "pass", "Good case study"],
      ["2026-10-22", "pass", "Panel agreed"]],
    note: "Offer is a draft, not yet approved." },
  { id: "cand-011", req: "req-003", name: "Wen Zhao", nat: "CN",
    stage: "rejected", applied: "2026-09-18", source: "Job portal",
    interviews: [["2026-10-02", "fail", "Not enough credit experience"]],
    note: "Not taken forward." },
  { id: "cand-012", req: "req-004", name: "Ibrahim Yusuf", nat: "NG",
    stage: "screening", applied: "2026-10-15", source: "Job portal",
    interviews: [], note: "Held while the requisition is on hold." },
  { id: "cand-013", req: "req-004", name: "Tess Alvarez", nat: "PH",
    stage: "applied", applied: "2026-10-23", source: "Job portal",
    interviews: [], note: "New application." }];

interface OfferSpec { id: string; cand: string; status: OfferStatus;
  prepared: string; sent?: string; responded?: string; joining?: string }

const OFFERS: readonly OfferSpec[] = [
  { id: "offer-001", cand: "cand-001", status: "accepted",
    prepared: "2026-08-20", sent: "2026-08-24", responded: "2026-08-28" },
  { id: "offer-002", cand: "cand-004", status: "sent",
    prepared: "2026-10-19", sent: "2026-10-22", joining: "2026-12-01" },
  { id: "offer-003", cand: "cand-008", status: "accepted",
    prepared: "2026-10-12", sent: "2026-10-14", responded: "2026-10-21",
    joining: "2026-11-16" },
  { id: "offer-004", cand: "cand-009", status: "declined",
    prepared: "2026-10-01", sent: "2026-10-02", responded: "2026-10-09",
    joining: "2026-11-01" },
  { id: "offer-005", cand: "cand-010", status: "draft",
    prepared: "2026-10-26", joining: "2026-12-01" }];

const STANDARD_PROBATION = 6;

function buildRequisitions(es: readonly DemoEmployee[],
  offers: HiringOffer[]): HiringRequisition[] {
  return reqSpecs(es).map((r) => {
    const boss = es.find((e) => e.id === managerIdFor(es,
      { departmentId: r.dept, location: r.location, grade: r.grade }))!;
    const taken = offers.filter((o) => o.requisitionId === r.id &&
      o.status === "accepted").length;
    const left = r.status === "filled" ? 0 : r.openings - taken;
    const title = jobTitleText(r.jobKey);
    const place = placeText(r.location);
    const statusText = { open: "Open", "on-hold": "On hold",
      filled: "Filled" }[r.status];
    return { id: r.id, jobKey: r.jobKey, title,
      departmentId: r.dept, departmentText: departmentText(r.dept),
      location: r.location, locationText: place, grade: r.grade,
      openings: r.openings, openingsLeft: left, status: r.status,
      statusText, reason: r.reason, replacesEmployeeId: r.replaces ?? null,
      positionIds: r.positions, hiringManagerId: boss.id,
      hiringManagerName: boss.fullName, openedOn: shortDateOf(r.openedOn),
      basicMin: money(GRADE_BASIC[r.grade]!),
      basicMax: money(GRADE_BASIC[r.grade]! + 8n * BASIC_STEP),
      published: r.published, note: r.note,
      summary: `${title}, ${place}: ${statusText.toLowerCase()}, ` +
        `${plural(r.openings, "opening", "openings")}, opened ` +
        shortDateText(r.openedOn) };
  });
}

function buildOffers(es: readonly DemoEmployee[],
  reqs: ReqSpec[], names: Map<string, string>): HiringOffer[] {
  const hire = es.find((e) => e.cases.includes("probation"))!;
  const gm = es.find((e) => e.jobKey === "general-manager")!;
  const hr = es.find((e) => e.jobKey === "hr-manager")!;
  return OFFERS.map((o, i) => {
    const cand = CANDS.find((x) => x.id === o.cand)!;
    const req = reqs.find((x) => x.id === cand.req)!;
    const hired = o.cand === "cand-001";
    const pack = hired ? { basic: hire.basicMonthly,
      allowances: hire.allowances.map((a) => ({ ...a })) }
      : entryPackage(req.grade);
    const allowances = pack.allowances;
    const basic = fils(pack.basic);
    const gross = fils(pack.basic + allowances.reduce((n, a) =>
      n + a.monthly, 0n));
    const joining = hired ? hire.joiningDate : o.joining!;
    const who = req.grade >= 7 ? gm : hr;
    const approvedOn = o.sent === undefined ? null : isoIn(o.prepared, 1);
    const title = jobTitleText(req.jobKey);
    const valid = o.status === "sent" ? isoIn(o.sent!, 7) : null;
    return { id: o.id, number: `OL-2026-${pad(i + 1, 4)}`,
      candidateId: o.cand, candidateName: names.get(o.cand)!,
      requisitionId: req.id, jobKey: req.jobKey, title, grade: req.grade,
      status: o.status, statusText: OFFER_TEXT[o.status], basic,
      allowances, gross, basicText: formatAed(basic),
      grossText: formatAed(gross), probationMonths: STANDARD_PROBATION,
      preparedOn: shortDateOf(o.prepared),
      sentOn: o.sent === undefined ? null : shortDateOf(o.sent),
      respondedOn: o.responded === undefined ? null
        : shortDateOf(o.responded),
      validUntil: valid === null ? null : shortDateOf(valid),
      joiningDate: shortDateOf(joining),
      approvedBy: approvedOn === null ? null : { employeeId: who.id,
        name: who.fullName, on: shortDateOf(approvedOn) },
      employeeId: hired ? hire.id : null,
      note: o.status === "draft" ? "Draft: needs the HR manager's " +
        "approval before it goes out." : cand.note };
  });
}

function buildCandidates(es: readonly DemoEmployee[],
  reqs: HiringRequisition[]): HiringCandidate[] {
  const hire = es.find((e) => e.cases.includes("probation"))!;
  const hrOfficer = es.find((e) => e.jobKey === "hr-officer")!;
  return CANDS.map((x) => {
    const req = reqs.find((r) => r.id === x.req)!;
    const hired = x.id === "cand-001";
    const panelIds = [req.hiringManagerId, hrOfficer.id];
    const panel = panelIds.map((id) => ({ employeeId: id,
      name: es.find((e) => e.id === id)!.fullName }));
    const offer = OFFERS.find((o) => o.id === x.offer);
    const next = nextStepOf(x, offer);
    return { id: x.id, name: hired ? hire.fullName : x.name,
      nationality: hired ? hire.nationality : x.nat, requisitionId: x.req,
      requisitionTitle: req.title, stage: x.stage,
      stageText: STAGE_TEXT[x.stage], appliedOn: shortDateOf(x.applied),
      source: x.source, interviews: x.interviews.map(([d, o, note]) =>
        ({ date: shortDateOf(d), outcome: o, outcomeText: OUTCOME_TEXT[o],
          panel, note })),
      offerId: x.offer ?? null, employeeId: hired ? hire.id : null,
      formerEmployee: x.former === true, note: x.note, nextStep: next };
  });
}

function nextStepOf(x: CandSpec, offer: OfferSpec | undefined): string {
  const booked = x.interviews.find(([, o]) => o === "scheduled");
  if (booked !== undefined) {
    return `Interview on ${shortDateText(booked[0])}`;
  }
  if (x.stage === "hired") return "On the staff list";
  if (x.stage === "rejected") return "Closed";
  if (x.stage === "withdrawn") return "Closed: withdrew";
  if (offer?.status === "sent") {
    return `Waiting for an answer by ${shortDateText(isoIn(offer.sent!, 7))}`;
  }
  if (offer?.status === "accepted") {
    return `Joins on ${shortDateText(offer.joining!)}`;
  }
  if (offer?.status === "draft") return "Approve and send the offer";
  if (x.stage === "applied") return "Review the application";
  if (x.stage === "screening") return "Decide on a first call";
  return "Collect the panel's feedback";
}

type ItemSpec = [string, string, OwnerRole, string, string | null,
  string?];

function itemsOf(specs: ItemSpec[]): MoveChecklistItem[] {
  return specs.map(([key, text, role, due, done, note]) => {
    const state = done !== null ? "done" as const
      : due < AS_OF ? "overdue" as const : "open" as const;
    return { key, label: text, ownerRole: role,
      ownerText: OWNER_TEXT[role], dueOn: shortDateOf(due),
      doneOn: done === null ? null : shortDateOf(done), state,
      dueText: done !== null ? `Done ${shortDateText(done)}`
        : dueTextOf(due), note: note ?? null };
  });
}

const progressOf = (items: MoveChecklistItem[]): string =>
  `${items.filter((i) => i.state === "done").length} of ` +
  `${items.length} done`;

function buildJoiners(es: readonly DemoEmployee[], offers: HiringOffer[],
  cands: HiringCandidate[]): JoinerChecklistView[] {
  const e = es.find((x) => x.cases.includes("probation"))!;
  const j = e.joiningDate;
  const bankDone = e.iban === null ? null : isoIn(j, 6);
  const mine = itemsOf([
    ["contract", "Employment contract signed and filed", "hr",
      isoIn(j, -3), isoIn(j, -3)],
    ["passport-copies", "Passport and photo copies collected", "hr", j, j],
    ["system-access", "Laptop and system access ready", "it", j, j],
    ["induction", "Branch induction with the branch manager", "manager",
      isoIn(j, 4), isoIn(j, 4)],
    ["bank-details", "Bank account details for the salary file",
      "finance", isoIn(j, 7), bankDone],
    ["medical", "Medical fitness test", "hr", isoIn(j, 7), isoIn(j, 6)],
    ["residence-id", "Residence visa and Emirates ID application", "hr",
      isoIn(j, 14), null, "Appointment booked, not completed yet"],
    ["policies", "Staff policies read and acknowledged", "employee",
      isoIn(j, 14), isoIn(j, 10)],
    ["check-in", "30-day check-in with the line manager", "manager",
      isoIn(j, 30), null],
    ["insurance", "Health insurance card issued", "hr", isoIn(j, 30),
      null]]);
  const re = offers.find((o) => o.id === "offer-003")!;
  const rj = re.joiningDate.iso;
  const cand = cands.find((c) => c.id === re.candidateId)!;
  const pre = itemsOf([
    ["offer-signed", "Offer letter countersigned", "employee",
      re.respondedOn!.iso, re.respondedOn!.iso],
    ["contract", "Employment contract prepared and signed", "hr",
      isoIn(rj, -10), null],
    ["medical", "Medical fitness test booked", "hr", isoIn(rj, -7), null],
    ["system-access", "Laptop and system access ready", "it",
      isoIn(rj, -1), null],
    ["residence-id", "Residence visa and Emirates ID application", "hr",
      isoIn(rj, 14), null]]);
  return [{ id: "join-001", employeeId: e.id, candidateId: "cand-001",
    personName: e.fullName, title: jobTitleText(e.jobKey),
    joiningDate: shortDateOf(j), items: mine, progressText: progressOf(mine) },
  { id: "join-002", employeeId: null, candidateId: cand.id,
    personName: cand.name, title: re.title, joiningDate: shortDateOf(rj),
    items: pre, progressText: progressOf(pre) }];
}

const SETTLEMENT_BASIS = "gratuity and unused leave pay from the " +
  "engine; notice pay, deductions and other dues are not computed";

function buildLeavers(c: readonly DemoEmployee[], run: DemoCompany["payRun"],
  due: string): LeaverChecklistView[] {
  const e = c.find((x) => x.cases.includes("leaver"))!;
  const end = e.leavingDate!;
  const sub = isoIn(end, -31);
  const items = itemsOf([
    ["resignation", "Resignation letter received", "hr", sub, sub],
    ["accepted", "Resignation accepted, last day agreed", "hr",
      isoIn(sub, 1), isoIn(sub, 1)],
    ["handover", "Client portfolio handed over", "manager",
      isoIn(end, -1), isoIn(end, -1)],
    ["exit-interview", "Exit interview held", "hr", isoIn(end, -2),
      isoIn(end, -2)],
    ["assets", "Laptop, access card and keys returned", "it", end, end],
    ["access", "System access closed", "it", end, end],
    ["clearance", "Loans and advances cleared", "finance", end,
      isoIn(end, -1), "Nothing outstanding"],
    ["calculate-settlement", "Final settlement calculated", "hr",
      isoIn(end, 4), isoIn(end, 4)],
    ["pay-settlement", "Final settlement paid", "finance", due, null],
    ["certificate", "Experience certificate issued", "hr", due, null],
    ["visa-cancel", "Residence visa cancelled", "hr", isoIn(end, 30), null,
      "Sample date: confirm the deadline with the immigration office"]]);
  const total = run.settlements.find((s) => s.employeeId === e.id)!
    .result.total;
  return [{ id: "leave-001", employeeId: e.id, personName: e.fullName,
    title: jobTitleText(e.jobKey), lastWorkingDay: shortDateOf(end), items,
    progressText: progressOf(items), settlement: { total: money(total),
      dueOn: shortDateOf(due), basis: SETTLEMENT_BASIS,
      statusText: `Calculated, to be paid by ${shortDateText(due)}` } }];
}

function buildEndings(es: readonly DemoEmployee[]): EmploymentEndView[] {
  const e = es.find((x) => x.cases.includes("leaver"))!;
  const gm = es.find((x) => x.jobKey === "general-manager")!;
  const sub = isoIn(e.leavingDate!, -31);
  const n = daysBetween(sub, e.leavingDate!);
  return [{ employeeId: e.id, personName: e.fullName, kind: "resignation",
    submittedOn: shortDateOf(sub), lastWorkingDay: shortDateOf(e.leavingDate!),
    noticeDays: n, noticeText: `${n} days of notice, from ` +
    `${shortDateText(sub)} to ${shortDateText(e.leavingDate!)}`,
    acceptedBy: { employeeId: gm.id, name: gm.fullName,
      on: shortDateOf(isoIn(sub, 1)) },
    reason: "Moving abroad to another bank" }];
}

const seat = (departmentId: string, location: string, jobKey: string,
  grade: number): MoveSeat => ({ departmentId, location, jobKey, grade,
  text: `${jobTitleText(jobKey)}, ${departmentText(departmentId)}, ` +
    `${placeText(location)}, grade ${grade}` });

function buildMoves(es: readonly DemoEmployee[], offers: HiringOffer[],
  cands: HiringCandidate[]): StaffMove[] {
  const at = (id: string) => es.find((e) => e.id === id)!;
  const now = (e: DemoEmployee) => seat(e.departmentId, e.location,
    e.jobKey, e.grade);
  const noora = at("emp-006");
  const nimal = at("emp-020");
  const saeed = at("emp-008");
  const re = offers.find((o) => o.id === "offer-003")!;
  const former = cands.find((x) => x.id === re.candidateId)!;
  const mk = (id: string, e: DemoEmployee, from: MoveSeat, to: MoveSeat,
    eff: string, status: StaffMove["status"], note: string): StaffMove =>
    ({ id, kind: "transfer", status,
      statusText: status === "completed" ? "Done" : "Approved, starts later",
      employeeId: e.id, personName: e.fullName,
      effectiveOn: shortDateOf(eff), from, to,
      payChangeText: "No change in pay", previousService: null,
      offerId: null, note, summary: `${e.fullName}: ${from.text} to ` +
        to.text });
  const first = "2019-05-12";
  const last = "2023-02-28";
  return [
    mk("move-001", noora, seat("dept-retail", "br-khalidiya", noora.jobKey,
      noora.grade), now(noora), "2026-02-01", "completed",
    "Moved to the Al Ain branch; no change in role or pay."),
    mk("move-002", nimal, seat("dept-retail", "br-khalidiya", "teller",
      nimal.grade), now(nimal), "2026-03-02", "completed",
    "Moved from the branch counter to the head office archive."),
    mk("move-003", saeed, now(saeed), seat(saeed.departmentId, "br-al-ain",
      saeed.jobKey, saeed.grade), "2026-11-16", "approved",
    "Covers the Al Ain counter while a teller is on leave."),
    { id: "move-004", kind: "rejoin", status: "approved",
      statusText: "Offer accepted, starts later", employeeId: null,
      personName: former.name, effectiveOn: re.joiningDate,
      from: seat("dept-credit", "hq-abu-dhabi", "credit-analyst", 5),
      to: seat("dept-credit", "hq-abu-dhabi", re.jobKey, re.grade),
      payChangeText: `New package: ${re.grossText} a month (band floor)`,
      previousService: { from: shortDateOf(first), to: shortDateOf(last),
        text: `${shortDateText(first)} to ${shortDateText(last)}` },
      offerId: re.id, note: "Previous service was settled when he left. " +
        "The new period counts from the re-joining date: our reading, " +
        "to confirm.",
      summary: `${former.name} re-joins on ${re.joiningDate.display}` }];
}

const cache = new WeakMap<object, MovesData>();

/** All WP3 data for one demo company (built once, then reused). */
export function movesDataOf(c: DemoCompany): MovesData {
  const hit = cache.get(c);
  if (hit !== undefined) return hit;
  const es = c.employees;
  const specs = reqSpecs(es);
  const names = new Map<string, string>(CANDS.map((x) => [x.id,
    x.id === "cand-001" ? es.find((e) => e.cases.includes("probation"))!
      .fullName : x.name]));
  const offers = buildOffers(es, specs, names);
  const requisitions = buildRequisitions(es, offers);
  const candidates = buildCandidates(es, requisitions);
  const due = isoIn(es.find((e) => e.cases.includes("leaver"))!
    .leavingDate!, SETTLEMENT_DUE_DAYS);
  const data = { requisitions, candidates, offers,
    joiners: buildJoiners(es, offers, candidates),
    leavers: buildLeavers(es, c.payRun, due), endings: buildEndings(es),
    moves: buildMoves(es, offers, candidates) };
  cache.set(c, data);
  return data;
}

export const requisitionViews = (c: DemoCompany): HiringRequisition[] =>
  movesDataOf(c).requisitions;

/** Open, published requisitions with an opening left (P13). */
export const vacancyViews = (c: DemoCompany): HiringRequisition[] =>
  requisitionViews(c).filter((r) => r.status === "open" && r.published &&
    r.openingsLeft > 0);

const BOARD: CandidateStage[] = ["applied", "screening", "interview",
  "offer", "hired"];

/** The candidates board: five columns, closed ones kept apart. */
export function candidateBoard(c: DemoCompany): CandidateBoard {
  const all = movesDataOf(c).candidates;
  const columns = BOARD.map((stage) => {
    const candidates = all.filter((x) => x.stage === stage);
    return { stage, label: STAGE_TEXT[stage], count: candidates.length,
      candidates };
  });
  const closed = all.filter((x) => x.stage === "rejected" ||
    x.stage === "withdrawn");
  return { columns, closed, text: `${plural(all.length - closed.length,
    "candidate", "candidates")} on the board, ${closed.length} closed` };
}

export function offerViews(c: DemoCompany, status?: OfferStatus)
  : HiringOffer[] {
  return movesDataOf(c).offers.filter((o) => status === undefined ||
    o.status === status);
}

/** The offer letter as lines of text, ready to show or print. */
export function offerLetterText(c: DemoCompany, offerId: string)
  : string[] {
  const o = movesDataOf(c).offers.find((x) => x.id === offerId);
  if (o === undefined) throw new Error(`no offer ${offerId}`);
  const req = requisitionViews(c).find((r) => r.id === o.requisitionId)!;
  const when = o.sentOn ?? o.preparedOn;
  return [c.company.name, `Offer letter ${o.number}`,
    `Dated ${when.display}`, "", `Dear ${o.candidateName},`,
    `We are pleased to offer you the position of ${o.title} in ` +
      `${req.departmentText}, ${req.locationText}.`,
    `Monthly basic salary: ${o.basicText}`,
    ...o.allowances.map((a) => `${ALLOWANCE_TEXT[a.code] ?? a.code}: ` +
      formatAed(a.monthly)),
    `Total monthly pay: ${o.grossText}`,
    `Start date: ${o.joiningDate.display}`,
    `Probation: ${plural(o.probationMonths, "month", "months")}`,
    ...(o.validUntil === null ? [] : [`This offer is open until ` +
      o.validUntil.display]),
    o.approvedBy === null ? "Draft: not yet approved"
      : `Approved by ${o.approvedBy.name} on ${o.approvedBy.on.display}`];
}

export const joinerChecklistViews = (c: DemoCompany)
  : JoinerChecklistView[] => movesDataOf(c).joiners;

export function leaverChecklistView(c: DemoCompany, employeeId: string)
  : LeaverChecklistView | null {
  return movesDataOf(c).leavers.find((l) => l.employeeId === employeeId)
    ?? null;
}

export function employmentEndView(c: DemoCompany, employeeId: string)
  : EmploymentEndView | null {
  return movesDataOf(c).endings.find((x) => x.employeeId === employeeId)
    ?? null;
}

export function moveViews(c: DemoCompany, kind?: StaffMove["kind"])
  : StaffMove[] {
  return movesDataOf(c).moves.filter((m) => kind === undefined ||
    m.kind === kind);
}

/** The numbers the hiring page leads with, each a count of a list. */
export function hiringSummary(c: DemoCompany): HiringSummary {
  const d = movesDataOf(c);
  const open = d.requisitions.filter((r) => r.status === "open");
  const inProcess = d.candidates.filter((x) =>
    x.stage !== "hired" && x.stage !== "rejected" &&
    x.stage !== "withdrawn").length;
  const out = d.offers.filter((o) => o.status === "sent").length;
  const joiners = d.joiners.filter((j) => j.joiningDate.iso > AS_OF).length;
  return { openRequisitions: open.length,
    openings: open.reduce((n, r) => n + r.openingsLeft, 0),
    candidatesInProcess: inProcess, offersOut: out,
    upcomingJoiners: joiners,
    text: `${plural(open.length, "open requisition", "open " +
      "requisitions")}, ${plural(inProcess, "candidate", "candidates")} ` +
      `in process, ${plural(out, "offer", "offers")} waiting for an ` +
      `answer, ${plural(joiners, "person", "people")} joining soon` };
}
