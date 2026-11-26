import {
  addDays,
  daysBetween,
  fils,
  formatAed,
  type Fils,
} from "@payroll/engine";
import { AS_OF } from "./calendar";
import { dateOf, plural, type DisplayDate } from "./display";
import { GRADE_BASIC } from "./roster-data";
import type { DemoCompany, DemoEmployee } from "./types";
import { jobTitleText, movesDataOf } from "./wp3";

/**
 * WPE referral and agency ledger: bonuses owed to the staff who
 * referred a hire, fees owed to agencies, and where each stands.
 * FICTIONAL terms written for the demo (an owner's own policy, not a
 * rule of law): a referral bonus by grade band, an agency fee of 8% of
 * the first year's basic salary, both payable once the hire has
 * completed 90 days. Candidates come from the hiring board (source
 * "Referral" or "Agency"); earlier hires are staff who joined from
 * January 2025. Marking a row payable only drafts it for the next
 * run: nothing here is added to the pay run or any payslip.
 */

export type ReferralKind = "referral" | "agency";

/** open: still hiring; closed: no hire; probation: hired, inside the
 * 90 days; payable: the 90 days are done. */
export type ReferralStage = "open" | "closed" | "probation" | "payable";

export const PAYABLE_AFTER_DAYS = 90;
export const AGENCY_FEE_BPS = 800;
export const REFERRAL_BONUS_LOW = 250000n;
export const REFERRAL_BONUS_HIGH = 500000n;
export const REFERRAL_BAND_GRADE = 5;

export const AGENCIES: readonly string[] = ["Falcon Search Partners",
  "Gulf Crest Staffing"];

export const REFERRAL_TERMS = "Demo terms, our own policy and not a " +
  "rule of law: a referral bonus by grade band, an agency fee of 8% of " +
  "the first year's basic salary, each payable once the hire has " +
  "completed 90 days.";

export const NEXT_RUN_TEXT = "November 2026";

export const DRAFT_LABEL = `Draft for the ${NEXT_RUN_TEXT} run. Nothing ` +
  "is added to the pay run.";

export interface ReferralRow {
  id: string;
  kind: ReferralKind;
  kindText: string;
  candidateName: string;
  /** The role, in plain words. */
  roleText: string;
  /** The referrer (a colleague) or the agency. */
  sourceName: string;
  referrerId: string | null;
  stage: ReferralStage;
  stageText: string;
  amount: Fils;
  amountText: string;
  /** How the amount was worked out, one plain line. */
  basisText: string;
  joinedOn: DisplayDate | null;
  payableFrom: DisplayDate | null;
  /** Days until it is payable; 0 once it is; null with no hire yet. */
  daysToPayable: number | null;
  /** Days since joining; null with no hire yet. */
  daysIn: number | null;
  note: string;
  /** Staff record of the hire, when there is one. */
  employeeId: string | null;
}

const KIND_TEXT: Record<ReferralKind, string> = {
  referral: "Referral bonus", agency: "Agency fee" };

/** The bonus for a grade (fictional terms). */
export const bonusOf = (grade: number): Fils => fils(
  grade <= REFERRAL_BAND_GRADE ? REFERRAL_BONUS_LOW : REFERRAL_BONUS_HIGH);

/** The agency fee on a monthly basic: 12 months at 8%, half up. */
export const agencyFeeOf = (basicMonthly: bigint): Fils => fils(
  (basicMonthly * 12n * BigInt(AGENCY_FEE_BPS) + 5000n) / 10000n);

/** Where a hire stands, from the joining date and the report date. */
export function stageOfHire(joined: string, asOf: string = AS_OF)
  : { stage: "probation" | "payable"; daysIn: number; left: number } {
  const daysIn = daysBetween(joined, asOf);
  const left = Math.max(0, PAYABLE_AFTER_DAYS - daysIn);
  return { stage: left === 0 ? "payable" : "probation", daysIn, left };
}

const STAGE_WORD: Record<ReferralStage, string> = {
  open: "Not hired yet", closed: "Closed, no fee",
  probation: "Hired, in the first 90 days", payable: "Payable" };

function refereeOf(c: DemoCompany, who: DemoEmployee): DemoEmployee | null {
  const ok = c.employees.filter((e) => e.id !== who.id &&
    e.departmentId === who.departmentId && e.leavingDate === null &&
    e.joiningDate <= addDays(who.joiningDate, -365));
  return [...ok].sort((a, b) => a.id.localeCompare(b.id))[0] ?? null;
}

function row(p: Omit<ReferralRow, "kindText" | "amountText" | "stageText">)
  : ReferralRow {
  return { ...p, kindText: KIND_TEXT[p.kind],
    amountText: formatAed(p.amount), stageText: STAGE_WORD[p.stage] };
}

/** Candidates from the hiring board whose source carries a fee. */
function pipelineRows(c: DemoCompany): ReferralRow[] {
  const data = movesDataOf(c);
  return data.candidates.filter((x) => x.source === "Referral" ||
    x.source === "Agency").map((x) => {
    const req = data.requisitions.find((r) => r.id === x.requisitionId)!;
    const offer = data.offers.find((o) => o.id === x.offerId);
    const kind: ReferralKind = x.source === "Agency" ? "agency"
      : "referral";
    const hm = c.employees.find((e) => e.id === req.hiringManagerId)!;
    const referrer = kind === "referral" ? refereeOf(c, hm) : null;
    const basic = offer?.basic ?? fils(GRADE_BASIC[req.grade]!);
    const amount = kind === "agency" ? agencyFeeOf(basic)
      : bonusOf(req.grade);
    const closed = x.stage === "rejected" || x.stage === "withdrawn";
    const joining = offer?.joiningDate.iso ?? null;
    return row({ id: `ref-${x.id}`, kind, candidateName: x.name,
      roleText: req.title,
      sourceName: kind === "agency"
        ? AGENCIES[Number(x.id.slice(-3)) % 2]!
        : referrer?.fullName ?? "Staff referral",
      referrerId: referrer?.id ?? null,
      stage: closed ? "closed" : "open", amount,
      basisText: kind === "agency" ? "8% of the first year's basic " +
        (offer === undefined ? "at the start of the grade's band"
          : "in the offer") : `Grade ${req.grade} band`,
      joinedOn: null,
      payableFrom: joining === null || closed ? null
        : dateOf(addDays(joining, PAYABLE_AFTER_DAYS)),
      daysToPayable: null, daysIn: null,
      note: closed ? `${x.note} No fee is owed.` : x.note +
        (joining === null ? "" : ` If the offer is accepted and ` +
          `${x.name.split(" ")[0]} joins on ${dateOf(joining).display}, ` +
          "the fee is payable 90 days later."),
      employeeId: null });
  });
}

/** Staff hired from January 2025 who are not a hiring-board record. */
function hireRows(c: DemoCompany): ReferralRow[] {
  const onBoard = new Set(movesDataOf(c).candidates
    .map((x) => x.employeeId).filter((x) => x !== null));
  const hires = c.employees.filter((e) => e.joiningDate >= "2025-01-01" &&
    e.joiningDate <= AS_OF && !onBoard.has(e.id) &&
    !e.cases.includes("probation"))
    .sort((a, b) => a.joiningDate.localeCompare(b.joiningDate) ||
      a.id.localeCompare(b.id));
  return hires.map((e, i) => {
    const kind: ReferralKind = i % 2 === 0 ? "referral" : "agency";
    const referrer = kind === "referral" ? refereeOf(c, e) : null;
    const st = stageOfHire(e.joiningDate);
    const amount = kind === "agency" ? agencyFeeOf(e.basicMonthly)
      : bonusOf(e.grade);
    return row({ id: `ref-${e.id}`, kind,
      candidateName: e.fullName, roleText: jobTitleText(e.jobKey),
      sourceName: kind === "agency" ? AGENCIES[i % 2]!
        : referrer?.fullName ?? "Staff referral",
      referrerId: referrer?.id ?? null, stage: st.stage, amount,
      basisText: kind === "agency" ? "8% of the first year's basic"
        : `Grade ${e.grade} band`,
      joinedOn: dateOf(e.joiningDate),
      payableFrom: dateOf(addDays(e.joiningDate, PAYABLE_AFTER_DAYS)),
      daysToPayable: st.left, daysIn: st.daysIn,
      note: st.stage === "payable"
        ? `Joined ${dateOf(e.joiningDate).display}; the 90 days are done.`
        : `Joined ${dateOf(e.joiningDate).display}; ${plural(st.left,
          "day", "days")} to go.`, employeeId: e.id });
  });
}

/** The ledger: hires first (payable on top), then the candidates. */
export function referralLedger(c: DemoCompany): ReferralRow[] {
  const order: Record<ReferralStage, number> = { payable: 0,
    probation: 1, open: 2, closed: 3 };
  return [...hireRows(c), ...pipelineRows(c)].sort((a, b) =>
    order[a.stage] - order[b.stage] ||
    a.candidateName.localeCompare(b.candidateName));
}

export interface ReferralSummary {
  /** Owed now and not yet marked. */
  ready: Fils;
  /** Marked as a draft for the next run. */
  marked: Fils;
  /** Everything owed and not paid: ready plus marked. */
  outstanding: Fils;
  /** Hired inside the 90 days, or not hired yet. */
  notYet: Fils;
  readyCount: number;
  markedCount: number;
  display: { ready: string; marked: string; outstanding: string;
    notYet: string; next: string };
}

const total = (xs: readonly ReferralRow[]): Fils =>
  fils(xs.reduce((n, r) => n + r.amount, 0n));

/** Totals for the ledger; `marked` holds the row ids marked payable. */
export function referralSummary(rows: readonly ReferralRow[],
  marked: ReadonlySet<string>): ReferralSummary {
  const owed = rows.filter((r) => r.stage === "payable");
  const ready = owed.filter((r) => !marked.has(r.id));
  const mk = owed.filter((r) => marked.has(r.id));
  const notYet = rows.filter((r) => r.stage === "probation" ||
    r.stage === "open");
  const out = total(owed);
  return { ready: total(ready), marked: total(mk), outstanding: out,
    notYet: total(notYet), readyCount: ready.length,
    markedCount: mk.length,
    display: { ready: formatAed(total(ready)),
      marked: formatAed(total(mk)), outstanding: formatAed(out),
      notYet: formatAed(total(notYet)),
      next: NEXT_RUN_TEXT } };
}
