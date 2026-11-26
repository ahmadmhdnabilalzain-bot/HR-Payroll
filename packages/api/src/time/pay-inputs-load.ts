import { addDays } from "@payroll/engine";
import type { Db } from "../db/db";
import { leaveTypeKinds } from "../leave/payroll-kind";
import { leaveMap } from "./leave-map";
import type { PayInputSource } from "./pay-inputs";
import { monthBounds } from "./timesheet-build";
import { sheetView, type SheetRow } from "./timesheets";

interface EmpRow { id: string; joining_date: string;
  last_working_date: string | null }

/** Employees in service at some point of the month. */
async function employeesIn(tx: Db, companyId: string, first: string,
  last: string) {
  const rows = await tx.query<EmpRow>(
    `SELECT id, joining_date, last_working_date FROM employees
     WHERE company_id = $1 AND joining_date <= $3
     AND (last_working_date IS NULL OR last_working_date >= $2)
     ORDER BY id`, [companyId, first, last]);
  return rows.map((r) => ({ employeeId: r.id, joiningDate: r.joining_date,
    lastWorkingDate: r.last_working_date }));
}

/** Approved leave dates of `kind` in [from, to], with their halves. */
async function halvesOf(tx: Db, companyId: string, ids: string[],
  from: string, to: string, kind: string) {
  if (to < from) return new Map<string, Map<string, number>>();
  const kinds = await leaveTypeKinds(tx, companyId);
  const m = await leaveMap(tx, companyId, ids, from, to);
  const out = new Map<string, Map<string, number>>();
  for (const [emp, days] of m) {
    out.set(emp, new Map([...days].filter(([, l]) =>
      kinds.get(l.leaveTypeId)?.payrollKind === kind)
      .map(([d, l]) => [d, l.halves])));
  }
  return out;
}

/** Days of the unbroken run of dates ending the day before `first`. */
function runBefore(dates: Map<string, number> | undefined,
  first: string) {
  let n = 0;
  for (let d = addDays(first, -1); dates?.has(d); d = addDays(d, -1)) n++;
  return n;
}

/**
 * Reads employees, the month's timesheets (an approved sheet's frozen
 * days give its leave dates, so approved inputs never change
 * silently), and approved sick and maternity leave before the month.
 */
export async function loadPayInputSource(tx: Db, companyId: string,
  year: number, month: number, today: string): Promise<PayInputSource> {
  const { first, last } = monthBounds(year, month);
  const employees = await employeesIn(tx, companyId, first, last);
  const rows = await tx.query<SheetRow>("SELECT * FROM timesheets WHERE " +
    "company_id = $1 AND year = $2 AND month = $3 ORDER BY employee_id",
  [companyId, year, month]);
  const timesheets = [];
  for (const r of rows) {
    const v = await sheetView(tx, companyId, r, today, null);
    timesheets.push({ employeeId: r.employee_id, id: r.id,
      status: r.status, stale: v.stale, days: v.days });
  }
  const leaveDates = timesheets.filter((t) => t.status === "approved")
    .flatMap((t) => t.days.filter((d) => d.leave !== null).map((d) => ({
      employeeId: t.employeeId, date: d.date,
      halves: (d.leave!.part === "full" ? 2 : 1) as 1 | 2,
      payrollKind: d.leave!.payrollKind ?? "other-paid" })));
  const ids = employees.map((e) => e.employeeId);
  const sick = await halvesOf(tx, companyId, ids, `${year}-01-01`,
    addDays(first, -1), "sick");
  const mat = await halvesOf(tx, companyId, ids, addDays(first, -366),
    addDays(first, -1), "maternity");
  return { year, month, employees, timesheets, leaveDates,
    sickHalvesBefore: Object.fromEntries(ids.map((id) =>
      [id, [...(sick.get(id)?.values() ?? [])].reduce((a, b) => a + b,
        0)])),
    maternityRunBefore: Object.fromEntries(ids.map((id) =>
      [id, runBefore(mat.get(id), first)])) };
}
