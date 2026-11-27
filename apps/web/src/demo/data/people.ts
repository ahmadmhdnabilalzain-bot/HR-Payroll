import {
  accruedHalves,
  addDays,
  balanceHalves,
  countLeaveHalves,
  daysBetween,
  fils,
} from "@payroll/engine";
import {
  ANNUAL_POLICY,
  DEMO_LABELS,
  explainPayslipLine,
  isDemoLabelKey,
  holidays,
  isHoliday,
  isWorkingDay,
  PENSION_NOT_COMPUTED,
  payslipByEmployee,
  type DemoCompany,
  type DemoEmployee,
} from "@payroll/demo-data";
import { people as P_EN } from "../../i18n/en/people";
import { toExplanation } from "./people-explain";
import type { Localized } from "./types";
import type {
  AnnualBalance,
  DayCount,
  LeaveRequestView,
  LeaveTypeId,
  LeaveUse,
  PayslipLineView,
  PayslipView,
  PeopleData,
  Person,
  PersonStatus,
} from "./people-types";

/**
 * The People and Time off view over the demo company. Imported only by
 * adapter.ts, so the package (and the engine) stay in the lazy chunk.
 */

function label(key: string): Localized {
  if (!isDemoLabelKey(key)) throw new Error(`DEMO_NO_LABEL: ${key}`);
  return { en: DEMO_LABELS.en[key], ar: DEMO_LABELS.ar[key] };
}

const same = (text: string): Localized => ({ en: text, ar: text });

/**
 * The package's rule for who decides (workplace.ts): the most senior
 * person of the same department, same location first. The package
 * falls back to the GM, which would make the GM decide his own
 * request; then the HR manager decides instead (maker-checker).
 */
export function approverIn(es: DemoEmployee[], id: string): string {
  const e = es.find((x) => x.id === id);
  if (e === undefined) throw new Error(`no employee ${id}`);
  const senior = es.filter((x) => x.departmentId === e.departmentId &&
    x.grade > e.grade && x.leavingDate === null)
    .sort((a, b) => b.grade - a.grade);
  const local = senior.filter((x) => x.location === e.location);
  const gm = es.find((x) => x.jobKey === "general-manager")?.id
    ?? "emp-001";
  const pick = (local[0] ?? senior[0])?.id ?? gm;
  if (pick !== id) return pick;
  const hr = es.find((x) => x.jobKey === "hr-manager");
  if (hr === undefined) throw new Error("DEMO_NO_HR_MANAGER");
  return hr.id;
}

function statusOf(e: DemoEmployee, asOf: string)
  : [PersonStatus, string | null] {
  if (e.leavingDate !== null && e.leavingDate <= asOf) {
    return ["left", e.leavingDate];
  }
  if (e.joiningDate > asOf) return ["joining", e.joiningDate];
  if (e.probationEndDate !== null && e.probationEndDate > asOf) {
    return ["probation", e.probationEndDate];
  }
  return ["active", null];
}

function toPerson(c: DemoCompany, e: DemoEmployee): Person {
  const dept = c.departments.find((d) => d.id === e.departmentId);
  const [status, statusDate] = statusOf(e, c.asOf);
  return { id: e.id, number: e.number,
    name: { en: e.fullName, ar: e.fullNameAr ?? e.fullName },
    role: label(`job.${e.jobKey}`), departmentId: e.departmentId,
    department: dept === undefined ? same("") : label(dept.labelKey),
    branch: label(`location.${e.location}`), status, statusDate,
    joinedOn: e.joiningDate, leftOn: e.leavingDate,
    probationEndsOn: e.probationEndDate, grade: e.grade,
    nationality: e.nationality, gender: e.gender, uaeNational:
      e.workerClass === "uae-national", email: e.email,
    emiratesIdMasked: e.emiratesId.masked,
    ibanMasked: e.iban?.masked ?? null,
    approverId: approverIn(c.employees, e.id) };
}

function payslipOf(c: DemoCompany, employeeId: string)
  : PayslipView | null {
  const s = payslipByEmployee(c, employeeId);
  if (s === null) return null;
  const p = s.payslip;
  const codeOf = (traceId: string): string | null =>
    traceId.includes("#") ? traceId.split("#")[1] ?? null : null;
  const lines: PayslipLineView[] = [
    ...p.earnings.map((l) => ({ traceId: l.traceId,
      group: "earning" as const, engineLabel: l.label, kind: l.kind,
      code: codeOf(l.traceId), amountFils: l.amount })),
    ...p.deductions.map((l) => ({ traceId: l.traceId,
      group: "deduction" as const, engineLabel: l.label, kind: l.kind,
      code: codeOf(l.traceId), amountFils: l.amount })),
  ];
  return { id: s.id, employeeId, month: `${p.year}-${String(p.month)
    .padStart(2, "0")}`, payStart: p.payStart, payEnd: p.payEnd,
  daysInPeriod: p.daysInPeriod, unpaidDays: p.unpaidDays, lines,
  grossFils: p.gross, deductionsFils: p.totalDeductions, netFils: p.net,
  grossTraceId: "earn.gross", deductionsTraceId: "ded.total",
  netTraceId: "pay.net",
  pension: s.pension === null ? null : { status: "not-computed",
    traceId: s.pension.traceId, text: { en: PENSION_NOT_COMPUTED.en,
      ar: PENSION_NOT_COMPUTED.ar } },
  held: s.sif.included ? null : s.sif.reason,
  rulesScope: label("scope.rules") };
}

/** A payslip line in the payslip's own words (English: the working's
 * other lines are English too). */
const LINE_WORDS: Record<string, string> = {
  basic: P_EN.lineBasic, housing: P_EN.lineHousing,
  conveyance: P_EN.lineTransport, transport: P_EN.lineTransport,
  phone: P_EN.linePhone, "back-pay": P_EN.lineBackPay,
  overtime: P_EN.lineOvertime, "rest-day": P_EN.lineRestDay,
  holiday: P_EN.lineHoliday, "leave-encashment": P_EN.lineEncash,
};
const lineWords = (l: PayslipLineView): string =>
  (l.code === null ? undefined : LINE_WORDS[l.code]) ?? LINE_WORDS[l.kind]
  ?? l.engineLabel;

function explainOf(c: DemoCompany, payslipId: string, traceId: string,
  title: string, lang: "en" | "ar") {
  const x = explainPayslipLine(c, payslipId, traceId);
  const slip = c.payRun.payslips.find((p) => p.id === payslipId);
  const who = c.employees.find((e) => e.id === slip?.employeeId);
  const pension = traceId === slip?.pension?.traceId;
  // Net pay is worked from its earnings (each line as the payslip
  // names it), so the panel shows how gross is made.
  const view = slip === undefined ? null : payslipOf(c, slip.employeeId);
  const gross = traceId !== view?.netTraceId ? undefined : view.lines
    .filter((l) => l.group === "earning").map((l) => ({
      label: lineWords(l), fils: String(l.amountFils) }));
  return toExplanation(`payslip:${payslipId}:${traceId}`, x, {
    ...(gross === undefined ? {} : { gross }),
    label: title, subject: who === undefined ? "" : lang === "ar"
      ? who.fullNameAr ?? who.fullName : who.fullName, lang,
    scope: label("scope.rules")[lang],
    notComputed: pension ? PENSION_NOT_COMPUTED[lang] : null });
}

function requestsOf(c: DemoCompany): LeaveRequestView[] {
  return c.leaveRequests.map((r) => ({ id: r.id,
    employeeId: r.employeeId, leaveTypeId: r.leaveTypeId as LeaveTypeId,
    startDate: r.startDate, endDate: r.endDate, halves: r.halves,
    status: r.status, reason: label(r.reasonKey),
    approvalId: c.approvals.find((a) => a.kind === "leave" &&
      a.subjectId === r.id)?.id ?? null,
    approverId: c.approvals.find((a) => a.kind === "leave" &&
      a.subjectId === r.id)?.checkerEmployeeId
      ?? approverIn(c.employees, r.employeeId) }));
}

/**
 * Annual leave for 2026 from the engine, with the same inputs as the
 * package (leave.ts), but the taken and pending uses given: so a
 * decision or a new request in the demo re-runs the engine.
 */
function balanceOf(c: DemoCompany, employeeId: string, uses: LeaveUse[])
  : AnnualBalance | null {
  const e = c.employees.find((x) => x.id === employeeId);
  if (e === undefined || e.joiningDate > c.asOf) return null;
  const pkg = c.leaveBalances.find((b) => b.employeeId === employeeId);
  if (pkg !== undefined && pkg.availableHalves === null) {
    // At exit the package gives one figure (the settlement's): use it.
    return { employeeId, year: pkg.year, accruedHalves: pkg.accruedHalves,
      takenHalves: pkg.takenHalves, pendingHalves: pkg.pendingHalves,
      availableDays: pkg.availableDays, basis: pkg.basis };
  }
  const asOf = e.leavingDate !== null && e.leavingDate < c.asOf
    ? e.leavingDate : c.asOf;
  const mine = uses.filter((u) => u.employeeId === employeeId &&
    u.leaveTypeId === "lt-annual" && u.startDate.startsWith("2026"));
  const accrued = accruedHalves(ANNUAL_POLICY, e.joiningDate, 2026, asOf);
  const pending = mine.filter((u) => u.state === "pending")
    .reduce((s, u) => s + u.halves, 0);
  const b = balanceHalves({ accruedHalves: accrued, carriedHalves: 0,
    carriedExpiresOn: null, adjustmentHalves: 0,
    taken: mine.filter((u) => u.state === "taken")
      .map((u) => ({ date: u.startDate, halves: u.halves })),
    pendingHalves: pending, asOf });
  return { employeeId, year: 2026, accruedHalves: accrued,
    takenHalves: b.takenHalves, pendingHalves: pending,
    availableDays: b.availableHalves / 2, basis: null };
}

/**
 * The engine's working-day count: the weekend is Sat and Sun, and the
 * sample public holidays (Setup, Public holidays) are skipped too.
 */
export function countDays(startDate: string, endDate: string): DayCount {
  if (endDate < startDate) {
    return { halves: 0, weekendDays: 0, holidayDays: 0 };
  }
  const restDates = new Set<string>();
  const holidayDates = new Set<string>();
  const n = daysBetween(startDate, endDate) + 1;
  for (let i = 0; i < n; i++) {
    const d = addDays(startDate, i);
    if (!isWorkingDay(d)) restDates.add(d);
    else if (isHoliday(d)) holidayDates.add(d);
  }
  const r = countLeaveHalves({ start: startDate, end: endDate,
    startPart: "full", endPart: "full" }, "working",
  { restDates, holidayDates });
  const why = (w: string): number => r.skipped.filter((x) => x.why === w)
    .length;
  return { halves: r.halves, weekendDays: why("rest-day"),
    holidayDays: why("holiday") };
}

/** The sample public holiday a date falls in, or null. */
export function holidayOn(iso: string): string | null {
  return holidays().find((h) => iso >= h.from && iso <= h.to)?.name ?? null;
}

export function adaptPeople(c: DemoCompany): PeopleData {
  const people = c.employees.map((e) => toPerson(c, e))
    .sort((a, b) => a.name.en.localeCompare(b.name.en));
  const byId = new Map(people.map((p) => [p.id, p]));
  const run = c.approvals.find((a) => a.kind === "pay-run");
  const employee = c.employees.find((e) => e.cases.includes("overtime"));
  const it = c.employees.find((e) => e.jobKey === "it-manager");
  if (run === undefined || employee === undefined || it === undefined) {
    throw new Error("DEMO_NO_PERSONAS");
  }
  const personas = { hrId: run.makerEmployeeId, gmId: run.checkerEmployeeId,
    employeeId: employee.id, itId: it.id,
    managerId: approverIn(c.employees, employee.id) };
  const requests = requestsOf(c);
  return {
    asOf: c.asOf,
    personas: () => personas,
    people: () => people,
    person: (id) => byId.get(id) ?? null,
    departments: () => c.departments.map((d) => ({ id: d.id,
      name: label(d.labelKey) })),
    payslip: (id) => payslipOf(c, id),
    explain: (payslipId, traceId, title, lang) =>
      explainOf(c, payslipId, traceId, title, lang),
    emiratesIdFull: (id) => c.employees.find((e) => e.id === id)
      ?.emiratesId.value ?? null,
    documentsOf: (id) => c.documents.filter((d) => d.employeeId === id)
      .map((d) => ({ id: d.id, employeeId: d.employeeId,
        kind: label(`doc.${d.kind}`), numberMasked: d.number.masked,
        expiresOn: d.expiresOn, daysLeft: d.daysLeft, state: d.state })),
    leaveTypes: () => c.leaveTypes.map((t) => ({
      id: t.id as LeaveTypeId, name: label(t.labelKey), paid: t.paid,
      annualDays: t.annualDays, rule: t.rule })),
    reasons: () => ["reason.travel", "reason.family", "reason.rest",
      "reason.medical", "reason.personal"].map((key) => ({ key,
      text: label(key) })),
    leaveRequests: () => requests,
    leaveApprovalTitle: label("approval.leave"),
    annualBalance: (id, uses) => balanceOf(c, id, uses),
    countDays,
    holidayOn,
    approverOf: (id) => approverIn(c.employees, id),
  };
}
