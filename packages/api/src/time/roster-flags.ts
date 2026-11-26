import type { EmployeeFlag, RosterSlot } from "@payroll/contract";
import {
  addDays,
  checkRoster,
  type RosterDayInput,
  type TimeFlag,
} from "@payroll/engine";
import type { Db } from "../db/db";
import {
  isCompanyRestDay,
  isRamadan,
  loadCalendar,
  type CompanyCalendar,
} from "./calendar";
import { leaveMap, type LeaveMap } from "./leave-map";
import { timeParams } from "./params";
import { readEntries, workingSlot } from "./rosters";
import { slotToShiftSlot } from "./shifts";

/** `employeeId|date` to a slot that replaces the stored one. */
export type SlotOverrides = Map<string, RosterSlot | null>;

interface Sources {
  slots: Map<string, RosterSlot | null>;
  cal: CompanyCalendar;
  leave: LeaveMap;
}

function dayInput(emp: string, date: string, src: Sources)
  : RosterDayInput {
  const slot = src.slots.get(`${emp}|${date}`) ?? null;
  return { date, slot: slot === null ? null : slotToShiftSlot(slot),
    holiday: src.cal.holidays.has(date),
    companyRestDay: isCompanyRestDay(src.cal, date),
    ramadan: isRamadan(src.cal, date),
    onApprovedLeave: src.leave.get(emp)?.get(date)?.part === "full" };
}

const touches = (f: TimeFlag, from: string, to: string) =>
  f.dates.some((d) => d >= from && d <= to) ||
  (f.dates.length === 2 && f.dates[0]! <= to && f.dates[1]! >= from);

/**
 * Legal roster flags (informational, never blocking) for the working
 * slots of [from - 6, to + 6], keeping the flags that touch [from, to].
 */
export async function rosterFlagsFor(tx: Db, companyId: string,
  employeeIds: readonly string[], from: string, to: string,
  overrides: SlotOverrides = new Map()): Promise<EmployeeFlag[]> {
  const lo = addDays(from, -6);
  const hi = addDays(to, 6);
  const rows = await readEntries(tx, companyId, employeeIds, lo, hi);
  const slots = new Map(rows.map((r) =>
    [`${r.employee_id}|${r.date}`, workingSlot(r)]));
  for (const [k, v] of overrides) slots.set(k, v);
  const src: Sources = { slots, cal: await loadCalendar(tx, companyId, lo,
    hi), leave: await leaveMap(tx, companyId, employeeIds, lo, hi) };
  const p = timeParams(from);
  const out: EmployeeFlag[] = [];
  for (const emp of [...new Set(employeeIds)]) {
    const days: RosterDayInput[] = [];
    for (let d = lo; d <= hi; d = addDays(d, 1)) {
      days.push(dayInput(emp, d, src));
    }
    for (const f of checkRoster({ employeeId: emp, days }, p)) {
      if (touches(f, from, to)) out.push({ ...f, employeeId: emp });
    }
  }
  return out;
}
