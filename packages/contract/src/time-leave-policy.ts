import { z } from "zod";
import { ErrorCodeSchema } from "./errors";
import { Id, IsoDate, listOf } from "./primitives";
import { TimeFlagView } from "./time-settings";

/** Days in half-day steps (leave counts are whole half-days). */
export const HalfDays = z.number().multipleOf(0.5).min(0).max(366);
export const DayPart = z.enum(["full", "am", "pm"]);
export type DayPart = z.infer<typeof DayPart>;
export const PayrollKind = z.enum(["annual", "sick", "maternity", "unpaid",
  "other-paid"]);
export type PayrollKind = z.infer<typeof PayrollKind>;

const PolicyFields = {
  payrollKind: PayrollKind,
  accrual: z.enum(["upfront", "monthly"]),
  joiningYearProRata: z.boolean(),
  dayCount: z.enum(["calendar", "working"]),
  halfDays: z.boolean(),
  carryOverMaxDays: HalfDays.nullable(),
  carryOverExpiresMonths: z.number().int().min(1).max(12).nullable(),
  minNoticeDays: z.number().int().min(0).max(365),
  maxConsecutiveDays: z.number().int().min(1).max(366).nullable(),
  allowNegative: z.boolean(),
};
export const LeavePolicy = z.object({ leaveTypeId: Id, ...PolicyFields,
  isDefault: z.boolean(), warnings: z.array(TimeFlagView) });
export type LeavePolicy = z.infer<typeof LeavePolicy>;
export const LeavePolicyPut = z.object(PolicyFields).strict();
export type LeavePolicyPut = z.infer<typeof LeavePolicyPut>;

const BlackoutName = z.string().trim().min(1).max(100);
export const LeaveBlackout = z.object({
  id: Id,
  name: BlackoutName,
  from: IsoDate,
  to: IsoDate,
  leaveTypeIds: z.array(Id),
  departmentId: Id.nullable(),
  mode: z.enum(["block", "warn"]),
  status: z.enum(["active", "removed"]),
});
export type LeaveBlackout = z.infer<typeof LeaveBlackout>;
export const LeaveBlackoutList = listOf(LeaveBlackout);
export const LeaveBlackoutCreate = z.object({
  name: BlackoutName,
  from: IsoDate,
  to: IsoDate,
  leaveTypeIds: z.array(Id).max(50),
  departmentId: Id.nullable(),
  mode: z.enum(["block", "warn"]),
}).strict();
export type LeaveBlackoutCreate = z.infer<typeof LeaveBlackoutCreate>;
export const LeaveBlackoutUpdate = z.object({
  name: BlackoutName.optional(),
  mode: z.enum(["block", "warn"]).optional(),
  status: z.enum(["active", "removed"]).optional(),
}).strict();
export type LeaveBlackoutUpdate = z.infer<typeof LeaveBlackoutUpdate>;

export const LeaveWarning = z.object({
  code: z.enum(["BLACKOUT_WARN", "BLACKOUT_OVERRIDDEN", "BELOW_STAFFING",
    "SHORT_NOTICE", "OVER_MAX_CONSECUTIVE", "HOLIDAYS_EXCLUDED"]),
  message: z.string(),
  dates: z.array(IsoDate),
});
export type LeaveWarning = z.infer<typeof LeaveWarning>;

export const LeavePreview = z.object({
  days: HalfDays,
  dates: z.array(z.object({ date: IsoDate, part: DayPart })),
  skipped: z.array(z.object({ date: IsoDate,
    why: z.enum(["rest-day", "holiday"]) })),
  balanceAfter: z.number().multipleOf(0.5).nullable(),
  warnings: z.array(LeaveWarning),
  blocked: z.object({ code: ErrorCodeSchema, dates: z.array(IsoDate) })
    .nullable(),
});
export type LeavePreview = z.infer<typeof LeavePreview>;

export const CarryOverRun = z.object({
  fromYear: z.number().int().min(2000).max(2099) }).strict();
export const CarryOverResult = z.object({
  fromYear: z.number().int(),
  toYear: z.number().int(),
  rows: z.array(z.object({ employeeId: Id, leaveTypeId: Id,
    days: HalfDays, expiresOn: IsoDate.nullable() })),
  alreadyRun: z.boolean(),
});
export type CarryOverResult = z.infer<typeof CarryOverResult>;
