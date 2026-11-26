import type {
  OvertimeDecision,
  RosterSlot,
  TimesheetDay,
} from "@payroll/contract";
import {
  addDays,
  computeDaySheet,
  daysInMonth,
  type DayInput,
  type TimeFlag,
  type TimeParams,
} from "@payroll/engine";
import { canonicalJson, sha256Hex } from "../audit/canonical";
import type { Db } from "../db/db";
import { leaveTypeKinds } from "../leave/payroll-kind";
import { isCompanyRestDay, isRamadan, loadCalendar } from "./calendar";
import { recordShape } from "./clock-math";
import { leaveMap } from "./leave-map";
import { publishedSlot, readEntries } from "./rosters";
import { slotToShiftSlot } from "./shifts";

/** One day's engine input plus what the sheet shows next to it. */
export interface BuiltDay {
  input: DayInput;
  slot: RosterSlot | null;
  records: TimesheetDay["records"];
  leave: TimesheetDay["leave"];
  extraFlags: TimeFlag[];
}

interface Rec { id: string; date: string; clock_in: string;
  clock_out: string | null }

const pad = (n: number) => String(n).padStart(2, "0");
export const monthBounds = (y: number, m: number) => ({
  first: `${y}-${pad(m)}-01`, last: `${y}-${pad(m)}-${pad(daysInMonth(y,
    m))}` });

function worked(recs: Rec[], date: string, today: string) {
  const out = { worked: [] as DayInput["worked"], open: false,
    flags: [] as TimeFlag[] };
  for (const r of recs) {
    const s = recordShape(r, date);
    if (s.kind === "closed") out.worked.push(s.interval);
    if (s.kind !== "open") continue;
    if (r.clock_out !== null) {
      out.open = true;
      out.flags.push({ code: "RECORD_OVER_24_HOURS", dates: [date],
        detail: { attendanceId: r.id }, rule: null });
    } else if (date < today) out.open = true;
  }
  return out;
}

/**
 * One day per date of the month up to `today`: holiday (active
 * holiday), rest (published rest, else a company rest day without a
 * published slot), else work; shift from the published slot; worked
 * from closed records of that date; approved leave parts.
 */
export async function buildDayInputs(tx: Db, companyId: string,
  employeeId: string, year: number, month: number, today: string)
  : Promise<BuiltDay[]> {
  const { first, last } = monthBounds(year, month);
  const cal = await loadCalendar(tx, companyId, first, last);
  const slots = new Map((await readEntries(tx, companyId, [employeeId],
    first, last)).map((r) => [r.date, publishedSlot(r)]));
  const recs = await tx.query<Rec>(
    `SELECT id, date, clock_in, clock_out FROM attendance
     WHERE company_id = $1 AND employee_id = $2 AND date BETWEEN $3 AND $4
     ORDER BY clock_in, id`, [companyId, employeeId, first, last]);
  const leave = (await leaveMap(tx, companyId, [employeeId], first, last))
    .get(employeeId);
  const kinds = await leaveTypeKinds(tx, companyId);
  const out: BuiltDay[] = [];
  for (let d = first; d <= last && d <= today; d = addDays(d, 1)) {
    const slot = slots.get(d) ?? null;
    const dayRecs = recs.filter((r) => r.date === d);
    const w = worked(dayRecs, d, today);
    const l = leave?.get(d);
    const kind = l === undefined ? null : kinds.get(l.leaveTypeId);
    const restDay = slot?.kind === "rest" ||
      (slot === null && isCompanyRestDay(cal, d));
    const shift = slot?.kind === "shift" ? slotToShiftSlot(slot) : null;
    out.push({ input: { date: d, kind: cal.holidays.has(d) ? "holiday"
      : restDay ? "rest" : "work", shift: shift === "rest" ? null : shift,
    worked: w.worked, openRecord: w.open, ramadan: isRamadan(cal, d),
    leave: l?.part ?? "none" }, slot, records: dayRecs.map((r) => ({
      attendanceId: r.id, clockIn: r.clock_in, clockOut: r.clock_out })),
    leave: l === undefined ? null : { part: l.part,
      typeName: kind?.name ?? null, payrollKind: kind?.payrollKind ?? null },
    extraFlags: w.flags });
  }
  return out;
}

/** The hash a frozen sheet keeps; a later change makes it stale. */
export const sourceHash = (days: BuiltDay[]): string =>
  sha256Hex(canonicalJson(days));

export type WfhLite = NonNullable<TimesheetDay["wfh"]>;

/** Day sheets from the engine; decisions and WFH totals attached. */
export function buildTimesheetDays(days: BuiltDay[], p: TimeParams,
  decisions: Map<string, OvertimeDecision>,
  wfh: Map<string, WfhLite> | null): TimesheetDay[] {
  return days.map((b) => {
    const s = computeDaySheet(b.input, p);
    const shift = b.slot?.kind === "shift" ? { start: b.slot.start,
      end: b.slot.end, breakMinutes: b.slot.breakMinutes } : null;
    return { date: s.date, kind: s.kind, shift, records: b.records,
      leave: b.leave, scheduledMinutes: s.scheduledMinutes,
      workedMinutes: s.workedMinutes, lateMinutes: s.lateMinutes,
      earlyLeaveMinutes: s.earlyLeaveMinutes,
      overtimeMinutes: s.overtimeMinutes,
      overtimeNightMinutes: s.overtimeNightMinutes,
      restDayWorkMinutes: s.restDayWorkMinutes,
      decision: decisions.get(s.date) ?? null,
      flags: [...s.flags, ...b.extraFlags], trace: s.trace,
      wfh: wfh?.get(s.date) ?? null };
  });
}
