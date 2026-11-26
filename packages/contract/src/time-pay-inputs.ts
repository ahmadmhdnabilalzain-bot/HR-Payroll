import { z } from "zod";
import { Id, IsoDate } from "./primitives";
import { TimesheetStatus } from "./time-timesheets";

/** Exact wording shown with every pay-inputs export. */
export const PAY_INPUTS_STATEMENT = "Time inputs for review. Nothing " +
  "here is paid until HR enters it in a pay run and an owner approves " +
  "the run. Work-from-home tracking data is never included.";

/** Plan 5 `OvertimeEntry`. */
export const PayInputOvertime = z.object({
  date: IsoDate,
  minutes: z.number().int().min(1),
  nightMinutes: z.number().int().min(0),
});
/** Plan 5 `RestDayWork`. */
export const PayInputRestDayWork = z.object({
  date: IsoDate,
  kind: z.enum(["rest-day", "holiday"]),
  compensation: z.enum(["pay", "day-off"]),
});
/** Plan 5 `Absence`. */
export const PayInputAbsence = z.object({
  date: IsoDate,
  kind: z.enum(["unpaid", "sick", "maternity"]),
});
export type PayInputOvertime = z.infer<typeof PayInputOvertime>;
export type PayInputRestDayWork = z.infer<typeof PayInputRestDayWork>;
export type PayInputAbsence = z.infer<typeof PayInputAbsence>;

export const ManualItem = z.object({
  date: IsoDate.nullable(),
  code: z.enum(["HALF_DAY_ABSENCE", "WORK_ON_ABSENCE_DATE",
    "DATE_OUTSIDE_SERVICE", "SICK_COUNTER_HAS_HALF_DAYS",
    "TIMESHEET_STALE", "DECISION_CLIPPED"]),
  note: z.string(),
});
export type ManualItem = z.infer<typeof ManualItem>;

export const PayInputEmployee = z.object({
  employeeId: Id,
  timesheetId: Id,
  overtime: z.array(PayInputOvertime),
  restDayWork: z.array(PayInputRestDayWork),
  absences: z.array(PayInputAbsence),
  sickDaysUsedBefore: z.number().int().min(0),
  maternityDaysUsedBefore: z.number().int().min(0),
  needsManualEntry: z.array(ManualItem),
});
export type PayInputEmployee = z.infer<typeof PayInputEmployee>;

export const PayInputs = z.object({
  year: z.number().int(),
  month: z.number().int(),
  statement: z.literal(PAY_INPUTS_STATEMENT),
  sickYear: z.literal("calendar-year"),
  employees: z.array(PayInputEmployee),
  missingTimesheets: z.array(Id),
  notApproved: z.array(z.object({ employeeId: Id, timesheetId: Id,
    status: TimesheetStatus })),
  flagsNotDeducted: z.array(z.object({ employeeId: Id, date: IsoDate,
    code: z.literal("UNRECORDED_ABSENCE") })),
});
export type PayInputs = z.infer<typeof PayInputs>;
