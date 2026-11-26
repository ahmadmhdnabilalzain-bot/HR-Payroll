import { z } from "zod";
import { Id, IsoDate, listOf } from "./primitives";
import { DayPart } from "./time-leave-policy";
import { Hhmm, TraceRuleView } from "./time-settings";

export const CalendarEntry = z.object({
  employeeId: Id,
  employeeName: z.string(),
  kind: z.enum(["leave", "shift", "rest"]),
  /** typeName is null for anyone but the person, manager, hr, owner. */
  leave: z.object({ status: z.enum(["approved", "pending"]),
    part: DayPart, typeName: z.string().nullable() }).nullable(),
  shift: z.object({ start: Hhmm, end: Hhmm }).nullable(),
});
export const CalendarDay = z.object({
  date: IsoDate,
  holiday: z.object({ name: z.string(), nameAr: z.string().nullable() })
    .nullable(),
  specialPeriod: z.literal("ramadan").nullable(),
  companyRestDay: z.boolean(),
  entries: z.array(CalendarEntry),
});
export type CalendarDay = z.infer<typeof CalendarDay>;
export const CalendarDayList = listOf(CalendarDay);
export const CalendarQuery = z.object({ from: IsoDate, to: IsoDate,
  departmentId: Id.optional() });

/** Counts only: no names. */
export const AvailabilityDay = z.object({
  date: IsoDate,
  departmentId: Id,
  scheduled: z.number().int().min(0),
  onLeave: z.number().int().min(0),
  available: z.number().int().min(0),
  minOnDuty: z.number().int().nullable(),
  belowMinimum: z.boolean(),
});
export const AvailabilityDayList = listOf(AvailabilityDay);
export const StaffingPut = z.object({
  minOnDuty: z.number().int().min(0).max(500).nullable() }).strict();
export const DepartmentStaffing = z.object({ departmentId: Id,
  minOnDuty: z.number().int().nullable() });

/** Informational only: `consequence` is always "none". */
export const AttendanceFlag = z.object({
  employeeId: Id,
  code: z.string(),
  dates: z.array(IsoDate).min(1),
  explanation: z.string(),
  inputs: z.record(z.string(), z.string()),
  basis: z.enum(["product-threshold", "law", "record"]),
  rule: TraceRuleView.nullable(),
  consequence: z.literal("none"),
});
export type AttendanceFlag = z.infer<typeof AttendanceFlag>;
export const AttendanceFlagList = listOf(AttendanceFlag);
export const FlagQuery = z.object({ from: IsoDate, to: IsoDate,
  employeeId: Id.optional() });
