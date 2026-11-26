import { addDays } from "@payroll/engine";
import type { Db } from "../db/db";
import { isCompanyRestDay, loadCalendar } from "./calendar";
import { leaveMap } from "./leave-map";
import { publishedSlot, readEntries } from "./rosters";

export interface Person { id: string; full_name: string;
  manager_id: string | null; department_id: string | null;
  joining_date: string; last_working_date: string | null }

export async function loadPeople(tx: Db, companyId: string)
  : Promise<Person[]> {
  return tx.query<Person>(
    `SELECT id, full_name, manager_id, department_id, joining_date,
       last_working_date FROM employees WHERE company_id = $1 ORDER BY id`,
    [companyId]);
}

const inService = (p: Person, d: string) => p.joining_date <= d &&
  (p.last_working_date === null || p.last_working_date >= d);

export interface DeptDay { date: string; departmentId: string;
  scheduled: string[]; onLeave: string[] }

/**
 * Who is scheduled (a published shift; with no published slot, a
 * non-rest, non-holiday day) and who of them is on approved full-day
 * leave, per department and date.
 */
export async function departmentDays(tx: Db, companyId: string,
  people: Person[], from: string, to: string): Promise<DeptDay[]> {
  const ids = people.map((p) => p.id);
  const cal = await loadCalendar(tx, companyId, from, to);
  const slots = new Map((await readEntries(tx, companyId, ids, from, to))
    .map((r) => [`${r.employee_id}|${r.date}`, publishedSlot(r)]));
  const leave = await leaveMap(tx, companyId, ids, from, to);
  const depts = [...new Set(people.map((p) => p.department_id)
    .filter((d): d is string => d !== null))].sort();
  const out: DeptDay[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const freeDay = !cal.holidays.has(d) && !isCompanyRestDay(cal, d);
    for (const dep of depts) {
      const scheduled = people.filter((p) => p.department_id === dep &&
        inService(p, d)).filter((p) => {
        const s = slots.get(`${p.id}|${d}`) ?? null;
        return s === null ? freeDay : s.kind === "shift";
      }).map((p) => p.id);
      const onLeave = scheduled.filter((id) =>
        leave.get(id)?.get(d)?.part === "full");
      out.push({ date: d, departmentId: dep, scheduled, onLeave });
    }
  }
  return out;
}

export async function staffingMinimums(tx: Db, companyId: string)
  : Promise<Map<string, number | null>> {
  const rows = await tx.query<{ department_id: string;
    min_on_duty: number | null }>("SELECT department_id, min_on_duty " +
    "FROM department_staffing WHERE company_id = $1", [companyId]);
  return new Map(rows.map((r) => [r.department_id, r.min_on_duty]));
}

/**
 * Dates on which this employee's leave would take the department
 * below its minimum (a warning on the request, never a refusal).
 */
export async function belowStaffingDates(tx: Db, companyId: string,
  employeeId: string, dates: string[]): Promise<string[]> {
  if (dates.length === 0) return [];
  const people = await loadPeople(tx, companyId);
  const me = people.find((p) => p.id === employeeId);
  if (me?.department_id == null) return [];
  const min = (await staffingMinimums(tx, companyId))
    .get(me.department_id) ?? null;
  if (min === null) return [];
  const sorted = [...dates].sort();
  const days = await departmentDays(tx, companyId, people.filter((p) =>
    p.department_id === me.department_id), sorted[0]!,
  sorted[sorted.length - 1]!);
  return days.filter((d) => dates.includes(d.date) &&
    d.scheduled.includes(employeeId) && !d.onLeave.includes(employeeId) &&
    d.scheduled.length - d.onLeave.length - 1 < min).map((d) => d.date);
}
