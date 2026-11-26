import { z } from "zod";
import { Id, IsoDate, Name, Timestamp } from "./primitives";
import { DayPart, HalfDays, LeaveWarning } from "./time-leave-policy";

export const LeaveType = z.object({
  id: Id,
  name: Name,
  nameAr: z.string().max(200).nullable(),
  paid: z.boolean(),
  /** Company-entered days per calendar year; null: no balance kept. */
  annualDays: z.number().int().min(0).max(366).nullable(),
});
export type LeaveType = z.infer<typeof LeaveType>;

export const LeaveTypeCreate = z.object({
  name: Name,
  nameAr: z.string().max(200).nullable().optional(),
  paid: z.boolean(),
  annualDays: z.number().int().min(0).max(366).nullable(),
});
export type LeaveTypeCreate = z.infer<typeof LeaveTypeCreate>;

export const LeaveTypeUpdate = LeaveTypeCreate.partial();
export type LeaveTypeUpdate = z.infer<typeof LeaveTypeUpdate>;

export const LeaveStatus = z.enum([
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

export const LeaveRequest = z.object({
  id: Id,
  employeeId: Id,
  leaveTypeId: Id,
  startDate: IsoDate,
  endDate: IsoDate,
  /** Half-day steps (Plan 9 Ruling 6 widening). */
  days: HalfDays.min(0.5),
  status: LeaveStatus,
  reason: z.string().nullable(),
  decidedBy: Id.nullable(),
  decidedAt: Timestamp.nullable(),
  startPart: DayPart.optional(),
  endPart: DayPart.optional(),
  /** On create only: informational, never blocking. */
  warnings: z.array(LeaveWarning).optional(),
});
export type LeaveRequest = z.infer<typeof LeaveRequest>;

export const LeaveRequestCreate = z.object({
  employeeId: Id.optional(),
  leaveTypeId: Id,
  startDate: IsoDate,
  endDate: IsoDate,
  reason: z.string().max(1000).optional(),
  startPart: DayPart.optional(),
  endPart: DayPart.optional(),
  /** Owner or hr only: book through a blocking blackout (audited). */
  overrideBlackout: z.boolean().optional(),
});
export type LeaveRequestCreate = z.infer<typeof LeaveRequestCreate>;

export const LeaveRequestQuery = z.object({
  employeeId: Id.optional(),
  status: LeaveStatus.optional(),
  /** Requests starting in this calendar year (query text, coerced). */
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const LeaveDecision = z.object({
  note: z.string().max(1000).optional(),
});
export type LeaveDecision = z.infer<typeof LeaveDecision>;

export const LeaveAdjustmentCreate = z.object({
  employeeId: Id,
  leaveTypeId: Id,
  year: z.number().int().min(2000).max(2100),
  days: z.number().int().min(-366).max(366),
  reason: z.string().min(3).max(1000),
});
export type LeaveAdjustmentCreate = z.infer<typeof LeaveAdjustmentCreate>;

export const LeaveAdjustment = LeaveAdjustmentCreate.extend({
  id: Id,
  createdBy: Id,
  createdAt: Timestamp,
});
export type LeaveAdjustment = z.infer<typeof LeaveAdjustment>;

export const LeaveBalance = z.object({
  leaveTypeId: Id,
  year: z.number().int(),
  entitledDays: z.number().int(),
  adjustmentDays: z.number().int(),
  takenDays: z.number().multipleOf(0.5),
  pendingDays: z.number().multipleOf(0.5),
  remainingDays: z.number().multipleOf(0.5),
  dayCountRule: z.enum(["calendar-days-inclusive", "working-days"]),
  accrual: z.enum(["upfront", "monthly"]).optional(),
  accruedToDate: z.number().multipleOf(0.5).optional(),
  carriedDays: z.number().multipleOf(0.5).optional(),
  carriedExpiresOn: IsoDate.nullable().optional(),
  expiredDays: z.number().multipleOf(0.5).optional(),
});
export type LeaveBalance = z.infer<typeof LeaveBalance>;

/** Query strings arrive as text, so the year is coerced. */
export const LeaveBalanceQuery = z.object({
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});
