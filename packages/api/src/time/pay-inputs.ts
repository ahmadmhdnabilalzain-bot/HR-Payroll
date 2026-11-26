import {
  PAY_INPUTS_STATEMENT,
  type ManualItem,
  type PayInputAbsence,
  type PayInputEmployee,
  type PayInputs,
  type TimesheetDay,
  type TimesheetStatus,
} from "@payroll/contract";

/**
 * Pure: approved timesheets to Plan 5's time inputs. An export for
 * review only; it never reads tracking data and writes nothing.
 */
export interface PayInputSource {
  year: number;
  month: number;
  employees: { employeeId: string; joiningDate: string;
    lastWorkingDate: string | null }[];
  timesheets: { employeeId: string; id: string; status: TimesheetStatus;
    stale: boolean; days: TimesheetDay[] }[];
  leaveDates: { employeeId: string; date: string; halves: 1 | 2;
    payrollKind: string }[];
  sickHalvesBefore: Record<string, number>;
  maternityRunBefore: Record<string, number>;
}

type Emp = PayInputSource["employees"][number];
type Sheet = PayInputSource["timesheets"][number];
const ABSENT = new Set(["unpaid", "sick", "maternity"]);
const item = (date: string | null, code: ManualItem["code"],
  note: string): ManualItem => ({ date, code, note });

function arrays(s: Sheet, leave: PayInputSource["leaveDates"]) {
  const manual: ManualItem[] = [];
  const overtime = s.days.filter((d) => (d.decision?.approvedMinutes ?? 0)
    > 0).map((d) => ({ date: d.date, minutes: d.decision!.approvedMinutes,
    nightMinutes: d.decision!.approvedNightMinutes }));
  const restDayWork = s.days.filter((d) => d.decision?.restDayWork
    ?.approved === true).map((d) => ({ date: d.date,
    kind: d.kind === "holiday" ? "holiday" as const : "rest-day" as const,
    compensation: d.decision!.restDayWork!.compensation }));
  const absences: PayInputAbsence[] = [];
  for (const l of leave.filter((x) => ABSENT.has(x.payrollKind))) {
    if (l.halves === 2) {
      absences.push({ date: l.date,
        kind: l.payrollKind as PayInputAbsence["kind"] });
    } else {
      manual.push(item(l.date, "HALF_DAY_ABSENCE", "Half-day absence: " +
        "enter by hand"));
    }
  }
  return { overtime, restDayWork, absences, manual };
}

const inService = (e: Emp, date: string) => date >= e.joiningDate &&
  (e.lastWorkingDate === null || date <= e.lastWorkingDate);

/** Removes dates the pay run would refuse and lists them for review. */
function clean(a: ReturnType<typeof arrays>, e: Emp) {
  const absent = new Set(a.absences.map((x) => x.date));
  const worked = new Set([...a.overtime, ...a.restDayWork]
    .map((x) => x.date));
  const conflict = [...absent].filter((d) => worked.has(d));
  const all = [...new Set([...absent, ...worked])];
  const outside = all.filter((d) => !inService(e, d));
  const drop = new Set([...conflict, ...outside]);
  const keep = <T extends { date: string }>(xs: T[]) =>
    xs.filter((x) => !drop.has(x.date));
  const manual = [...a.manual,
    ...conflict.map((d) => item(d, "WORK_ON_ABSENCE_DATE",
      "Absence and work on one date: resolve by hand")),
    ...outside.filter((d) => !conflict.includes(d)).map((d) =>
      item(d, "DATE_OUTSIDE_SERVICE", "Outside the service period"))];
  return { overtime: keep(a.overtime), restDayWork: keep(a.restDayWork),
    absences: keep(a.absences), manual };
}

function employeeInputs(src: PayInputSource, e: Emp, s: Sheet)
  : PayInputEmployee {
  const leave = src.leaveDates.filter((l) => l.employeeId === e.employeeId);
  const c = clean(arrays(s, leave), e);
  const sick = src.sickHalvesBefore[e.employeeId] ?? 0;
  if (sick % 2 === 1) {
    c.manual.push(item(null, "SICK_COUNTER_HAS_HALF_DAYS",
      "Earlier sick leave includes a half day; check the counter"));
  }
  if (s.stale) {
    c.manual.push(item(null, "TIMESHEET_STALE", "Records changed after " +
      "approval; the approved sheet is shown unchanged"));
  }
  return { employeeId: e.employeeId, timesheetId: s.id,
    overtime: c.overtime, restDayWork: c.restDayWork,
    absences: c.absences, sickDaysUsedBefore: Math.floor(sick / 2),
    maternityDaysUsedBefore: src.maternityRunBefore[e.employeeId] ?? 0,
    needsManualEntry: c.manual };
}

/** Scheduled work days with no record and no leave: never deducted. */
function unrecorded(s: Sheet) {
  return s.days.filter((d) => d.kind === "work" && d.shift !== null &&
    d.records.length === 0 && d.leave === null).map((d) => ({
    employeeId: s.employeeId, date: d.date,
    code: "UNRECORDED_ABSENCE" as const }));
}

export function buildPayInputs(src: PayInputSource): PayInputs {
  const out: PayInputs = { year: src.year, month: src.month,
    statement: PAY_INPUTS_STATEMENT, sickYear: "calendar-year",
    employees: [], missingTimesheets: [], notApproved: [],
    flagsNotDeducted: [] };
  for (const e of src.employees) {
    const s = src.timesheets.find((t) => t.employeeId === e.employeeId);
    if (s === undefined) out.missingTimesheets.push(e.employeeId);
    else if (s.status !== "approved") {
      out.notApproved.push({ employeeId: e.employeeId, timesheetId: s.id,
        status: s.status });
    } else {
      out.employees.push(employeeInputs(src, e, s));
      out.flagsNotDeducted.push(...unrecorded(s));
    }
  }
  return out;
}
