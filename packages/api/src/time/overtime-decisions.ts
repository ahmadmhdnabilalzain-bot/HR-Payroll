import type {
  OvertimeDecisionInput,
  TimesheetDay,
} from "@payroll/contract";
import type { Db } from "../db/db";
import { ApiError } from "../http/errors";

type In = OvertimeDecisionInput["days"][number];

export function valid(d: TimesheetDay | undefined, x: In): boolean {
  if (d === undefined) return false;
  if (x.approvedMinutes > d.overtimeMinutes) return false;
  if (x.approvedNightMinutes > Math.min(x.approvedMinutes,
    d.overtimeNightMinutes)) return false;
  if (x.restDayWork === undefined) return true;
  return d.kind !== "work" && d.restDayWorkMinutes > 0;
}

/**
 * Approved minutes within the day's overtime; night within both;
 * rest-day work only on a rest day or holiday with work. Any other
 * input: 422 OVERTIME_DECISION_INVALID naming the dates.
 */
export function checkDecisions(days: TimesheetDay[], input: In[]): void {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const bad = input.filter((x) => !valid(byDate.get(x.date), x))
    .map((x) => x.date);
  const dup = input.length !== new Set(input.map((x) => x.date)).size;
  if (bad.length > 0 || dup) {
    throw new ApiError("OVERTIME_DECISION_INVALID", undefined,
      { dates: [...new Set(bad)] });
  }
}

/** Days with overtime or rest-day work and no decision. */
export function undecided(days: TimesheetDay[]): string[] {
  return days.filter((d) => (d.overtimeMinutes > 0 ||
    d.restDayWorkMinutes > 0) && d.decision === null).map((d) => d.date);
}

export async function saveDecisions(tx: Db, companyId: string,
  sheetId: string, input: In[], by: string, at: string): Promise<void> {
  for (const x of input) {
    await tx.query(
      `INSERT INTO overtime_decisions (company_id, timesheet_id, date,
         approved_minutes, approved_night_minutes, rest_day_approved,
         compensation, decided_by, decided_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (timesheet_id, date) DO UPDATE SET
         approved_minutes = $4, approved_night_minutes = $5,
         rest_day_approved = $6, compensation = $7, decided_by = $8,
         decided_at = $9, voided_at = NULL`,
      [companyId, sheetId, x.date, x.approvedMinutes,
        x.approvedNightMinutes, x.restDayWork?.approved ?? null,
        x.restDayWork?.compensation ?? null, by, at]);
  }
}

/** Voids decisions (all, or those of `dates`); they stop counting. */
export async function voidDecisions(tx: Db, companyId: string,
  sheetId: string, at: string, dates: string[] | null): Promise<void> {
  await tx.query(
    `UPDATE overtime_decisions SET voided_at = $3 WHERE company_id = $1
     AND timesheet_id = $2 AND voided_at IS NULL
     AND ($4::date[] IS NULL OR date = ANY($4::date[]))`,
    [companyId, sheetId, at, dates]);
}

/** Days whose stored decision no longer fits the day. */
export function misfits(days: TimesheetDay[]): string[] {
  return days.filter((d) => d.decision !== null && !valid(d, {
    date: d.date, approvedMinutes: d.decision.approvedMinutes,
    approvedNightMinutes: d.decision.approvedNightMinutes,
    ...(d.decision.restDayWork === null ? {}
      : { restDayWork: d.decision.restDayWork }) })).map((d) => d.date);
}
