import {
  addDays,
  computeDaySheet,
  periodHourFlags,
} from "@payroll/engine";
import type { Db } from "../db/db";
import type { FlagDay } from "./flags";
import { timeParams } from "./params";
import { buildDayInputs, type BuiltDay } from "./timesheet-build";

/** The months touching [from, to] as (year, month) pairs. */
function months(from: string, to: string): [number, number][] {
  const out: [number, number][] = [];
  let y = Number(from.slice(0, 4));
  let m = Number(from.slice(5, 7));
  const end = Number(to.slice(0, 4)) * 12 + Number(to.slice(5, 7));
  for (; y * 12 + m <= end; m === 12 ? (y++, m = 1) : m++) out.push([y, m]);
  return out;
}

const restLike = (b: BuiltDay | undefined) =>
  b !== undefined && b.input.kind !== "work";

/**
 * Flag facts for [from - 89, to] (the pattern windows reach 90 days
 * back), from the same day inputs and engine day sheets as timesheets.
 */
export async function loadFlagDays(tx: Db, companyId: string,
  employeeId: string, from: string, to: string, today: string)
  : Promise<FlagDay[]> {
  const lo = addDays(from, -89);
  const built: BuiltDay[] = [];
  for (const [y, m] of months(lo, to)) {
    built.push(...await buildDayInputs(tx, companyId, employeeId, y, m,
      today));
  }
  const days = built.filter((b) => b.input.date >= lo &&
    b.input.date <= to);
  const exc = new Set((await tx.query<{ date: string }>(
    `SELECT DISTINCT date FROM attendance WHERE company_id = $1
     AND employee_id = $2 AND exception IS NOT NULL
     AND date BETWEEN $3 AND $4`, [companyId, employeeId, lo, to]))
    .map((r) => r.date));
  const p = timeParams(to);
  const sheets = days.map((b) => computeDaySheet(b.input, p));
  const period = periodHourFlags(sheets.map((s) => ({ date: s.date,
    workedMinutes: s.workedMinutes })), p);
  return days.map((b, i) => ({ date: b.input.date, kind: b.input.kind,
    hasPublishedShift: b.slot?.kind === "shift",
    lateMinutes: sheets[i]!.lateMinutes,
    earlyLeaveMinutes: sheets[i]!.earlyLeaveMinutes,
    worked: b.records.length > 0, openRecord: b.input.openRecord,
    leave: b.leave === null ? "none" : b.leave.part === "full" ? "full"
      : "half",
    sickLeave: b.leave?.payrollKind === "sick",
    restOrHolidayNext: restLike(days[i + 1]),
    restOrHolidayPrev: restLike(days[i - 1]),
    geofenceException: exc.has(b.input.date),
    sheetFlags: [...sheets[i]!.flags, ...period.filter((f) =>
      f.dates[f.dates.length - 1] === b.input.date)] }));
}
