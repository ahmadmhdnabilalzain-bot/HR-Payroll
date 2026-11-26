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
  isWorkingDay,
  issuesOf,
  PENSION_NOT_COMPUTED,
  payslipByEmployee,
  type DemoCompany,
  type DemoEmployee,
} from "@payroll/demo-data";
import type { Localized } from "./types";
import type {
  AnnualBalance,
  DayCount,
  ExplainedFigure,
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
    nationality: e.nationality, uaeNational:
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

/** "prorationBasis" to "proration basis". */
const words = (key: string): string =>
  key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();

function explainOf(c: DemoCompany, payslipId: string, traceId: string)
  : ExplainedFigure {
  const x = explainPayslipLine(c, payslipId, traceId);
  const numeric = /^-?\d+$/.test(x.line.result);
  return { payslipId, traceId, label: x.line.label,
    text: { en: x.text.en, ar: x.text.ar },
    amountFils: numeric ? fils(BigInt(x.line.result)) : null,
    formula: x.line.formula,
    rules: x.rules.map((r) => ({ name: words(r.key), status: r.status,
      source: r.source?.note ?? null })),
    rulesScope: label("scope.rules") };
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
    availableHalves: b.availableHalves };
}

/** The engine's working-day count; the demo's weekend is Sat and Sun. */
export function countDays(startDate: string, endDate: string): DayCount {
  if (endDate < startDate) return { halves: 0, weekendDays: 0 };
  const restDates = new Set<string>();
  const n = daysBetween(startDate, endDate) + 1;
  for (let i = 0; i < n; i++) {
    const d = addDays(startDate, i);
    if (!isWorkingDay(d)) restDates.add(d);
  }
  const r = countLeaveHalves({ start: startDate, end: endDate,
    startPart: "full", endPart: "full" }, "working",
  { restDates, holidayDates: new Set() });
  return { halves: r.halves, weekendDays: r.skipped.length };
}

export function adaptPeople(c: DemoCompany): PeopleData {
  const people = c.employees.map((e) => toPerson(c, e))
    .sort((a, b) => a.name.en.localeCompare(b.name.en));
  const byId = new Map(people.map((p) => [p.id, p]));
  const run = c.approvals.find((a) => a.kind === "pay-run");
  const employee = c.employees.find((e) => e.cases.includes("overtime"));
  if (run === undefined || employee === undefined) {
    throw new Error("DEMO_NO_PERSONAS");
  }
  const personas = { hrId: run.makerEmployeeId, gmId: run.checkerEmployeeId,
    employeeId: employee.id,
    managerId: approverIn(c.employees, employee.id) };
  const issues = issuesOf(c);
  const requests = requestsOf(c);
  return {
    asOf: c.asOf,
    personas: () => personas,
    people: () => people,
    person: (id) => byId.get(id) ?? null,
    departments: () => c.departments.map((d) => ({ id: d.id,
      name: label(d.labelKey) })),
    payslip: (id) => payslipOf(c, id),
    explain: (payslipId, traceId) => explainOf(c, payslipId, traceId),
    documentsOf: (id) => c.documents.filter((d) => d.employeeId === id)
      .map((d) => ({ id: d.id, employeeId: d.employeeId,
        kind: label(`doc.${d.kind}`), numberMasked: d.number.masked,
        expiresOn: d.expiresOn, daysLeft: d.daysLeft, state: d.state })),
    notesOf: (id) => issues.filter((i) => i.employeeId === id)
      .map((i, n) => ({ id: `${i.code}:${i.subjectId ?? id}:${n}`,
        kind: i.kind, title: i.title, reason: i.plainReason,
        fix: i.suggestedFix, dateText: i.date?.display ?? null })),
    leaveTypes: () => c.leaveTypes.map((t) => ({
      id: t.id as LeaveTypeId, name: label(t.labelKey), paid: t.paid,
      annualDays: t.annualDays })),
    reasons: () => ["reason.travel", "reason.family", "reason.rest",
      "reason.medical", "reason.personal"].map((key) => ({ key,
      text: label(key) })),
    leaveRequests: () => requests,
    leaveApprovalTitle: label("approval.leave"),
    annualBalance: (id, uses) => balanceOf(c, id, uses),
    countDays,
    approverOf: (id) => approverIn(c.employees, id),
  };
}
