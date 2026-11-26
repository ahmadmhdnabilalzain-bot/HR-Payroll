import { z } from "zod";
import { Id, IsoDate, listOf, Timestamp } from "./primitives";
import { TraceLine } from "./trace";
import { Hhmm, TimeFlagView } from "./time-settings";

const Int = z.number().int();
const NonNeg = Int.min(0);
const Compensation = z.enum(["pay", "day-off"]);

export const OvertimeDecision = z.object({
  approvedMinutes: NonNeg,
  approvedNightMinutes: NonNeg,
  restDayWork: z.object({ approved: z.boolean(),
    compensation: Compensation }).nullable(),
  decidedBy: Id,
  decidedAt: Timestamp,
});
export type OvertimeDecision = z.infer<typeof OvertimeDecision>;

export const WfhTotalsLite = z.object({ activeMinutes: NonNeg,
  idleMinutes: NonNeg, pausedMinutes: NonNeg });

export const TimesheetDay = z.object({
  date: IsoDate,
  kind: z.enum(["work", "rest", "holiday"]),
  shift: z.object({ start: Hhmm, end: Hhmm, breakMinutes: NonNeg })
    .nullable(),
  records: z.array(z.object({ attendanceId: Id, clockIn: Timestamp,
    clockOut: Timestamp.nullable() })),
  leave: z.object({ part: z.enum(["full", "am", "pm"]),
    typeName: z.string().nullable(), payrollKind: z.string().nullable() })
    .nullable(),
  scheduledMinutes: NonNeg,
  workedMinutes: NonNeg,
  lateMinutes: NonNeg,
  earlyLeaveMinutes: NonNeg,
  overtimeMinutes: NonNeg,
  overtimeNightMinutes: NonNeg,
  restDayWorkMinutes: NonNeg,
  decision: OvertimeDecision.nullable(),
  flags: z.array(TimeFlagView),
  trace: z.array(TraceLine),
  wfh: WfhTotalsLite.nullable(),
});
export type TimesheetDay = z.infer<typeof TimesheetDay>;

export const TimesheetStatus = z.enum(["draft", "submitted", "approved"]);
export type TimesheetStatus = z.infer<typeof TimesheetStatus>;

export const TimesheetSummary = z.object({
  id: Id,
  employeeId: Id,
  year: Int,
  month: Int,
  status: TimesheetStatus,
  stale: z.boolean(),
  totals: z.object({ scheduled: NonNeg, worked: NonNeg, overtime: NonNeg,
    overtimeNight: NonNeg, approvedOvertime: NonNeg,
    approvedNight: NonNeg, restDayWorkDays: NonNeg }),
  flags: z.array(TimeFlagView),
  submittedAt: Timestamp.nullable(),
  submittedBy: Id.nullable(),
  approvedAt: Timestamp.nullable(),
  approvedBy: Id.nullable(),
});
export type TimesheetSummary = z.infer<typeof TimesheetSummary>;
export const Timesheet = TimesheetSummary.extend({
  days: z.array(TimesheetDay) });
export type Timesheet = z.infer<typeof Timesheet>;
export const TimesheetSummaryList = listOf(TimesheetSummary);

const Year = z.coerce.number().int().min(2000).max(2100);
const Month = z.coerce.number().int().min(1).max(12);
export const TimesheetQuery = z.object({ year: Year, month: Month,
  employeeId: Id.optional(), status: TimesheetStatus.optional() });
export type TimesheetQuery = z.infer<typeof TimesheetQuery>;
export const TimesheetPrepare = z.object({ employeeId: Id.optional(),
  year: Year, month: Month }).strict();
export type TimesheetPrepare = z.infer<typeof TimesheetPrepare>;
export const OvertimeDecisionInput = z.object({
  days: z.array(z.object({
    date: IsoDate,
    approvedMinutes: NonNeg,
    approvedNightMinutes: NonNeg,
    restDayWork: z.object({ approved: z.boolean(),
      compensation: Compensation }).strict().optional(),
  }).strict()).min(1).max(31),
}).strict();
export type OvertimeDecisionInput = z.infer<typeof OvertimeDecisionInput>;
export const TimesheetNote = z.object({
  note: z.string().min(3).max(500) }).strict();
export const PeriodQuery = z.object({ year: Year, month: Month });
