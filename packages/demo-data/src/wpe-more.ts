import { fils, formatAed, type Fils } from "@payroll/engine";
import { AS_OF } from "./calendar";
import { plural, type DisplayDate } from "./display";
import { PROBATION_MONTHS } from "./roster";
import { LOCATIONS } from "./roster-data";
import type { DemoCompany, DemoEmployee } from "./types";
import { EXPENSE_LIMIT } from "./wp9";
import {
  departmentText,
  jobTitleText,
  managerIdFor,
  offerViews,
  placeText,
  requisitionViews,
  shortDateOf,
  shortDateText,
  movesDataOf,
} from "./wp3";
import { gradeBands, jobCatalogue } from "./wpd-structure";

/**
 * WPE more: the new-employee sheet (P04), the claim route for My
 * expenses (E08) and approval cover (H10). FICTIONAL sample data.
 * Nothing is typed per person: starts come from accepted offers, cover
 * from the demo's own approver rule (managerIdFor), the claim route
 * from the General manager's expense limit. A pending hire is not an
 * employee: it never changes headcount, the run or a report.
 */

const active = (c: DemoCompany): DemoEmployee[] =>
  c.employees.filter((e) => e.leavingDate === null);
const byId = (c: DemoCompany, id: string): DemoEmployee =>
  c.employees.find((e) => e.id === id)!;
const gmOf = (c: DemoCompany): DemoEmployee =>
  c.employees.find((e) => e.jobKey === "general-manager")!;
const makerOf = (c: DemoCompany): DemoEmployee => byId(c,
  c.approvals.find((a) => a.kind === "pay-run")!.makerEmployeeId);

/* ---------------------------------------------------------------- *
 * P04 New employee
 * ---------------------------------------------------------------- */

export interface NewHireStart {
  offerId: string;
  name: string;
  nationality: string;
  jobKey: string;
  title: string;
  departmentId: string;
  departmentText: string;
  location: string;
  locationText: string;
  grade: number;
  basic: Fils;
  basicText: string;
  startOn: DisplayDate;
  probationMonths: number;
  number: string;
  joinerChecklistId: string | null;
}

/** Number the next record takes, after the staff list and the ones made. */
export const nextEmployeeNumber = (c: DemoCompany, made = 0): string =>
  `ZB-${String(c.employees.length + 1 + made).padStart(4, "0")}`;

/** Accepted offers whose person is not yet on the staff list. */
export function newHireStarts(c: DemoCompany): NewHireStart[] {
  const reqs = requisitionViews(c);
  const cands = movesDataOf(c).candidates;
  const joiners = movesDataOf(c).joiners;
  return offerViews(c, "accepted").filter((o) => o.employeeId === null)
    .map((o, i) => {
      const r = reqs.find((x) => x.id === o.requisitionId)!;
      const cand = cands.find((x) => x.id === o.candidateId);
      return { offerId: o.id, name: o.candidateName,
        nationality: cand?.nationality ?? "", jobKey: o.jobKey,
        title: o.title, departmentId: r.departmentId,
        departmentText: r.departmentText, location: r.location,
        locationText: r.locationText, grade: o.grade, basic: o.basic,
        basicText: o.basicText, startOn: o.joiningDate,
        probationMonths: o.probationMonths,
        number: nextEmployeeNumber(c, i),
        joinerChecklistId: joiners.find((j) => j.candidateId ===
          o.candidateId)?.id ?? null };
    });
}

export interface NewHireOptions {
  departments: { id: string; text: string }[];
  places: { id: string; text: string }[];
  jobs: { jobKey: string; title: string; gradeMin: number;
    gradeMax: number; departmentIds: string[] }[];
  bands: { grade: number; min: Fils; max: Fils; text: string }[];
  probationMax: number;
}

export function newHireOptions(c: DemoCompany): NewHireOptions {
  return {
    departments: c.departments.map((d) => ({ id: d.id,
      text: departmentText(d.id) })),
    places: LOCATIONS.map((l) => ({ id: l, text: placeText(l) })),
    jobs: jobCatalogue(c).map((j) => ({ jobKey: j.jobKey, title: j.title,
      gradeMin: j.gradeMin, gradeMax: j.gradeMax,
      departmentIds: j.departmentIds })),
    bands: gradeBands(c).map((b) => ({ grade: b.grade, min: b.basicMin,
      max: b.basicMax, text: b.display.band })),
    probationMax: PROBATION_MONTHS };
}

export interface NewHireInput {
  name: string;
  departmentId: string;
  jobKey: string;
  grade: number;
  location: string;
  basic: Fils;
  startOn: string;
  probationMonths: number;
}

/** Latest start date the sheet accepts (a year ahead of the demo day). */
export const NEW_HIRE_LATEST = "2027-10-27";

/** A plain sentence for the first thing wrong, or null when it holds. */
export function checkNewHire(c: DemoCompany, i: NewHireInput)
  : string | null {
  const o = newHireOptions(c);
  if (i.name.trim().split(/\s+/).filter((x) => x !== "").length < 2) {
    return "Write the full name, first and family name.";
  }
  if (!o.departments.some((d) => d.id === i.departmentId)) {
    return "Choose a department.";
  }
  const job = o.jobs.find((j) => j.jobKey === i.jobKey);
  if (job === undefined) return "Choose a job title.";
  if (i.grade < job.gradeMin || i.grade > job.gradeMax) {
    return `${job.title} sits in ${job.gradeMin === job.gradeMax
      ? `grade ${job.gradeMin}` : `grades ${job.gradeMin} to ${
        job.gradeMax}`}. Choose a grade in that range.`;
  }
  if (!o.places.some((p) => p.id === i.location)) return "Choose a place.";
  const band = o.bands.find((b) => b.grade === i.grade)!;
  if (i.basic < band.min || i.basic > band.max) {
    return `Basic pay for grade ${i.grade} runs ${band.text}. Enter an ` +
      "amount in that range.";
  }
  if (i.startOn <= AS_OF) {
    return `The start date must be after ${shortDateText(AS_OF)}.`;
  }
  if (i.startOn > NEW_HIRE_LATEST) {
    return `The start date must be before ${
      shortDateText(NEW_HIRE_LATEST)}.`;
  }
  if (i.probationMonths < 0 || i.probationMonths > o.probationMax) {
    return `Probation runs from 0 to ${o.probationMax} months.`;
  }
  return null;
}

export interface NewHirePlan {
  makerId: string;
  checkerId: string;
  /** What happens after the General manager signs off. */
  steps: string[];
  /** Said only for UAE nationals. */
  pensionNote: string | null;
}

/** HR makes the record, the General manager signs it off. */
export function newHirePlan(c: DemoCompany, nationality: string)
  : NewHirePlan {
  return { makerId: makerOf(c).id, checkerId: gmOf(c).id,
    steps: ["The record joins the staff list on the start date.",
      "The joiner checklist opens for HR, IT and the line manager.",
      "Bank details, Emirates ID and visa papers are collected before " +
        "the first pay run."],
    pensionNote: nationality === "AE"
      ? "Pension for UAE nationals: Not computed." : null };
}

/* ---------------------------------------------------------------- *
 * E08 My expenses
 * ---------------------------------------------------------------- */

export const EXPENSE_KINDS: readonly string[] = ["Taxi and parking",
  "Client meal", "Travel", "Office supplies", "Books and courses"];

export interface ClaimRoute {
  checkerId: string;
  /** Plain words for who decides and why. */
  text: string;
}

const AED = (n: Fils): string => formatAed(n);

/** Who decides a claim: the line manager up to the limit, else the GM. */
export function claimRoute(c: DemoCompany, employeeId: string,
  amount: Fils): ClaimRoute {
  const e = byId(c, employeeId);
  const gm = gmOf(c);
  const hr = c.employees.find((x) => x.jobKey === "hr-manager")!;
  const leads = active(c).some((x) => x.id !== e.id &&
    managerIdFor(c.employees, x) === e.id);
  if (e.id === gm.id) {
    return { checkerId: hr.id, text: "The HR manager decides the General " +
      "manager's own claims." };
  }
  if (amount > EXPENSE_LIMIT || leads) {
    return { checkerId: gm.id, text: leads && amount <= EXPENSE_LIMIT
      ? "The General manager decides a manager's own claim."
      : `The General manager decides claims over ${AED(EXPENSE_LIMIT)}.` };
  }
  const m = managerIdFor(c.employees, e) ?? gm.id;
  return { checkerId: m, text: `Your line manager decides claims up to ${
    AED(EXPENSE_LIMIT)}.` };
}

export const CLAIM_LIMIT_TEXT = `Claims up to ${AED(EXPENSE_LIMIT)} go to ` +
  "your line manager, larger ones to the General manager. A signed-off " +
  "claim is repaid with the next pay run.";

/** A claim needs a kind, a date in the demo's year up to today, an amount. */
export function checkClaim(i: { kind: string; date: string; amount: Fils;
  note: string }): string | null {
  if (!EXPENSE_KINDS.includes(i.kind)) return "Choose what the claim is for.";
  if (i.date < "2026-01-01" || i.date > AS_OF) {
    return `The date must fall between 1 January 2026 and ${
      shortDateText(AS_OF)}.`;
  }
  if (i.amount <= 0n) return "Enter an amount above zero.";
  if (i.amount > fils(5000000n)) {
    return "Claims above AED 50,000 are made on paper with HR.";
  }
  return null;
}

/* ---------------------------------------------------------------- *
 * H10 Leave cover for approvals
 * ---------------------------------------------------------------- */

export interface CoverPerson { id: string; name: string; title: string }

export interface CoverRow {
  approverId: string;
  name: string;
  title: string;
  /** What this person decides, in plain words. */
  decides: string;
  /** Booked or waiting leave of the approver from today on, if any. */
  away: { from: DisplayDate; to: DisplayDate } | null;
  suggested: CoverPerson;
  candidates: CoverPerson[];
}

export const COVER_PAY_RUN_NOTE = "The pay run is signed off by the " +
  "General manager only. It is never covered by the person who " +
  "prepared it.";

const person = (e: DemoEmployee): CoverPerson => ({ id: e.id,
  name: e.fullName, title: jobTitleText(e.jobKey) });

/** The people who decide something for others, in a fixed order. */
export function coverRows(c: DemoCompany): CoverRow[] {
  const gm = gmOf(c);
  const maker = makerOf(c);
  const staff = active(c);
  const leads = staff.map((e) => managerIdFor(c.employees, e))
    .filter((x): x is string => x !== null);
  const ids = [...new Set([gm.id, maker.id, ...leads])];
  const rows = ids.map((id): CoverRow => {
    const e = byId(c, id);
    const n = leads.filter((x) => x === id).length;
    const own = id === gm.id ? "Expense claims over " + AED(EXPENSE_LIMIT) +
      ", the pay run and pay changes"
      : id === maker.id ? "Prepares the pay run; decides leave for " +
        plural(n, "person", "people")
        : `Leave and expense claims for ${plural(n, "person", "people")}`;
    const lv = c.leaveRequests.filter((r) => r.employeeId === id &&
      r.status !== "rejected" && r.endDate >= AS_OF)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
    const peer = ids.filter((x) => x !== id && x !== gm.id &&
      x !== maker.id && managerIdFor(c.employees, byId(c, x)) !== id)
      .map((x) => byId(c, x)).sort((a, b) =>
        Math.abs(a.grade - e.grade) - Math.abs(b.grade - e.grade) ||
        a.fullName.localeCompare(b.fullName))[0];
    const next = id === gm.id ? maker.id : id === maker.id ? gm.id
      : (peer?.id ?? gm.id);
    // The General manager is covered by one of their own heads of
    // department; everyone else by a colleague outside their team.
    const pool = staff.filter((x) => x.id !== id && (id === gm.id
      ? managerIdFor(c.employees, x) === id && x.grade >= 7
      : managerIdFor(c.employees, x) !== id && x.grade >= 5));
    return { approverId: id, name: e.fullName, title: jobTitleText(e.jobKey),
      decides: own, away: lv === undefined ? null
        : { from: shortDateOf(lv.startDate), to: shortDateOf(lv.endDate) },
      suggested: person(byId(c, next)),
      candidates: pool.sort((a, b) => b.grade - a.grade ||
        a.fullName.localeCompare(b.fullName)).map(person) };
  });
  return rows;
}

/** A plain sentence for the first thing wrong, or null when it holds. */
export function checkCover(c: DemoCompany, approverId: string,
  coverId: string, from: string, to: string): string | null {
  const row = coverRows(c).find((r) => r.approverId === approverId);
  if (row === undefined) return "That person does not sign off anything.";
  if (coverId === approverId) return "Choose someone other than the person " +
    "they cover for.";
  if (!row.candidates.some((x) => x.id === coverId)) {
    return "Choose one of the colleagues listed for them.";
  }
  if (from <= AS_OF) return `Cover starts after ${shortDateText(AS_OF)}.`;
  if (to < from) return "The end date comes before the start date.";
  if (to > "2027-10-27") return "Cover can run for up to a year.";
  return null;
}
