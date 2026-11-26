import type { CalendarDay } from "@payroll/contract";
import { addDays } from "@payroll/engine";
import type { Tenant } from "../auth/guard";
import type { Db } from "../db/db";
import { leaveTypeKinds } from "../leave/payroll-kind";
import { isCompanyRestDay, isRamadan, loadCalendar } from "./calendar";
import { loadPeople, type Person } from "./availability";
import { leaveMap, type LeaveOnDate } from "./leave-map";
import { publishedSlot, readEntries } from "./rosters";

/** Owner, hr, the person, or their manager: sees names and pending. */
const privileged = (t: Tenant, p: Person) =>
  t.role === "owner" || t.role === "hr" || p.id === t.employeeId ||
  (t.role === "manager" && p.manager_id === t.employeeId);

/** Owner and hr: everyone; others: self, own department, reports. */
export function visiblePeople(t: Tenant, people: Person[],
  departmentId?: string): Person[] {
  const me = people.find((p) => p.id === t.employeeId);
  return people.filter((p) => {
    if (departmentId !== undefined && p.department_id !== departmentId) {
      return false;
    }
    if (privileged(t, p)) return true;
    return me?.department_id != null &&
      p.department_id === me.department_id;
  });
}

function entry(t: Tenant, p: Person, l: LeaveOnDate | undefined,
  slot: ReturnType<typeof publishedSlot>, typeName: string | null) {
  const base = { employeeId: p.id, employeeName: p.full_name };
  const seeLeave = l !== undefined &&
    (l.status === "approved" || privileged(t, p));
  if (seeLeave) {
    return { ...base, kind: "leave" as const, shift: null, leave: {
      status: l!.status, part: l!.part,
      typeName: privileged(t, p) ? typeName : null } };
  }
  if (slot === null) return null;
  return { ...base, kind: slot.kind, leave: null, shift: slot.kind ===
    "shift" ? { start: slot.start, end: slot.end } : null };
}

/**
 * Leave and published shifts of the people the caller may see. A
 * leave type's name (health types included) is shown only to the
 * person, their manager, hr and owner; pending leave likewise.
 */
export async function teamCalendar(tx: Db, t: Tenant, from: string,
  to: string, departmentId?: string): Promise<CalendarDay[]> {
  const people = visiblePeople(t, await loadPeople(tx, t.companyId),
    departmentId);
  const ids = people.map((p) => p.id);
  const cal = await loadCalendar(tx, t.companyId, from, to);
  const slots = new Map((await readEntries(tx, t.companyId, ids, from, to))
    .map((r) => [`${r.employee_id}|${r.date}`, publishedSlot(r)]));
  const leave = await leaveMap(tx, t.companyId, ids, from, to, true);
  const kinds = await leaveTypeKinds(tx, t.companyId);
  const out: CalendarDay[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const h = cal.holidays.get(d);
    const entries = people.map((p) => {
      const l = leave.get(p.id)?.get(d);
      return entry(t, p, l, slots.get(`${p.id}|${d}`) ?? null,
        l === undefined ? null : kinds.get(l.leaveTypeId)?.name ?? null);
    }).filter((e) => e !== null);
    out.push({ date: d, holiday: h === undefined ? null
      : { name: h.name, nameAr: h.nameAr },
    specialPeriod: isRamadan(cal, d) ? "ramadan" : null,
    companyRestDay: isCompanyRestDay(cal, d), entries });
  }
  return out;
}
