import {
  attendanceAgainstShifts,
  buildDemoCompany,
  LATE_GRACE_MINUTES,
  overtimeClaims,
  overtimePreApprovals,
  punches,
  rosterPlan,
  shifts,
  unmatchedPunches,
} from "@payroll/demo-data";
import type { TimeData, TimeSource } from "./time-types";

const hm = (stamp: string | null): string | null =>
  stamp === null ? null : stamp.slice(11, 16);

/**
 * The Time half of the demo company: shifts, the November roster,
 * attendance, punches and overtime, all from the package (the engine's
 * day sheets and payslips). This file and adapter.ts are the only ones
 * that import the package; it loads as its own chunk (time-load.ts).
 */
export function buildTimeSource(): TimeSource {
  const c = buildDemoCompany();
  const against = attendanceAgainstShifts(c);
  const plan = rosterPlan(c);
  const data: TimeData = {
    asOf: c.asOf,
    lateGraceMinutes: LATE_GRACE_MINUTES,
    activeToday: c.employees.filter((e) => e.joiningDate <= c.asOf &&
      (e.leavingDate === null || e.leavingDate >= c.asOf))
      .map((e) => e.id),
    days: c.attendance.map((d) => ({ employeeId: d.employeeId,
      date: d.date, state: d.status, clockIn: hm(d.clockIn),
      clockOut: hm(d.clockOut), workedMinutes: d.workedMinutes,
      overtimeMinutes: d.overtimeMinutes })),
    sheets: c.timesheets.map((t) => {
      const x = against.find((a) => a.employeeId === t.employeeId);
      return { employeeId: t.employeeId, workingDays: t.workingDays,
        presentDays: t.presentDays, leaveDays: t.leaveDays,
        unpaidDays: t.unpaidDays, workedMinutes: t.workedMinutes,
        overtimeMinutes: t.overtimeMinutes,
        nightOvertimeMinutes: x?.nightOvertimeMinutes ?? 0,
        late: (x?.late ?? []).map((l) => ({ date: l.date,
          minutes: l.minutes })) };
    }),
    punches: punches(c).map((p) => ({ employeeId: p.employeeId,
      date: p.date, in: p.in, out: p.out, source: p.source })),
    unmatched: unmatchedPunches(c).map((u) => ({ id: u.id,
      badge: u.badge, reader: u.reader, date: u.date, time: u.time,
      reason: u.reason })),
    claims: overtimeClaims(c).map((o) => ({ id: o.id,
      employeeId: o.employeeId, date: o.date, minutes: o.minutes,
      nightMinutes: o.nightMinutes,
      phase: o.status === "approved" ? "paid" : "waiting",
      value: o.value })),
    crew: overtimePreApprovals(c).map((p) => ({ id: p.id,
      requestedBy: p.requestedBy, date: p.date,
      minutesEach: p.minutesEach, people: p.people,
      estimate: p.estimate, reason: p.reason })),
    shifts: shifts().map((s) => ({ id: s.id, label: s.label,
      hours: s.display.hours, breakText: s.display.break })),
    rosterDays: plan.days.map((d) => ({ iso: d.iso, status: d.status })),
    roster: plan.rows.map((r) => ({ employeeId: r.employeeId,
      cells: r.cells.map((x) => ({ date: x.date, kind: x.kind,
        shiftId: x.shiftId, pending: x.pending })) })),
    rosterChecks: plan.flags.map((f) => ({ employeeId: f.employeeId,
      code: f.code, dates: f.dates })),
  };
  return { data };
}
