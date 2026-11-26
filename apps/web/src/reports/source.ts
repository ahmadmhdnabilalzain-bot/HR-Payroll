import {
  auditEvents,
  auditRows,
  buildDemoCompany,
  DEMO_LABELS,
  employeeById,
  HISTORY_SICK,
  isDemoLabelKey,
  payrollHistory,
  reportMonth,
  varianceBetween,
  verifyAuditChain,
  workingDaysBetween,
  type DemoCompany,
  type DemoEmployee,
} from "@payroll/demo-data";
import type {
  AuditCheck,
  AuditView,
  DeptHeads,
  LeavePerson,
  MonthRow,
  OvertimeLine,
  ReportsSource,
  VarianceView,
} from "./types";

/**
 * The only report file that imports the package (a lazy chunk, beside
 * the pay run's). Everything the new report screens show is worked out
 * here from the package's own selectors; nothing is typed in.
 */

/** Plain words for the audit trail's action codes. */
const ACTION: Record<string, string> = {
  "access.user-invited": "User invited",
  "access.role-changed": "Role changed",
  "access.api-key-created": "Key created",
  "access.webhook-created": "Webhook created",
  "access.review-completed": "Access review done",
  "setup.mfa-required": "Two-step sign-in required",
  "payrun.calculated": "Pay run worked out",
  "payrun.submitted": "Pay run sent for sign-off",
  "payrun.approved": "Pay run signed off",
  "wps.file-created": "Salary file made",
  "wps.file-sent": "Salary file sent",
  "leave.requested": "Leave asked for",
  "leave.approved": "Leave booked",
  "leave.rejected": "Leave declined",
  "expense.submitted": "Expense sent",
  "expense.approved": "Expense signed off",
  "salary.revised": "Salary revised",
  "salary.approved": "Salary change signed off",
  "employee.created": "Employee added",
  "employee.resignation-recorded": "Resignation recorded",
  "settlement.prepared": "Settlement prepared",
};

const AREA: Record<string, string> = { pay: "Pay", people: "People",
  time: "Time off", access: "Access", setup: "Setup" };

/** Our words, not claims: "approved" reads "booked" or "signed off". */
export function plainAudit(text: string): string {
  const word = /leave/i.test(text) ? "booked" : "signed off";
  return text.replace(/\bapproved\b/g, word)
    .replace(/\brejected\b/g, "declined");
}

const deptName = (c: DemoCompany, id: string): string => {
  const d = c.departments.find((x) => x.id === id);
  const key = d?.labelKey ?? "";
  return isDemoLabelKey(key) ? DEMO_LABELS.en[key] : id;
};

const heldOn = (e: DemoEmployee, on: string): boolean =>
  e.joiningDate <= on && (e.leavingDate === null || e.leavingDate > on);

function monthRows(c: DemoCompany): MonthRow[] {
  return payrollHistory(c).map((m) => ({ month: m.month,
    label: reportMonth(m.month), paid: m.status === "paid",
    headcount: m.headcount, gross: m.gross, deductions: m.deductions,
    net: m.net, overtimeMinutes: m.overtimeMinutes,
    overtimeAmount: m.overtimeAmount,
    overtimePeople: m.lines.filter((l) => l.overtimeMinutes > 0).length,
    annualDays: m.leaveTaken.annual, sickDays: m.leaveTaken.sick,
    unpaidDays: m.leaveTaken.unpaid }));
}

function varianceView(c: DemoCompany, month: string,
  against: string): VarianceView {
  const v = varianceBetween(c, month, against);
  const h = payrollHistory(c);
  const at = (k: string) => h.find((m) => m.month === k)!;
  return { month, against, monthLabel: reportMonth(month),
    againstLabel: reportMonth(against), grossNow: at(month).gross,
    grossBefore: at(against).gross, grossChange: v.grossChange,
    netChange: v.netChange, headcountChange: v.headcountChange,
    drivers: v.drivers.map((d) => ({ key: d.key, label: d.label,
      amount: d.amount, people: d.people.map((id) =>
        employeeById(c, id).fullName) })) };
}

function auditViews(c: DemoCompany): AuditView[] {
  const ev = auditEvents(c);
  return auditRows(c).map((r, i) => ({ id: r.id, seq: ev[i]!.seq,
    when: r.when, who: r.who, area: AREA[r.area] ?? r.area,
    action: ACTION[r.action] ?? r.action,
    summary: plainAudit(r.summary), subject: plainAudit(r.subjectLabel),
    shortHash: r.shortHash, shortPrev: r.shortPrev }));
}

function departmentHeads(c: DemoCompany): DeptHeads[] {
  const asOf = c.asOf;
  return c.departments.map((d): DeptHeads => {
    const mine = c.employees.filter((e) => e.departmentId === d.id);
    return { name: deptName(c, d.id),
      start: mine.filter((e) => heldOn(e, "2026-01-01")).length,
      joined: mine.filter((e) => e.joiningDate > "2026-01-01" &&
        e.joiningDate <= asOf).length,
      departed: mine.filter((e) => e.leavingDate !== null &&
        e.leavingDate > "2026-01-01" && e.leavingDate <= asOf).length,
      now: mine.filter((e) => heldOn(e, asOf)).length };
  });
}

function overtimeLines(c: DemoCompany): OvertimeLine[] {
  return payrollHistory(c).flatMap((m) => m.lines
    .filter((l) => l.overtimeMinutes > 0)
    .map((l) => ({ month: m.month, name: employeeById(c,
      l.employeeId).fullName, minutes: l.overtimeMinutes,
    amount: l.overtimeAmount })));
}

function daysOf(from: string, to: string): number {
  return workingDaysBetween(from, to).length;
}

function leavePeople(c: DemoCompany): LeavePerson[] {
  return c.employees.map((e): LeavePerson => {
    const mine = c.leaveRequests.filter((r) => r.employeeId === e.id);
    const days = (type: string, status: string): number => mine
      .filter((r) => r.leaveTypeId === type && r.status === status)
      .reduce((n, r) => n + daysOf(r.startDate, r.endDate), 0);
    const bal = c.leaveBalances.find((b) => b.employeeId === e.id &&
      b.leaveTypeId === "lt-annual");
    const sick = HISTORY_SICK.filter(([id]) => id === e.id)
      .reduce((n, [, a, b]) => n + daysOf(a, b), 0);
    const waiting = mine.filter((r) => r.status === "pending")
      .reduce((n, r) => n + daysOf(r.startDate, r.endDate), 0);
    return { name: e.fullName, department: deptName(c, e.departmentId),
      annualLeft: bal?.availableDays ?? 0,
      annualTaken: (bal?.takenHalves ?? 0) / 2,
      sickDays: sick + days("lt-sick", "approved"),
      unpaidDays: days("lt-unpaid", "approved"), waitingDays: waiting };
  });
}

export function buildReportsSource(): ReportsSource {
  const c = buildDemoCompany();
  const events = auditEvents(c);
  const people = leavePeople(c);
  const active = people.filter((p) => p.annualTaken + p.sickDays +
    p.unpaidDays + p.waitingDays > 0);
  return {
    asOf: c.asOf,
    months: monthRows(c),
    variance: (month, against) => varianceView(c, month, against),
    audit: auditViews(c),
    verifyAudit: (tamperSeq): AuditCheck => verifyAuditChain(
      tamperSeq === null ? events : events.map((e) => e.seq === tamperSeq
        ? { ...e, summary: `${e.summary} (edited)` } : e)),
    departments: departmentHeads(c),
    joiners: c.employees.filter((e) => e.joiningDate > "2026-01-01" &&
      e.joiningDate <= c.asOf).map((e) => e.fullName),
    leavers: c.employees.filter((e) => e.leavingDate !== null &&
      e.leavingDate > "2026-01-01" && e.leavingDate <= c.asOf)
      .map((e) => e.fullName),
    overtime: overtimeLines(c),
    leave: active,
    leaveOthers: people.length - active.length,
    annualLeftTotal: people.reduce((n, p) => n + p.annualLeft, 0),
  };
}
